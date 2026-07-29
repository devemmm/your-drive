// mobile/src/app/bus/route/[routeId]/trips.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/ThemeProvider";
import { useRouteDepartures, useMaterializeTrip } from "@/hooks/useBus";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { formatCurrency, handleApiError } from "@/lib/utils";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";

function toDateString(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ScheduleScreen() {
  const { routeId, routeTitle } = useLocalSearchParams<{ routeId: string; routeTitle?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const requireAuth = useRequireAuth();
  const { data: departures, isLoading } = useRouteDepartures(routeId);
  const materialize = useMaterializeTrip();
  const [pendingDepartureId, setPendingDepartureId] = useState<number | null>(null);

  const onPickDate = (departureId: number) => requireAuth(() => setPendingDepartureId(departureId));

  const onDateChosen = async (_e: unknown, date?: Date) => {
    const departureId = pendingDepartureId;
    setPendingDepartureId(null);
    if (!date || departureId == null) return;
    try {
      const { ride } = await materialize.mutateAsync({ routeDepartureId: departureId, date: toDateString(date) });
      router.push({ pathname: "/bus/trip/[rideId]", params: { rideId: String(ride.id), routeId: String(routeId), routeTitle: routeTitle ?? "" } } as any);
    } catch (e) {
      handleApiError(e, t);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color={colors.text.primary} /></TouchableOpacity>
        <Text style={s.title}>{routeTitle || "Schedule"}</Text>
      </View>
      {isLoading ? <LoadingIndicator /> : (
        <FlatList
          data={departures ?? []}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>No scheduled departures on this route.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`bus.departure.${item.id}`} style={s.card} activeOpacity={0.7} onPress={() => onPickDate(item.id)}>
              <Text style={s.time}>{item.timeOfDay}</Text>
              <View style={s.botRow}>
                {item.vehicle ? <Text style={s.vehicle}>{item.vehicle.make} {item.vehicle.model}</Text> : <Text style={s.vehicle} />}
                <Text style={s.price}>{formatCurrency(Math.round(item.fare * 100))}</Text>
              </View>
              <Text style={s.pick}>Tap to pick a date</Text>
            </TouchableOpacity>
          )}
        />
      )}
      {pendingDepartureId != null && (
        <DateTimePicker value={new Date()} mode="date" minimumDate={new Date()} display={Platform.OS === "ios" ? "inline" : "default"} onChange={onDateChosen} />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    appBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.md, color: colors.text.primary },
    list: { padding: spacing.lg, gap: spacing.md },
    empty: { fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center", marginTop: spacing.xxxl },
    card: { gap: spacing.sm, padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    time: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
    botRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    vehicle: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.tertiary },
    price: { fontFamily: "Jost_700Bold", fontSize: fontSize.sm, color: colors.primary },
    pick: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.xs, color: colors.primary },
  });
