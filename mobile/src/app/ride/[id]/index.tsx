import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useRideDetail, useBookRide, useStartRide, useCancelRide } from "@/hooks/useRides";
import { useCancelBooking, useApproveBooking } from "@/hooks/useBookings";
import type { Booking } from "@/lib/types";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookingSummary } from "@/components/BookingSummary";
import { TicketQr } from "@/components/TicketQr";
import { CancelReasonModal } from "@/components/CancelReasonModal";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { formatDate, formatTime, handleApiError } from "@/lib/utils";
import { ensurePushPermission } from "@/lib/permissions";
import { ArrowLeft, Star, Shield, Snowflake, CigaretteOff, Luggage, CheckCircle, Car, MessageCircle, Phone } from "lucide-react-native";
import { useChatThreadByRideId } from "@/hooks/useChat";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { queryKeys } from "@/lib/constants";

type CancelContext =
  | null
  | { kind: "myBooking" }
  | { kind: "ride" }
  | { kind: "declineBooking"; bookingId: number };

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const rd = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();
  // Poll briefly in test mode so puppet-driven server state changes
  // (e.g. /test/bookings/:id/approve) reflect in the UI without manual refresh.
  // Also poll when the ride is ONGOING so passengers viewing the detail screen
  // auto-route to the rating screen when the driver ends the trip.
  const testMode = process.env.EXPO_PUBLIC_TEST_MODE === "1";
  const { data: ride, isLoading } = useRideDetail(id!, {
    refetchInterval: testMode ? 2000 : 5000,
  });
  const bookMutation = useBookRide();
  const cancelBookingMutation = useCancelBooking();
  const approveBookingMutation = useApproveBooking();
  const startRideMutation = useStartRide();
  const cancelRideMutation = useCancelRide();
  const [cancelContext, setCancelContext] = useState<CancelContext>(null);
  const chatThread = useChatThreadByRideId(ride?.id);
  const requireAuth = useRequireAuth();

  const viewerIsDriverEarly =
    !!ride && user?.id != null && ride.driver?.id === user.id;
  useEffect(() => {
    if (!ride) return;
    // Passenger viewing this screen when the driver ends the ride should
    // auto-route to the rating screen (mirrors the active screen behaviour).
    if (ride.status === "COMPLETED" && !viewerIsDriverEarly) {
      router.replace(`/ride/${ride.id}/complete` as any);
    }
  }, [ride?.status, viewerIsDriverEarly, ride?.id, router]);

  if (isLoading || !ride) return <LoadingIndicator fullScreen />;

  const viewerIsDriver = user?.id != null && ride.driver?.id === user.id;
  const myBooking = viewerIsDriver
    ? undefined
    : ride.bookings?.find((b) => b.userId === user?.id);
  const attendanceCode = myBooking?.bookingSeats?.[0]?.attendanceCode || myBooking?.attendanceCode;
  const seatsBooked = (ride.totalSeats ?? 0) - (ride.availableSeats ?? 0);

  async function handleBook() {
    try {
      await bookMutation.mutateAsync({ rideId: ride!.id, seats: 1 });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rides.detail(String(ride!.id)) });
      // Just-in-time push permission request after first successful booking.
      // void: don't block success flow on user's permission decision;
      // ensurePushPermission stores the "asked before" flag to avoid re-prompting.
      void ensurePushPermission();
      Alert.alert("Booking Confirmed", "Your seat has been reserved. You can track the ride when it starts.");
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  async function handleCancelConfirm(reason: string) {
    if (!cancelContext) return;
    try {
      if (cancelContext.kind === "myBooking") {
        if (!myBooking) return;
        await cancelBookingMutation.mutateAsync({
          bookingId: String(myBooking.id),
          reason,
        });
        setCancelContext(null);
        Alert.alert("Booking Cancelled", "Your booking has been cancelled.");
      } else if (cancelContext.kind === "declineBooking") {
        await cancelBookingMutation.mutateAsync({
          bookingId: String(cancelContext.bookingId),
          reason,
        });
        setCancelContext(null);
        Alert.alert("Passenger declined", "The passenger has been notified.");
      } else if (cancelContext.kind === "ride") {
        await cancelRideMutation.mutateAsync({ rideId: ride!.id, reason });
        setCancelContext(null);
        Alert.alert("Ride cancelled", "All passengers have been notified.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  async function handleStartRide() {
    Alert.alert(
      "Start ride?",
      "Passengers will be notified that the ride is starting.",
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Start",
          onPress: async () => {
            try {
              await startRideMutation.mutateAsync(ride!.id);
              // Cache shape is the wrapped ApiResponse — { success, data: Ride } —
              // and useRideDetail's `select` reads `data.status`. Seed the
              // nested field so the active screen's mount-time effect sees
              // ONGOING from the first render and doesn't bounce us back.
              queryClient.setQueryData(
                queryKeys.rides.detail(String(ride!.id)),
                (prev: any) =>
                  prev?.data
                    ? { ...prev, data: { ...prev.data, status: "ONGOING" } }
                    : prev,
              );
              router.replace(`/ride/${ride!.id}/active` as any);
            } catch (error: any) {
              handleApiError(error, t);
            }
          },
        },
      ]
    );
  }

  async function handleApproveBooking(bookingId: number) {
    try {
      await approveBookingMutation.mutateAsync(bookingId);
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  function bookingStatusColor(status: string): string {
    switch (status) {
      case "APPROVED": return colors.success;
      case "PENDING": return colors.warning;
      case "CANCELLED": return colors.error;
      default: return colors.text.secondary;
    }
  }

  return (
    <SafeAreaView style={rd.container}>
      <ScrollView contentContainerStyle={rd.content}>
        <TouchableOpacity onPress={() => router.back()} style={rd.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
          <Text style={rd.backLabel}>{t("rides.rideDetails")}</Text>
        </TouchableOpacity>

        {viewerIsDriver && (
          <Card style={rd.driverBanner} testID="ride.driverBanner">
            <View style={rd.bookingHeader}>
              <Car size={20} color={colors.primary} />
              <Text style={rd.bookingTitle}>Your Ride</Text>
              <Text style={[rd.bookingStatus, { color: colors.primary }]}>{ride.status}</Text>
            </View>
            <Text style={rd.bookingSubtext}>
              {seatsBooked} of {ride.totalSeats} {ride.totalSeats === 1 ? "seat" : "seats"} booked.
              {" "}Departs {formatDate(ride.departureTime)} at {formatTime(ride.departureTime)}.
            </Text>
            {ride.status === "PUBLISHED" && (
              <>
                <Button
                  title="Start ride"
                  // auth-gated
                  onPress={() =>
                    requireAuth(() => void handleStartRide(), {
                      reason: "Sign in to start this ride",
                    })
                  }
                  loading={startRideMutation.isPending}
                  style={rd.trackBtn}
                  testID="ride.startRideButton"
                />
                <Button
                  title="Cancel ride"
                  variant="destructive"
                  // auth-gated
                  onPress={() =>
                    requireAuth(() => setCancelContext({ kind: "ride" }), {
                      reason: "Sign in to cancel this ride",
                    })
                  }
                  style={rd.cancelBtn}
                  testID="ride.cancelRideButton"
                />
              </>
            )}
            {ride.status === "ONGOING" && (
              <>
                <Button
                  title="Track Ride"
                  onPress={() => router.push(`/ride/${ride.id}/active` as any)}
                  style={rd.trackBtn}
                />
                <Button
                  title="View Manifest"
                  onPress={() => router.push(`/ride/${ride.id}/manifest` as any)}
                  testID="ride.viewManifestButton"
                />
              </>
            )}
            {ride.status === "COMPLETED" && (
              <Button
                title="Find ride requests"
                onPress={() => router.replace("/" as any)}
                style={rd.trackBtn}
                testID="ride.findRequestsButton"
              />
            )}
          </Card>
        )}

        {myBooking && (
          <Card style={rd.bookingBanner} testID="ride.bookingBanner">
            <View style={rd.bookingHeader}>
              <CheckCircle size={20} color={colors.success} />
              <Text style={rd.bookingTitle}>Booking </Text>
              <Text
                testID="ride.bookingStatus"
                style={[rd.bookingStatus, { color: bookingStatusColor(myBooking.status) }]}
              >
                {myBooking.status}
              </Text>
            </View>
            <View testID="ride.attendanceQr">
              {myBooking.bookingSeats && myBooking.bookingSeats.length > 0
                ? myBooking.bookingSeats.map((seat, index) =>
                    seat.attendanceCode ? (
                      <TicketQr key={index} attendanceCode={seat.attendanceCode} />
                    ) : null
                  )
                : myBooking.attendanceCode
                ? <TicketQr attendanceCode={myBooking.attendanceCode} />
                : null}
            </View>
            {myBooking.status === "APPROVED" && ride.status === "PUBLISHED" && (
              <Text style={rd.bookingSubtext}>
                Your seat is confirmed. The ride departs on {formatDate(ride.departureTime)} at {formatTime(ride.departureTime)}.
              </Text>
            )}
            {myBooking.status === "APPROVED" && ride.status === "PUBLISHED" ? (
              <View style={rd.contactRow}>
                <Button
                  title={t("rides.chatDriver")}
                  variant="secondary"
                  size="md"
                  onPress={async () => {
                    const from = encodeURIComponent(`/ride/${id}`);
                    if (chatThread) {
                      router.push(`/chat/${chatThread.id}?from=${from}` as any);
                      return;
                    }
                    // Cache may be stale — the backend auto-creates threads
                    // when bookings/rides land, but if we never refetched the
                    // threads list since then, our local data is empty.
                    await queryClient.refetchQueries({
                      queryKey: queryKeys.chat.threads,
                    });
                    const fresh = queryClient.getQueryData<{
                      data: Array<{ id: number; rideId: number }>;
                    }>(queryKeys.chat.threads);
                    const found = fresh?.data?.find((t) => t.rideId === ride.id);
                    if (found) {
                      router.push(`/chat/${found.id}?from=${from}` as any);
                    } else {
                      Alert.alert(
                        "Chat",
                        "Chat thread isn't ready yet — try again in a moment.",
                      );
                    }
                  }}
                  icon={<MessageCircle size={18} color={colors.primary} />}
                  style={{ flex: 1 }}
                  testID="ride.chatDriverButton"
                />
                <Button
                  title={t("rides.callDriver")}
                  variant="secondary"
                  size="md"
                  disabled={!ride.driver?.phoneNumber}
                  onPress={async () => {
                    const phone = ride.driver?.phoneNumber;
                    if (!phone) return;
                    const url = `tel:${phone}`;
                    try {
                      const ok = await Linking.canOpenURL(url);
                      if (!ok) {
                        Alert.alert("Calls not supported", "This device can't place phone calls.");
                        return;
                      }
                      await Linking.openURL(url);
                    } catch {
                      Alert.alert("Couldn't start the call", "Please try again.");
                    }
                  }}
                  icon={<Phone size={18} color={colors.primary} />}
                  style={{ flex: 1 }}
                  testID="ride.callDriverButton"
                />
              </View>
            ) : null}
            {myBooking.status === "PENDING" && ride.status === "PUBLISHED" && (
              <Text style={rd.bookingSubtext}>
                Your booking is pending confirmation. The driver will confirm your seat soon.
              </Text>
            )}
            {ride.status === "ONGOING" && (
              <Button
                title="Track Ride"
                onPress={() => router.push(`/ride/${ride.id}/active`)}
                style={rd.trackBtn}
              />
            )}
            {myBooking.status !== "CANCELLED" && ride.status === "PUBLISHED" && (
              <Button
                title="Cancel Booking"
                variant="destructive"
                // auth-gated
                onPress={() =>
                  requireAuth(() => setCancelContext({ kind: "myBooking" }), {
                    reason: "Sign in to cancel your booking",
                  })
                }
                style={rd.cancelBtn}
                testID="ride.cancelBookingButton"
              />
            )}
          </Card>
        )}

        {!viewerIsDriver && (
          <Card>
            <View style={rd.driverRow}>
              <Avatar firstName={ride.driver.firstName ?? ""} lastName={ride.driver.lastName ?? ""} imageUrl={ride.driver.profileImage?.url} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={rd.driverName}>
                  {ride.driver.firstName}{ride.driver.lastName ? ` ${ride.driver.lastName.charAt(0)}.` : ""}
                </Text>
                <Text style={rd.driverMeta}>
                  {ride.driver.averageRating != null ? ride.driver.averageRating.toFixed(1) : "New"} · {ride.driver.totalRatings ?? 0} ratings
                </Text>
                {ride.driver.createdAt && (
                  <Text style={rd.driverMeta}>{t("rides.memberSince", { date: formatDate(ride.driver.createdAt, "MMM yyyy") })}</Text>
                )}
              </View>
            </View>
          </Card>
        )}

        {viewerIsDriver && (
          <PassengersSection
            bookings={ride.bookings ?? []}
            // auth-gated
            onApprove={(bookingId) =>
              requireAuth(() => handleApproveBooking(bookingId), {
                reason: "Sign in to approve this passenger",
              })
            }
            // auth-gated
            onDecline={(bookingId) =>
              requireAuth(
                () => setCancelContext({ kind: "declineBooking", bookingId }),
                { reason: "Sign in to decline this passenger" },
              )
            }
            isMutating={
              approveBookingMutation.isPending || cancelBookingMutation.isPending
            }
            styles={rd}
          />
        )}
        <Card>
          <View style={rd.routePoint}>
            <View style={[rd.dot, { backgroundColor: colors.primary }]} />
            <View><Text style={rd.cityName}>{ride.departureLocation.locationName}</Text><Text style={rd.routeMeta}>{formatTime(ride.departureTime)} · {ride.departureLocation.address}</Text></View>
          </View>
          <View style={rd.routePoint}>
            <View style={[rd.dot, { backgroundColor: colors.error }]} />
            <View><Text style={rd.cityName}>{ride.destinationLocation.locationName}</Text><Text style={rd.routeMeta}>{ride.estimatedArrivalTime ? formatTime(ride.estimatedArrivalTime) : ""} · Est. arrival</Text></View>
          </View>
        </Card>
        {ride.vehicle && (
          <Card>
            <Text style={rd.vehicleText}>{ride.vehicle.make} {ride.vehicle.model} - {ride.vehicle.color}</Text>
            <Text style={rd.vehiclePlate}>{ride.vehicle.plateNumber}</Text>
          </Card>
        )}
        {ride.preferences && (
          <View style={rd.prefsRow}>
            {ride.preferences.airConditioning && (
              <View style={rd.prefItem}><Snowflake size={14} color={colors.primary} /><Text style={rd.prefText}>AC</Text></View>
            )}
            {!ride.preferences.smoking && (
              <View style={rd.prefItem}><CigaretteOff size={14} color={colors.primary} /><Text style={rd.prefText}>No Smoking</Text></View>
            )}
            {ride.preferences.luggageSize && (
              <View style={rd.prefItem}><Luggage size={14} color={colors.primary} /><Text style={rd.prefText}>{ride.preferences.luggageSize}</Text></View>
            )}
          </View>
        )}
        {!viewerIsDriver && !myBooking && (
          <BookingSummary pricePerSeat={ride.contribution} seats={1} platformFee={350} />
        )}
      </ScrollView>
      {!viewerIsDriver && !myBooking && (
        <View style={rd.footer}>
          <Button
            title={t("rides.bookThisRide")}
            onPress={() =>
              requireAuth(() => void handleBook(), {
                reason: "Sign in to reserve a seat",
              })
            }
            loading={bookMutation.isPending}
            testID="ride.bookButton"
          />
        </View>
      )}
      <CancelReasonModal
        visible={cancelContext !== null}
        loading={
          cancelBookingMutation.isPending || cancelRideMutation.isPending
        }
        onClose={() => setCancelContext(null)}
        onConfirm={handleCancelConfirm}
      />
    </SafeAreaView>
  );
}

function PassengersSection({
  bookings,
  onApprove,
  onDecline,
  isMutating,
  styles: rd,
}: {
  bookings: Booking[];
  onApprove: (bookingId: number) => void;
  onDecline: (bookingId: number) => void;
  isMutating: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  // Hide bookings that are no longer relevant on the driver's view.
  const visible = bookings.filter(
    (b) =>
      b.status === "PENDING" ||
      b.status === "APPROVED" ||
      b.status === "COMPLETED"
  );

  if (visible.length === 0) {
    return (
      <Card>
        <Text style={rd.passengersLabel}>Passengers</Text>
        <Text style={rd.passengersEmpty}>
          No bookings yet. Your ride is still open to passengers.
        </Text>
      </Card>
    );
  }

  return (
    <Card testID="ride.passengers.list">
      <Text style={rd.passengersLabel}>
        Passengers ({visible.length})
      </Text>
      {visible.map((booking) => (
        <View key={booking.id} style={rd.passengerRow} testID={`ride.passenger.${booking.id}.row`}>
          <Avatar
            firstName={booking.booker?.firstName ?? "—"}
            lastName=""
            imageUrl={booking.booker?.profileImage?.url}
            size={40}
          />
          <View style={rd.passengerInfo}>
            <Text style={rd.passengerName} numberOfLines={1}>
              {booking.booker?.firstName ?? "Unknown"}
            </Text>
            <Text style={rd.passengerMeta} testID={`ride.passenger.${booking.id}.status`}>
              {booking.seats} {booking.seats === 1 ? "seat" : "seats"} ·{" "}
              {booking.status}
            </Text>
          </View>
          {booking.status === "PENDING" ? (
            <View style={rd.passengerActions}>
              <Button
                testID={`ride.passenger.${booking.id}.approveButton`}
                size="sm"
                variant="primary"
                title="Approve"
                onPress={() => onApprove(booking.id)}
                disabled={isMutating}
              />
              <Button
                testID={`ride.passenger.${booking.id}.declineButton`}
                size="sm"
                variant="destructive"
                title="Decline"
                onPress={() => onDecline(booking.id)}
                disabled={isMutating}
              />
            </View>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  backBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  backLabel: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text.primary },
  driverRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  driverName: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  driverMeta: { fontSize: fontSize.xs, color: colors.text.secondary },
  routePoint: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", paddingVertical: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  cityName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  routeMeta: { fontSize: fontSize.sm, color: colors.text.secondary },
  vehicleText: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  vehiclePlate: { fontSize: fontSize.sm, color: colors.text.secondary },
  prefsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  prefItem: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryLight, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  prefText: { fontSize: 12, color: colors.primary, fontWeight: "500" },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  bookingBanner: { backgroundColor: colors.primaryLight, gap: spacing.sm },
  driverBanner: { backgroundColor: colors.primaryLight, gap: spacing.sm },
  bookingHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bookingTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  bookingStatus: { fontSize: fontSize.md, fontWeight: "700" },
  bookingSubtext: { fontSize: fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
  attendanceRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
  attendanceLabel: { fontSize: fontSize.sm, color: colors.text.secondary },
  attendanceCode: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text.primary, letterSpacing: 2 },
  trackBtn: { marginTop: spacing.sm },
  cancelBtn: { marginTop: spacing.xs },
  contactRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  passengersLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  passengersEmpty: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontStyle: "italic",
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  passengerMeta: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: 2 },
  passengerActions: { flexDirection: "row", gap: spacing.xs },
});
