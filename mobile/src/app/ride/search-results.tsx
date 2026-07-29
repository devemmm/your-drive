import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList } from "react-native";
import { useTranslation } from "react-i18next";
import { usePublicRides } from "@/hooks/useRides";
import { RideResultCard } from "@/components/RideResultCard";
import { FilterBar } from "@/components/FilterBar";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Ride, RideSearchParams } from "@/lib/types";
import { ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export default function SearchResultsScreen() {
  const params = useLocalSearchParams<{
    originCity?: string;
    destinationCity?: string;
    departureTime?: string;
    departureIso?: string;
    passengers?: string;
    vehicleCategory?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sr = useMemo(() => makeStyles(colors), [colors]);
  const [rideType, setRideType] = useState<"P2P" | "D2D">("P2P");

  const departureMs = params.departureTime ? Number(params.departureTime) : undefined;
  const departureDateObj = params.departureIso
    ? new Date(params.departureIso)
    : departureMs
      ? new Date(departureMs)
      : null;
  const headerWhen = departureDateObj
    ? `${departureDateObj.toLocaleDateString()} ${departureDateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";

  const searchParams: RideSearchParams = {
    originCity: params.originCity,
    destinationCity: params.destinationCity,
    departureTime: departureMs,
    passengers: params.passengers ? parseInt(params.passengers) : undefined,
    rideType,
    vehicleCategory: params.vehicleCategory,
  };

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePublicRides(searchParams);
  const rides = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const renderItem = useCallback(
    ({ item }: { item: Ride }) => <RideResultCard ride={item} />,
    []
  );

  return (
    <SafeAreaView style={sr.container}>
      <View style={sr.header}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color={colors.text.primary} /></TouchableOpacity>
        <View>
          <Text style={sr.title}>{params.originCity || "Any"} → {params.destinationCity || "Any"}</Text>
          <Text style={sr.subtitle}>{headerWhen} · {params.passengers || 1} passenger</Text>
        </View>
      </View>
      <FilterBar activeType={rideType} onTypeChange={setRideType} />
      <Text style={sr.count}>{t("rides.ridesFound", { count: rides.length })}</Text>
      {isLoading ? (
        <View style={sr.loadingWrap}>
          <LoadingIndicator />
        </View>
      ) : (
        <FlatList
          testID="search.list"
          style={sr.list}
          data={rides}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={sr.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <LoadingIndicator /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  back: { fontSize: fontSize.xxl, color: colors.text.primary },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.sm, color: colors.text.secondary },
  count: { fontSize: fontSize.sm, color: colors.text.secondary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  list: { flex: 1 },
  listContent: { padding: spacing.lg },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
});
