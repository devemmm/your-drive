import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageCircle } from "lucide-react-native";
import { useChatThreads } from "@/hooks/useChat";
import { ChatThreadItem } from "@/components/ChatThreadItem";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ChatThread } from "@/lib/types";
import { useTheme } from "@/providers/ThemeProvider";
import { ColorPalette } from "@/lib/theme";

export default function ChatScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading } = useChatThreads();
  const threads = data?.data ?? [];

  const renderItem = useCallback(
    ({ item }: { item: ChatThread }) => <ChatThreadItem thread={item} />,
    []
  );

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      <ScreenHeader title="Messages" variant="root" />

      {isLoading ? (
        <LoadingIndicator fullScreen />
      ) : threads.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={48} color={colors.text.tertiary} />}
          title="No conversations yet"
          subtitle="Your messages will appear here once you start chatting."
        />
      ) : (
        <FlatList
          data={threads}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 80 },
});
