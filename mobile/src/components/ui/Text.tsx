import React from "react";
import { Text, TextProps, TextStyle, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize as fontSizeTokens } from "@/lib/theme";

type Weight = 400 | 500 | 600 | 700;
type SizeKey = keyof typeof fontSizeTokens;

interface ThemedTextProps extends TextProps {
  weight?: Weight;
  size?: SizeKey;
}

const FAMILY_BY_WEIGHT: Record<Weight, string> = {
  400: "Jost_400Regular",
  500: "Jost_500Medium",
  600: "Jost_600SemiBold",
  700: "Jost_700Bold",
};

export function ThemedText({ weight = 400, size, style, ...rest }: ThemedTextProps) {
  const { colors, fontsLoaded } = useTheme();
  const family = fontsLoaded ? FAMILY_BY_WEIGHT[weight] : "System";
  const base: TextStyle = {
    fontFamily: family,
    color: colors.text.primary,
    ...(size ? { fontSize: fontSizeTokens[size] } : undefined),
  };
  return <Text {...rest} style={StyleSheet.flatten([base, style])} />;
}
