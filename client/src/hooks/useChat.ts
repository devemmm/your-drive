import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChatService,
  ChatThread,
  ChatMessage,
  MessageRead,
} from "../services/chatService";
import { useSocket } from "../providers/SocketProvider";
import { useAuth } from "../providers/Context/UseAuthContext";
import { notificationManager } from "../utils/notificationUtils";

export const useChat = () => {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const { user } = useAuth();
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [readStatus, setReadStatus] = useState<Map<number, MessageRead[]>>(
    new Map()
  );
  const [markedAsRead, setMarkedAsRead] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get all chat threads with better caching
  const {
    data: threadsData,
    isLoading: isLoadingThreads,
    error: threadsError,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ["chatThreads"],
    queryFn: () => ChatService.getChatThreads(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Get messages for selected thread with React Query
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["chatMessages", selectedThread?.id],
    queryFn: () =>
      selectedThread
        ? ChatService.getThreadMessages(selectedThread.id)
        : Promise.resolve({ data: [] }),
    enabled: !!selectedThread,
    staleTime: 1000, // Consider data fresh for 1 second for faster updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 1, // Only retry once to avoid delays
  });

  const messages = messagesData?.data || [];

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: ({
      threadId,
      content,
    }: {
      threadId: number;
      content: string;
    }) => ChatService.sendMessage(threadId, content),
    onMutate: async ({ threadId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["chatMessages", threadId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData([
        "chatMessages",
        threadId,
      ]);

      // Optimistically update messages
      const optimisticMessage: ChatMessage = {
        id: Date.now(), // Temporary ID
        content,
        threadId,
        senderId: Number(user?.id),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sender: {
          id: Number(user?.id),
          name: user?.name || "",
          email: user?.email || "",
          gender: undefined,
          roles: [user?.role || "passenger"],
          isVerified: false,
          profileImage: user?.profileImage,
        },
      };

      queryClient.setQueryData(["chatMessages", threadId], (old: any) => ({
        data: [...(old?.data || []), optimisticMessage],
      }));

      // Optimistically update threads
      queryClient.setQueryData(["chatThreads"], (old: any) => ({
        data: (old?.data || []).map((thread: ChatThread) =>
          thread.id === threadId
            ? {
                ...thread,
                lastMessage: optimisticMessage,
                unreadCount: thread.unreadCount,
              }
            : thread
        ),
      }));

      return { previousMessages };
    },
    onError: (err, { threadId }, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["chatMessages", threadId],
          context.previousMessages
        );
      }
      toast.error("Failed to send message", {
        className: "custom-error-toast",
      });
    },
    onSettled: (data, error, { threadId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["chatMessages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    },
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: ({
      threadId,
      messageId,
      content,
    }: {
      threadId: number;
      messageId: number;
      content: string;
    }) => ChatService.updateMessage(threadId, messageId, content),
    onSuccess: (data) => {
      // Update message in cache
      queryClient.setQueryData(
        ["chatMessages", data.data.threadId],
        (old: any) => ({
          data: (old?.data || []).map((msg: ChatMessage) =>
            msg.id === data.data.id ? data.data : msg
          ),
        })
      );
      toast.success("Message updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update message", {
        className: "custom-error-toast",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: ({
      threadId,
      messageId,
    }: {
      threadId: number;
      messageId: number;
    }) => ChatService.deleteMessage(threadId, messageId),
    onSuccess: (_, { threadId, messageId }) => {
      // Remove message from cache
      queryClient.setQueryData(["chatMessages", threadId], (old: any) => ({
        data: (old?.data || []).filter(
          (msg: ChatMessage) => msg.id !== messageId
        ),
      }));
      // Remove read status for deleted message
      setReadStatus((prev) => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });
      toast.success("Message deleted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete message", {
        className: "custom-error-toast",
      });
    },
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: ({
      threadId,
      messageIds,
    }: {
      threadId: number;
      messageIds: number[];
    }) => ChatService.markMessagesAsRead(threadId, messageIds),
    onSuccess: (data) => {
      // Update read status in local state
      setReadStatus((prev) => {
        const newMap = new Map(prev);
        data.data.readBy?.forEach((read) => {
          const existing = newMap.get(read.messageId) || [];
          newMap.set(read.messageId, [...existing, read]);
        });
        return newMap;
      });
    },
    onError: (error: any) => {
      console.error("Failed to mark messages as read:", error);
    },
  });

  // Load read status for messages - Disabled due to API issues
  const loadReadStatus = useCallback(
    async (threadId: number, messageIds: number[]) => {
      // Temporarily disabled due to 404 API errors
      // This will be re-enabled once the backend API is fixed
      return;
    },
    []
  );

  // Mark messages as read
  const markMessagesAsRead = useCallback(
    (messageIds: number[]) => {
      if (!selectedThread || !messageIds.length) return;

      // Filter out messages that are already marked as read
      const unmarkedMessageIds = messageIds.filter(
        (id) => !markedAsRead.has(id)
      );

      if (unmarkedMessageIds.length === 0) return;

      // Add to marked set to prevent duplicate requests
      setMarkedAsRead((prev) => new Set([...prev, ...unmarkedMessageIds]));

      // Mark as read via API
      markAsReadMutation.mutate({
        threadId: selectedThread.id,
        messageIds: unmarkedMessageIds,
      });

      // Also emit socket event for real-time updates
      socket.markMessagesAsRead(selectedThread.id, unmarkedMessageIds);
    },
    [selectedThread, markAsReadMutation, socket, markedAsRead]
  );

  // Manual trigger to mark messages as read (call this when user actually views messages)
  const markCurrentMessagesAsRead = useCallback(() => {
    if (!selectedThread || !user) return;

    const unreadMessages = messages.filter((message) => {
      // Don't mark own messages as read
      if (message.senderId === user.id) return false;
      // Don't mark messages that are already marked as read
      if (markedAsRead.has(message.id)) return false;
      return true;
    });

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg.id);
      markMessagesAsRead(messageIds);
    }
  }, [selectedThread, user, messages, markMessagesAsRead, markedAsRead]);

  // Auto-mark messages as read when user views them - Throttled
  const markVisibleMessagesAsRead = useCallback(() => {
    if (!selectedThread || !user) return;

    // Clear existing timeout
    if (markReadTimeoutRef.current) {
      clearTimeout(markReadTimeoutRef.current);
    }

    // Set a new timeout to throttle the requests
    markReadTimeoutRef.current = setTimeout(() => {
      const unreadMessages = messages.filter((message) => {
        // Don't mark own messages as read
        if (message.senderId === user.id) return false;
        // Don't mark messages that are already marked as read
        if (markedAsRead.has(message.id)) return false;
        return true;
      });

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg) => msg.id);
        markMessagesAsRead(messageIds);
      }
    }, 1000); // Throttle to 1 second
  }, [selectedThread, user, messages, markMessagesAsRead, markedAsRead]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Prefetch messages when hovering over a thread
  const prefetchMessages = useCallback(
    (threadId: number) => {
      queryClient.prefetchQuery({
        queryKey: ["chatMessages", threadId],
        queryFn: () => ChatService.getThreadMessages(threadId),
        staleTime: 1000,
        gcTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  // Select a thread and load its messages
  const selectThread = useCallback(
    (thread: ChatThread) => {
      // Clear any pending mark read timeout
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }

      // Reset marked messages for new thread
      setMarkedAsRead(new Set());

      setSelectedThread(thread);

      // Join the thread room for real-time updates
      if (thread.rideId) {
        socket.joinRideThread(thread.rideId);
      }
    },
    [socket]
  );

  // Send a message
  const sendMessage = useCallback(
    (content: string) => {
      if (!selectedThread || !content.trim()) return;

      sendMessageMutation.mutate({
        threadId: selectedThread.id,
        content: content.trim(),
      });
    },
    [selectedThread, sendMessageMutation]
  );

  // Update a message
  const updateMessage = useCallback(
    (messageId: number, content: string) => {
      if (!selectedThread || !content.trim()) return;

      updateMessageMutation.mutate({
        threadId: selectedThread.id,
        messageId,
        content: content.trim(),
      });
    },
    [selectedThread, updateMessageMutation]
  );

  // Delete a message
  const deleteMessage = useCallback(
    (messageId: number) => {
      if (!selectedThread) return;

      deleteMessageMutation.mutate({
        threadId: selectedThread.id,
        messageId,
      });
    },
    [selectedThread, deleteMessageMutation]
  );

  // Set up real-time message listeners
  useEffect(() => {
    // console.log("🎯 Setting up socket listeners in useChat", {
    //   hasSocket: !!socket.socket,
    //   hasUser: !!user,
    //   selectedThreadId: selectedThread?.id,
    // });

    if (!socket.socket) {
      // console.log("❌ No socket available, skipping listener setup");
      return;
    }

    const handleNewMessage = (data: {
      success: boolean;
      data: ChatMessage;
    }) => {
      if (!data.success) {
        return;
      }

      // Update messages cache if this is the currently selected thread
      if (selectedThread && data.data.threadId === selectedThread.id) {
        // console.log("📝 Updating messages cache for selected thread");
        queryClient.setQueryData(
          ["chatMessages", selectedThread.id],
          (old: any) => {
            const existingMessages = old?.data || [];
            const exists = existingMessages.some(
              (msg: ChatMessage) => msg.id === data.data.id
            );
            if (exists) return old;
            return { data: [...existingMessages, data.data] };
          }
        );

        // Auto-mark new messages as read if user is viewing the chat
        if (user && data.data.senderId !== Number(user.id)) {
          markMessagesAsRead([data.data.id]);
        }
      }

      // ALWAYS notify user of new messages (even from other threads)
      if (user && data.data.senderId !== Number(user.id)) {
        // console.log("🔊 TRIGGERING NOTIFICATION!");
        const senderName = data.data.sender?.name || "Someone";
        const messagePreview =
          data.data.content.length > 50
            ? `${data.data.content.substring(0, 50)}...`
            : data.data.content;

        // console.log("🎵 Playing sound...");
        notificationManager.playSound();

        // console.log("🍞 Showing toast...");
        toast.info(`💬 ${senderName}: ${messagePreview}`, {
          duration: 4000,
        });
      } else {
        // console.log("⏭️ Skipping notification (message from self or no user)");
      }

      // Update threads cache optimistically
      // console.log("🔄 Updating threads cache");
      queryClient.setQueryData(["chatThreads"], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          data: old.data?.map((thread: ChatThread) => {
            if (thread.id === data.data.threadId) {
              return {
                ...thread,
                lastMessage: data.data,
                unreadCount:
                  data.data.senderId !== Number(user?.id)
                    ? (thread.unreadCount || 0) + 1
                    : thread.unreadCount,
              };
            }
            return thread;
          }),
        };
      });

      // console.log("✅ Message handling complete");
    };

    const handleMessageUpdated = (data: {
      success: boolean;
      data: ChatMessage;
    }) => {
      if (
        data.success &&
        selectedThread &&
        data.data.threadId === selectedThread.id
      ) {
        queryClient.setQueryData(
          ["chatMessages", selectedThread.id],
          (old: any) => ({
            data: (old?.data || []).map((msg: ChatMessage) =>
              msg.id === data.data.id ? data.data : msg
            ),
          })
        );
      }
    };

    const handleMessageDeleted = (data: {
      success: boolean;
      data: { messageId: number; threadId: number };
    }) => {
      if (
        data.success &&
        selectedThread &&
        data.data.threadId === selectedThread.id
      ) {
        queryClient.setQueryData(
          ["chatMessages", selectedThread.id],
          (old: any) => ({
            data: (old?.data || []).filter(
              (msg: ChatMessage) => msg.id !== data.data.messageId
            ),
          })
        );
        // Remove read status for deleted message
        setReadStatus((prev) => {
          const newMap = new Map(prev);
          newMap.delete(data.data.messageId);
          return newMap;
        });
      }
    };

    const handleNewMessageNotification = (data: any) => {
      // Show notification for ride group chat messages in other threads
      if (!selectedThread || data.threadId !== selectedThread.id) {
        toast.info(`New message from ${data.message.sender.name}`);
      }
      // Refetch threads to update unread counts
      queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    };

    const handleMessageRead = (data: {
      success: boolean;
      data: {
        messageId: number;
        readBy: MessageRead[];
      };
    }) => {
      if (data.success && selectedThread) {
        setReadStatus((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.data.messageId, data.data.readBy);
          return newMap;
        });
      }
    };

    const handleMessageReadByUser = (data: {
      success: boolean;
      data: {
        messageId: number;
        userId: number;
        readAt: string;
      };
    }) => {
      if (data.success && selectedThread) {
        setReadStatus((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(data.data.messageId) || [];
          const newRead: MessageRead = {
            id: Date.now(), // Temporary ID
            messageId: data.data.messageId,
            userId: data.data.userId,
            readAt: data.data.readAt,
            user: {
              id: data.data.userId,
              name: "", // Will be populated by backend
              email: "",
            },
          };
          newMap.set(data.data.messageId, [...existing, newRead]);
          return newMap;
        });
      }
    };

    // Debug: Log ALL socket events
    const originalEmit = socket.socket.emit;
    const originalOn = socket.socket.on;

    socket.socket.on("new_message", handleNewMessage);
    socket.socket.on("message_updated", handleMessageUpdated);
    socket.socket.on("message_deleted", handleMessageDeleted);
    socket.socket.on("new_message_notification", handleNewMessageNotification);
    socket.socket.on("message_read", handleMessageRead);
    socket.socket.on("message_read_by_user", handleMessageReadByUser);

    // Universal event catcher for debugging
    const catchAllEvents = (eventName: string, ...args: any[]) => {
      // console.log(`📨 Socket event received: "${eventName}"`, args);
    };

    // Listen to ALL events (for debugging)
    socket.socket.onAny(catchAllEvents);

    return () => {
      // Cleanup listeners
      if (socket.socket) {
        socket.socket.offAny(catchAllEvents);
        socket.socket.off("new_message", handleNewMessage);
        socket.socket.off("message_updated", handleMessageUpdated);
        socket.socket.off("message_deleted", handleMessageDeleted);
        socket.socket.off(
          "new_message_notification",
          handleNewMessageNotification
        );
        socket.socket.off("message_read", handleMessageRead);
        socket.socket.off("message_read_by_user", handleMessageReadByUser);
      }
    };
  }, [socket.socket, queryClient, user]);

  // Auto-mark messages as read when thread is selected - Less frequent
  useEffect(() => {
    if (selectedThread && messages.length > 0) {
      // Longer delay to reduce frequency
      const timer = setTimeout(() => {
        markVisibleMessagesAsRead();
      }, 2000); // Wait 2 seconds before marking as read
      return () => {
        clearTimeout(timer);
        // Also clear the mark read timeout on cleanup
        if (markReadTimeoutRef.current) {
          clearTimeout(markReadTimeoutRef.current);
        }
      };
    }
  }, [selectedThread, messages, markVisibleMessagesAsRead]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (selectedThread?.rideId) {
        socket.leaveRideThread(selectedThread.rideId);
      }
      // Clear any pending timeouts
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
    };
  }, [selectedThread, socket]);

  return {
    // Data
    threads: threadsData?.data || [],
    messages,
    selectedThread,
    readStatus,

    // Loading states
    isLoadingThreads,
    isLoadingMessages,
    isSendingMessage: sendMessageMutation.isPending,
    isUpdatingMessage: updateMessageMutation.isPending,
    isDeletingMessage: deleteMessageMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,

    // Actions
    selectThread,
    sendMessage,
    updateMessage,
    deleteMessage,
    markMessagesAsRead,
    markVisibleMessagesAsRead,
    markCurrentMessagesAsRead,
    scrollToBottom,
    refetchThreads,
    prefetchMessages,

    // Socket connection
    isConnected: socket.isConnected,

    // Errors
    threadsError,
    messagesError,
  };
};

export default useChat;
