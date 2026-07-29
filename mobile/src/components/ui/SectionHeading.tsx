import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "start" | "center";
}

export function SectionHeading({ title, subtitle, align = "center" }: SectionHeadingProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors, align), [colors, align]);
  return (
    <View style={s.container}>
      <ThemedText weight={700} style={s.title}>{title}</ThemedText>
      <View testID="sectionHeading.accentBar" style={s.bar} />
      {subtitle ? <ThemedText style={s.subtitle}>{subtitle}</ThemedText> : null}
    </View>
  );
}

const makeStyles = (colors: ColorPalette, align: "start" | "center") =>
  StyleSheet.create({
    container: { alignItems: align === "center" ? "center" : "flex-start", gap: 10 },
    title: { fontSize: fontSize.h2, color: colors.text.primary, textAlign: align === "center" ? "center" : "left" },
    bar: { width: 60, height: 3, borderRadius: 2, backgroundColor: colors.primary },
    subtitle: { fontSize: 13, color: colors.text.secondary, textAlign: align === "center" ? "center" : "left" },
  });
