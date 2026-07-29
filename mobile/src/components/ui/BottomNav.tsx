import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Home, Route, Inbox, User, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

type IconKey = "home" | "trips" | "inbox" | "profile";
const ICON_MAP: Record<IconKey, LucideIcon> = { home: Home, trips: Route, inbox: Inbox, profile: User };

interface BottomNavItem {
  icon: IconKey;
  label: string;
  active?: boolean;
  onPress: () => void;
}

interface BottomNavProps {
  items: BottomNavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.container}>
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon];
        const tint = item.active ? colors.primary : colors.text.secondary;
        return (
          <TouchableOpacity key={item.label} onPress={item.onPress} style={s.item} activeOpacity={0.7}>
            <Icon size={20} color={tint} />
            <ThemedText weight={600} style={[s.label, { color: tint }]}>{item.label}</ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: borderRadius.nav,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    item: { alignItems: "center", justifyContent: "center", gap: 4, flex: 1 },
    label: { fontSize: 11 },
  });
