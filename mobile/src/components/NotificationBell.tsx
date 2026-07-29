import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, ColorPalette } from "@/lib/theme";

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export function NotificationBell({
  size = 24,
  color,
}: NotificationBellProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const resolvedColor = color ?? colors.text.secondary;
  const unreadCount = useUnreadNotificationCount();
  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications" as any)}
      activeOpacity={0.7}
      accessibilityLabel="Notifications"
      accessibilityHint={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Open notifications"
      }
      accessibilityRole="button"
    >
      <View style={s.wrap}>
        <Bell size={size} color={resolvedColor} />
        {unreadCount > 0 ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{displayCount}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  wrap: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: "#fff",
    lineHeight: fontSize.xs + 2,
  },
});
