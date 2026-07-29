import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { ThemedText } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Ride } from "@/lib/types";
import { formatCurrency, formatTime } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export function RideResultCard({ ride }: { ride: Ride }) {
  const router = useRouter();
  const { colors } = useTheme();
  const rc = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity testID={`search.resultCard.${ride.id}`} onPress={() => router.push(`/ride/${ride.id}`)}>
      <Card style={rc.card}>
        <View style={rc.header}>
          <View style={rc.driverInfo}>
            <Avatar firstName={ride.driver.firstName} lastName={ride.driver.lastName ?? ""} imageUrl={ride.driver.profileImage?.url} size={40} />
            <View>
              <ThemedText weight={600} style={rc.driverName}>{ride.driver.firstName}{ride.driver.lastName ? ` ${ride.driver.lastName.charAt(0)}.` : ""}</ThemedText>
              <ThemedText style={rc.rating}>{ride.driver.averageRating?.toFixed(1) || "New"} · {ride.driver.totalRatings ?? 0} ratings</ThemedText>
            </View>
          </View>
          <ThemedText weight={700} style={rc.price}>{formatCurrency(Math.round(ride.contribution * 100))}</ThemedText>
        </View>
        <View style={rc.times}>
          <ThemedText weight={600} style={rc.time}>{formatTime(ride.departureTime)}</ThemedText>
          <View style={rc.timeLine} />
          <ThemedText weight={600} style={rc.time}>{ride.estimatedArrivalTime ? formatTime(ride.estimatedArrivalTime) : "—"}</ThemedText>
        </View>
        <View style={rc.footer}>
          <ThemedText style={rc.seats}>{ride.availableSeats} seat{ride.availableSeats !== 1 ? "s" : ""} left</ThemedText>
          <Badge label={ride.type} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  driverInfo: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  driverName: { fontSize: fontSize.md, color: colors.text.primary },
  rating: { fontSize: fontSize.xs, color: colors.text.secondary },
  price: { fontSize: fontSize.lg, color: colors.primary },
  times: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  time: { fontSize: fontSize.md, color: colors.text.primary },
  timeLine: { flex: 1, height: 1, backgroundColor: colors.border },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seats: { fontSize: fontSize.sm, color: colors.text.secondary },
});
