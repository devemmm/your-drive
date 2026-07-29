import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, MoreVertical, UserPlus, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiUrl } from "@/data";
import axios from "axios";

interface Message {
  id: string;
  text: string;
  sender: "driver" | "passenger";
  senderId: string;
  timestamp: Date;
  status?: "sent" | "delivered" | "read";
}

interface Person {
  id: string;
  name: string;
  profileImage: string;
  type: "driver" | "passenger";
  isOnline?: boolean;
  lastSeen?: Date;
}

interface ChatComponentProps {
  participants: Person[]; // All participants in the ride (driver + passengers)
  currentUser: { id: string; type: "driver" | "passenger" };
  open: boolean;
  onClose: () => void;
  rideDriver: any;
}

const ChatComponent: React.FC<ChatComponentProps> = ({
  participants,
  currentUser,
  open,
  onClose,
  rideDriver,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with sample messages
  useEffect(() => {
    if (open) {
      const initialMessages: Message[] = [
        {
          id: "1",
          text: "Hello everyone! Welcome to our ride chat",
          sender: "driver",
          senderId: participants?.find((p) => p?.type === "driver")?.id || "",
          timestamp: new Date(Date.now() - 60000),
          status: "read",
        },
        {
          id: "2",
          text: "Hi driver! Looking forward to the trip",
          sender: "passenger",
          senderId: participants?.find((p) => p?.type === "passenger")?.id || "",
          timestamp: new Date(Date.now() - 30000)
        },
      ];
      setMessages(initialMessages);
    }
  }, [open, participants]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const threadId = 20; // Example thread ID, replace with actual logic to get thread ID

  // Send message handler
  const { mutate } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/chat/threads/${threadId}/messages`
      );
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: currentUser.type,
      senderId: currentUser.id,
      timestamp: new Date(),
      status: "sent",
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    // Simulate replies from other participants
    if (Math.random() > 0.5) {
      setIsTyping(true);
      setTimeout(() => {
        const otherParticipants = participants.filter(
          (p) => p.id !== currentUser.id
        );
        if (otherParticipants.length > 0) {
          const randomParticipant =
            otherParticipants[
              Math.floor(Math.random() * otherParticipants.length)
            ];

          const replies = [
            "Thanks for the update!",
            "Sounds good!",
            "See you soon!",
            "Got it, thanks!",
            "I'll be there shortly.",
          ];

          const replyMessage: Message = {
            id: Date.now().toString(),
            text: replies[Math.floor(Math.random() * replies.length)],
            sender: randomParticipant.type,
            senderId: randomParticipant.id,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, replyMessage]);
        }
        setIsTyping(false);
      }, 1000 + Math.random() * 2000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const grouped: Record<string, Message[]> = {};
    messages.forEach((message) => {
      const dateKey = formatDate(message.timestamp);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(message);
    });
    return grouped;
  };

  const groupedMessages = groupMessagesByDate(messages);

  const getParticipantById = (id: string) => {
    return participants.find((p) => p.id === id);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-xl h-[95vh] flex flex-col p-0 z-[2100]">
        {/* Group Info Header */}
        <DialogHeader className="border-b p-4 shadow-xl shadow-black/10">
          <div className="flex justify-between items-start mt-3">
            <div className="flex flex-col space-y-2">
              {rideDriver && (
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10 border-2 border-background ring-2 ring-primary">
                    <AvatarImage src={rideDriver.profileImage.url} />
                    <AvatarFallback>{rideDriver.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-base font-semibold">
                      {rideDriver.name}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">Ride Driver</p>
                  </div>
                </div>
              )}

              {/* 👥 Other Participants */}
              <div className="flex -space-x-2">
                {participants.slice(0, 3).map((participant) => (
                  <Avatar
                    key={participant.id}
                    className="w-7 h-7 border-2 border-background"
                  >
                    <AvatarImage src={participant.profileImage} />
                    <AvatarFallback>
                      {participant.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {participants.length > 3 && (
                  <div className="w-7 h-7 pl-2 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                    +{participants.length - 3}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[100]">
                  <DropdownMenuItem>View Participants</DropdownMenuItem>
                  <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
                  <DropdownMenuItem>Report</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        {/* Chat Content */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, messages]) => (
              <div key={date} className="space-y-4">
                <div className="text-center text-xs text-muted-foreground my-2">
                  {date}
                </div>
                {messages.map((message) => {
                  const sender = getParticipantById(message.senderId);
                  const isCurrentUser = message.senderId === currentUser.id;
                  const isDriver = sender?.type === "driver";

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isCurrentUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isCurrentUser && (
                        <Avatar className="w-8 h-8 mt-1 mr-2">
                          <AvatarImage src={sender?.profileImage} />
                          <AvatarFallback>
                            {sender?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-xs p-3 rounded-lg flex flex-col ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : isDriver
                            ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800"
                            : "bg-muted"
                        }`}
                      >
                        {!isCurrentUser && (
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold">
                              {sender?.name}
                            </p>
                            {isDriver && (
                              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                                Driver
                              </span>
                            )}
                          </div>
                        )}
                        <p>{message.text}</p>
                        <div className="flex justify-end items-center space-x-1 mt-1">
                          <p className="text-xs opacity-70">
                            {formatTime(message.timestamp)}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs opacity-70">
                              {message.status === "read" ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start items-center">
                <Avatar className="w-8 h-8 mt-1 mr-2">
                  <AvatarImage
                    src={
                      participants.find((p) => p.id !== currentUser.id)
                        ?.profileImage
                    }
                  />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <DialogFooter className="border-t p-4">
          <div className="flex w-full space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isTyping}
            >
              Send
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChatComponent;
