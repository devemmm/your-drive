// mobile/src/components/bus/OperatorListView.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Bus, Star, ChevronRight, Search } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";
import type { BusOperator } from "@/lib/types";

export function OperatorListView({
  operators,
  onSelect,
}: {
  operators: BusOperator[];
  onSelect: (operatorId: number) => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => operators.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase())),
    [operators, query]
  );

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Bus operators</Text>
      <Text style={s.subtitle}>Choose an operator to see its routes & trips</Text>
      <View style={s.search}>
        <Search size={18} color={colors.text.tertiary} />
        <TextInput
          testID="bus.operatorSearch"
          value={query}
          onChangeText={setQuery}
          placeholder="Search operators"
          placeholderTextColor={colors.text.tertiary}
          style={s.searchInput}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o.id)}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`bus.operator.${item.id}`}
            style={s.row}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
          >
            <View style={s.logo}>
              <Bus size={22} color={colors.primary} />
            </View>
            <View style={s.mid}>
              <Text style={s.name}>{item.name}</Text>
              <View style={s.metaRow}>
                <Star size={13} color={colors.star} />
                <Text style={s.meta}>{item.rating ?? "—"}</Text>
                <Text style={s.dot}>·</Text>
                <Text style={s.meta}>{item.routeCount} routes</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: { flex: 1, gap: spacing.md },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
    subtitle: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      height: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.primary },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.card,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logo: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    mid: { flex: 1, gap: 3 },
    name: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.sm, color: colors.text.primary },
    metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    meta: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    dot: { color: colors.text.tertiary },
  });
