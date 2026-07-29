import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MapPin, Users, Clock } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { RideRequest } from "@/hooks/useRideRequests";
import { formatRideRoute } from "@/utils/formatRideRoute";

interface Props {
  request: RideRequest;
  onAccept: () => void;
  onCounter: () => void;
}

export function RideRequestCard({ request, onAccept, onCounter }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const fare = request.proposedFare ? parseFloat(request.proposedFare) : 0;
  const when = request.timeWindowStart ?? request.date;
  const route = formatRideRoute(request);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onAccept}>
      <Card style={s.card}>
        <View style={s.cardHeader}>
          <Avatar
            firstName={request.user?.firstName ?? "?"}
            lastName={request.user?.lastName ?? ""}
            imageUrl={request.user?.profileImage?.url}
            size={40}
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
          {fare > 0 && (
            <View style={s.fareBadge}>
              <Text style={s.fareText}>{formatCurrency(Math.round(fare * 100))}</Text>
            </View>
          )}
        </View>

        <View style={s.routeRow}>
          <MapPin size={14} color={colors.primary} />
          <Text style={s.routeText} numberOfLines={1}>{route.from}</Text>
        </View>
        <View style={s.routeRow}>
          <MapPin size={14} color={colors.error} />
          <Text style={s.routeText} numberOfLines={1}>{route.to}</Text>
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

        <View style={{ gap: spacing.sm }}>
          <Button
            title={`Accept${fare > 0 ? ` · ${formatCurrency(Math.round(fare * 100))}` : ""}`}
            onPress={onAccept}
          />
          <Button title="Counter-offer" variant="secondary" onPress={onCounter} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: { gap: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  passenger: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  meta: { fontSize: fontSize.xs, color: colors.text.tertiary },
  fareBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  fareText: { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  routeText: { flex: 1, fontSize: fontSize.sm, color: colors.text.primary },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: fontSize.xs, color: colors.text.tertiary },
});
