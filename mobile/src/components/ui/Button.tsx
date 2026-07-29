import React, { useMemo } from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  icon,
  style,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDisabled = disabled || loading;
  const labelColor =
    variant === "primary" || variant === "destructive"
      ? colors.text.inverse
      : colors.primary;
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        variant !== "ghost" && styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          {icon}
          <ThemedText
            weight={600}
            style={[
              styles.text,
              { color: labelColor },
              variant === "ghost" ? styles.ghost_text : styles[`size_${size}_text`],
              icon ? { marginLeft: spacing.sm } : undefined,
            ]}
          >
            {title}
          </ThemedText>
        </>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    base: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.primary },
    ghost: { backgroundColor: "transparent", paddingVertical: 10, paddingHorizontal: 14 },
    destructive: { backgroundColor: colors.error },
    size_sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    size_md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    size_lg: { paddingVertical: 14, paddingHorizontal: 24, minHeight: 50 },
    disabled: { opacity: 0.5 },
    text: { includeFontPadding: false, textAlignVertical: "center" } as TextStyle,
    size_sm_text: { fontSize: fontSize.sm },
    size_md_text: { fontSize: fontSize.md },
    size_lg_text: { fontSize: 15 },
    ghost_text: { fontSize: 13 },
  });
