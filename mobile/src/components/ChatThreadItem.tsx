import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Avatar } from "@/components/ui/Avatar";
import { ChatThread } from "@/lib/types";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export function ChatThreadItem({ thread }: { thread: ChatThread }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const otherParticipant = thread.users.find((p) => p.id !== user?.id) || thread.users[0];

  return (
    <TouchableOpacity style={s.container} onPress={() => router.push(`/chat/${thread.id}`)}>
      <Avatar
        firstName={otherParticipant?.firstName || ""}
        lastName={otherParticipant?.lastName || ""}
        imageUrl={otherParticipant?.profileImage?.url}
        size={48}
      />
      <View style={s.content}>
        <View style={s.topRow}>
          <Text style={s.name}>{otherParticipant?.firstName} {otherParticipant?.lastName}</Text>
          {thread.lastMessage && (
            <Text style={s.time}>{new Date(thread.lastMessage.createdAt).toLocaleDateString()}</Text>
          )}
        </View>
        <Text style={s.preview} numberOfLines={1}>{thread.lastMessage?.content || "No messages yet"}</Text>
      </View>
      {thread.unreadCount > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{thread.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  content: { flex: 1, gap: spacing.xs },
  topRow: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  time: { fontSize: fontSize.xs, color: colors.text.tertiary },
  preview: { fontSize: fontSize.sm, color: colors.text.secondary },
  badge: { backgroundColor: colors.primary, borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: colors.text.inverse, fontSize: fontSize.xs, fontWeight: "700" },
});
