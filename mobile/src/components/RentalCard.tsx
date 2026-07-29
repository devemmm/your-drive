import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Car, Star } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ThemedText } from "@/components/ui/Text";
import { RentalVehicleListing } from "@/lib/types";
import { formatCurrency, getVehicleImageUrl } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export function RentalCard({ vehicle }: { vehicle: RentalVehicleListing }) {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const validImage = getVehicleImageUrl(vehicle);

  const dailyRate = vehicle.dailyRate ? parseFloat(vehicle.dailyRate) : null;
  const hourlyRate = vehicle.hourlyRate ? parseFloat(vehicle.hourlyRate) : null;

  return (
    <TouchableOpacity testID="rental.listItem" onPress={() => router.push(`/rental/${vehicle.id}`)}>
      <Card style={s.card}>
        {validImage ? (
          <Image source={{ uri: validImage }} style={s.image} contentFit="cover" transition={200} />
        ) : (
          <View style={s.imagePlaceholder}>
            <Car size={40} color={colors.text.tertiary} />
          </View>
        )}
        <View style={s.content}>
          <View style={s.titleRow}>
            <ThemedText style={s.vehicleName} weight={700}>{vehicle.year} {vehicle.make} {vehicle.model}</ThemedText>
            <Badge label={vehicle.category} variant="muted" />
          </View>
          {vehicle.user && (
            <View style={s.ownerRow}>
              <Avatar
                firstName={vehicle.user.firstName}
                lastName={vehicle.user.lastName ?? ""}
                imageUrl={vehicle.user.profileImage?.url}
                size={28}
              />
              <ThemedText style={s.ownerName}>{vehicle.user.firstName} {vehicle.user.lastName ?? ""}</ThemedText>
              {vehicle.user.averageRating != null && (
                <View style={s.ratingRow}>
                  <Star size={12} color={colors.star} fill={colors.star} />
                  <ThemedText style={s.rating} weight={600}>{vehicle.user.averageRating.toFixed(1)}</ThemedText>
                </View>
              )}
            </View>
          )}
          <View style={s.priceRow}>
            {dailyRate != null && (
              <ThemedText style={s.price} weight={700}>{formatCurrency(Math.round(dailyRate * 100))}<ThemedText style={s.priceUnit}>/day</ThemedText></ThemedText>
            )}
            {hourlyRate != null && (
              <ThemedText style={s.priceSecondary}>{formatCurrency(Math.round(hourlyRate * 100))}/hr</ThemedText>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: { padding: 0, overflow: "hidden" },
  image: { width: "100%", height: 160, backgroundColor: colors.surface },
  imagePlaceholder: { width: "100%", height: 160, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.md, gap: spacing.sm },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehicleName: { fontSize: fontSize.md, color: colors.text.primary, flex: 1, marginRight: spacing.sm },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ownerName: { fontSize: fontSize.sm, color: colors.text.secondary, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  rating: { fontSize: fontSize.xs, color: colors.text.secondary },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.md },
  price: { fontSize: fontSize.lg, color: colors.primary },
  priceUnit: { fontSize: fontSize.sm, color: colors.text.secondary },
  priceSecondary: { fontSize: fontSize.sm, color: colors.text.secondary },
});
