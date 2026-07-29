import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { PaginatedResponse, ChatThread, ChatMessage } from "@/lib/types";
import { queryKeys } from "@/lib/constants";
import { useSocketContext } from "@/providers/SocketProvider";

export function useChatThreads() {
  return useQuery({
    queryKey: queryKeys.chat.threads,
    queryFn: () => api.get<PaginatedResponse<ChatThread>>("/chat/threads"),
  });
}

export function useChatThreadByRideId(rideId: number | undefined) {
  const { data } = useChatThreads();
  if (!rideId || !data) return null;
  const threads = data.data ?? [];
  return threads.find((t) => t.rideId === rideId) ?? null;
}

export function useChatMessages(threadId: string) {
  return useQuery({
    queryKey: queryKeys.chat.messages(threadId),
    queryFn: () => api.get<PaginatedResponse<ChatMessage>>(
      `/chat/threads/${threadId}/messages`,
      { order: "desc" },
    ),
    enabled: !!threadId,
    // Always refetch on screen open so messages that arrived while away show up
    // even if the cached list is <5min old (the global staleTime).
    staleTime: 0,
    refetchOnMount: "always",
    // Socket-fallback poll: catches new messages if the socket drops mid-session.
    refetchInterval: 30_000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      api.post(`/chat/threads/${threadId}/messages`, { content }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.messages(variables.threadId) });
      qc.invalidateQueries({ queryKey: queryKeys.chat.threads });
    },
  });
}

export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => api.post(`/chat/threads/${threadId}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.chat.threads }); },
  });
}

export function useChatSocket(threadId: string | null) {
  const { socket } = useSocketContext();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket || !threadId) return;
    socket.emit("join_thread", { threadId });

    const onNewMessage = () => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.messages(threadId) });
      qc.invalidateQueries({ queryKey: queryKeys.chat.threads });
    };
    const onMessageUpdated = () => { qc.invalidateQueries({ queryKey: queryKeys.chat.messages(threadId) }); };
    const onMessageDeleted = () => { qc.invalidateQueries({ queryKey: queryKeys.chat.messages(threadId) }); };

    socket.on("new_message", onNewMessage);
    socket.on("message_updated", onMessageUpdated);
    socket.on("message_deleted", onMessageDeleted);

    return () => {
      socket.emit("leave_thread", { threadId });
      socket.off("new_message", onNewMessage);
      socket.off("message_updated", onMessageUpdated);
      socket.off("message_deleted", onMessageDeleted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, threadId]);

  const sendViaSocket = useCallback((content: string) => {
    if (!socket || !threadId) return;
    socket.emit("send_message", { threadId, content });
  }, [socket, threadId]);

  return { sendViaSocket };
}
