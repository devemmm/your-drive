import React, { useCallback, useEffect, useMemo } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChatMessages, useChatSocket, useMarkThreadRead, useSendMessage, useChatThreads } from "@/hooks/useChat";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { handleApiError } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ChatMessage } from "@/lib/types";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { spacing, ColorPalette } from "@/lib/theme";

export default function ChatThreadScreen() {
  const { threadId, from } = useLocalSearchParams<{ threadId: string; from?: string }>();
  const router = useRouter();
  const { user } = useAuthContext();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const handleBack = useCallback(() => {
    if (from) {
      router.replace(from as any);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/chat" as any);
  }, [from, router]);

  const { data: messagesData, isLoading } = useChatMessages(threadId);
  const { data: threadsData } = useChatThreads();
  useChatSocket(threadId);
  const sendMessage = useSendMessage();
  const markRead = useMarkThreadRead();
  const requireAuth = useRequireAuth();

  const messages = messagesData?.data ?? [];
  const thread = threadsData?.data.find((t) => String(t.id) === threadId);
  const otherParticipant = thread?.users?.find((p) => p.id !== user?.id) || thread?.users?.[0];

  useEffect(() => {
    if (threadId) {
      markRead.mutate(threadId);
    }
  }, [threadId]);

  function handleSend(text: string) {
    // auth-gated
    requireAuth(
      async () => {
        try {
          await sendMessage.mutateAsync({ threadId, content: text });
        } catch (error: any) {
          handleApiError(error, t);
        }
      },
      { reason: "Sign in to chat" },
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble message={item} isOwn={Number(item.senderId) === user?.id} />
    ),
    [user?.id]
  );

  const participantName = otherParticipant
    ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
    : "Chat";

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScreenHeader title={participantName} onBack={handleBack} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <LoadingIndicator fullScreen />
        ) : (
          <FlatList
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            inverted
            contentContainerStyle={s.messageList}
          />
        )}
        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  messageList: { padding: spacing.md, paddingBottom: spacing.lg },
});
