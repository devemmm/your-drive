import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Car } from "lucide-react-native";
import { DateTimeField } from "@/components/DateTimeField";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { useAvailableRentals, useCreateRental } from "@/hooks/useRentals";
import { buildBookingDates } from "@/lib/bookingDates";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Image } from "expo-image";
import { formatCurrency, getVehicleImageUrl, handleApiError } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { useTranslation } from "react-i18next";

type RentalType = "HOURLY" | "DAILY";

function withTime(base: Date, time: Date): Date {
  const next = new Date(base);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
}

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading } = useAvailableRentals();
  const createRental = useCreateRental();
  const requireAuth = useRequireAuth();

  const [rentalType, setRentalType] = useState<RentalType>("DAILY");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const vehicle = data?.data.find((v) => String(v.id) === id);

  async function handleSubmit() {
    try {
      const { startDate: start, endDate: end } = buildBookingDates(
        rentalType,
        startDate,
        endDate
      );
      await createRental.mutateAsync({
        vehicleId: Number(id),
        rentalType: rentalType,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      Alert.alert("Request sent!", "Your rental request has been sent to the owner.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      handleApiError(err, t);
    }
  }

  if (isLoading) return <LoadingIndicator fullScreen />;

  if (!vehicle) {
    return <LoadingIndicator fullScreen />;
  }

  const validImage = getVehicleImageUrl(vehicle);

  return (
    <SafeAreaView style={s.container} testID="rental.detail.screen">
      <ScreenHeader title="Rental Details" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {validImage ? (
          <Image source={{ uri: validImage }} style={s.image} contentFit="cover" transition={200} />
        ) : (
          <View style={s.imagePlaceholder}>
            <Car size={48} color={colors.text.tertiary} />
          </View>
        )}

        <View style={s.section}>
          <View style={s.vehicleRow}>
            <Text style={s.vehicleName}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
            <Badge label={vehicle.category} variant="muted" />
          </View>
          <Text style={s.vehicleDetail}>{vehicle.color} · {vehicle.capacity} seats</Text>
        </View>

        <View style={s.divider} />

        {vehicle.user && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Owner</Text>
            <View style={s.ownerRow}>
              <Avatar
                firstName={vehicle.user.firstName}
                lastName={vehicle.user.lastName ?? ""}
                imageUrl={vehicle.user.profileImage?.url}
                size={44}
              />
              <View>
                <Text style={s.ownerName}>{vehicle.user.firstName} {vehicle.user.lastName ?? ""}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionLabel}>Pricing</Text>
          <View style={s.pricingRow}>
            {vehicle.dailyRate && (
              <View style={s.priceBox}>
                <Text style={s.priceAmount}>{formatCurrency(Math.round(parseFloat(vehicle.dailyRate) * 100))}</Text>
                <Text style={s.priceLabel}>per day</Text>
              </View>
            )}
            {vehicle.hourlyRate && (
              <View style={s.priceBox}>
                <Text style={s.priceAmount}>{formatCurrency(Math.round(parseFloat(vehicle.hourlyRate) * 100))}</Text>
                <Text style={s.priceLabel}>per hour</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionLabel}>Availability</Text>
          <AvailabilityCalendar
            testID="rental.calendar"
            bookedRanges={vehicle.bookedRanges ?? []}
            startDate={startDate}
            endDate={endDate}
            mode={rentalType}
            onChange={(start, end) => {
              setStartDate(withTime(start, startDate));
              setEndDate(withTime(end, endDate));
            }}
          />
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionLabel}>Booking</Text>

          <Text style={s.fieldLabel}>Rental Type</Text>
          <View style={s.typeRow}>
            {(["DAILY", "HOURLY"] as RentalType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[s.typeBtn, rentalType === type && s.typeBtnActive]}
                onPress={() => setRentalType(type)}
              >
                <Text style={[s.typeBtnText, rentalType === type && s.typeBtnTextActive]}>
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

          {rentalType === "HOURLY" && (
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

          {rentalType === "HOURLY" && (
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
            testID="rental.bookButton"
            title="Request Rental"
            onPress={() =>
              requireAuth(() => void handleSubmit(), {
                reason: "Sign in to book this rental",
              })
            }
            loading={createRental.isPending}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },
  image: { width: "100%", height: 220, backgroundColor: colors.surface },
  imagePlaceholder: { width: "100%", height: 220, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  section: { padding: spacing.lg, gap: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  vehicleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehicleName: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary, flex: 1 },
  vehicleDetail: { fontSize: fontSize.sm, color: colors.text.secondary },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ownerName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  ownerRating: { fontSize: fontSize.sm, color: colors.text.secondary },
  pricingRow: { flexDirection: "row", gap: spacing.lg },
  priceBox: { alignItems: "center", backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md, flex: 1 },
  priceAmount: { fontSize: fontSize.lg, fontWeight: "700", color: colors.primary },
  priceLabel: { fontSize: fontSize.xs, color: colors.text.secondary },
  fieldLabel: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.sm },
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  typeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeBtnText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: "600" },
  typeBtnTextActive: { color: colors.primary },
  submitWrapper: { padding: spacing.lg, paddingTop: spacing.xl },
});
