import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Modal, TouchableOpacity } from "react-native";
import { MapPin, Users, Clock } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CountdownRing } from "./CountdownRing";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { RideRequest } from "@/hooks/useRideRequests";
import { formatRideRoute } from "@/utils/formatRideRoute";

interface Props {
  request: RideRequest;
  vehicleLabel: string | null;
  secondsRemaining: number;
  onChangeVehicle: () => void;
  onAccept: () => void;
  onCounter: () => void;
  onSkip: () => void;
  acceptDisabled?: boolean;
  acceptPending?: boolean;
}

export function FocusedRideRequestSheet({
  request,
  vehicleLabel,
  secondsRemaining,
  onChangeVehicle,
  onAccept,
  onCounter,
  onSkip,
  acceptDisabled,
  acceptPending,
}: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const fare = request.proposedFare ? parseFloat(request.proposedFare) : 0;
  const when = request.timeWindowStart ?? request.date;
  const route = formatRideRoute(request);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onSkip}
      testID="driverHome.focusedSheet"
    >
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.headerRow}>
            <Avatar
              firstName={request.user?.firstName ?? "?"}
              lastName={request.user?.lastName ?? ""}
              imageUrl={request.user?.profileImage?.url}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.passenger}>
                {request.user?.firstName} {request.user?.lastName}
              </Text>
              {request.user?.averageRating != null && (
                <Text style={s.meta}>
                  ★ {request.user.averageRating.toFixed(1)} · {request.user.totalRatings} trips
                </Text>
              )}
            </View>
            <CountdownRing secondsRemaining={secondsRemaining} />
          </View>

          <ScrollView style={{ maxHeight: 200 }}>
            <View style={s.routeRow}>
              <MapPin size={14} color={colors.primary} />
              <Text style={s.routeText}>{route.from}</Text>
            </View>
            <View style={s.routeRow}>
              <MapPin size={14} color={colors.error} />
              <Text style={s.routeText}>{route.to}</Text>
            </View>

            <View style={s.footerRow}>
              <View style={s.footerItem}>
                <Clock size={14} color={colors.text.tertiary} />
                <Text style={s.footerText}>{formatDate(when)} · {formatTime(when)}</Text>
              </View>
              <View style={s.footerItem}>
                <Users size={14} color={colors.text.tertiary} />
                <Text style={s.footerText}>{request.seats} seat{request.seats > 1 ? "s" : ""}</Text>
              </View>
            </View>

            {fare > 0 && (
              <Text style={s.fare}>
                {formatCurrency(Math.round(fare * 100))}
              </Text>
            )}

            <TouchableOpacity
              testID="driverHome.changeVehicle"
              onPress={onChangeVehicle}
              activeOpacity={0.7}
              style={s.vehicleRow}
            >
              <Text style={s.vehicleText}>
                Vehicle: {vehicleLabel ?? "Choose vehicle"} · Change
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={{ gap: spacing.sm }}>
            <Button
              testID="driverHome.accept"
              title={`Accept${fare > 0 ? ` · ${formatCurrency(Math.round(fare * 100))}` : ""}`}
              onPress={onAccept}
              disabled={acceptDisabled || acceptPending}
              loading={acceptPending}
            />
            <Button
              testID="driverHome.counter"
              title="Counter-offer"
              variant="secondary"
              onPress={onCounter}
              disabled={acceptPending}
            />
            <TouchableOpacity
              testID="driverHome.skip"
              onPress={onSkip}
              activeOpacity={0.7}
              disabled={acceptPending}
            >
              <Text style={s.skip}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: "85%",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  passenger: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  meta: { fontSize: fontSize.xs, color: colors.text.tertiary },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  routeText: { flex: 1, fontSize: fontSize.sm, color: colors.text.primary },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: fontSize.xs, color: colors.text.tertiary },
  fare: {
    marginTop: spacing.md,
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.primary,
  },
  vehicleRow: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vehicleText: { fontSize: fontSize.sm, color: colors.text.primary },
  skip: {
    textAlign: "center",
    paddingVertical: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: "600",
  },
});
