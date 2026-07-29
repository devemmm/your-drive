import { useEffect } from "react";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { AppState, AppStateStatus, Platform } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Bridge React Native's AppState to React Query's focusManager so
    // refetchOnWindowFocus triggers when the app returns from background.
    // Without this, refetchOnWindowFocus is silently a no-op on RN.
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (Platform.OS !== "web") {
        focusManager.setFocused(state === "active");
      }
    });
    return () => sub.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export { queryClient };
