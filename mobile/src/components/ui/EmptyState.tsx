import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.container}>
      {icon}
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xxl },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.secondary },
  subtitle: { fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: "center" },
});
