import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Users, UserX } from "lucide-react-native";
import { DateTimeField } from "@/components/DateTimeField";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { useAvailableDrivers, useCreateChauffeurService } from "@/hooks/useChauffeur";
import { buildBookingDates } from "@/lib/bookingDates";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, handleApiError } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { useTranslation } from "react-i18next";

type ServiceType = "HOURLY" | "DAILY";

function withTime(base: Date, time: Date): Date {
  const next = new Date(base);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
}

export default function ChauffeurDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading } = useAvailableDrivers();
  const createService = useCreateChauffeurService();
  const requireAuth = useRequireAuth();

  const [serviceType, setServiceType] = useState<ServiceType>("DAILY");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const driver = data?.data.find((d) => String(d.id) === id);

  async function handleSubmit() {
    try {
      const { startDate: start, endDate: end } = buildBookingDates(
        serviceType,
        startDate,
        endDate
      );
      await createService.mutateAsync({
        driverId: Number(id),
        serviceType: serviceType,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      Alert.alert("Request sent!", "Your chauffeur request has been sent to the driver.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      handleApiError(err, t);
    }
  }

  if (isLoading) return <LoadingIndicator fullScreen />;

  if (!driver) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="Driver Details" />
        <View style={{ flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg }}>
          <EmptyState
            icon={<UserX size={48} color={colors.text.tertiary} />}
            title="Driver not found"
            subtitle="This driver may no longer be available for hire."
          />
          <Button title="Go back" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Driver Details" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.profileSection}>
          <Avatar
            firstName={driver.firstName}
            lastName={driver.lastName}
            imageUrl={driver.profileImage?.url}
            size={80}
          />
          <Text style={s.driverName}>{driver.firstName} {driver.lastName}</Text>
          {driver.averageRating != null && (
            <Text style={s.ratingText}>{driver.averageRating.toFixed(1)} ★ · {driver.totalRatings} ratings</Text>
          )}
          {driver.chauffeurDescription ? (
            <Text style={s.description}>{driver.chauffeurDescription}</Text>
          ) : null}
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionLabel}>Pricing</Text>
          <View style={s.pricingRow}>
            {driver.chauffeurDailyRate && (
              <View style={s.priceBox}>
                <Text style={s.priceAmount}>{formatCurrency(Math.round(parseFloat(driver.chauffeurDailyRate) * 100))}</Text>
                <Text style={s.priceLabel}>per day</Text>
              </View>
            )}
            {driver.chauffeurHourlyRate && (
              <View style={s.priceBox}>
                <Text style={s.priceAmount}>{formatCurrency(Math.round(parseFloat(driver.chauffeurHourlyRate) * 100))}</Text>
                <Text style={s.priceLabel}>per hour</Text>
              </View>
            )}
          </View>
        </View>

        {driver.drivingExperience != null && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <Text style={s.sectionLabel}>Experience</Text>
              <Text style={s.vehicleItem}>{driver.drivingExperience} years of driving experience</Text>
            </View>
          </>
        )}

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionLabel}>Availability</Text>
          <AvailabilityCalendar
            testID="chauffeur.calendar"
            bookedRanges={driver.bookedRanges ?? []}
            startDate={startDate}
            endDate={endDate}
            mode={serviceType}
            onChange={(start, end) => {
              setStartDate(withTime(start, startDate));
              setEndDate(withTime(end, endDate));
            }}
          />
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionLabel}>Booking</Text>

          <Text style={s.fieldLabel}>Service Type</Text>
          <View style={s.typeRow}>
            {(["DAILY", "HOURLY"] as ServiceType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[s.typeBtn, serviceType === type && s.typeBtnActive]}
                onPress={() => setServiceType(type)}
              >
                <Text style={[s.typeBtnText, serviceType === type && s.typeBtnTextActive]}>
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <DateTimeField
            mode="date"
            label="Start Date"
            value={startDate}
            minimumDate={new Date()}
            onChange={(d) => {
              setStartDate(d);
              if (endDate < d) setEndDate(d);
            }}
          />

          {serviceType === "HOURLY" && (
            <DateTimeField
              mode="time"
              label="Start Time"
              value={startDate}
              onChange={(t) => setStartDate(withTime(startDate, t))}
            />
          )}

          <DateTimeField
            mode="date"
            label="End Date"
            value={endDate}
            minimumDate={startDate}
            onChange={setEndDate}
          />

          {serviceType === "HOURLY" && (
            <DateTimeField
              mode="time"
              label="End Time"
              value={endDate}
              onChange={(t) => setEndDate(withTime(endDate, t))}
            />
          )}
        </View>

        <View style={s.submitWrapper}>
          <Button
            title="Request Service"
            onPress={() =>
              requireAuth(() => void handleSubmit(), {
                reason: "Sign in to hire a chauffeur",
              })
            }
            loading={createService.isPending}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },
  profileSection: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  driverName: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  ratingText: { fontSize: fontSize.sm, color: colors.text.secondary },
  description: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center", paddingHorizontal: spacing.lg, lineHeight: 20 },
  section: { padding: spacing.lg, gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  pricingRow: { flexDirection: "row", gap: spacing.lg },
  priceBox: { alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, flex: 1 },
  priceAmount: { fontSize: fontSize.lg, fontWeight: "700", color: colors.primary },
  priceLabel: { fontSize: fontSize.xs, color: colors.text.secondary },
  vehicleItem: { fontSize: fontSize.sm, color: colors.text.secondary, paddingVertical: spacing.xs },
  fieldLabel: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.sm },
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeBtnText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: "600" },
  typeBtnTextActive: { color: colors.primary },
  submitWrapper: { padding: spacing.lg, paddingTop: spacing.xl },
});
