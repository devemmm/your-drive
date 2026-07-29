import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import io from "socket.io-client";
import { apiUrl } from "@/data";
import { useAuth } from "./Context/UseAuthContext";
import { getToken } from "@/components/getToken";

interface SocketContextType {
  socket: any | null;
  isConnected: boolean;
  joinRideThread: (rideId: number) => void;
  leaveRideThread: (rideId: number) => void;
  sendMessage: (threadId: number, content: string) => void;
  markMessagesAsRead: (threadId: number, messageIds: number[]) => void;
  onNewMessage: (callback: (data: any) => void) => void;
  onMessageUpdated: (callback: (data: any) => void) => void;
  onMessageDeleted: (callback: (data: any) => void) => void;
  onNewMessageNotification: (callback: (data: any) => void) => void;
  onMessageRead: (callback: (data: any) => void) => void;
  onMessageReadByUser: (callback: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const token = getToken();
    if (user && token) {
      // Initialize socket connection
      const newSocket = io(apiUrl, {
        auth: {
          token,
        },
        autoConnect: true,
      });

      // Connection event handlers
      newSocket.on("connect", () => {
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        setIsConnected(false);
      });

      newSocket.on("connect_error", (error) => {
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [user]);

  const joinRideThread = (rideId: number) => {
    if (socket && isConnected) {
      socket.emit("join_ride_thread", { rideId });
    }
  };

  const leaveRideThread = (rideId: number) => {
    if (socket && isConnected) {
      socket.emit("leave_ride_thread", { rideId });
    }
  };

  const sendMessage = (threadId: number, content: string) => {
    if (socket && isConnected) {
      socket.emit("send_message", { threadId, content });
    }
  };

  const markMessagesAsRead = (threadId: number, messageIds: number[]) => {
    if (socket && isConnected) {
      socket.emit("mark_messages_read", { threadId, messageIds });
    }
  };

  const onNewMessage = (callback: (data: any) => void) => {
    if (socket) {
      socket.on("new_message", callback);
      return () => socket.off("new_message", callback);
    }
  };

  const onMessageUpdated = (callback: (data: any) => void) => {
    if (socket) {
      socket.on("message_updated", callback);
      return () => socket.off("message_updated", callback);
    }
  };

  const onMessageDeleted = (callback: (data: any) => void) => {
    if (socket) {
      socket.on("message_deleted", callback);
      return () => socket.off("message_deleted", callback);
    }
  };

  const onNewMessageNotification = (callback: (data: any) => void) => {
    if (socket) {
      socket.on("new_message_notification", callback);
      return () => socket.off("new_message_notification", callback);
    }
  };

  const onMessageRead = (callback: (data: any) => void) => {
    if (socket) {
      socket.on("message_read", callback);
      return () => socket.off("message_read", callback);
    }
  };

  const onMessageReadByUser = (callback: (data: any) => void) => {
    if (socket) {
      socket.on("message_read_by_user", callback);
      return () => socket.off("message_read_by_user", callback);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinRideThread,
    leaveRideThread,
    sendMessage,
    markMessagesAsRead,
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onNewMessageNotification,
    onMessageRead,
    onMessageReadByUser,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
