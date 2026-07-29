import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export function NetworkBanner({ isConnected }: { isConnected: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const nbStyles = useMemo(() => makeStyles(colors), [colors]);
  if (isConnected) return null;
  return (
    <View style={nbStyles.banner}>
      <Text style={nbStyles.text}>{t("common.offline")}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  banner: { backgroundColor: colors.error, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  text: { color: colors.text.inverse, fontSize: fontSize.sm, fontWeight: "600" },
});
