import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    async function checkConnection() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch("https://clients3.google.com/generate_204", { method: "HEAD", signal: controller.signal });
        clearTimeout(timeout);
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    }

    checkConnection();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") checkConnection();
    });

    const interval = setInterval(checkConnection, 30000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return isConnected;
}
