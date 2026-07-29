import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Star } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ChauffeurDriverListing } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { ThemedText } from "@/components/ui/Text";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

export function ChauffeurCard({ driver }: { driver: ChauffeurDriverListing }) {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity onPress={() => router.push(`/chauffeur/${driver.id}`)}>
      <Card style={s.card}>
        <Avatar
          firstName={driver.firstName}
          lastName={driver.lastName}
          imageUrl={driver.profileImage?.url}
          size={56}
        />
        <View style={s.content}>
          <View style={s.topRow}>
            <ThemedText weight={700} style={s.name}>{driver.firstName} {driver.lastName}</ThemedText>
            {driver.averageRating != null && (
              <View style={s.ratingRow}>
                <Star size={13} color={colors.star} fill={colors.star} />
                <ThemedText weight={600} style={s.rating}>{driver.averageRating.toFixed(1)}</ThemedText>
              </View>
            )}
          </View>
          {driver.chauffeurDescription ? (
            <ThemedText style={s.description} numberOfLines={2}>{driver.chauffeurDescription}</ThemedText>
          ) : null}
          <View style={s.priceRow}>
            {driver.chauffeurDailyRate && (
              <ThemedText weight={700} style={s.price}>{formatCurrency(Math.round(parseFloat(driver.chauffeurDailyRate) * 100))}<ThemedText style={s.priceUnit}>/day</ThemedText></ThemedText>
            )}
            {driver.chauffeurHourlyRate && (
              <ThemedText style={s.priceSecondary}>{formatCurrency(Math.round(parseFloat(driver.chauffeurHourlyRate) * 100))}/hr</ThemedText>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  content: { flex: 1, gap: spacing.xs },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: fontSize.md, color: colors.text.primary, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { fontSize: fontSize.sm, color: colors.text.secondary },
  description: { fontSize: fontSize.sm, color: colors.text.secondary, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.md, marginTop: spacing.xs },
  price: { fontSize: fontSize.md, color: colors.primary },
  priceUnit: { fontSize: fontSize.xs, color: colors.text.secondary },
  priceSecondary: { fontSize: fontSize.sm, color: colors.text.secondary },
});
