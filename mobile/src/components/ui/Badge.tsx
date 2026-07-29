import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

interface BadgeProps {
  label: string;
  variant?: "primary" | "outline" | "muted";
}

export function Badge({ label, variant = "primary" }: BadgeProps) {
  const { colors } = useTheme();
  const bStyles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[bStyles.badge, bStyles[variant]]}>
      <ThemedText weight={700} style={[bStyles.text, bStyles[`${variant}Text`]]}>
        {label}
      </ThemedText>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: borderRadius.full, alignSelf: "flex-start" },
    primary: { backgroundColor: colors.primaryLight },
    outline: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    muted: { backgroundColor: colors.surface },
    text: { fontSize: 11 },
    primaryText: { color: colors.primaryDark },
    outlineText: { color: colors.text.secondary },
    mutedText: { color: colors.text.secondary },
  });
