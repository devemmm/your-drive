import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";
import { authStorage } from "./auth";

const RAW_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:3003";
const BASE_URL =
  Platform.OS === "android"
    ? RAW_BASE_URL.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, "//10.0.2.2")
    : RAW_BASE_URL;

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const token = await authStorage.getToken();
  if (!token) throw new Error("No auth token");
  socket = io(BASE_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
