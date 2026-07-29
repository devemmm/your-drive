# Notifications Polling & Deep Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give drivers (and all users) an in-app notifications surface: tappable Bell on Home tab with an unread-count badge, a notifications list screen with per-row deep links to the relevant detail screen, driven by 30-second React Query polling against `GET /notifications`.

**Architecture:** Mobile-only feature. The server already emits notifications for every chauffeur / ride / rental / d2d event via `NotificationServices.notifyUsers(...)`. This plan adds: (1) a polling query hook, (2) a tappable Bell component with badge, (3) a notifications list screen, (4) the React Query `focusManager` hookup to pause polling in background, (5) a deep-link resolver based on whichever entity foreign key is non-null on the notification row.

**Tech Stack:** React Query (@tanstack/react-query) polling + `focusManager`, Expo Router, existing shared UI components (`ScreenHeader`, `Card`, `LoadingIndicator`), `date-fns` (`formatDistanceToNow`) for relative time, `lucide-react-native` icons.

**Spec:** `docs/superpowers/specs/2026-04-05-notifications-polling-and-deep-links-design.md`

---

## Spec-to-reality deviations (acknowledged up front)

Four findings from the exploration step changed what the plan implements vs what the spec initially proposed. All are improvements driven by the actual codebase, not shortcuts.

1. **No `type` string, no `data` JSON column on the server Notification model.** The model (`server/prisma/schema.prisma:870-888`) has only `id`, `title`, `userId`, `message`, `isRead`, `createdAt`, and four nullable foreign keys: `rideRequestId`, `rideId`, `rentalId`, `chauffeurServiceId`. The deep-link router becomes a trivial "first non-null FK wins" check — no discriminated union, no `type` enumeration, zero server changes.

2. **`message` not `body`.** The spec used the word "body" but the schema field is `message`.

3. **Title/message are stored as `"English | French"` concatenated strings.** `notification.service.ts:76-77` does `const combinedTitle = ${titleEn} | ${titleFr};` before inserting. The mobile client must split on `" | "` and pick `[0]` or `[1]` based on the current i18n language. A small helper does this.

4. **Mark-read endpoints return only `{ success, message }` — NOT the updated notification.** Optimistic cache updates must construct the new state client-side instead of consuming a server response.

One additional unknown kept as graceful degradation:

5. **`rideRequestId`** (on the Notification model) refers to the `RideRequest` Prisma model (line 1158), which is a distinct feature from rides/bookings and from D2D. Mobile has no obvious `/ride-request/[id]` route. The deep-link resolver will log a warning and decline to navigate for this case; the notification still gets marked as read on tap. Adding a route when/if that feature lands is a small follow-up.

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `mobile/src/hooks/useNotifications.ts` | Polling query, mark-single-read mutation, mark-all-read mutation, `useUnreadCount()` selector, `resolveNotificationRoute()` pure function, `pickLocalizedText()` bilingual split helper |
| `mobile/src/components/NotificationBell.tsx` | Tappable bell + unread-count badge; reads from the shared React Query cache; routes to `/notifications` on press |
| `mobile/src/app/notifications/_layout.tsx` | Stack layout for the notifications route (matches the existing `chauffeur/_layout.tsx` pattern) |
| `mobile/src/app/notifications/index.tsx` | List screen: FlatList, pull-to-refresh, mark-all-read header action, empty state, tap-to-mark-and-deep-link |

### Modified files

| File | Change |
|---|---|
| `mobile/src/lib/utils.ts` | Add `formatRelativeTime(iso: string)` helper using `date-fns.formatDistanceToNow` |
| `mobile/src/lib/types.ts` | Extend the existing `Notification` interface (currently at line 247) to match the actual server shape — `title`/`message` as combined bilingual strings + the four FK fields |
| `mobile/src/providers/QueryProvider.tsx` | Install `focusManager` AppState listener so `refetchOnWindowFocus` works in React Native |
| `mobile/src/app/(tabs)/_layout.tsx` | Mount `useNotifications()` so polling runs for the lifetime of the authenticated tab experience |
| `mobile/src/app/(tabs)/index.tsx` | Replace the static `<Bell>` at line 52 with `<NotificationBell />` |
| `mobile/src/app/_layout.tsx` | Register a new `<Stack.Screen name="notifications" options={{ presentation: "card" }} />` alongside the existing peer routes |

### Unchanged (server)

No server changes. Every `type` inference is derived client-side from which FK column on the notification row is non-null.

---

## Task 1: Add `formatRelativeTime` helper and extend the `Notification` type

Small foundational change: the list screen needs a "2m ago" formatter, and the `Notification` TypeScript interface needs to match the actual server response shape.

**Files:**
- Modify: `mobile/src/lib/utils.ts`
- Modify: `mobile/src/lib/types.ts:247-254`

- [ ] **Step 1: Verify `date-fns` is installed**

```
grep '"date-fns"' /Users/adrianmaenzanise/Projects/Node/your-drive/mobile/package.json
```

Expected: a line like `"date-fns": "^4.1.0"`. The exploration already confirmed this, but verify before importing.

- [ ] **Step 2: Add `formatRelativeTime` to `mobile/src/lib/utils.ts`**

Open `mobile/src/lib/utils.ts`. Find the existing imports at the top and add `formatDistanceToNow` and `parseISO` from `date-fns`:

```typescript
import { formatDistanceToNow, parseISO } from "date-fns";
```

(Keep any existing imports unchanged. If `date-fns` is not already imported in this file, this is the first import from it; add it as a fresh line with the other imports.)

Then append this function to the file (after the existing `handleApiError` or at the end — wherever the file's existing utility functions live):

```typescript
export function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}
```

The `try/catch` guards against malformed timestamps (the server currently sends valid ISO strings but belt-and-braces costs nothing).

- [ ] **Step 3: Extend the `Notification` interface in `mobile/src/lib/types.ts`**

The current `Notification` interface is at `mobile/src/lib/types.ts:247`. It's stale (references fields the server doesn't send). Use Edit to find and replace the whole block.

Find this exact block (it should be at roughly lines 247-254):

```typescript
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  type: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}
```

Replace with:

```typescript
export interface Notification {
  id: number;
  userId: number;
  title: string;    // Stored as "English | French" by server; split on " | " client-side
  message: string;  // Stored as "English | French" by server; split on " | " client-side
  isRead: boolean;
  createdAt: string;
  // Deep-link foreign keys — at most one is non-null per notification row.
  // The resolveNotificationRoute() helper in useNotifications.ts uses these
  // to determine which detail screen to open when the notification is tapped.
  rideId: number | null;
  rideRequestId: number | null;
  rentalId: number | null;
  chauffeurServiceId: number | null;
}
```

**Important:** if the existing file has imports or uses of the old `body` / `type` / `data` fields elsewhere in the mobile app, the type change will surface them as compile errors. The exploration confirmed no other mobile code currently reads `Notification.body` or `Notification.type` (the deleted `useNotifications.ts` did, but it's gone). If `tsc` in the next step surfaces references, report BLOCKED.

- [ ] **Step 4: Type-check**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: exit 0. No new errors introduced.

- [ ] **Step 5: Commit**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/lib/utils.ts mobile/src/lib/types.ts
git commit -m "feat(mobile): add formatRelativeTime + align Notification type

Notification type was stale: had body/type/data fields that the server
doesn't emit. Replaced with the actual server shape — bilingual title/
message strings + four nullable entity foreign keys for deep linking.
Adds a formatRelativeTime helper built on date-fns.formatDistanceToNow
for the notifications list screen."
```

---

## Task 2: Configure React Query `focusManager` for AppState

React Query's `refetchOnWindowFocus: true` is a no-op on React Native unless `focusManager` is wired to `AppState`. This is a one-time setup in the `QueryProvider`, and it benefits every polling query in the app — not just notifications.

**Files:**
- Modify: `mobile/src/providers/QueryProvider.tsx`

- [ ] **Step 1: Read the current `QueryProvider.tsx`**

Open `mobile/src/providers/QueryProvider.tsx` to see the existing structure. The exploration reported it at lines 1-19 with a `QueryClient` construction and a `QueryClientProvider` wrapper, but no focusManager.

- [ ] **Step 2: Add the AppState → focusManager bridge**

Add these imports at the top of `QueryProvider.tsx` (merging with existing imports):

```typescript
import { useEffect } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { focusManager } from "@tanstack/react-query";
```

(If `useEffect` is already imported from `react`, don't duplicate it — just ensure it's in the import list.)

Then, inside the `QueryProvider` component (before the `return` statement), add:

```typescript
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
```

**Do not change the `QueryClient` defaults** — the existing `staleTime`/`gcTime`/`retry` config stays as-is. This task is purely additive.

- [ ] **Step 3: Type-check**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/providers/QueryProvider.tsx
git commit -m "feat(mobile): bridge AppState to React Query focusManager

Without this, refetchOnWindowFocus is a no-op on React Native because
React Query has no way to know when the app is foregrounded. The bridge
is a one-time install in QueryProvider and benefits every query that
opts in (notifications polling is the first consumer)."
```

---

## Task 3: Create `useNotifications` hook file

The core of the feature: polling query, two mark-read mutations, the unread-count selector, the deep-link resolver, and the bilingual title/message split helper. All live together in one file because they're tightly coupled and small.

**Files:**
- Create: `mobile/src/hooks/useNotifications.ts`

- [ ] **Step 1: Create the file with full contents**

Create `/Users/adrianmaenzanise/Projects/Node/your-drive/mobile/src/hooks/useNotifications.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { api } from "@/services/api";
import { queryKeys } from "@/lib/constants";
import type { Notification, PaginatedResponse } from "@/lib/types";

const NOTIFICATIONS_POLL_MS = 30_000;
const NOTIFICATIONS_PAGE_SIZE = 50;

/**
 * Polling query for the current user's notifications.
 *
 * Polls every 30 seconds while mounted. Refetches on app foreground via
 * React Query's focusManager (see QueryProvider.tsx for the AppState bridge).
 * staleTime is 10s so rapidly-mounted screens share a recent result rather
 * than thrashing the network on every navigation.
 */
export function useNotifications() {
  return useQuery({
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

/**
 * Narrow selector: returns just the unread count. Uses React Query's `select`
 * so subscribers only re-render when the count actually changes — not when
 * unrelated fields on notifications update.
 */
export function useUnreadNotificationCount(): number {
  const { data } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () =>
      api.get<PaginatedResponse<Notification>>("/notifications", {
        pageSize: NOTIFICATIONS_PAGE_SIZE,
      }),
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    select: (response) =>
      response.data.filter((n) => !n.isRead).length,
  });
  return data ?? 0;
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Server stores title/message as "English | French" concatenated strings
 * (see server/src/services/notification.service.ts:76-77). Pick the half
 * matching the current i18n language; fall back to the whole string if
 * the expected separator is missing.
 */
export function pickLocalizedText(combined: string): string {
  const parts = combined.split(" | ");
  if (parts.length !== 2) return combined;
  const lang = i18next.language ?? "en";
  return lang.startsWith("fr") ? parts[1] : parts[0];
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
  if (n.chauffeurServiceId != null) {
    return `/chauffeur/${n.chauffeurServiceId}`;
  }
  if (n.rideId != null) {
    return `/ride/${n.rideId}`;
  }
  if (n.rentalId != null) {
    return `/rental/${n.rentalId}`;
  }
  if (n.rideRequestId != null) {
    console.warn(
      "[notifications] No mobile route for rideRequestId notification",
      n.id
    );
    return null;
  }
  return null;
}
```

**Notes:**
- `i18next` is already a dependency (used by `useTranslation` throughout the app). Import from `i18next` gives you access to the current language without needing a hook.
- `queryKeys.notifications.all` is `["notifications"] as const` per `mobile/src/lib/constants.ts:29-31` — no changes to constants.ts are needed.
- Deliberately duplicating the query config between `useNotifications` and `useUnreadNotificationCount` because extracting the options to a shared constant object and sharing it across `useQuery` calls is error-prone with React Query's inference. The duplication is 8 lines; the DRY tax would be larger. React Query's internal dedup ensures only one HTTP request runs regardless of how many components subscribe.
- If `api.get`'s second argument is not a query-params object in your codebase, adjust — the pattern matches what `useChauffeur.ts:8-10` does for `useAvailableDrivers`, so the signature is known.

- [ ] **Step 2: Type-check**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: exit 0. Particular things that might surface errors:
- If `PaginatedResponse` isn't exported from `@/lib/types`, check the actual export name and adjust.
- If `api.get` signature differs from assumed, fix and report.

- [ ] **Step 3: Commit**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/hooks/useNotifications.ts
git commit -m "feat(mobile): add useNotifications hook with polling + deep-link resolver

30s React Query polling, mark-single-read and mark-all-read mutations,
unread-count selector, bilingual split helper for the server's
'English | French' concatenated strings, and a deep-link resolver
that routes notifications based on their non-null entity foreign key
(chauffeurServiceId/rideId/rentalId) — no notification.type field on
the server, so routing is FK-based instead."
```

---

## Task 4: Create `NotificationBell` component

A small, self-contained component: tappable bell icon with a red unread-count badge overlaid at the top-right. Consumed by the Home tab.

**Files:**
- Create: `mobile/src/components/NotificationBell.tsx`

- [ ] **Step 1: Create the file**

Create `/Users/adrianmaenzanise/Projects/Node/your-drive/mobile/src/components/NotificationBell.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { colors, fontSize } from "@/lib/theme";

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export function NotificationBell({
  size = 24,
  color = colors.text.secondary,
}: NotificationBellProps) {
  const router = useRouter();
  const unreadCount = useUnreadNotificationCount();
  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications" as any)}
      activeOpacity={0.7}
      accessibilityLabel="Notifications"
      accessibilityHint={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Open notifications"
      }
      accessibilityRole="button"
    >
      <View style={s.wrap}>
        <Bell size={size} color={color} />
        {unreadCount > 0 ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{displayCount}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: "#fff",
    lineHeight: fontSize.xs + 2,
  },
});
```

**Notes:**
- `colors.error` was verified to exist during the previous feature (T8 of the chauffeur plan).
- The wrap `View` is slightly larger than the icon (28×28 vs 24×24) so the badge has room to overflow without clipping.
- The badge has a 1.5px `borderColor: colors.background` ring so it visually separates from the bell even when the bell's dark outline touches it.

- [ ] **Step 2: Type-check**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/components/NotificationBell.tsx
git commit -m "feat(mobile): add NotificationBell component

Tappable bell with unread-count badge (red dot, 9+ cap). Subscribes
to the polling cache via useUnreadNotificationCount selector so it
re-renders only when the count actually changes. Routes to
/notifications on press."
```

---

## Task 5: Wire Bell into Home tab and mount polling at tab layout

Two small edits: swap the static `<Bell>` on Home for the new component, and mount `useNotifications()` in the tabs layout so polling keeps running across tab switches.

**Files:**
- Modify: `mobile/src/app/(tabs)/index.tsx:52`
- Modify: `mobile/src/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace the static Bell on Home**

Open `mobile/src/app/(tabs)/index.tsx`. At the top, the file currently imports `Bell` from `lucide-react-native`:

```typescript
import { Bell, Car, UserCheck, Ticket, ArrowRight } from "lucide-react-native";
```

Remove `Bell` from this import (leave the others untouched). After the Edit, that line should read:

```typescript
import { Car, UserCheck, Ticket, ArrowRight } from "lucide-react-native";
```

Add a new import for the component — place it alongside the other `@/components/...` imports in the same file:

```typescript
import { NotificationBell } from "@/components/NotificationBell";
```

Then find the line at roughly `index.tsx:52`:

```tsx
<Bell size={24} color={colors.text.secondary} />
```

Replace it with:

```tsx
<NotificationBell />
```

The surrounding `<View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>` wrapper stays exactly as-is — `NotificationBell` is designed to slot into the same position.

- [ ] **Step 2: Mount polling in the tabs layout**

Open `mobile/src/app/(tabs)/_layout.tsx`. Read it first to see the current structure — it should be a small `TabsLayout` function that returns a `<Tabs>` element.

At the top of the file, add the import:

```typescript
import { useNotifications } from "@/hooks/useNotifications";
```

Inside the `TabsLayout` component, **on the first line of the function body (before any existing logic)**, add:

```typescript
// Subscribes the notifications polling query for the lifetime of the
// authenticated tab experience. The NotificationBell on Home and the
// /notifications list screen share this cache via the same query key.
useNotifications();
```

We deliberately ignore the return value — subscribing is the goal, not reading the data here.

- [ ] **Step 3: Type-check and boot**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: exit 0. No Metro restart needed; hot reload picks up the change if Metro is already running.

- [ ] **Step 4: Commit**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/app/\(tabs\)/index.tsx mobile/src/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): wire NotificationBell into Home tab + mount polling

Home tab's static Bell icon becomes the tappable NotificationBell.
Tabs layout subscribes to useNotifications() so polling runs for the
whole authenticated tab experience, not just while Home is mounted."
```

---

## Task 6: Create the notifications list screen

The destination when the bell is tapped. Shows all recent notifications in a FlatList with pull-to-refresh, mark-all-read header action, per-row tap handler that marks-as-read and deep-links, empty state, loading state.

**Files:**
- Create: `mobile/src/app/notifications/_layout.tsx`
- Create: `mobile/src/app/notifications/index.tsx`

- [ ] **Step 1: Create the stack layout**

Create `/Users/adrianmaenzanise/Projects/Node/your-drive/mobile/src/app/notifications/_layout.tsx`:

```tsx
import React from "react";
import { Stack } from "expo-router";

export default function NotificationsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
```

This matches the pattern from `mobile/src/app/chauffeur/_layout.tsx` (which was the reference for the previous feature).

- [ ] **Step 2: Create the list screen**

Create `/Users/adrianmaenzanise/Projects/Node/your-drive/mobile/src/app/notifications/index.tsx`:

```tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
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
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { EmptyState } from "@/components/EmptyState";
import { formatRelativeTime, handleApiError } from "@/lib/utils";
import { queryKeys } from "@/lib/constants";
import { colors, fontSize, spacing, borderRadius } from "@/lib/theme";
import type { Notification } from "@/lib/types";

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
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
      <NotificationRow notification={item} onPress={() => onRowPress(item)} />
    ),
    [onRowPress]
  );

  const keyExtractor = useCallback((n: Notification) => String(n.id), []);

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={onMarkAllRead}
              disabled={markAllRead.isPending}
              accessibilityLabel="Mark all as read"
              accessibilityRole="button"
            >
              <Text style={s.markAllText}>Mark all read</Text>
            </TouchableOpacity>
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
}: {
  notification: Notification;
  onPress: () => void;
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  emptyContent: { flex: 1 },
  markAllText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  row: {
    backgroundColor: colors.surface ?? colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowUnread: {
    backgroundColor: colors.primaryLight ?? colors.background,
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
```

**Notes:**
- `EmptyState` is assumed to exist (used by the existing `rides.tsx` screen at `mobile/src/app/(tabs)/rides.tsx`). If import path differs, check the existing screens for the correct import and fix.
- `colors.surface` and `colors.primaryLight` may or may not exist in the theme; the `?? colors.background` fallback keeps the code resilient. If they exist, the read/unread rows will look different; if not, they fall back cleanly.
- The "Mark all read" button uses hardcoded English copy. This file, like `mobile/src/app/chauffeur/availability.tsx`, ships with English-only copy and is expected to be translated in a separate i18n pass later. Matches existing pattern.
- The `right` prop passes `undefined` when there are no unread notifications — `ScreenHeader` handles `undefined` by rendering its default `spacer` per the exploration report of `ScreenHeader.tsx`.

- [ ] **Step 3: Type-check**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: exit 0.

If tsc errors about `EmptyState`'s import path or props, fix to match how `mobile/src/app/(tabs)/rides.tsx` uses it. If it errors about theme keys (`colors.surface`, `colors.primaryLight`), replace the specific missing key with an existing theme color (e.g. use `colors.background` and `colors.primary` with opacity-via-style instead) — keep the change minimal.

- [ ] **Step 4: Commit**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/app/notifications/_layout.tsx mobile/src/app/notifications/index.tsx
git commit -m "feat(mobile): add notifications list screen

FlatList with pull-to-refresh, mark-all-read header action, empty
state, and per-row tap that marks-as-read (optimistic) then deep-links
via resolveNotificationRoute. Unread rows get a primary-tinted
background and bold title so they're scannable at a glance."
```

---

## Task 7: Register `notifications` route in the root Stack

Expo Router needs the `notifications` directory to be declared on the root Stack so `router.push("/notifications")` resolves.

**Files:**
- Modify: `mobile/src/app/_layout.tsx`

- [ ] **Step 1: Add the Stack.Screen entry**

Open `mobile/src/app/_layout.tsx`. Find the existing `<Stack>` block — the exploration reported it at lines 19-31, with sibling entries for `(auth)`, `(tabs)`, `onboarding`, `ride`, `post-ride`, `vehicle`, `rental`, `chauffeur`, `chat`, `profile`, `transactions`.

Add a new `<Stack.Screen>` line alongside these, matching the card-presentation pattern used by the other peer routes:

```tsx
<Stack.Screen name="notifications" options={{ presentation: "card" }} />
```

Place it wherever makes sense in the list (e.g. right after `chauffeur`, or alphabetically). Do not reorder the existing entries.

- [ ] **Step 2: Type-check and restart Metro**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: exit 0.

Since Expo Router resolves routes from the file tree at bundle time, Metro may need a restart to pick up the new nested directory. If Metro is currently running, the recommended action is to press `r` in its terminal (reload) or restart it with `--clear`.

- [ ] **Step 3: Commit**

```
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/app/_layout.tsx
git commit -m "feat(mobile): register notifications route in root Stack"
```

---

## Task 8: End-to-end manual smoke test

The server already emits notifications at every relevant event — we just need to trigger a couple and verify the whole surface works.

**Files:** None.

**Prerequisites:**
- Local Docker server running (the one from the previous feature's T5 verification).
- Metro running with `--clear` so Task 7's route is picked up.
- Mobile app on the iOS simulator.
- Two accounts: a **driver** (the one used during the previous E2E — `chauffeur-test-1775402710@test.local` or similar) and a **passenger** (register fresh via the app or curl).

- [ ] **Step 1: Baseline — empty state**

Sign into the driver account in the app. On Home, the Bell should be visible with **no badge**. Tap it. Notifications screen should show the `BellOff` empty state.

- [ ] **Step 2: Generate a chauffeur request notification**

Sign into the passenger account on a second device/simulator (or via curl `POST /chauffeur-services` — the payload shape is in `server/src/controllers/chauffeur.controller.ts:28`). Create a chauffeur service request targeting the driver you signed in as in Step 1.

Within 30 seconds (the poll interval), return to the driver's Home tab. Expected:
- The Bell now has a red badge with `1`.
- Tapping it opens the list, showing one row with an unread indicator, title like "New Chauffeur Request" (split from the bilingual combined string), body text from the server, "just now" / "seconds ago" timestamp.

- [ ] **Step 3: Tap the notification → deep link**

Tap the row. Expected:
- The row's unread dot disappears immediately (optimistic update).
- The app navigates to `/chauffeur/{serviceId}` — the existing chauffeur service detail screen.
- Navigating back to Notifications, the row is still marked read (persisted on the server).
- The Home tab Bell badge count decremented to 0.

- [ ] **Step 4: Mark-all-read**

Generate at least two more notifications (e.g. cancel and re-create a chauffeur request, or have the passenger accept/decline an existing service to trigger status-change notifications). Wait up to 30s for polling. Expected: badge shows `2` or more.

Open Notifications. Tap "Mark all read" in the header. Expected:
- All rows immediately lose their unread indicator.
- Bell badge drops to 0.
- Refreshing the list confirms the server persisted the change (rows stay marked read).

- [ ] **Step 5: Pull-to-refresh**

On the notifications screen, pull down to refresh. Expected: brief spinner, then the list re-renders (no visible content change if nothing new has happened).

- [ ] **Step 6: Background / foreground polling**

With the app in the foreground on Home, generate another notification on the server side (passenger creates another service). Wait ~30s — the Bell badge should appear without any user action (polling).

Send the app to background for ~10 seconds, then return. Expected: an immediate refetch kicks in via `focusManager` even if 30s haven't elapsed since the last poll — if a new notification landed during background, the badge updates within a couple of seconds.

- [ ] **Step 7: Unknown FK graceful degradation**

This step is optional and requires direct DB access. If you can insert a notification row with only `rideRequestId` set (and all other FKs null) via psql:

```
docker compose exec -T db psql -U yourdrive -d yourdrive -c \
  "INSERT INTO \"Notification\" (title, message, \"userId\", \"isRead\", \"rideRequestId\") \
   VALUES ('Test | Test', 'Test | Test', <driver-user-id>, false, 1);"
```

Expected: row appears in the list with the bell badge incremented. Tapping it marks it read but does **not** navigate (the resolver returns null for `rideRequestId` only). Check the Metro console for the `[notifications] No mobile route for rideRequestId notification <id>` warning.

If this setup is too fiddly, skip — the resolver's null branch is small enough to trust by inspection.

- [ ] **Step 8: Commit any fixes**

If any step uncovered a bug, fix the root cause and commit. If everything passes, no commit needed.

---

## Self-Review

Checked against the spec `docs/superpowers/specs/2026-04-05-notifications-polling-and-deep-links-design.md`:

**Spec coverage:**
- ✅ Polling every 30s — Task 3 (`refetchInterval: NOTIFICATIONS_POLL_MS`).
- ✅ `refetchOnWindowFocus` behavior — Task 2 installs `focusManager`, Task 3 opts in.
- ✅ Polling subscription at tabs layout level — Task 5 step 2.
- ✅ Tappable Bell + unread badge + 9+ cap — Task 4.
- ✅ Bell lives only on Home tab — Task 5 step 1 (only modifies `(tabs)/index.tsx`).
- ✅ Notifications list screen with pull-to-refresh + mark-all-read + empty state + per-row tap — Task 6.
- ✅ Mark-read optimistic update (server returns only `{success, message}`) — Task 3's `useMarkNotificationRead` `onMutate` / `onError`.
- ✅ Deep-link router — Task 3's `resolveNotificationRoute` (FK-based, per spec deviation #1).
- ✅ Bilingual split helper — Task 3's `pickLocalizedText` (per spec deviation #3).
- ✅ Relative time formatting — Task 1 `formatRelativeTime`.
- ✅ Route registration — Task 7.
- ✅ E2E verification — Task 8.

**Spec open items — all resolved during exploration and folded into the plan:**
- ✅ Response shape: `{ success, data: Notification[], pagination: {page,pageSize,total,totalPages} }`.
- ✅ Mark-read shape: `{ success, message }` only — optimistic updates synthesize the new state.
- ✅ `type` field — doesn't exist on server; routing is FK-based instead.
- ✅ `queryKeys.notifications.all` already defined in `constants.ts:29-31` — no changes to constants.
- ✅ `ScreenHeader` supports `right` prop — Task 6 uses it.
- ✅ Root stack registration pattern — Task 7 follows the existing `(tabs)` sibling pattern.
- ✅ AppState listener — `AuthProvider` has its own; this feature adds `focusManager` at the React Query layer (not duplicating).
- ✅ `date-fns` is already in `mobile/package.json` — used in Task 1.
- ✅ `lucide-react-native` has `BellOff` — used in Task 6 empty state.

**Placeholder scan:** None. No TBD, TODO, "similar to Task N", or steps without code. "Open items" all resolved before task writing.

**Type consistency:** `Notification` interface fields used in Task 3 (`rideId`, `chauffeurServiceId`, etc.) match the interface definition in Task 1. `resolveNotificationRoute` signature in Task 3 matches its call site in Task 6. `useUnreadNotificationCount` return type (`number`) matches what `NotificationBell` consumes in Task 4. `queryKeys.notifications.all` is the same key string across Task 3 (query + mutations) and Task 6 (refresh invalidation).
