# Notifications Polling & Deep Links — Design

**Date:** 2026-04-05
**Branch:** `feat/mobile-app`
**Status:** Approved, pending implementation plan

## Goal

Give drivers (and all authenticated users) an in-app notifications surface: a tappable bell on the Home tab with an unread-count badge, and a notifications list screen where each entry deep-links to the appropriate detail screen. Initial trigger: drivers who just opted in to chauffeur availability need to see incoming hire requests, and the server is already emitting notifications for them — there's just no UI to consume them.

No push notifications (FCM). Polling only, via React Query `refetchInterval`.

## Non-goals

- **No FCM / push.** The prior `useNotifications.ts` and `useNotificationHandler.ts` hooks were deleted in the user's in-progress work for good reason: enabling them requires Google-services setup the user cannot perform for the current client. Push is deferred indefinitely.
- **No accept/decline inline from the list.** Tapping a chauffeur-request notification deep-links to the service detail screen where actions live (or will live). Inline decision-making lacks the context a driver needs (pickup location, duration, price).
- **No separate notifications tab.** The Bell + badge on Home is the entry point.
- **No changes to server-side notification emission.** The `chauffeur.controller.ts`, `ride.controller.ts`, `d2d.controller.ts`, and `rental.controller.ts` already call `NotificationServices.notifyUsers(...)` at every relevant event. This feature only adds a client that consumes the existing stream.
- **No changes to notification copy.** Whatever `title`/`body` the server sends is shown verbatim.

## Current state

**Server (fully functional, no changes needed):**
- `GET /notifications` (paginated, authenticated).
- `PATCH /notifications/:id/read` (mark one).
- `PATCH /notifications/read-all` (mark all).
- `POST /notifications/register-fcm-token` — exists but won't be called by mobile.
- `chauffeur.controller.ts` emits notifications at eight call sites (create, accept, decline, cancel, complete, payment transitions). Same pattern exists in ride/d2d/rental controllers.
- Prisma `Notification` model: `id`, `userId`, `title`, `body`, `type` (string), `data` (JSON, nullable), `isRead`, `createdAt`.

**Mobile (scaffolding only):**
- `Bell` icon at `mobile/src/app/(tabs)/index.tsx:52` — decorative only (no `TouchableOpacity`, no `onPress`, no badge).
- `Notification` TypeScript interface at `mobile/src/lib/types.ts:247` — present but unused.
- No `mobile/src/app/notifications/` directory.
- No `useNotifications` hook (deleted in working tree as part of the FCM rip-out).

## Scope

### Polling strategy

- **Interval:** 30 seconds, via React Query's `refetchInterval` option.
- **Where:** the `useNotifications` query is subscribed at the `(tabs)/_layout.tsx` level so polling runs whenever the user is inside the authenticated tab navigator, across any tab. The `NotificationBell` component on Home and the notifications list screen share the same React Query cache entry (same `queryKey`), so React Query dedupes — there's only one in-flight request at a time regardless of how many consumers are mounted.
- **Pause on background:** React Query's `focusManager` will pause polling when the app goes to background and resume on foreground. The `_layout` will install the AppState listener that React Native requires (one-time setup; React Query doesn't do it automatically on RN).
- **Immediate refresh on foreground:** `refetchOnWindowFocus: true` ensures a fresh fetch the moment the app returns from background.
- **Polling stops:** automatically when the user signs out (the tabs layout unmounts), or when the query has no subscribers.

### UI surface

**1. `NotificationBell` component** (`mobile/src/components/NotificationBell.tsx`, new)

- Wraps the lucide `Bell` icon in a `TouchableOpacity`.
- Reads `unreadCount` from the notifications query cache.
- Renders a small red circular badge at the top-right of the bell when `unreadCount > 0`, showing the count or `9+` for counts ≥ 10.
- `onPress` → `router.push("/notifications")`.

**2. Home tab integration** (`mobile/src/app/(tabs)/index.tsx`)

Replace the current static `<Bell>` at line 52 with `<NotificationBell />`. Nothing else on Home changes.

**3. Tab-layout polling subscription** (`mobile/src/app/(tabs)/_layout.tsx`)

Add a `useNotifications()` call (or a small wrapper that just subscribes to the query) at the top of the `TabsLayout` component so the query is mounted and polling runs for the lifetime of the authenticated tab experience. The component doesn't need to render anything from the hook — subscribing is enough.

**4. Notifications list screen** (`mobile/src/app/notifications/index.tsx`, new)

- `SafeAreaView` + `ScreenHeader` with title "Notifications" and back button.
- Header right-action: "Mark all read" button, disabled when `unreadCount === 0`.
- `FlatList` of notifications with:
  - Row: circular unread indicator (dot), title (bold), body (secondary text, 2 lines max), relative timestamp ("2m ago", "3h ago", "yesterday"). Unread rows get a slightly different background color.
  - Pull-to-refresh (`RefreshControl`) triggers `queryClient.invalidateQueries(queryKeys.notifications.list)`.
  - Empty state: icon + "No notifications yet" + secondary copy.
  - Loading state on first mount: `LoadingIndicator`.
- Tap handler:
  1. If `!notification.isRead`, call `markAsRead(notification.id)` (optimistic update on the cache).
  2. Resolve the deep link for `notification.type` (see routing table below) and navigate.
  3. If the type is unknown, just mark-as-read and do nothing else (no navigation, no error).

**5. Root stack registration**

Register `notifications` as a screen in the root or `(tabs)` stack so `router.push("/notifications")` resolves. Location TBD during plan writing based on where the app puts other modal-style screens.

### Deep-link routing table

The mapping from `notification.type` to mobile route will be finalised during plan writing by reading the server call sites directly (they're at known line numbers in `chauffeur.controller.ts`, `ride.controller.ts`, `d2d.controller.ts`, `rental.controller.ts`). The planning step will enumerate the actual `type` strings and `data` JSON shapes so the routing map reflects reality, not assumptions.

Expected shape (subject to plan-step verification):

| `type` prefix | Deep link | Source |
|---|---|---|
| `CHAUFFEUR_*` | `/chauffeur/[id]` (where `id` comes from `data.serviceId` or similar) | `chauffeur.controller.ts` |
| `RIDE_*` / `BOOKING_*` | `/ride/[id]` | `ride.controller.ts` |
| `D2D_*` | To be confirmed | `d2d.controller.ts` |
| `RENTAL_*` | `/rental/[id]` | `rental.controller.ts` |
| *unknown* | no navigation (mark-as-read only) | — |

The resolver is a single pure function in the new hook file: `resolveNotificationRoute(notification): string | null`. Easy to unit-test if test infrastructure is ever added, and easy to extend when new notification types appear.

### Data layer

**New files:**

- `mobile/src/hooks/useNotifications.ts` — polling query + mark-read mutations. Replaces the deleted file with a narrower scope (no FCM):
  - `useNotifications()` — `useQuery` on `GET /notifications` with `refetchInterval: 30_000`, `refetchOnWindowFocus: true`, staleTime reasonable (e.g. 10s to prevent thrash on rapid mounts).
  - `useMarkNotificationRead()` — `useMutation` on `PATCH /notifications/:id/read`, with optimistic cache update on success.
  - `useMarkAllNotificationsRead()` — `useMutation` on `PATCH /notifications/read-all`, invalidates the list query on success.
  - Helper: `resolveNotificationRoute(notification)` — the discriminated-union route resolver.
  - Derived selector: `useNotificationUnreadCount()` — reads the current query cache and returns the count of `!isRead`. Implemented as a thin wrapper around `useNotifications` with a `select` option to avoid re-rendering subscribers on unrelated changes.

**Modified files:**

- `mobile/src/lib/constants.ts` (or wherever `queryKeys` is defined) — add `queryKeys.notifications.list` (and `.list(params)` if pagination params are needed).
- `mobile/src/lib/types.ts` — extend the existing `Notification` interface if the server response includes fields not currently typed (e.g. `data` JSON shape). The plan step reads the controller to confirm.

### Pagination

The server route uses `validatePagination` middleware per `notification.routes.ts`. That suggests `?page=N&limit=N` query params are supported. Two options:

- **Option A (simpler):** Request the first N (e.g. 50) most recent notifications on mount and poll. Drivers actively using the app at peak rarely have more than a handful of pending requests at a time.
- **Option B (fuller):** Use React Query's `useInfiniteQuery` with scroll-to-load-more.

**Decision:** A for v1. Drivers need a *notifications bell*, not a historical log. 50 most recent is more than enough; the polling layer keeps it fresh. Option B is a trivial follow-up if users actually hit the limit.

## Error handling

- **Polling errors:** silent. React Query retries with exponential backoff by default. Errors don't surface in the UI while polling — the old data stays visible. An error banner would be noisy for a background poll.
- **Mark-as-read errors:** silent rollback of the optimistic cache update. No toast. If the server is down, the row will still show as unread on the next refetch.
- **Mark-all-read errors:** `handleApiError(err, t)` to show an Alert — this is a user-initiated action, so a visible failure is appropriate.
- **Navigation to deep link where the target doesn't exist** (e.g. a notification for a deleted ride): the deep-link target screen is responsible for its own 404 state. Out of scope here.
- **Unknown notification type:** mark-as-read runs, no navigation happens, no error. Defensive logging via `console.warn` with the unrecognised type for debugging.

## Open items (to confirm during plan writing)

These are codebase-matching tasks, not design gaps:

- Exact shape of `GET /notifications` response (paginated wrapper shape, field names).
- Exact `notification.type` string literals and `notification.data` JSON shapes emitted by each of the five+ call sites in `chauffeur.controller.ts` and the equivalents in `ride`/`d2d`/`rental` controllers.
- Whether `notification.type` has an enum on the server (Prisma enum? TypeScript union?) that can be imported or mirrored.
- Where the root Stack screen for `notifications` should be registered (root `_layout.tsx`, or as a new `notifications/_layout.tsx` nested stack).
- Whether `queryKeys` lives in `mobile/src/lib/constants.ts` or elsewhere (seen in passing but not fully verified).
- AppState listener installation: whether the app already installs one (e.g. for refresh on foreground) that can be extended, or whether this feature adds a new one.
- Whether `ScreenHeader` supports a right-action slot for the "Mark all read" button, or needs a small API extension.
