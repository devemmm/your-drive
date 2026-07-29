import React, { useEffect } from "react";
import { Drawer } from "expo-router/drawer";
import { useAuthContext } from "@/providers/AuthProvider";
import { useNotifications, useNotificationBanners } from "@/hooks/useNotifications";
import { useDriverPresenceHeartbeat } from "@/hooks/useDriverPresenceHeartbeat";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { DrawerContent } from "@/components/DrawerContent";
import { useTheme } from "@/providers/ThemeProvider";
import { ensurePushPermission } from "@/lib/permissions";

function NotificationsPoller() {
  useNotifications();
  useNotificationBanners();
  return null;
}

function PushPermissionPrimer() {
  useEffect(() => {
    void ensurePushPermission();
  }, []);
  return null;
}

function DriverPresencePoller() {
  useDriverPresenceHeartbeat();
  return null;
}

export default function DrawerLayout() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const { colors } = useTheme();

  if (isLoading) return <LoadingIndicator fullScreen />;

  return (
    <>
      {isAuthenticated && <NotificationsPoller />}
      {isAuthenticated && <PushPermissionPrimer />}
      {isAuthenticated && <DriverPresencePoller />}
      <Drawer
        initialRouteName="index"
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          drawerStyle: {
            width: "80%",
            backgroundColor: colors.background,
          },
          overlayColor: "rgba(0,0,0,0.4)",
          swipeEnabled: false,
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Home" }} />
        <Drawer.Screen name="rides" options={{ title: "My Rides" }} />
        <Drawer.Screen name="wallet" options={{ title: "Wallet" }} />
        <Drawer.Screen name="post-ride" options={{ title: "Post a Ride" }} />
        <Drawer.Screen name="rental" options={{ title: "Rent a Car" }} />
        <Drawer.Screen name="chauffeur" options={{ title: "Hire a Driver" }} />
        <Drawer.Screen name="chat" options={{ title: "Chat" }} />
        <Drawer.Screen name="profile" options={{ title: "Profile" }} />
      </Drawer>
    </>
  );
}
