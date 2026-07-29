// mobile/src/app/bus/trip/[rideId].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Minus, Plus } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useBookRide } from "@/hooks/useRides";
import { usePublicRide } from "@/hooks/useBus";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { isValidStopSelection, clampSeats } from "@/lib/busBooking";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Button } from "@/components/ui/Button";
import { formatCurrency, handleApiError } from "@/lib/utils";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";

export default function BusBookingScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const requireAuth = useRequireAuth();
  const { data: ride, isLoading } = usePublicRide(rideId);
  const book = useBookRide();

  const stops = ride?.route?.stops ?? [];
  const [boardingStopId, setBoardingStopId] = useState<number | null>(null);
  const [alightingStopId, setAlightingStopId] = useState<number | null>(null);
  const [seats, setSeats] = useState(1);
  const maxSeats = Math.max(1, ride?.availableSeats ?? 1);

  useEffect(() => {
    if (stops.length && boardingStopId == null) {
      setBoardingStopId(stops[0].id);
      setAlightingStopId(stops[stops.length - 1].id);
    }
  }, [stops, boardingStopId]);

  if (isLoading || !ride) return <LoadingIndicator />;

  const onConfirm = () => {
    requireAuth(async () => {
      if (
        boardingStopId == null ||
        alightingStopId == null ||
        !isValidStopSelection(stops, boardingStopId, alightingStopId)
      ) {
        Alert.alert("Invalid stops", "Your drop-off must be after your boarding stop.");
        return;
      }
      try {
        await book.mutateAsync({ rideId: ride.id, seats, boardingStopId, alightingStopId });
        router.replace(`/bus/trip/${ride.id}/ticket` as any);
      } catch (e) {
        handleApiError(e, t);
      }
    });
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Confirm booking</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>BOARDING POINT</Text>
        {stops.map((stop) => {
          const selected = stop.id === boardingStopId;
          return (
            <TouchableOpacity
              key={`b-${stop.id}`}
              testID={`bus.boarding.${stop.id}`}
              style={[s.option, selected && s.optionSelected]}
              onPress={() => setBoardingStopId(stop.id)}
            >
              <View style={[s.radio, selected && s.radioOn]}>
                {selected ? <Check size={12} color={colors.text.inverse} /> : null}
              </View>
              <Text style={s.optionText}>{stop.name}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={s.label}>DROP-OFF POINT</Text>
        {stops.map((stop) => {
          const selected = stop.id === alightingStopId;
          return (
            <TouchableOpacity
              key={`a-${stop.id}`}
              testID={`bus.alighting.${stop.id}`}
              style={[s.option, selected && s.optionSelected]}
              onPress={() => setAlightingStopId(stop.id)}
            >
              <View style={[s.radio, selected && s.radioOn]}>
                {selected ? <Check size={12} color={colors.text.inverse} /> : null}
              </View>
              <Text style={s.optionText}>{stop.name}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={s.label}>PASSENGERS</Text>
        <View style={s.stepperRow}>
          <TouchableOpacity
            testID="bus.seats.minus"
            style={[s.stepperBtn, seats <= 1 && s.stepperBtnDisabled]}
            disabled={seats <= 1}
            onPress={() => setSeats((n) => clampSeats(n - 1, maxSeats))}
          >
            <Minus size={18} color={seats <= 1 ? colors.text.tertiary : colors.text.primary} />
          </TouchableOpacity>
          <View style={s.stepperValue}>
            <Text testID="bus.seats.count" style={s.stepperCount}>{seats}</Text>
            <Text style={s.stepperHint}>
              {seats === 1 ? "seat" : "seats"} · {maxSeats} available
            </Text>
          </View>
          <TouchableOpacity
            testID="bus.seats.plus"
            style={[s.stepperBtn, seats >= maxSeats && s.stepperBtnDisabled]}
            disabled={seats >= maxSeats}
            onPress={() => setSeats((n) => clampSeats(n + 1, maxSeats))}
          >
            <Plus size={18} color={seats >= maxSeats ? colors.text.tertiary : colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={s.priceCard}>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>
              Fare · {seats} {seats === 1 ? "seat" : "seats"}
            </Text>
            <Text testID="bus.fare.total" style={s.priceValue}>
              {formatCurrency(Math.round(ride.contribution * seats * 100))}
            </Text>
          </View>
          <Text style={s.note}>Pay operator on boarding (cash)</Text>
        </View>
      </ScrollView>
      <View style={s.bar}>
        <Button testID="bus.confirmBooking" title="Confirm booking" onPress={onConfirm} loading={book.isPending} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    appBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.md, color: colors.text.primary },
    content: { padding: spacing.lg, gap: spacing.sm },
    label: {
      fontFamily: "Jost_700Bold",
      fontSize: 11,
      letterSpacing: 0.6,
      color: colors.text.secondary,
      marginTop: spacing.md,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.text.tertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
    optionText: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.sm, color: colors.text.primary },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperBtn: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    stepperBtnDisabled: { opacity: 0.4 },
    stepperValue: { alignItems: "center" },
    stepperCount: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
    stepperHint: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    priceCard: {
      marginTop: spacing.lg,
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    priceRow: { flexDirection: "row", justifyContent: "space-between" },
    priceLabel: { fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.secondary },
    priceValue: { fontFamily: "Jost_700Bold", fontSize: fontSize.sm, color: colors.text.primary },
    note: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    bar: {
      padding: spacing.lg,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
