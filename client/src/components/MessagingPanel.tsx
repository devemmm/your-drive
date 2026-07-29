import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

// Mock message type
interface Message {
  id: number;
  sender: "user" | "other";
  text: string;
  timestamp: Date;
}

interface MessagingPanelProps {
  recipientName: string;
  recipientAvatar?: string;
  onClose?: () => void;
}

const MessagingPanel: React.FC<MessagingPanelProps> = ({
  recipientName,
  recipientAvatar,
  onClose,
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize messages with translated content when language changes
  useEffect(() => {
    setMessages([
      {
        id: 1,
        sender: "other",
        text: `Hello, I saw you booked a seat for the trip to Ottawa!`,
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: 2,
        sender: "user",
        text: t("messages.question"),
        timestamp: new Date(Date.now() - 3300000),
      },
      {
        id: 3,
        sender: "other",
        text: t("messages.response"),
        timestamp: new Date(Date.now() - 3000000),
      },
    ]);
  }, [t]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === "") return;

    const message: Message = {
      id: messages.length + 1,
      sender: "user",
      text: newMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // Simulate reply
    setTimeout(() => {
      const reply: Message = {
        id: messages.length + 2,
        sender: "other",
        text: t("messages.autoReply"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-700">
      {/* Header */}
      <div className="border-b dark:border-gray-700 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center overflow-hidden">
          {recipientAvatar ? (
            <img
              src={recipientAvatar}
              alt={recipientName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="text-primary h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate text-gray-800 dark:text-white">
            {recipientName}
          </h3>
          <div className="text-xs text-green-500">{t("messages.online")}</div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-xl shadow-sm mb-5 ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none dark:bg-gray-800 dark:text-gray-100"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <span
                  className={`text-[10px] mt-1 block ${
                    isUser
                      ? "text-primary-foreground/70 text-right"
                      : "text-muted-foreground dark:text-gray-400"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t dark:border-gray-700 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-3"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t("messages.type")}
            className="flex-1 rounded-full px-4 py-2 text-sm dark:bg-gray-800 dark:text-white"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full dark:bg-primary dark:hover:bg-primary/90 dark:text-white"
            aria-label={t("messages.send")}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default MessagingPanel;
