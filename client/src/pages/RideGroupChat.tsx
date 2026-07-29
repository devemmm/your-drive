import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { ChatThread } from "@/services/chatService";
import { cn } from "@/lib/utils";
import CustomLoader from "@/components/CustomLoader";
import { Input } from "@/components/ui/input";

const RideGroupChat: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    threads,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    isSendingMessage,
    selectThread,
    sendMessage,
    isConnected,
  } = useChat();

  // Auto-scroll to bottom when ride group chat messages change
  useEffect(() => {
    if (messagesEndRef.current && selectedThread) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedThread]);

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

  const handleThreadSelect = (thread: ChatThread) => {
    setSelectedThread(thread);
    selectThread(thread);
  };

  const handleBackToThreads = () => {
    setSelectedThread(null);
    setMessageText("");
  };

  return (
    <div className="container mx-auto h-screen max-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          {selectedThread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToThreads}
              className="lg:hidden"
            >
              <ArrowLeft className="h-5 w-5 rounded-full" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {selectedThread
                ? formatThreadTitle(selectedThread)
                : t("chat.messages")}
            </h1>
            <p className="text-muted-foreground">
              {selectedThread
                ? `${selectedThread.users.length} ${t("chat.participants")}`
                : t("chat.messagesDesc")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="text-sm text-muted-foreground">
              {isConnected ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread List */}
        <div
          className={cn(
            "w-full lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col",
            selectedThread ? "hidden lg:flex" : "flex"
          )}
        >
          {/* Threads */}
          <ScrollArea className="flex-1">
            {isLoadingThreads ? (
              <div className="flex items-center justify-center h-full">
                <CustomLoader className="size-32" />
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <h3 className="text-lg font-medium mb-2">
                  {t("chat.noConversations")}
                </h3>
                <p className="text-sm">Start a conversation with someone</p>
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
                      "flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800",
                      isSelected &&
                        "bg-slate-50 dark:bg-slate-800/50 border-l-4 border-primary"
                    )}
                    onClick={() => handleThreadSelect(thread)}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      {thread.unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate dark:text-white">
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
                        {thread.lastMessage?.content || t("chat.noMessages")}
                      </p>
                      {thread.ride && (
                        <p className="text-xs text-primary mt-1">
                          Ride: {thread.ride.departureLocation.city} →{" "}
                          {thread.ride.destinationLocation.city}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div
          className={cn(
            "flex-1 flex flex-col",
            !selectedThread && "hidden lg:flex"
          )}
        >
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">
                  {t("chat.selectConversation")}
                </h3>
                <p className="text-sm">{t("chat.selectConversationDesc")}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Ride Group Chat Messages Area */}
              <ScrollArea className="flex-1 p-6">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <CustomLoader className="size-32" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      {t("chat.noMessages")}
                      <p className="text-sm">{t("chat.startConversation")}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage =
                        message.senderId === Number(user?.id);
                      const isDriver = message.sender.role === "driver";
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}
                        >
                          {!isOwnMessage && (
                            <Avatar className="w-8 h-8">
                              <AvatarImage
                                src={message.sender.profileImage?.url}
                              />
                              <AvatarFallback className="text-xs">
                                {message?.sender?.name
                                  ?.slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-sm",
                              isOwnMessage && "order-first"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold text-primary">
                                {message?.sender?.firstName ??
                                  message?.sender?.name ??
                                  "Unknown"}
                              </p>
                              {isDriver && (
                                <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                                  Driver
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(message.createdAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "rounded-lg px-4 py-2 break-words",
                                isOwnMessage
                                  ? "bg-primary text-primary-foreground ml-auto"
                                  : isDriver
                                  ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
                                  : "bg-muted"
                              )}
                            >
                              <p className="text-sm">{message.content}</p>
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
              <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex gap-3">
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
                    size="sm"
                  >
                    <Send className="h-4 w-4 rounded-full" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RideGroupChat;
