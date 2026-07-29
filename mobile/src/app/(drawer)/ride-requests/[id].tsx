import React, { useCallback, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, BackHandler, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, MapPin, Users, Banknote, CheckCircle2, Ban, X, Navigation, MessageCircle, Phone } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useRideRequest, useCancelRideRequest } from "@/hooks/useRideRequests";
import { useRideDetail } from "@/hooks/useRides";
import { useChatThreadByRideId } from "@/hooks/useChat";
import { useBidsForRequest, useAcceptBid, type BidListItem } from "@/hooks/useBids";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { StarRating } from "@/components/ui/StarRating";
import { formatCurrency, handleApiError } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { formatRideRoute } from "@/utils/formatRideRoute";

export default function RideRequestWaitingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data: request, isLoading, isError } = useRideRequest(id);
  const cancelMutation = useCancelRideRequest();

  const isOpen = request?.status === "OPEN";
  const isClosed = request?.status === "CLOSED";
  const linkedRideId = request?.matches?.[0]?.ride?.id;
  const { data: linkedRide } = useRideDetail(
    linkedRideId ? String(linkedRideId) : "",
    { refetchInterval: linkedRideId ? 5000 : false }
  );
  const chatThread = useChatThreadByRideId(linkedRideId);

  const numericRequestId = request?.id ?? null;
  const { data: bids = [] } = useBidsForRequest(numericRequestId, isOpen);
  const acceptBid = useAcceptBid();
  const requireAuth = useRequireAuth();

  // When the driver starts the trip, auto-navigate to ride detail.
  useEffect(() => {
    if (linkedRide?.status === "ONGOING") {
      // Route to the active tracking screen so the passenger sees the live trip UI
      // AND its built-in completion handler that auto-navigates to /complete (rating)
      // when the driver ends the ride.
      router.replace(`/ride/${linkedRide.id}/active` as any);
    } else if (linkedRide?.status === "COMPLETED") {
      // Fallback in case the passenger is still on this screen when the ride
      // is already completed (e.g., driver ended before passenger ever opened
      // the active screen).
      router.replace(`/ride/${linkedRide.id}/complete` as any);
    }
  }, [linkedRide?.status, linkedRide?.id, router]);

  const confirmCancel = useCallback(() => {
    Alert.alert(
      "Cancel ride request?",
      "Your request will be removed and drivers will no longer see it.",
      [
        { text: "Keep waiting", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelMutation.mutateAsync(Number(id));
              router.replace("/(drawer)" as any);
            } catch (error: any) {
              handleApiError(error, t);
            }
          },
        },
      ]
    );
  }, [id, cancelMutation, router, t]);

  const handleBack = useCallback(() => {
    if (isOpen) {
      confirmCancel();
    } else {
      router.back();
    }
  }, [isOpen, confirmCancel, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isOpen) {
        confirmCancel();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isOpen, confirmCancel]);

  if (isLoading) return <LoadingIndicator fullScreen />;

  if (isError || !request) {
    Alert.alert(
      "Request unavailable",
      "This ride request is no longer available.",
      [{ text: "OK", onPress: () => router.back() }]
    );
    return <LoadingIndicator fullScreen />;
  }

  const proposedFare = request.proposedFare ? parseFloat(request.proposedFare) : 0;
  const agreedFare = linkedRide?.contribution ?? null;
  const fareDisplay = agreedFare != null ? agreedFare : proposedFare;
  const fareLabel = agreedFare != null ? "Agreed fare" : "Your offer";
  const driver = linkedRide?.driver;
  const vehicle = linkedRide?.vehicle;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
          <Text style={s.backLabel}>Ride request</Text>
        </TouchableOpacity>

        {/* ── Status Card ── */}
        <Card style={s.statusCard}>
          {isClosed ? (
            driver ? (
              <>
                <CheckCircle2 size={40} color={colors.success} />
                <Text style={s.statusTitle}>
                  {driver.firstName} accepted your ride
                </Text>
                <Text style={s.statusSubtitle}>
                  Your driver is on the way. You'll be redirected once the trip starts.
                </Text>

                {/* Driver info */}
                <View style={s.driverRow}>
                  <Avatar
                    firstName={driver.firstName ?? ""}
                    lastName={driver.lastName ?? ""}
                    imageUrl={driver.profileImage?.url}
                    size={52}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.driverName}>
                      {driver.firstName} {driver.lastName}
                    </Text>
                    {vehicle && (
                      <Text style={s.vehicleInfo}>
                        {vehicle.make} {vehicle.model} · {vehicle.color}
                      </Text>
                    )}
                    {vehicle?.plateNumber && (
                      <Text style={s.plateNumber}>{vehicle.plateNumber}</Text>
                    )}
                  </View>
                </View>

                <View style={s.onTheWayBadge}>
                  <Navigation size={14} color={colors.primary} />
                  <Text style={s.onTheWayText}>Driver is on their way</Text>
                </View>

                {/* Chat & Call actions */}
                <View style={s.actionRow}>
                  <Button
                    variant="secondary"
                    title="Chat"
                    icon={<MessageCircle size={18} color={colors.primary} />}
                    onPress={() => {
                      if (chatThread) {
                        router.push(`/chat/${chatThread.id}?from=${encodeURIComponent(`/ride-requests/${id}`)}` as any);
                      } else {
                        Alert.alert("Chat", "Chat will be available shortly.");
                      }
                    }}
                    style={{ flex: 1 }}
                  />

                  {driver.phoneNumber ? (
                    <Button
                      variant="secondary"
                      title="Call"
                      icon={<Phone size={18} color={colors.primary} />}
                      onPress={() => Linking.openURL(`tel:${driver.phoneNumber}`)}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <View style={s.statusIconWrap}>
                  <ActivityIndicator size="large" color={colors.success} />
                </View>
                <Text style={s.statusTitle}>Driver accepted!</Text>
                <Text style={s.statusSubtitle}>Loading driver details...</Text>
              </>
            )
          ) : (
            <>
              <View style={s.statusIconWrap}>
                {isOpen ? (
                  <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                  <Ban size={48} color={colors.error} />
                )}
              </View>
              <Text style={s.statusTitle}>
                {isOpen
                  ? "Waiting for a driver"
                  : request.status === "EXPIRED"
                  ? "Request expired"
                  : request.status}
              </Text>
              <Text style={s.statusSubtitle}>
                {isOpen
                  ? "Your ride request is being shown to nearby drivers."
                  : request.status === "EXPIRED"
                  ? "No driver accepted within the time window."
                  : ""}
              </Text>
            </>
          )}
        </Card>

        {/* ── Trip details ── */}
        <Card style={s.detailsCard}>
          <View style={s.detailRow}>
            <MapPin size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.detailLabel}>From</Text>
              <Text style={s.detailValue}>
                {formatRideRoute(request).from}
              </Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.detailRow}>
            <MapPin size={18} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={s.detailLabel}>To</Text>
              <Text style={s.detailValue}>
                {formatRideRoute(request).to}
              </Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.detailRow}>
            <Users size={18} color={colors.text.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={s.detailLabel}>Seats</Text>
              <Text style={s.detailValue}>{request.seats}</Text>
            </View>
          </View>
          {fareDisplay > 0 && (
            <>
              <View style={s.divider} />
              <View style={s.detailRow}>
                <Banknote size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.detailLabel}>{fareLabel}</Text>
                  <Text style={[s.detailValue, { color: colors.primary, fontWeight: "700" }]}>
                    {formatCurrency(Math.round(fareDisplay * 100))}
                  </Text>
                </View>
              </View>
            </>
          )}
        </Card>

        {isOpen && (
          <Text style={s.hint}>
            Your request is visible to available drivers nearby. You'll be notified as soon as someone accepts.
          </Text>
        )}

        {isOpen && (
          <View style={s.bidSection}>
            <Text style={s.bidHeader}>Offers ({bids.length})</Text>
            {bids.length === 0 ? (
              <Text style={s.bidEmpty}>
                Drivers will appear here as they offer. You can wait, or cancel.
              </Text>
            ) : (
              bids.map((bid: BidListItem) => (
                <Card key={bid.id} style={s.bidCard}>
                  <View style={s.bidRow}>
                    <Avatar
                      firstName={bid.driver.firstName ?? ""}
                      lastName={bid.driver.lastName ?? ""}
                      imageUrl={bid.driver.profileImage?.url ?? null}
                      size={40}
                    />
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={s.bidName}>
                        {bid.driver.firstName} {bid.driver.lastName ?? ""}
                      </Text>
                      {bid.driver.averageRating != null && (
                        <View style={s.bidRatingRow}>
                          <StarRating
                            rating={bid.driver.averageRating}
                            size={14}
                            interactive={false}
                          />
                          <Text style={s.bidMeta}>· {bid.driver.totalRatings} trips</Text>
                        </View>
                      )}
                      <Text style={s.bidMeta}>
                        {bid.vehicle.make} {bid.vehicle.model}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: spacing.xs }}>
                      <Text style={s.bidAmount}>
                        RWF {Math.round(parseFloat(bid.bidAmount)).toLocaleString()}
                      </Text>
                      <Button
                        title="Accept offer"
                        onPress={() =>
                          requireAuth(
                            async () => {
                              try {
                                await acceptBid.mutateAsync(bid.id);
                                // The screen's existing match-detection effect picks up
                                // the new linkedRideId on the next request poll and
                                // flips to "Driver assigned" view automatically.
                              } catch (err: any) {
                                handleApiError(err, t);
                              }
                            },
                            { reason: "Sign in to book" },
                          )
                        }
                        loading={
                          acceptBid.isPending &&
                          acceptBid.variables === bid.id
                        }
                      />
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* ── Bottom actions ── */}
        {isOpen ? (
          <Button
            title="Cancel request"
            variant="destructive"
            // auth-gated
            onPress={() =>
              requireAuth(confirmCancel, {
                reason: "Sign in to cancel this request",
              })
            }
            loading={cancelMutation.isPending}
            icon={<X size={18} color={colors.text.inverse} />}
          />
        ) : isClosed ? (
          <Button
            title="View ride details"
            onPress={() => {
              if (linkedRideId) {
                router.replace(`/ride/${linkedRideId}` as any);
              } else {
                router.replace("/(drawer)" as any);
              }
            }}
          />
        ) : (
          <Button
            title="Back to home"
            variant="secondary"
            onPress={() => router.replace("/(drawer)" as any)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  backBtn: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  backLabel: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  statusCard: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  statusIconWrap: { height: 64, justifyContent: "center" },
  statusTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary, textAlign: "center" },
  statusSubtitle: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center", paddingHorizontal: spacing.lg },
  detailsCard: { gap: spacing.md },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  detailLabel: { fontSize: fontSize.xs, color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  divider: { height: 1, backgroundColor: colors.border },
  hint: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center", paddingHorizontal: spacing.lg },
  driverRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, width: "100%" },
  driverName: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  vehicleInfo: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  plateNumber: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text.primary, marginTop: 2 },
  onTheWayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  onTheWayText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.primary },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  bidSection: { gap: spacing.md },
  bidHeader: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text.primary,
    paddingHorizontal: spacing.xs,
  },
  bidEmpty: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  bidCard: { padding: spacing.md },
  bidRow: { flexDirection: "row", alignItems: "center" },
  bidName: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  bidRatingRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  bidMeta: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  bidAmount: { fontSize: fontSize.lg, fontWeight: "700", color: colors.primary },
});
