import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, borderRadius, ColorPalette } from "@/lib/theme";

interface Props {
  secondsRemaining: number;
}

export function CountdownRing({ secondsRemaining }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const urgent = secondsRemaining <= 5;

  return (
    <View
      testID="driverHome.countdown"
      style={[s.ring, urgent ? s.ringUrgent : null]}
    >
      <Text style={[s.text, urgent ? s.textUrgent : null]}>
        {secondsRemaining}s
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  ring: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ringUrgent: {
    borderColor: colors.error,
    backgroundColor: colors.error,
  },
  text: { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  textUrgent: { color: colors.text.inverse },
});
