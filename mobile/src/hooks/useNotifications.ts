import { useEffect, useRef } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import i18next from "i18next";
import { api } from "@/services/api";
import { queryKeys } from "@/lib/constants";
import { useAuthContext } from "@/providers/AuthProvider";
import type { Notification, PaginatedResponse } from "@/lib/types";

const NOTIFICATIONS_POLL_MS = 30_000;
const NOTIFICATIONS_PAGE_SIZE = 50;

/**
 * Shared React Query options for the notifications list. Used by
 * useNotifications() (full result) and useUnreadNotificationCount()
 * (narrow selector) so they share a single cache entry and subscription.
 *
 * 30s polling keeps the badge responsive without being wasteful.
 * refetchOnWindowFocus: true relies on QueryProvider.tsx's AppState
 * bridge to the React Query focusManager — a plain `true` is a no-op
 * on React Native without that bridge.
 * staleTime of 10s prevents rapidly-mounted consumers from thrashing
 * the network on every navigation.
 */
function notificationsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.notifications.all,
    queryFn: () =>
      api.get<PaginatedResponse<Notification>>("/notifications", {
        pageSize: NOTIFICATIONS_PAGE_SIZE,
      }),
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

/** Polling query for the current user's notifications. */
export function useNotifications() {
  const { isAuthenticated } = useAuthContext();
  return useQuery({
    ...notificationsQueryOptions(),
    // Guests can render the drawer; skip the auth-required /notifications
    // poll until a token exists. Belt-and-braces: callers should also gate
    // mounting this hook on isAuthenticated.
    enabled: isAuthenticated,
  });
}

/**
 * Narrow selector: returns just the unread count. Re-renders subscribers
 * only when the count actually changes, not on unrelated cache updates.
 */
export function useUnreadNotificationCount(): number {
  const { isAuthenticated } = useAuthContext();
  const { data } = useQuery({
    ...notificationsQueryOptions(),
    select: (response) => response.data.filter((n) => !n.isRead).length,
    enabled: isAuthenticated,
  });
  return data ?? 0;
}

/**
 * Watches the polled notifications list and fires an OS-level local banner
 * for each notification that's new since the last poll. Intended to be
 * mounted exactly once per session (next to NotificationsPoller).
 *
 * First poll seeds `lastSeenId` without firing — otherwise we'd banner every
 * existing unread on app launch. Subsequent polls only banner rows with
 * id > lastSeenId AND unread.
 *
 * Logout resets lastSeen so the next user starts clean.
 */
export function useNotificationBanners(): void {
  const { isAuthenticated, user } = useAuthContext();
  const { data } = useQuery({
    ...notificationsQueryOptions(),
    enabled: isAuthenticated,
  });
  const lastSeenIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      lastSeenIdRef.current = null;
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const rows = data?.data;
    if (!rows?.length) return;
    const maxId = rows.reduce((m, n) => (n.id > m ? n.id : m), 0);
    const lastSeen = lastSeenIdRef.current;

    if (lastSeen == null) {
      lastSeenIdRef.current = maxId;
      return;
    }

    if (maxId <= lastSeen) return;

    const fresh = rows.filter((n) => n.id > lastSeen && !n.isRead);
    fresh.forEach((n) => {
      void Notifications.scheduleNotificationAsync({
        content: {
          title: pickLocalizedText(n.title),
          body: pickLocalizedText(n.message),
          data: { notificationId: n.id },
        },
        trigger: null,
      });
    });

    lastSeenIdRef.current = maxId;
  }, [data]);
}

/**
 * Mark a single notification as read. Optimistically updates the cache so
 * the UI reflects the change immediately; rolls back on failure. The server
 * returns only { success, message } (no updated row), so we build the new
 * state client-side.
 */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) =>
      api.patch(`/notifications/${notificationId}/read`),
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications.all });
      const previous = qc.getQueryData<PaginatedResponse<Notification>>(
        queryKeys.notifications.all
      );
      if (previous) {
        qc.setQueryData<PaginatedResponse<Notification>>(
          queryKeys.notifications.all,
          {
            ...previous,
            data: previous.data.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            ),
          }
        );
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.notifications.all, ctx.previous);
      }
    },
    // Invalidate on settle so the server becomes the source of truth after
    // any mutation resolves. Fixes a concurrent-optimistic-update race where
    // overlapping mutations' rollback snapshots can wipe out successful
    // sibling writes.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Mark all notifications as read. User-initiated, so failures surface via
 * the caller's handleApiError — no silent rollback here.
 */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Server stores title/message as "English | French" concatenated strings
 * (see server/src/services/notification.service.ts:76-77). Pick the half
 * matching the current i18n language; fall back to the whole string if
 * the expected separator is missing.
 *
 * Uses indexOf rather than split(" | ") so an English half that itself
 * contains " | " (e.g. a vehicle name) doesn't get mis-split. The French
 * half can still be corrupted in that edge case — the real fix is a
 * server-side data model change to store bilingual strings as JSON.
 *
 * TODO(i18n): push back on the server's combined-string notification
 * storage; bilingual copy belongs in a structured { en, fr } JSON
 * column, not a delimiter-joined string.
 */
export function pickLocalizedText(combined: string): string {
  const separator = " | ";
  const idx = combined.indexOf(separator);
  if (idx === -1) return combined;
  const en = combined.slice(0, idx);
  const fr = combined.slice(idx + separator.length);
  const lang = i18next.language ?? "en";
  return lang.startsWith("fr") ? fr : en;
}

/**
 * Deep-link resolver. Returns the route to push when a notification is
 * tapped, or null if we don't know how to route this notification.
 *
 * The server stores a nullable foreign key per entity kind; at most one
 * is non-null per row. We inspect in priority order — chauffeur first
 * because that's the feature that drove this work.
 *
 * rideRequestId points at the RideRequest model, which has no clear
 * mobile route today; return null and log a warning so we can add the
 * route when that feature is built.
 */
export function resolveNotificationRoute(n: Notification): string | null {
  // Dev-mode invariant check: at most one FK should be non-null per row.
  // If that invariant ever breaks (migration bug, bad seed, new feature),
  // we want to know loudly rather than silently routing to whichever FK
  // the priority order picks first.
  if (__DEV__) {
    const setFks = [
      n.chauffeurServiceId,
      n.rideId,
      n.rentalId,
      n.rideRequestId,
    ].filter((v) => v != null).length;
    if (setFks > 1) {
      console.warn(
        "[notifications] Multiple non-null FKs on notification",
        n.id,
        {
          chauffeurServiceId: n.chauffeurServiceId,
          rideId: n.rideId,
          rentalId: n.rentalId,
          rideRequestId: n.rideRequestId,
        }
      );
    }
  }

  if (n.chauffeurServiceId != null) {
    return `/chauffeur/service/${n.chauffeurServiceId}`;
  }
  if (n.rideId != null) {
    return `/ride/${n.rideId}`;
  }
  if (n.rentalId != null) {
    return `/rental/${n.rentalId}`;
  }
  if (n.rideRequestId != null) {
    return `/ride-request/${n.rideRequestId}`;
  }
  return null;
}
