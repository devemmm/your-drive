// mobile/src/app/bus/[operatorId]/routes.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useOperatorRoutes } from "@/hooks/useBus";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";
import { formatCurrency } from "@/lib/utils";

export default function OperatorRoutesScreen() {
  const { operatorId, operatorName } = useLocalSearchParams<{ operatorId: string; operatorName?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data: routes, isLoading } = useOperatorRoutes(operatorId);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>{operatorName || "Routes"}</Text>
      </View>
      {isLoading ? (
        <LoadingIndicator />
      ) : (
        <FlatList
          data={routes ?? []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>No routes available yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`bus.route.${item.id}`}
              style={s.card}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/bus/route/[routeId]/trips",
                  params: { routeId: String(item.id), routeTitle: `${item.originCity} → ${item.destCity}` },
                } as any)
              }
            >
              <View style={s.cardTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.route}>{item.originCity} → {item.destCity}</Text>
                  <Text style={s.meta}>{item.distanceKm} km · {item.stops.length} stops</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.from}>from</Text>
                  <Text style={s.price}>{formatCurrency(Math.round(parseFloat(item.basePrice) * 100))}</Text>
                </View>
              </View>
              <View style={s.cardBottom}>
                <Text style={s.viewTrips}>View trips</Text>
                <ChevronRight size={18} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    appBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
    list: { padding: spacing.lg, gap: spacing.md },
    empty: { fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center", marginTop: spacing.xxxl },
    card: { gap: spacing.md, padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    route: { fontFamily: "Jost_700Bold", fontSize: fontSize.md, color: colors.text.primary },
    meta: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    from: { fontFamily: "Jost_500Medium", fontSize: 10, color: colors.text.tertiary },
    price: { fontFamily: "Jost_700Bold", fontSize: fontSize.sm, color: colors.primary },
    cardBottom: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 2, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm },
    viewTrips: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.xs, color: colors.primary },
  });
