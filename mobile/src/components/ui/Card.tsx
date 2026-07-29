import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, spacing, ColorPalette } from "@/lib/theme";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  testID?: string;
}

export function Card({ children, style, elevated = false, testID }: CardProps) {
  const { colors } = useTheme();
  const cStyles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[cStyles.card, elevated && cStyles.elevated, style]} testID={testID}>
      {children}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elevated: {
      borderWidth: 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  });
