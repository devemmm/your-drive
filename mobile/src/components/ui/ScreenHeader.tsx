import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Menu } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";
import { useOpenDrawer } from "@/providers/DrawerControlProvider";

type Variant = "child" | "root";

interface ScreenHeaderProps {
  title: string;
  /**
   * "root" — header is at the top of a drawer stack, so the leading icon is the
   *          hamburger and tapping it opens the drawer.
   * "child" — header is inside a stack pushed onto a drawer stack, so the
   *           leading icon is a back arrow that pops one screen.
   * Default: "child" (preserves existing call sites).
   */
  variant?: Variant;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, variant = "child", onBack, right }: ScreenHeaderProps) {
  const router = useRouter();
  const openDrawer = useOpenDrawer();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const isRoot = variant === "root";

  const handlePress = () => {
    if (isRoot) {
      openDrawer();
      return;
    }
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  return (
    <View style={s.header}>
      <TouchableOpacity
        testID={isRoot ? "screenHeader.menuButton" : "screenHeader.backButton"}
        onPress={handlePress}
        style={s.iconBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isRoot ? (
          <Menu size={24} color={colors.text.primary} />
        ) : (
          <ArrowLeft size={24} color={colors.text.primary} />
        )}
      </TouchableOpacity>
      <ThemedText weight={700} style={s.title} numberOfLines={1}>
        {title}
      </ThemedText>
      {right || <View style={s.spacer} />}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    iconBtn: { padding: spacing.xs },
    title: { flex: 1, fontSize: fontSize.lg, color: colors.text.primary },
    spacer: { width: 32 },
  });
