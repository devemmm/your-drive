import React, { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { useAuthContext } from "./AuthProvider";
import { connectSocket, disconnectSocket } from "@/services/socket";

interface SocketContextType { socket: Socket | null; isConnected: boolean; }

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthContext();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    let s: Socket | null = null;
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    connectSocket().then((sock) => {
      s = sock;
      setSocket(sock);
      sock.on("connect", onConnect);
      sock.on("disconnect", onDisconnect);
    });

    return () => {
      if (s) {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
      }
      disconnectSocket();
    };
  }, [isAuthenticated, user?.id]);

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
}

export function useSocketContext() { return useContext(SocketContext); }
