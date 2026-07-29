import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Check,
  CheckCheck,
  Phone,
  Video,
  MoreVertical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { ChatThread, ChatMessage } from "@/services/chatService";
import { cn } from "@/lib/utils";
import CustomLoader from "@/components/CustomLoader";
import Spinner from "@/components/ui/spinner";
import { ThreadSkeleton, ChatMessageSkeleton } from "@/components/ui/skeleton";
import LoadingDots from "@/components/ui/loading-dots";
import MessageActions from "@/components/Chat/MessageActions";
import MessageEditIndicator from "@/components/Chat/MessageEditIndicator";

interface ChatLayoutProps {
  className?: string;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ className }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const {
    threads,
    messages,
    selectedThread,
    readStatus,
    isLoadingThreads,
    isLoadingMessages,
    isSendingMessage,
    isUpdatingMessage,
    isDeletingMessage,
    selectThread,
    sendMessage,
    updateMessage,
    deleteMessage,
    markVisibleMessagesAsRead,
    markCurrentMessagesAsRead,
    scrollToBottom,
    prefetchMessages,
    isConnected,
  } = useChat();

  const [messageText, setMessageText] = useState("");

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      // Mark messages as read when scrolling to bottom
      setTimeout(() => {
        markCurrentMessagesAsRead();
      }, 500);
    }
  }, [messages, markCurrentMessagesAsRead]);

  // Auto-mark messages as read when thread is selected
  useEffect(() => {
    if (selectedThread && messages.length > 0) {
      // Small delay to ensure messages are rendered
      const timer = setTimeout(() => {
        markVisibleMessagesAsRead();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedThread, messages, markVisibleMessagesAsRead]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendMessage(messageText);
      setMessageText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatThreadTitle = (thread: ChatThread) => {
    if (thread.ride) {
      const departureDate = new Date(thread.ride.departureTime);
      const formattedDate = departureDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `→ ${thread.ride.destinationLocation.city} • ${formattedDate}`;
    }
    const otherUsers = thread.users.filter((u) => u.id !== Number(user?.id));
    return otherUsers.map((u) => u.name).join(", ");
  };

  const formatThreadSubtitle = (thread: ChatThread) => {
    if (thread.ride) {
      return `${t("chat.rideChat")} • ${formatDistanceToNow(
        new Date(thread.ride.departureTime),
        { addSuffix: true }
      )}`;
    }
    return thread.lastMessage?.content || t("chat.noMessages");
  };

  const getReadStatusIcon = (messageId: number, isOwnMessage: boolean) => {
    if (!isOwnMessage) return null;

    const messageReads = readStatus.get(messageId) || [];
    const otherUsers =
      selectedThread?.users.filter((u) => u.id !== Number(user?.id)) || [];
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

  return (
    <div className={cn("flex h-[600px] bg-background", className)}>
      {/* Threads Sidebar */}
      <Card className="flex-shrink-0 w-80 mr-4">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t("chat.messages")}</h2>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? t("chat.connected") : t("chat.disconnected")}
                </span>
              </div>
            </div>
          </div>

          {/* Threads List */}
          <ScrollArea className="h-[500px]">
            {isLoadingThreads ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ThreadSkeleton key={i} />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {t("chat.noConversations")}
              </div>
            ) : (
              threads.map((thread) => {
                const otherUsers = thread.users.filter(
                  (u) => u.id !== Number(user?.id)
                );
                const isSelected = selectedThread?.id === thread.id;

                return (
                  <div
                    key={thread.id}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      isSelected && "bg-muted"
                    )}
                    onClick={() => selectThread(thread)}
                    onMouseEnter={() => prefetchMessages(thread.id)}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      {thread.ride ? (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-primary" />
                        </div>
                      ) : (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={otherUsers[0]?.profileImage?.url} />
                          <AvatarFallback>
                            {otherUsers[0]?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {thread.unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">
                          {formatThreadTitle(thread)}
                        </h3>
                        {thread.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(thread.lastMessage.createdAt),
                              { addSuffix: true }
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {formatThreadSubtitle(thread)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedThread.ride ? (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                ) : (
                  <Avatar>
                    <AvatarImage
                      src={
                        selectedThread.users.find(
                          (u) => u.id !== Number(user?.id)
                        )?.profileImage?.url
                      }
                    />
                    <AvatarFallback>
                      {selectedThread.users
                        .find((u) => u.id !== Number(user?.id))
                        ?.name.slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <h3 className="font-semibold">
                    {formatThreadTitle(selectedThread)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedThread.users.length} {t("chat.participants")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Ride Group Chat Messages Area */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <LoadingDots size="lg" className="mx-auto mb-3" />
                    <p className="text-sm">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t("chat.noMessages")}</p>
                    <p className="text-sm">{t("chat.startConversation")}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isOwnMessage =
                      Number(message.senderId) === Number(user?.id);
                    const isDriver = message.sender.role === "driver";
                    const showAvatar =
                      index === 0 ||
                      messages[index - 1].senderId !== message.senderId;

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          isOwnMessage ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isOwnMessage && showAvatar && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage
                              src={message.sender.profileImage?.url}
                            />
                            <AvatarFallback className="text-xs">
                              {message.sender.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        {!isOwnMessage && !showAvatar && (
                          <div className="w-8" />
                        )}

                        <div
                          className={cn(
                            "max-w-xs lg:max-w-md",
                            isOwnMessage && "order-first"
                          )}
                        >
                          {showAvatar && !isOwnMessage && (
                            <div className="flex items-center gap-2 mb-1 ml-1">
                              <p className="text-xs text-muted-foreground">
                                {message.sender.name}
                              </p>
                              {isDriver && (
                                <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                                  Driver
                                </span>
                              )}
                            </div>
                          )}

                          <div
                            className={cn(
                              "rounded-lg px-3 py-2 break-words group relative",
                              isOwnMessage
                                ? "bg-primary text-primary-foreground ml-auto"
                                : isDriver
                                ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
                                : "bg-muted"
                            )}
                          >
                            <p>{message.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-2">
                                <p
                                  className={cn(
                                    "text-xs",
                                    isOwnMessage
                                      ? "text-primary-foreground/70"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {formatDistanceToNow(
                                    new Date(message.createdAt),
                                    { addSuffix: true }
                                  )}
                                </p>
                                <MessageEditIndicator
                                  isEdited={
                                    message.updatedAt !== message.createdAt
                                  }
                                  className={
                                    isOwnMessage
                                      ? "text-primary-foreground/70"
                                      : "text-muted-foreground"
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                {getReadStatusIcon(message.id, isOwnMessage)}
                                {isOwnMessage && (
                                  <MessageActions
                                    message={message}
                                    isOwnMessage={isOwnMessage}
                                    onEdit={updateMessage}
                                    onDelete={deleteMessage}
                                    isEditing={isUpdatingMessage}
                                    isDeleting={isDeletingMessage}
                                  />
                                )}
                              </div>
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
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSendingMessage}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {t("chat.selectConversation")}
              </h3>
              <p>{t("chat.selectConversationDesc")}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ChatLayout;
