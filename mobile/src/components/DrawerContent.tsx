import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  Home, Car, PlusCircle, MessageCircle, User,
  X, ChevronRight, Wallet, Bell,
} from "lucide-react-native";
import { useAuthContext } from "@/providers/AuthProvider";
import { useMode, type AppMode } from "@/providers/ModeProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { Avatar } from "@/components/ui/Avatar";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

interface MenuItem {
  icon: (color: string) => React.ReactNode;
  label: string;
  route: string;
  testID: string;
  visible?: boolean;
  // When set, the item only appears in this mode. Undefined = both modes.
  mode?: AppMode;
  // Auth-gated items open the AuthGate sheet for guests instead of navigating.
  requiresAuth?: boolean;
  // Optional headline shown in the AuthGate sheet when a guest taps a gated item.
  authReason?: string;
  // Optional unread count rendered as a pill at the end of the row.
  badge?: number;
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const { user, isAuthenticated } = useAuthContext();
  const { mode, isDriverMode, setMode } = useMode();
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const requireAuth = useRequireAuth();
  const unreadNotifications = useUnreadNotificationCount();
  const s = useMemo(() => makeStyles(colors), [colors]);

  function navigate(route: string) {
    props.navigation.closeDrawer();
    router.push(route as any);
  }

  function handleToggleMode() {
    props.navigation.closeDrawer();
    if (isDriverMode) {
      setMode("passenger");
      router.replace("/");
      return;
    }
    // Switching into driver mode. Mirror the post-ride flow: a user who hasn't
    // completed driver onboarding is routed through it first. ModeProvider then
    // flips them into driver mode once onboarding marks them isDriverOnboarded.
    if (!user?.isDriverOnboarded) {
      router.push("/onboarding/driver" as any);
      return;
    }
    setMode("driver");
    router.replace("/");
  }

  // Each entry is one line in the drawer. `visible: false` keeps the screen
  // registered in the navigator (declared in (drawer)/_layout.tsx) without
  // showing it in the menu. `mode` restricts an item to driver or passenger
  // mode (undefined shows in both). Order here is the order users see.
  const menuItems: MenuItem[] = [
    {
      icon: (c) => <Home size={20} color={c} />,
      label: "Home",
      route: "/",
      testID: "drawer.home",
    },
    {
      icon: (c) => <Car size={20} color={c} />,
      label: "My Rides",
      route: "/rides",
      testID: "drawer.rides",
      requiresAuth: true,
      authReason: "Sign in to see your rides",
    },
    {
      icon: (c) => <Wallet size={20} color={c} />,
      label: "Wallet",
      route: "/wallet",
      testID: "drawer.wallet",
      requiresAuth: true,
      authReason: "Sign in to access your wallet",
    },
    {
      icon: (c) => <PlusCircle size={20} color={c} />,
      label: "Post a Ride",
      route: "/post-ride",
      testID: "drawer.post",
      mode: "driver",
      requiresAuth: true,
      authReason: "Sign in to post a ride",
    },
    {
      icon: (c) => <MessageCircle size={20} color={c} />,
      label: "Chat",
      route: "/chat",
      testID: "drawer.chat",
      requiresAuth: true,
      authReason: "Sign in to chat",
    },
    {
      icon: (c) => <Bell size={20} color={c} />,
      label: "Notifications",
      route: "/notifications",
      testID: "drawer.notifications",
      requiresAuth: true,
      authReason: "Sign in to see notifications",
      badge: unreadNotifications,
    },
    {
      icon: (c) => <User size={20} color={c} />,
      label: "Profile",
      route: "/profile",
      testID: "drawer.profile",
      requiresAuth: true,
      authReason: "Sign in to see your profile",
    },
  ];

  // The drawer sits on top of the screen, but @react-navigation/drawer doesn't
  // paint the area outside the SafeAreaView's edges — so we wrap the whole
  // thing in a colored View, then let the SafeArea sit on top. This is what
  // kept the top strip stark white in dark mode.
  return (
    <View style={s.surface}>
      <SafeAreaView style={s.container} edges={["top", "left", "bottom"]}>
        <View style={s.header}>
          <Avatar
            firstName={user?.firstName || ""}
            lastName={user?.lastName || ""}
            imageUrl={user?.profileImage?.url}
            size={56}
          />
          <View style={s.userInfo}>
            <Text style={s.userName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={s.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => props.navigation.closeDrawer()}
            style={s.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
        <View style={s.divider} />
        <ScrollView style={s.menuList} showsVerticalScrollIndicator={false}>
          {menuItems
            .filter((item) => item.visible !== false && (!item.mode || item.mode === mode))
            .map((item) => {
              const active = isActiveRoute(pathname, item.route);
              const fg = active ? colors.primary : colors.text.primary;
              const sub = active ? colors.primary : colors.text.secondary;
              const handlePress = () => {
                if (item.requiresAuth) {
                  requireAuth(() => navigate(item.route), { reason: item.authReason });
                  return;
                }
                navigate(item.route);
              };
              return (
                <TouchableOpacity
                  key={item.testID}
                  testID={item.testID}
                  style={[s.menuItem, active && s.menuItemActive]}
                  onPress={handlePress}
                  activeOpacity={0.7}
                >
                  {item.icon(sub)}
                  <Text style={[s.menuLabel, { color: fg }]}>{item.label}</Text>
                  {item.badge && item.badge > 0 ? (
                    <View testID={`${item.testID}.badge`} style={s.badge}>
                      <Text style={s.badgeText}>
                        {item.badge > 99 ? "99+" : item.badge}
                      </Text>
                    </View>
                  ) : null}
                  <ChevronRight size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
              );
            })}
        </ScrollView>
        {isAuthenticated && (
          <View style={s.footer}>
            <Text style={s.modeCaption}>
              You're in {isDriverMode ? "Driver" : "Passenger"} mode
            </Text>
            <TouchableOpacity
              testID="drawer.modeToggle"
              style={s.modeToggle}
              onPress={handleToggleMode}
              activeOpacity={0.85}
            >
              {isDriverMode ? (
                <User size={20} color={colors.text.inverse} />
              ) : (
                <Car size={20} color={colors.text.inverse} />
              )}
              <Text style={s.modeToggleLabel}>
                {isDriverMode ? "Switch to Passenger Mode" : "Switch to Driver Mode"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function isActiveRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/" || pathname === "/(drawer)";
  return pathname === route || pathname.startsWith(route + "/");
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  surface: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", padding: spacing.xl, gap: spacing.md },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  userEmail: { fontSize: fontSize.sm, color: colors.text.secondary },
  closeBtn: { padding: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.xl },
  menuList: { flex: 1, paddingTop: spacing.md },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  menuItemActive: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.xl - 3,
  },
  menuLabel: { flex: 1, fontSize: fontSize.md, fontWeight: "500" },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: "700", color: colors.text.inverse },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  modeCaption: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center" },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  modeToggleLabel: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.inverse },
});
