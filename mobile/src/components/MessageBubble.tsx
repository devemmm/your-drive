import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChatMessage } from "@/lib/types";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

export function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.container, isOwn ? s.own : s.other]}>
      <Text style={[s.text, isOwn ? s.ownText : s.otherText]}>{message.content}</Text>
      <Text style={[s.time, isOwn ? s.ownTime : s.otherTime]}>
        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { maxWidth: "75%", padding: spacing.md, borderRadius: borderRadius.lg, marginVertical: spacing.xs },
  own: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  other: { alignSelf: "flex-start", backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  text: { fontSize: fontSize.md },
  ownText: { color: colors.text.inverse },
  otherText: { color: colors.text.primary },
  time: { fontSize: fontSize.xs, marginTop: spacing.xs },
  ownTime: { color: "rgba(255,255,255,0.7)", alignSelf: "flex-end" },
  otherTime: { color: colors.text.tertiary, alignSelf: "flex-start" },
});
