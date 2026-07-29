import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Calendar } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  onPickPress: () => void;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DateStrip({ value, onChange, onPickPress }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);

  const renderChip = (date: Date, label: string, testID: string) => {
    const selected = sameDay(date, value);
    return (
      <TouchableOpacity
        key={testID}
        testID={selected ? `${testID}.selected` : testID}
        onPress={() => onChange(date)}
        activeOpacity={0.7}
        style={[styles.chip, selected && styles.chipSelected]}
      >
        <Text style={[styles.chipNum, selected && styles.chipNumSelected]}>{date.getDate()}</Text>
        <Text style={[styles.chipLbl, selected && styles.chipLblSelected]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {renderChip(days[0], "Today", "home.dateStrip.today")}
      {renderChip(days[1], "Tomorrow", "home.dateStrip.tomorrow")}
      {days.slice(2).map((d) =>
        renderChip(d, DAY_NAMES[d.getDay()], `home.dateStrip.day.${DAY_NAMES[d.getDay()].toUpperCase()}`)
      )}
      <TouchableOpacity
        testID="home.dateStrip.pick"
        onPress={onPickPress}
        activeOpacity={0.7}
        style={[styles.chip, styles.chipPick]}
      >
        <Calendar size={16} color={colors.text.secondary} />
        <Text style={styles.chipLbl}>Pick</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  row: { gap: spacing.xs, alignItems: "center" },
  chip: {
    width: 64, height: 48, borderRadius: 10,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPick: { backgroundColor: colors.surface, borderStyle: "dashed" },
  chipNum: { color: colors.text.primary, fontSize: fontSize.lg, fontWeight: "700" },
  chipNumSelected: { color: (colors.text as any).inverse ?? "#ffffff" },
  chipLbl: { color: colors.text.secondary, fontSize: (fontSize as any).xs ?? 10 },
  chipLblSelected: { color: (colors.text as any).inverse ?? "#ffffff" },
});
