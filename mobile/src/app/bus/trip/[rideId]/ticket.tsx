// mobile/src/app/bus/trip/[rideId]/ticket.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, X } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useRideDetail } from "@/hooks/useRides";
import { useAuthContext } from "@/providers/AuthProvider";
import { TicketQr } from "@/components/TicketQr";
import { Button } from "@/components/ui/Button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";

export default function BusTicketScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuthContext();
  const { data: ride, isLoading } = useRideDetail(rideId!, { refetchInterval: 4000 });

  if (isLoading || !ride) return <LoadingIndicator />;

  const myBooking = ride.bookings?.find((b) => String(b.userId) === String(user?.id));
  const seatCodes =
    myBooking?.bookingSeats?.map((bs) => bs.attendanceCode).filter(Boolean) ?? [];
  const codes =
    seatCodes.length > 0
      ? seatCodes
      : myBooking?.attendanceCode
      ? [myBooking.attendanceCode]
      : [];

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => (router as any).dismissAll?.() ?? router.replace("/")}>
          <X size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Your ticket</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <CheckCircle size={44} color={colors.primary} />
        <Text style={s.h1}>Booking confirmed</Text>
        <Text style={s.sub}>Show this QR to the conductor on boarding</Text>
        <View style={s.qrCard}>
          {codes.length ? (
            codes.map((c, i) => <TicketQr key={i} attendanceCode={c as string} />)
          ) : (
            <Text style={s.pending}>Your ticket code will appear here once confirmed.</Text>
          )}
        </View>
        <Button title="View in My Trips" onPress={() => router.replace("/(drawer)/rides" as any)} />
      </ScrollView>
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
    content: { padding: spacing.lg, gap: spacing.md, alignItems: "center" },
    h1: { fontFamily: "Jost_700Bold", fontSize: fontSize.xl, color: colors.text.primary },
    sub: {
      fontFamily: "Jost_500Medium",
      fontSize: fontSize.sm,
      color: colors.text.secondary,
      textAlign: "center",
    },
    qrCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    pending: {
      fontFamily: "Jost_500Medium",
      fontSize: fontSize.sm,
      color: "#6B7280",
      textAlign: "center",
    },
  });
