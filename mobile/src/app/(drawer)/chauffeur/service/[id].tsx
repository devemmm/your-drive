import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MapPin, Calendar, Clock, Inbox, Flag, Phone } from "lucide-react-native";
import {
  useChauffeurServiceDetail,
  useAcceptChauffeur,
  useDeclineChauffeur,
  useCancelChauffeur,
} from "@/hooks/useChauffeur";
import { useReportTrip } from "@/hooks/useReports";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthContext } from "@/providers/AuthProvider";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReportTripModal } from "@/components/ReportTripModal";
import { formatCurrency, formatDate, formatTime, handleApiError } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import type { ChauffeurService, ChauffeurStatus } from "@/lib/types";

const getStatusColor = (colors: ColorPalette): Record<ChauffeurStatus, string> => ({
  REQUESTED: colors.warning,
  ACCEPTED: colors.primary,
  ACTIVE: colors.primary,
  COMPLETED: colors.text.tertiary,
  DECLINED: colors.error,
  CANCELLED: colors.error,
  DISPUTED: colors.error,
});

function getStatusLabel(status: ChauffeurStatus, viewerIsDriver: boolean): string {
  switch (status) {
    case "REQUESTED":
      return viewerIsDriver ? "Pending your response" : "Awaiting driver response";
    case "ACCEPTED":
      return "Accepted";
    case "ACTIVE":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "DECLINED":
      return "Declined";
    case "CANCELLED":
      return "Cancelled";
    case "DISPUTED":
      return "Disputed";
  }
}

export default function ChauffeurServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const STATUS_COLOR = useMemo(() => getStatusColor(colors), [colors]);
  const { data, isLoading, error } = useChauffeurServiceDetail(id);
  const acceptMutation = useAcceptChauffeur();
  const declineMutation = useDeclineChauffeur();
  const cancelMutation = useCancelChauffeur();
  const reportTrip = useReportTrip();
  const requireAuth = useRequireAuth();
  const [reportOpen, setReportOpen] = useState(false);

  const service: ChauffeurService | undefined = data?.data;

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="Chauffeur Request" />
        <LoadingIndicator fullScreen />
      </SafeAreaView>
    );
  }

  if (error || !service) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="Chauffeur Request" />
        <View style={s.emptyWrap}>
          <EmptyState
            icon={<Inbox size={48} color={colors.text.tertiary} />}
            title="Request not found"
            subtitle="This chauffeur request may have been removed or you no longer have access to it."
          />
          <View style={s.backBtnWrap}>
            <Button title="Go back" onPress={() => router.back()} variant="secondary" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const viewerIsDriver = user?.id === service.driverId;

  // Driver can accept/decline a pending request.
  const canDriverRespond =
    viewerIsDriver && service.status === "REQUESTED";
  // Passenger can cancel/withdraw their own request at any point before
  // the service starts.
  const canPassengerCancel =
    !viewerIsDriver &&
    (service.status === "REQUESTED" || service.status === "ACCEPTED");

  const anyPending =
    acceptMutation.isPending ||
    declineMutation.isPending ||
    cancelMutation.isPending;

  async function handleAccept() {
    try {
      await acceptMutation.mutateAsync(service!.id);
      Alert.alert(
        "Request accepted",
        "The client will be notified.",
        [{ text: "OK" }]
      );
    } catch (err) {
      handleApiError(err, t);
    }
  }

  async function handleDecline() {
    Alert.alert(
      "Decline request?",
      "The client will be notified and this request will be closed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              await declineMutation.mutateAsync(service!.id);
              Alert.alert(
                "Request declined",
                "The client has been notified.",
                [{ text: "OK" }]
              );
            } catch (err) {
              handleApiError(err, t);
            }
          },
        },
      ]
    );
  }

  async function handlePassengerCancel() {
    const confirmMessage =
      service!.status === "REQUESTED"
        ? "Your request will be withdrawn and the driver notified."
        : "The driver will be notified and the booking cancelled.";
    Alert.alert("Cancel this request?", confirmMessage, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelMutation.mutateAsync(service!.id);
            Alert.alert("Request cancelled", "", [{ text: "OK" }]);
          } catch (err) {
            handleApiError(err, t);
          }
        },
      },
    ]);
  }

  // The "other party" is the one the viewer is looking AT — if the viewer is
  // the driver, they're looking at the passenger, and vice versa.
  const otherParty = viewerIsDriver ? service.passenger : service.driver;
  const otherPartyLabel = viewerIsDriver ? "Passenger" : "Driver";

  // Report only makes sense once the booking is real (accepted/active/completed/disputed).
  const canReport =
    service.status === "ACCEPTED" ||
    service.status === "ACTIVE" ||
    service.status === "COMPLETED" ||
    service.status === "DISPUTED";

  async function handleReport(reason: string) {
    try {
      await reportTrip.mutateAsync({
        target: { chauffeurServiceId: service!.id },
        subjectUserId: otherParty.id,
        reason,
      });
      setReportOpen(false);
      Alert.alert("Thanks", "Your report has been sent to the admin team.");
    } catch (err: unknown) {
      Alert.alert(
        "Could not send report",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Chauffeur Request" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Status badge */}
        <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[service.status] + "20" }]}>
          <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[service.status] }]} />
          <Text style={[s.statusText, { color: STATUS_COLOR[service.status] }]}>
            {getStatusLabel(service.status, viewerIsDriver)}
          </Text>
        </View>

        {/* Other party */}
        <Card style={s.card}>
          <Text style={s.sectionLabel}>{otherPartyLabel}</Text>
          <View style={s.partyRow}>
            <Avatar
              firstName={otherParty.firstName ?? ""}
              lastName={otherParty.lastName ?? ""}
              imageUrl={otherParty.profileImage?.url}
              size={56}
            />
            <View style={s.partyInfo}>
              <Text style={s.partyName}>
                {otherParty.firstName} {otherParty.lastName ?? ""}
              </Text>
              {otherParty.averageRating != null ? (
                <Text style={s.partyRating}>
                  {otherParty.averageRating.toFixed(1)} ★ · {otherParty.totalRatings} ratings
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Schedule */}
        <Card style={s.card}>
          <Text style={s.sectionLabel}>Schedule</Text>
          <View style={s.row}>
            <Calendar size={18} color={colors.text.secondary} />
            <View style={s.rowText}>
              <Text style={s.rowLabel}>Start</Text>
              <Text style={s.rowValue}>
                {formatDate(service.startDate)} · {formatTime(service.startDate)}
              </Text>
            </View>
          </View>
          <View style={s.row}>
            <Clock size={18} color={colors.text.secondary} />
            <View style={s.rowText}>
              <Text style={s.rowLabel}>End</Text>
              <Text style={s.rowValue}>
                {formatDate(service.endDate)} · {formatTime(service.endDate)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Pricing */}
        <Card style={s.card}>
          <Text style={s.sectionLabel}>Pricing</Text>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>
              {service.serviceType === "HOURLY" ? "Hourly service" : "Daily service"}
            </Text>
            <Text style={s.priceAmount}>
              {formatCurrency(Math.round(parseFloat(service.totalAmount) * 100))}
            </Text>
          </View>
        </Card>

        {/* Locations */}
        {(service.pickupLocation || service.dropoffLocation) && (
          <Card style={s.card}>
            <Text style={s.sectionLabel}>Locations</Text>
            {service.pickupLocation ? (
              <View style={s.row}>
                <MapPin size={18} color={colors.primary} />
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>Pickup</Text>
                  <Text style={s.rowValue}>{service.pickupLocation.locationName}</Text>
                  {service.pickupNotes ? (
                    <Text style={s.rowNotes}>{service.pickupNotes}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {service.dropoffLocation ? (
              <View style={s.row}>
                <MapPin size={18} color={colors.text.secondary} />
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>Drop-off</Text>
                  <Text style={s.rowValue}>{service.dropoffLocation.locationName}</Text>
                  {service.dropoffNotes ? (
                    <Text style={s.rowNotes}>{service.dropoffNotes}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </Card>
        )}

        {/* Driver actions — accept/decline a pending request */}
        {canDriverRespond ? (
          <View style={s.actions}>
            <Button
              title="Accept request"
              onPress={() =>
                requireAuth(() => void handleAccept(), {
                  reason: "Sign in to respond to this request",
                })
              }
              loading={acceptMutation.isPending}
              disabled={anyPending}
            />
            <Button
              title="Decline"
              onPress={() =>
                requireAuth(() => void handleDecline(), {
                  reason: "Sign in to respond to this request",
                })
              }
              variant="secondary"
              loading={declineMutation.isPending}
              disabled={anyPending}
            />
          </View>
        ) : null}

        {/* Passenger action — cancel own request at any point before service starts */}
        {canPassengerCancel ? (
          <View style={s.actions}>
            <Button
              title={
                service.status === "REQUESTED"
                  ? "Cancel request"
                  : "Cancel booking"
              }
              onPress={() =>
                requireAuth(() => void handlePassengerCancel(), {
                  reason: "Sign in to manage this booking",
                })
              }
              variant="secondary"
              loading={cancelMutation.isPending}
              disabled={anyPending}
            />
          </View>
        ) : null}

        {canReport && otherParty.phoneNumber ? (
          <Button
            title={`Call ${otherPartyLabel.toLowerCase()}`}
            variant="secondary"
            size="md"
            onPress={() => Linking.openURL(`tel:${otherParty.phoneNumber}`)}
            icon={<Phone size={18} color={colors.primary} />}
            testID="chauffeurService.callButton"
          />
        ) : null}

        {canReport ? (
          <Button
            title={`Report ${otherPartyLabel.toLowerCase()}`}
            variant="destructive"
            size="md"
            onPress={() => setReportOpen(true)}
            icon={<Flag size={18} color={colors.text.inverse} />}
            testID="chauffeurService.reportButton"
          />
        ) : null}
      </ScrollView>
      <ReportTripModal
        visible={reportOpen}
        loading={reportTrip.isPending}
        subjectName={otherParty.firstName ?? otherPartyLabel.toLowerCase()}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReport}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  emptyWrap: { flex: 1, justifyContent: "center" },
  backBtnWrap: { padding: spacing.xl },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: fontSize.sm, fontWeight: "700" },
  card: { gap: spacing.md },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  partyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  partyInfo: { flex: 1, gap: 2 },
  partyName: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  partyRating: { fontSize: fontSize.sm, color: colors.text.secondary },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    paddingVertical: spacing.xs,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: fontSize.xs, color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.3 },
  rowValue: { fontSize: fontSize.md, color: colors.text.primary, fontWeight: "500" },
  rowNotes: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: fontSize.md, color: colors.text.secondary },
  priceAmount: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.primary },
  actions: { gap: spacing.md, marginTop: spacing.md },
});
