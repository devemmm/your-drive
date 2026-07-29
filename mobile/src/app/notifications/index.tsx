import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BellOff } from "lucide-react-native";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  pickLocalizedText,
  resolveNotificationRoute,
} from "@/hooks/useNotifications";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime, handleApiError } from "@/lib/utils";
import { queryKeys } from "@/lib/constants";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import type { Notification } from "@/lib/types";

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const requireAuth = useRequireAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const onMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    try {
      await markAllRead.mutateAsync();
    } catch (err) {
      handleApiError(err, t);
    }
  }, [unreadCount, markAllRead, t]);

  const onRowPress = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        markRead.mutate(notification.id);
      }
      const route = resolveNotificationRoute(notification);
      if (route) {
        router.push(route as any);
      }
    },
    [markRead, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationRow notification={item} onPress={() => onRowPress(item)} styles={s} />
    ),
    [onRowPress, s]
  );

  const keyExtractor = useCallback((n: Notification) => String(n.id), []);

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              title="Mark all read"
              // auth-gated
              onPress={() =>
                requireAuth(() => void onMarkAllRead(), {
                  reason: "Sign in to manage notifications",
                })
              }
              disabled={markAllRead.isPending}
            />
          ) : undefined
        }
      />

      {isLoading && notifications.length === 0 ? (
        <LoadingIndicator fullScreen />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={keyExtractor}
          contentContainerStyle={
            notifications.length === 0 ? s.emptyContent : s.list
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<BellOff size={48} color={colors.text.tertiary} />}
              title="No notifications yet"
              subtitle="New chauffeur requests and ride updates will appear here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  onPress,
  styles: s,
}: {
  notification: Notification;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const title = pickLocalizedText(notification.title);
  const message = pickLocalizedText(notification.message);
  const timeAgo = formatRelativeTime(notification.createdAt);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[s.row, !notification.isRead && s.rowUnread]}
      accessibilityRole="button"
      accessibilityLabel={`${notification.isRead ? "" : "Unread. "}${title}. ${message}. ${timeAgo}`}
      accessibilityState={{ selected: !notification.isRead }}
    >
      <View style={s.rowMain}>
        <View style={s.rowHeader}>
          {!notification.isRead ? <View style={s.unreadDot} /> : null}
          <Text
            style={[s.rowTitle, !notification.isRead && s.rowTitleUnread]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <Text style={s.rowMessage} numberOfLines={2}>
          {message}
        </Text>
        <Text style={s.rowTime}>{timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  emptyContent: { flex: 1 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  rowMain: { gap: 4 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  rowTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text.primary,
  },
  rowTitleUnread: { fontWeight: "700" },
  rowMessage: { fontSize: fontSize.sm, color: colors.text.secondary },
  rowTime: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
