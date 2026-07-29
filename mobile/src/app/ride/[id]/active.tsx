import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useRideDetail, useCompleteRide } from "@/hooks/useRides";
import { useReportTrip } from "@/hooks/useReports";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { ActiveRideMap } from "@/components/ActiveRideMap";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ReportTripModal } from "@/components/ReportTripModal";
import { CheckCircle2, Flag } from "lucide-react-native";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

function computeEta(estimatedArrivalTime: string | null): string {
  if (!estimatedArrivalTime) return "—";
  const arrival = new Date(estimatedArrivalTime);
  const now = new Date();
  const diffMinutes = Math.max(0, Math.round((arrival.getTime() - now.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return `${hours}h ${mins}m`;
}

export default function ActiveRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const ar = useMemo(() => makeStyles(colors), [colors]);
  const { data: ride, isLoading } = useRideDetail(id!, { refetchInterval: 5000 });
  const reportTrip = useReportTrip();
  const completeRide = useCompleteRide();
  const requireAuth = useRequireAuth();
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !ride) return;
    if (ride.status === "ONGOING") return;

    // Driver ends the ride or it's already completed: passenger lands on the
    // review screen, driver goes back to the ride detail (rating themselves
    // makes no sense).
    if (ride.status === "COMPLETED") {
      const viewerIsDriverNow = user?.id === ride.driver.id;
      router.replace(viewerIsDriverNow ? `/ride/${id}` : (`/ride/${id}/complete` as any));
      return;
    }

    Alert.alert(
      "Ride hasn't started yet",
      "The driver hasn't started this ride yet. You'll be taken back to the ride details.",
      [{ text: "OK", onPress: () => router.replace(`/ride/${id}`) }]
    );
  }, [isLoading, ride, user?.id, id, router]);

  if (isLoading || !ride) return <LoadingIndicator fullScreen />;

  if (ride.status !== "ONGOING") {
    return (
      <View style={ar.waitingContainer}>
        <View style={ar.waitingContent}>
          <View style={ar.waitingDot} />
          <Text style={ar.waitingTitle}>Waiting for the driver to start the ride</Text>
          <Text style={ar.waitingSubtext}>
            {ride.departureLocation.locationName} → {ride.destinationLocation.locationName}
          </Text>
          <Button
            title="Back to Ride Details"
            variant="secondary"
            onPress={() => router.replace(`/ride/${id}`)}
            style={ar.backButton}
          />
        </View>
      </View>
    );
  }

  const myBooking = ride.bookings?.find((b) => b.userId === user?.id);
  const attendanceCode = myBooking?.bookingSeats?.[0]?.attendanceCode || myBooking?.attendanceCode || "------";

  const viewerIsDriver = user?.id === ride.driver.id;
  // For a driver: the "other party" is the first booked passenger. For a
  // passenger: it's the driver. ride.bookings already filters server-side to
  // APPROVED bookings, but guard against the driver-owns-a-booking edge case.
  const passengerBooking = ride.bookings?.find((b) => b.userId !== ride.driver.id);
  const reportSubjectId = viewerIsDriver ? passengerBooking?.userId : ride.driver.id;
  const reportLabel = viewerIsDriver ? "passenger" : "driver";

  async function handleReport(reason: string) {
    if (!ride || !reportSubjectId) return;
    try {
      await reportTrip.mutateAsync({
        target: { rideId: ride.id },
        subjectUserId: reportSubjectId,
        reason,
      });
      setReportOpen(false);
      Alert.alert("Thanks", "Your report has been sent to the admin team.");
    } catch (err: unknown) {
      Alert.alert("Could not send report", err instanceof Error ? err.message : "Please try again.");
    }
  }

  function confirmEndRide() {
    if (!ride) return;
    Alert.alert(
      "End this ride?",
      "Mark the trip as completed. Payment and ratings will be processed.",
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "End ride",
          style: "destructive",
          onPress: async () => {
            try {
              await completeRide.mutateAsync(ride.id);
              router.replace(`/ride/${ride.id}` as any);
            } catch (err: unknown) {
              Alert.alert(
                "Could not end ride",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <View style={ar.container} testID="rideActive.screen">
      <ActiveRideMap origin={ride.departureLocation} destination={ride.destinationLocation} />
      <View style={ar.sheet}>
        <View style={ar.statusRow}><View style={ar.statusDot} /><Text style={ar.statusText}>{t("rides.rideInProgress")}</Text></View>
        <View style={ar.driverRow}>
          <Avatar firstName={ride.driver.firstName} lastName={ride.driver.lastName ?? ""} imageUrl={ride.driver.profileImage?.url} size={40} />
          <View><Text style={ar.driverName} testID="rideActive.driverName">{ride.driver.firstName}{ride.driver.lastName ? ` ${ride.driver.lastName.charAt(0)}.` : ""}</Text><Text style={ar.vehicleInfo}>{ride.vehicle.make} {ride.vehicle.model} · {ride.vehicle.plateNumber}</Text></View>
        </View>
        <View style={ar.etaBox}>
          <Text style={ar.etaText} testID="rideActive.eta">Arriving in {computeEta(ride.estimatedArrivalTime)}</Text>
          <Text style={ar.routeText}>{ride.departureLocation.locationName} → {ride.destinationLocation.locationName}</Text>
        </View>
        {viewerIsDriver ? (
          <Button
            title="End ride"
            variant="primary"
            size="md"
            // auth-gated
            onPress={() =>
              requireAuth(confirmEndRide, { reason: "Sign in to end this ride" })
            }
            loading={completeRide.isPending}
            icon={<CheckCircle2 size={18} color={colors.text.inverse} />}
            testID="rideActive.endButton"
          />
        ) : null}
        {reportSubjectId ? (
          <Button
            title={`Report ${reportLabel}`}
            variant="destructive"
            size="md"
            // auth-gated
            onPress={() =>
              requireAuth(() => setReportOpen(true), {
                reason: "Sign in to file a report",
              })
            }
            icon={<Flag size={18} color={colors.text.inverse} />}
            testID="rideActive.reportButton"
          />
        ) : null}
      </View>
      <ReportTripModal
        visible={reportOpen}
        loading={reportTrip.isPending}
        subjectName={viewerIsDriver ? `the ${reportLabel}` : ride.driver.firstName ?? `the ${reportLabel}`}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReport}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sheet: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, padding: spacing.xl, gap: spacing.lg, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  statusText: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  driverRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  driverName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  vehicleInfo: { fontSize: fontSize.sm, color: colors.text.secondary },
  etaBox: { backgroundColor: colors.primaryLight, padding: spacing.lg, borderRadius: borderRadius.lg },
  etaText: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  routeText: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
  codeSection: { alignItems: "center", gap: spacing.md },
  codeLabel: { fontSize: fontSize.sm, color: colors.text.secondary },
  codeRow: { flexDirection: "row", gap: spacing.sm },
  codeDigit: { width: 40, height: 48, borderRadius: borderRadius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  codeDigitText: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary },
  waitingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: spacing.xxxl },
  waitingContent: { alignItems: "center", gap: spacing.lg },
  waitingDot: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, borderWidth: 3, borderColor: colors.primary },
  waitingTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary, textAlign: "center" },
  waitingSubtext: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center" },
  backButton: { marginTop: spacing.sm, width: "100%" },
});
