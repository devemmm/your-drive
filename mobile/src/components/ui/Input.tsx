import React, { useMemo, useState } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, fontSize, spacing, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}

export function Input({ label, error, icon, rightIcon, isPassword = false, ...props }: InputProps) {
  const { colors, fontsLoaded } = useTheme();
  const iStyles = useMemo(() => makeStyles(colors), [colors]);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View style={iStyles.container}>
      {label && (
        <ThemedText weight={600} style={iStyles.label}>
          {label}
        </ThemedText>
      )}
      <View style={[iStyles.inputWrapper, error && iStyles.inputError]}>
        {icon && <View style={iStyles.iconLeft}>{icon}</View>}
        <TextInput
          style={[iStyles.input, fontsLoaded && { fontFamily: "Jost_400Regular" }]}
          placeholderTextColor={colors.text.secondary}
          secureTextEntry={isPassword && !showPassword}
          autoCorrect={isPassword ? false : undefined}
          autoCapitalize={isPassword ? "none" : undefined}
          textContentType={isPassword ? "oneTimeCode" : undefined}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThemedText weight={500} style={iStyles.toggleText}>
              {showPassword ? "Hide" : "Show"}
            </ThemedText>
          </TouchableOpacity>
        )}
        {rightIcon && <View style={iStyles.iconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <ThemedText style={iStyles.error}>{error}</ThemedText>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: { width: "100%" },
    label: { fontSize: 14, color: colors.text.primary, marginBottom: spacing.xs },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingVertical: 0,
      height: 52,
    },
    inputError: { borderColor: colors.error },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.text.primary,
      paddingVertical: 0,
    },
    iconLeft: { marginRight: 10 },
    iconRight: { marginLeft: 10 },
    toggleText: { fontSize: 14, color: colors.primary, marginLeft: spacing.sm },
    error: { fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs },
  });
