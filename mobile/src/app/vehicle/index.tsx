import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Car, Plus } from "lucide-react-native";
import { useMyVehicles } from "@/hooks/useVehicles";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { Vehicle } from "@/lib/types";
import { getVehicleImageUrl } from "@/lib/utils";
import { Image } from "expo-image";

function VehicleCard({ vehicle, onPress, colors, styles: s }: { vehicle: Vehicle; onPress: () => void; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  const validUrl = getVehicleImageUrl(vehicle);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={s.card}>
        <View style={s.imageWrap}>
          {validUrl ? (
            <Image source={{ uri: validUrl }} style={s.vehicleImage} contentFit="cover" />
          ) : (
            <View style={s.imagePlaceholder}>
              <Car size={32} color={colors.text.tertiary} />
            </View>
          )}
        </View>
        <View style={s.cardInfo}>
          <View style={s.cardRow}>
            <Text style={s.vehicleName} numberOfLines={1}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </Text>
            <Badge label={vehicle.category} variant="primary" />
          </View>
          <View style={s.cardMeta}>
            <Text style={s.metaText}>{vehicle.color}</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.metaText}>{vehicle.plateNumber}</Text>
            <Text style={s.dot}>·</Text>
            <Text style={s.metaText}>{vehicle.capacity} seats</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function VehicleListScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data: vehicles, isLoading } = useMyVehicles();
  const requireAuth = useRequireAuth();

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="My Vehicles" />

      {isLoading ? (
        <LoadingIndicator fullScreen />
      ) : (
        <FlatList
          data={vehicles ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <VehicleCard
              vehicle={item}
              onPress={() => router.push(`/vehicle/${item.id}` as any)}
              colors={colors}
              styles={s}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Car size={56} color={colors.text.tertiary} />}
              title="No vehicles yet"
              subtitle="Add your first vehicle to start offering rides"
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        // auth-gated
        onPress={() =>
          requireAuth(() => router.push("/vehicle/add" as any), {
            reason: "Sign in to add a vehicle",
          })
        }
        activeOpacity={0.85}
      >
        <Plus size={22} color={colors.text.inverse} />
        <Text style={s.fabText}>Add Vehicle</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: 100 },
  card: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  imageWrap: { width: 72, height: 72, borderRadius: borderRadius.lg, overflow: "hidden" },
  vehicleImage: { width: 72, height: 72 },
  imagePlaceholder: { width: 72, height: 72, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: spacing.xs },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  vehicleName: { flex: 1, fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  metaText: { fontSize: fontSize.xs, color: colors.text.secondary },
  dot: { color: colors.text.tertiary, fontSize: fontSize.xs },
  fab: { position: "absolute", bottom: spacing.xxxl, right: spacing.xl, left: spacing.xl, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: borderRadius.xl, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.inverse },
});
