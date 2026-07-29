import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Users,
  AlertCircle,
  Check,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { useRideChat } from "@/hooks/useRideChat";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { ChatService } from "@/services/chatService";
import { useSocket } from "@/providers/SocketProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAllBookingInfinite } from "@/data";
import { notificationManager } from "@/utils/notificationUtils";

interface RideChatProps {
  rideId: number;
  className?: string;
  isDriver?: boolean;
  isPassenger?: boolean;
}

const RideChat: React.FC<RideChatProps> = ({
  rideId,
  className,
  isDriver = false,
  isPassenger = false,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get user's approved bookings to check if they can access this ride's chat
  const { data: userBookings } = useAllBookingInfinite(50, {
    status: "APPROVED",
  });
  const approvedBookings =
    userBookings?.pages.flatMap((page) => page?.data ?? []) ?? [];

  // Check if user has an approved booking for this specific ride
  const hasApprovedBooking = approvedBookings.some((booking) => {
    const bookingRideId = booking?.rideId || booking?.ride?.id;
    return bookingRideId === rideId;
  });

  const {
    rideThread,
    isLoadingRideThread,
    isJoining,
    joinRideChat,
    isInRideChat,
    isConnected,
  } = useRideChat(rideId);

  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [readStatus, setReadStatus] = useState<Map<number, any[]>>(new Map());

  // Check if user has access to this ride chat
  const hasAccess = isDriver || (isPassenger && hasApprovedBooking);
  const userInChat = user && rideThread && isInRideChat(user?.id as any);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-join chat thread if user has access but isn't in the thread
  useEffect(() => {
    if (hasAccess && rideThread && !userInChat && !isJoining) {
      joinRideChat(rideId);
    }
  }, [hasAccess, rideThread, userInChat, isJoining, joinRideChat, rideId]);

  // Load ride group chat messages when thread is available
  useEffect(() => {
    if (rideThread && userInChat) {
      loadMessages();
    }
  }, [rideThread, userInChat]);

  // Set up real-time message listeners
  useEffect(() => {
    if (!socket.socket || !rideThread) return;

    const handleNewMessage = (data: { success: boolean; data: any }) => {
      if (data.success && data.data.threadId === rideThread.id) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === data.data.id);
          if (exists) return prev;
          return [...prev, data.data];
        });

        // Notify user of new message if it's not from them
        if (user && data.data.senderId !== user.id) {
          const senderName = data.data.sender?.name || "Someone";
          const messagePreview =
            data.data.content.length > 50
              ? `${data.data.content.substring(0, 50)}...`
              : data.data.content;

          notificationManager.playSound();
          toast.info(`💬 ${senderName}: ${messagePreview}`, {
            duration: 4000,
          });

          // Auto-mark new messages as read if user is in the chat
          markMessageAsRead(data.data.id);
        }
      }
    };

    const handleMessageUpdated = (data: { success: boolean; data: any }) => {
      if (data.success && data.data.threadId === rideThread.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === data.data.id ? data.data : msg))
        );
      }
    };

    const handleMessageDeleted = (data: {
      success: boolean;
      data: { messageId: number; threadId: number };
    }) => {
      if (data.success && data.data.threadId === rideThread.id) {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== data.data.messageId)
        );
        // Remove read status for deleted message
        setReadStatus((prev) => {
          const newMap = new Map(prev);
          newMap.delete(data.data.messageId);
          return newMap;
        });
      }
    };

    const handleMessageRead = (data: {
      success: boolean;
      data: {
        messageId: number;
        readBy: any[];
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

    socket.onNewMessage(handleNewMessage);
    socket.onMessageUpdated(handleMessageUpdated);
    socket.onMessageDeleted(handleMessageDeleted);
    socket.onMessageRead(handleMessageRead);

    return () => {
      if (socket.socket) {
        socket.socket.off("new_message", handleNewMessage);
        socket.socket.off("message_updated", handleMessageUpdated);
        socket.socket.off("message_deleted", handleMessageDeleted);
        socket.socket.off("message_read", handleMessageRead);
      }
    };
  }, [socket, rideThread, user]);

  const loadMessages = async () => {
    if (!rideThread || !rideThread.id) return;

    setIsLoadingMessages(true);
    try {
      const response = await ChatService.getThreadMessages(rideThread.id);
      setMessages(response.data);

      // Load read status for all messages
      const messageIds = response.data.map((msg) => msg.id);
      await loadReadStatus(messageIds);

      // Mark visible messages as read
      markVisibleMessagesAsRead();
    } catch (error: any) {
      toast.error("Failed to load messages", {
        className: "custom-error-toast",
      });
      console.error("Error loading messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const loadReadStatus = async (messageIds: number[]) => {
    if (!messageIds.length || !rideThread) return;

    try {
      const response = await ChatService.getMessageReadStatus(
        rideThread.id,
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
  };

  const markMessageAsRead = async (messageId: number) => {
    if (!rideThread || !user) return;

    try {
      await ChatService.markMessageAsRead(rideThread.id, messageId);
      socket.markMessagesAsRead(rideThread.id, [messageId]);
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const markVisibleMessagesAsRead = () => {
    if (!rideThread || !user) return;

    const unreadMessages = messages.filter((message) => {
      // Don't mark own messages as read
      if (message?.senderId === user?.id) return false;

      // Check if message is already read by current user
      const messageReads = readStatus.get(message.id) || [];
      return !messageReads.some((read) => read?.userId === user?.id);
    });

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg?.id).filter(Boolean);
      ChatService.markMessagesAsRead(rideThread.id, messageIds);
      socket.markMessagesAsRead(rideThread.id, messageIds);
    }
  };

  const handleSendMessage = async () => {
    if (
      !messageText.trim() ||
      !rideThread ||
      !rideThread.id ||
      isSendingMessage
    )
      return;

    const messageToSend = messageText.trim();
    setMessageText(""); // Clear input immediately for better UX
    setIsSendingMessage(true);

    try {
      const response = await ChatService.sendMessage(
        rideThread.id,
        messageText.trim()
      );
      setMessages((prev) => [...prev, response.data]);
    } catch (error: any) {
      console.log(error);
      // Restore message text on error so user can retry
      setMessageText(messageToSend);
      toast.error(error.response?.data?.message || "Failed to send message", {
        className: "custom-error-toast",
      });
      console.error("Error sending message:", error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleJoinChat = () => {
    joinRideChat(rideId);
  };

  const getReadStatusIcon = (messageId: number, isOwnMessage: boolean) => {
    if (!isOwnMessage) return null;

    const messageReads = readStatus.get(messageId) || [];
    const otherUsers =
      rideThread?.users.filter((u) => u.id !== Number(user?.id)) || [];
    const readByOtherUsers = messageReads.filter(
      (read) => read.userId !== Number(user?.id)
    );

    if (readByOtherUsers.length === 0) {
      return <Check className="h-3 w-3 text-gray-400" />;
    } else if (readByOtherUsers.length === otherUsers.length) {
      return <CheckCheck className="h-3 w-3 text-green-500" />;
    } else {
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
  };

  if (!hasAccess) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{t("chat.accessDenied")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("chat.accessDeniedDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingRideThread) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">{t("general.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!rideThread) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{t("chat.noChatThread")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("chat.noChatThreadDesc")}
          </p>
          {isDriver && (
            <Button onClick={handleJoinChat} disabled={isJoining}>
              {isJoining ? t("general.loading") : t("chat.createRideChat")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!userInChat) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">{t("chat.joinRequired")}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("chat.joinRequiredDesc")}
          </p>
          <Button onClick={handleJoinChat} disabled={isJoining}>
            {isJoining ? t("general.loading") : t("chat.joinRideChat")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span>{t("chat.rideChat")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {rideThread.users.length}
            </Badge>
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Ride Group Chat Messages Area */}
        <ScrollArea className="h-80 px-4" ref={scrollAreaRef}>
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">
                {t("general.loading")}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("chat.noMessages")}</p>
                <p className="text-xs">{t("chat.startConversation")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {messages.map((message, index) => {
                const isOwnMessage =
                  Number(message.senderId) === Number(user?.id);
                const isDriver = message?.sender?.role === "driver";
                const isRideOwner = message?.sender?.isRideOwner || isDriver;
                const showAvatar =
                  index === 0 ||
                  messages[index - 1]?.senderId !== message?.senderId;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      isOwnMessage ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isOwnMessage && showAvatar && (
                      <Avatar
                        className={cn(
                          "w-6 h-6",
                          isRideOwner && "ring-2 ring-blue-400 ring-offset-1"
                        )}
                      >
                        <AvatarImage src={message?.sender?.profileImage?.url} />
                        <AvatarFallback
                          className={cn(
                            "text-xs",
                            isRideOwner &&
                              "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800"
                          )}
                        >
                          {message?.sender?.name?.slice(0, 2)?.toUpperCase() ||
                            "UN"}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {!isOwnMessage && !showAvatar && <div className="w-6" />}

                    <div
                      className={cn("max-w-xs", isOwnMessage && "order-first")}
                    >
                      {showAvatar && !isOwnMessage && (
                        <div className="flex items-center gap-2 mb-1 ml-1">
                          <p className="text-xs text-muted-foreground">
                            {message?.sender?.name || t("chat.unknownUser")}
                          </p>
                          {isRideOwner && (
                            <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-0.5 rounded-full font-medium shadow-sm">
                              {isDriver ? t("chat.rideOwner") : t("chat.owner")}
                            </span>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 break-words",
                          isOwnMessage
                            ? "bg-primary text-primary-foreground ml-auto"
                            : isRideOwner
                            ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-700 shadow-sm"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm">{message?.content || ""}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p
                            className={cn(
                              "text-xs",
                              isOwnMessage
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {message?.createdAt
                              ? formatDistanceToNow(
                                  new Date(message.createdAt),
                                  {
                                    addSuffix: true,
                                  }
                                )
                              : t("chat.unknownTime")}
                          </p>
                          {getReadStatusIcon(message?.id, isOwnMessage)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder={t("chat.typeMessage")}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSendingMessage}
              className="flex-1 text-sm"
              // size="sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || isSendingMessage}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RideChat;
