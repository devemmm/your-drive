import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { ColorPalette } from "@/lib/theme";

interface CheckboxProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  testID?: string;
  accessibilityLabel?: string;
}

export function Checkbox({ value, onValueChange, testID, accessibilityLabel }: CheckboxProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[styles.box, value && styles.boxChecked]}
    >
      {value ? <Check size={16} color={colors.text.inverse} strokeWidth={3} /> : <View />}
    </Pressable>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  box: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.background,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
});
