import React, { useEffect, useState } from "react";
import { View, LogBox } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { AuthGateProvider } from "@/providers/AuthGateProvider";
import { ModeProvider } from "@/providers/ModeProvider";
import { SocketProvider } from "@/providers/SocketProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { NetworkBanner } from "@/components/NetworkBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNetworkStatus } from "@/hooks/useNetwork";
import { authStorage } from "@/services/auth";
import { queryKeys } from "@/lib/constants";
import { resolveNotificationRoute } from "@/hooks/useNotifications";
import type { Notification, PaginatedResponse } from "@/lib/types";
import "@/translations/i18n";

// Show local notifications as OS banners even when the app is in the
// foreground. Without this, scheduleNotificationAsync silently no-ops on
// foreground for iOS/Android.
// E2E runs (Maestro) tap by screen position; LogBox warning toasts overlay
// tappable rows and hijack taps, so silence them in test mode.
if (process.env.EXPO_PUBLIC_TEST_MODE === "1") {
  LogBox.ignoreAllLogs(true);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Routes the user when they tap an OS notification. The notification
 * payload carries `notificationId`; we look it up in the React Query cache
 * (populated by the /notifications poll) and use resolveNotificationRoute.
 * If the row isn't in cache (cold start, or already paged off), fall back
 * to the notifications list.
 */
function NotificationTapRouter() {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const id = response.notification.request.content.data?.notificationId;
        if (typeof id !== "number") return;
        const cache = qc.getQueryData<PaginatedResponse<Notification>>(
          queryKeys.notifications.all
        );
        const row = cache?.data.find((n) => n.id === id);
        const route = row ? resolveNotificationRoute(row) : null;
        router.push((route ?? "/notifications") as any);
      }
    );
    return () => sub.remove();
  }, [router, qc]);

  return null;
}

function ThemeMarker() {
  const { resolved } = useTheme();
  return <View testID={`app.themeMarker.${resolved}`} style={{ width: 0, height: 0 }} />;
}

function FirstLaunchGuard() {
  const router = useRouter();
  const segments = useSegments();
  const [, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const seen = await authStorage.hasSeenWelcome();
      // If user hasn't seen welcome AND isn't already on an auth route, push to welcome.
      const isOnAuthRoute = segments[0] === "(auth)";
      if (!seen && !isOnAuthRoute) {
        router.replace("/(auth)/welcome");
      }
      setChecked(true);
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function AppContent() {
  const isConnected = useNetworkStatus();
  const { fontsLoaded } = useTheme();
  if (!fontsLoaded) return null;
  return (
    <>
      <StatusBar style="auto" />
      <NetworkBanner isConnected={isConnected} />
      <FirstLaunchGuard />
      <NotificationTapRouter />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="onboarding" />
        {/* Inner screens still at root — presented as cards above the drawer.
            Back arrow on each pops back to whichever drawer screen pushed them. */}
        <Stack.Screen name="ride" options={{ presentation: "card" }} />
        <Stack.Screen name="bus" options={{ presentation: "card" }} />
        <Stack.Screen name="bids" options={{ presentation: "card" }} />
        <Stack.Screen name="vehicle" options={{ presentation: "card" }} />
        <Stack.Screen name="notifications" options={{ presentation: "card" }} />
        <Stack.Screen name="profile" options={{ presentation: "card" }} />
        <Stack.Screen name="transactions" options={{ presentation: "card" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <ThemeMarker />
          <QueryProvider>
            <BottomSheetModalProvider>
              <AuthProvider>
                <AuthGateProvider>
                  <ModeProvider>
                    <SocketProvider>
                      <AppContent />
                    </SocketProvider>
                  </ModeProvider>
                </AuthGateProvider>
              </AuthProvider>
            </BottomSheetModalProvider>
          </QueryProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
