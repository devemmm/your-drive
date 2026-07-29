import React, { useMemo } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { ColorPalette } from "@/lib/theme";

interface LoadingIndicatorProps { fullScreen?: boolean; size?: "small" | "large"; }

export function LoadingIndicator({ fullScreen = false, size = "large" }: LoadingIndicatorProps) {
  const { colors } = useTheme();
  const liStyles = useMemo(() => makeStyles(colors), [colors]);
  if (fullScreen) return <View style={liStyles.fullScreen}><ActivityIndicator size={size} color={colors.primary} /></View>;
  return <ActivityIndicator size={size} color={colors.primary} />;
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  fullScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
