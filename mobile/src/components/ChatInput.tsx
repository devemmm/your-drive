import React, { useMemo, useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SendHorizontal } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

export function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState("");

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <View style={s.container}>
      <TextInput
        style={s.input}
        placeholder="Type a message..."
        placeholderTextColor={colors.text.tertiary}
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        returnKeyType="send"
        multiline
      />
      <TouchableOpacity onPress={handleSend} style={s.sendBtn}>
        <SendHorizontal size={22} color={text.trim() ? colors.primary : colors.text.tertiary} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text.primary, maxHeight: 100 },
  sendBtn: { padding: spacing.sm, paddingBottom: spacing.md },
});
