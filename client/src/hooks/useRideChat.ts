import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatThread, ChatService, MessageRead } from "../services/chatService";
import { useSocket } from "../providers/SocketProvider";
import { useSingleRide, useAllBookingInfinite } from "../data";
import { useAuth } from "../providers/Context/UseAuthContext";

export const useRideChat = (rideId?: number) => {
  const queryClient = useQueryClient();
  const socket = useSocket();
  const { user } = useAuth();

  // Get user's approved bookings to check if they can access this ride's chat
  const { data: userBookings } = useAllBookingInfinite(50, {
    status: "APPROVED",
  });
  const approvedBookings =
    userBookings?.pages.flatMap((page) => page?.data ?? []) ?? [];

  // Check if user has an approved booking for this specific ride
  const hasApprovedBooking = approvedBookings.some((booking) => {
    const bookingRideId = booking.rideId || booking.ride?.id;
    return bookingRideId === rideId;
  });

  // Get ride data
  const {
    data: rideData,
    isLoading: isLoadingRide,
    error: rideError,
    refetch: refetchRide,
  } = useSingleRide({
    rideId: rideId || 0,
    enabled: !!rideId,
  });

  // State for chat thread
  const [rideThread, setRideThread] = useState<ChatThread | null>(null);
  const [isLoadingRideThread, setIsLoadingRideThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [readStatus, setReadStatus] = useState<Map<number, MessageRead[]>>(
    new Map()
  );

  // Check if user is in the ride chat thread
  const isInRideChat = useCallback(
    (userId: number) => {
      if (!rideThread || !rideThread.users) return false;
      return rideThread.users.some((user) => user.id === userId);
    },
    [rideThread]
  );

  // Load read status for messages
  const loadReadStatus = useCallback(
    async (threadId: number, messageIds: number[]) => {
      if (!messageIds.length) return;

      try {
        const response = await ChatService.getMessageReadStatus(
          threadId,
          messageIds
        );
        setReadStatus((prev) => {
          const newMap = new Map(prev);
          response.data.forEach((read) => {
            const existing = newMap.get(read.messageId) || [];
            newMap.set(read.messageId, [...existing, read]);
          });
          return newMap;
        });
      } catch (error) {
        console.error("Failed to load read status:", error);
      }
    },
    []
  );

  // Mark messages as read
  const markMessagesAsRead = useCallback(
    async (threadId: number, messageIds: number[]) => {
      if (!messageIds.length || !user) return;

      try {
        await ChatService.markMessagesAsRead(threadId, messageIds);
        socket.markMessagesAsRead(threadId, messageIds);
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    },
    [socket, user]
  );

  // Join ride chat (placeholder - would need backend implementation)
  const joinRideChat = useCallback(async (rideId: number) => {
    try {
      // First try to get or create the chat thread for this ride
      const threadResponse = await ChatService.getOrCreateRideThread(rideId);

      if (threadResponse.success) {
        const thread = threadResponse.data;
        setRideThread(thread);

        // Then join the thread
        const joinResponse = await ChatService.joinThread(thread.id);

        if (joinResponse.success) {
          // Refetch the thread to get updated user list
          const updatedThreads = await ChatService.getChatThreads();
          const updatedThread = updatedThreads.data.find(
            (t) => t.id === thread.id
          );
          if (updatedThread) {
            setRideThread(updatedThread);
          }
        } else {
          console.error("Failed to join chat thread:", joinResponse.message);
        }
      } else {
        console.error("Failed to get or create chat thread");
      }
    } catch (error) {
      console.error("Error joining ride chat:", error);
    }
  }, []);

  // Auto-join chat thread when user has approved booking but isn't in the thread
  useEffect(() => {
    if (
      rideId &&
      user &&
      hasApprovedBooking &&
      rideThread &&
      !isInRideChat(Number(user.id))
    ) {
      joinRideChat(rideId);
    }
  }, [
    rideId,
    user,
    hasApprovedBooking,
    rideThread,
    isInRideChat,
    joinRideChat,
  ]);

  // Auto-join socket room when thread is available
  useEffect(() => {
    if (rideId && rideThread && socket.isConnected) {
      socket.joinRideThread(rideId);
    }

    return () => {
      if (rideId) {
        socket.leaveRideThread(rideId);
      }
    };
  }, [rideId, rideThread, socket]);

  // Set up real-time message listeners for read status
  useEffect(() => {
    if (!socket.socket || !rideThread) return;

    const handleMessageRead = (data: {
      success: boolean;
      data: {
        messageId: number;
        readBy: MessageRead[];
        threadId: number;
      };
    }) => {
      if (data.success && data.data.threadId === rideThread.id) {
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
      if (data.success && rideThread) {
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

    socket.onMessageRead(handleMessageRead);
    socket.onMessageReadByUser(handleMessageReadByUser);

    return () => {
      if (socket.socket) {
        socket.socket.off("message_read", handleMessageRead);
        socket.socket.off("message_read_by_user", handleMessageReadByUser);
      }
    };
  }, [socket, rideThread]);

  return {
    // Data
    rideThread,
    readStatus,
    hasApprovedBooking,
    rideData,

    // Loading states
    isLoadingRideThread,
    isLoadingRide,

    // Actions
    joinRideChat,
    markMessagesAsRead,
    loadReadStatus,
    isInRideChat,

    // Computed values
    isJoining: isLoadingRideThread,

    // Socket connection
    isConnected: socket.isConnected,

    // Errors
    threadError,
    rideError,
  };
};

export default useRideChat;
