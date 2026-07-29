import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  X,
  ArrowLeft,
  ArrowBigLeftDash,
  ArrowBigLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { ChatThread } from "@/services/chatService";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ThreadSkeleton } from "@/components/ui/skeleton";
import LoadingDots from "@/components/ui/loading-dots";
import MessageEditIndicator from "@/components/Chat/MessageEditIndicator";
import { Input } from "../ui/input";

interface ChatButtonProps {
  className?: string;
}

const ChatButton: React.FC<ChatButtonProps> = ({ className }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messageText, setMessageText] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    threads,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    isSendingMessage,
    isUpdatingMessage,
    isDeletingMessage,
    selectThread,
    sendMessage,
    updateMessage,
    deleteMessage,
    markCurrentMessagesAsRead,
    prefetchMessages,
    isConnected,
  } = useChat();

  // Auto-scroll to bottom when ride group chat messages change
  useEffect(() => {
    if (messagesEndRef.current && selectedThread) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      // Mark messages as read when scrolling to bottom
      setTimeout(() => {
        markCurrentMessagesAsRead();
      }, 500);
    }
  }, [messages, selectedThread, markCurrentMessagesAsRead]);

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    const departureDate = new Date(thread.ride.departureTime);
    const formattedDate = departureDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (thread.ride) {
      return `→ ${thread.ride.destinationLocation.city} • ${formattedDate}`;
    }
    const otherUsers = thread.users.filter((u) => u.id !== Number(user?.id));
    return otherUsers.map((u) => u.name).join(", ");
  };

  const handleThreadSelect = (thread: ChatThread) => {
    setSelectedThread(thread);
    selectThread(thread);
  };

  const handleBackToThreads = () => {
    setSelectedThread(null);
    setMessageText("");
  };

  const handleViewAllChats = () => {
    setIsOpen(false);
    navigate("/ride-group-chat");
  };

  // Hide chat button when on /ride-group-chat route
  if (location.pathname === "/ride-group-chat") {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={chatRef}>
      {/* Chat Dropdown - Bigger and more modern */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 h-[500px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700  shadow-2xl flex flex-col backdrop-blur-sm">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {selectedThread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToThreads}
                  className="p-2 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Link
                to="/ride-group-chat"
                className="bg-gray-200 rounded-full p-2 size-8 hover:bg-gray-100 dark:hover:bg-gray-800 "
              >
                <ArrowBigLeft className="size-9 text-primary rotate-45" />{" "}
              </Link>
              <h3 className="text-base font-semibold dark:text-white">
                {selectedThread ? formatThreadTitle(selectedThread) : "CHAT"}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedThread ? (
              // Thread List
              <>
                {/* Threads */}
                <ScrollArea className="flex-1">
                  {isLoadingThreads ? (
                    <div className="p-2 space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <ThreadSkeleton key={i} />
                      ))}
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <h3 className="font-medium mb-1">
                        {t("chat.noConversations")}
                      </h3>
                      <p className="text-sm">
                        Start a conversation with someone
                      </p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {threads.slice(0, 6).map((thread) => {
                        const otherUsers = thread.users.filter(
                          (u) => u.id !== Number(user?.id)
                        );
                        return (
                          <div
                            key={thread.id}
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors  mb-1"
                            onClick={() => handleThreadSelect(thread)}
                            onMouseEnter={() => prefetchMessages(thread.id)}
                          >
                            {/* Avatar */}
                            <div className="relative">
                              {thread.ride && (
                                <div className="size-4 rounded-full bg-primary/10 flex items-center justify-center"></div>
                              )}
                              {thread.unreadCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                                >
                                  {thread.unreadCount > 9
                                    ? "9+"
                                    : thread.unreadCount}
                                </Badge>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-medium truncate dark:text-white">
                                  {formatThreadTitle(thread)}
                                </h3>
                                {thread.lastMessage && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(thread?.lastMessage?.createdAt),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {thread.lastMessage?.content ||
                                  t("chat.noMessages")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Footer */}
                {threads.length > 6 && (
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      className="w-full h-10  font-medium"
                      onClick={handleViewAllChats}
                    >
                      View All Chats
                    </Button>
                  </div>
                )}
              </>
            ) : (
              // Chat View
              <>
                {/* Ride Group Chat Messages Area - Fixed height with proper scrolling */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        {isLoadingMessages ? (
                          <div className="flex items-center justify-center h-32">
                            <div className="text-center text-muted-foreground">
                              <LoadingDots size="md" className="mx-auto mb-2" />
                              <p className="text-sm">Loading messages...</p>
                            </div>
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="flex items-center justify-center h-32">
                            <div className="text-center text-muted-foreground">
                              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">{t("chat.noMessages")}</p>
                              <p className="text-xs mt-1">
                                Start the conversation!
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {messages.slice(-20).map((message) => {
                              const isOwnMessage =
                                message?.senderId === Number(user?.id);

                              const isDriver =
                                message?.sender?.role === "driver";
                              return (
                                <div
                                  key={message?.id}
                                  className={cn(
                                    "flex gap-2",
                                    isOwnMessage
                                      ? "justify-end"
                                      : "justify-start"
                                  )}
                                >
                                  {!isOwnMessage && (
                                    <Avatar className="w-7 h-7 mt-1">
                                      <AvatarImage
                                        src={message?.sender?.profileImage?.url}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {message?.sender?.name
                                          ?.slice(0, 2)
                                          ?.toUpperCase() ??
                                          message?.sender?.firstName ??
                                          "Unknown"}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div
                                    className={cn(
                                      "max-w-[250px]  px-3 py-2 group relative",
                                      isOwnMessage
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : isDriver
                                        ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-bl-md"
                                        : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
                                    )}
                                  >
                                    {/* Show sender name for non-own messages */}

                                    {!isOwnMessage && (
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-xs text-muted-foreground font-medium">
                                          {message?.sender?.firstName ??
                                            message?.sender?.name ??
                                            t("chat.unknownUser")}{" "}
                                          {message?.sender?.lastName}
                                        </p>
                                        {isDriver && (
                                          <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                                            {t("chat.driver")}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    <p className="text-sm leading-relaxed">
                                      {message?.content || ""}
                                    </p>
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
                                          {message?.createdAt
                                            ? formatDistanceToNow(
                                                new Date(message.createdAt),
                                                { addSuffix: true }
                                              )
                                            : t("chat.unknownTime")}
                                        </p>
                                        <MessageEditIndicator
                                          isEdited={
                                            message?.updatedAt !==
                                            message?.createdAt
                                          }
                                          className={
                                            isOwnMessage
                                              ? "text-primary-foreground/70"
                                              : "text-muted-foreground"
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Message Input - Always visible */}
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("chat.typeMessage")}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isSendingMessage}
                        className="flex-1 h-10  bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || isSendingMessage}
                        size="sm"
                        className="h-10 w-10 p-0 "
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105",
          "flex items-center justify-center",
          className
        )}
      >
        <MessageCircle className="h-7 w-7" />
        {threads.some((thread) => thread.unreadCount > 0) && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-semibold"
          >
            {threads.reduce((total, thread) => total + thread.unreadCount, 0) >
            99
              ? "99+"
              : threads.reduce(
                  (total, thread) => total + thread.unreadCount,
                  0
                )}
          </Badge>
        )}
      </Button>
    </div>
  );
};

export default ChatButton;
