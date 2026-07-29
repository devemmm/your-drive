# Guest Browse + Just-in-Time Auth — Design

**Date:** 2026-06-02
**Slice:** Closes §9 rows 1–3 of `2026-04-16-feature-gap-analysis.md` (the residual "intended-flow" alignment work).
**Source documents:**
- `docs/superpowers/specs/2026-05-08-client-intended-flow.md`
- `2026-04-16-feature-gap-analysis.md` §9
**Audience:** Engineering.

---

## 1. Context

The client's intended user flow says the app must be browseable without an account. Sign-up should be just-in-time — fired only when the user attempts an action that needs identity (book a seat, post a vehicle, request a rental, hire a chauffeur, top up, etc.). Today the (drawer) layout hard-redirects every unauthenticated user to `(auth)/welcome`, which means the home map, browse lists, and bus search are unreachable without an account.

This slice removes that gate, adds a reusable just-in-time prompt, and exposes the five guest-visible search endpoints under `/public/*` to match the existing `/public/fare-estimate` and `/public/directions` pattern.

The slice does **not** touch role-aware post-register routing — that's already handled client-side by `ModeProvider`. It also does not address the stricter rental two-step contact-reveal, live GPS during bus trips, the cooperative-employed driver schema split, or the Motor/Car Tax vertical (each tracked separately in §9).

---

## 2. Goals and non-goals

**Goal:** a guest can open the app, see the home map and the four service catalogues (Cars Ride, Rentals, Chauffeur, Bus), and is prompted to sign in only when they tap a CTA that actually needs identity. After signing in or registering, they stay on the screen they came from and re-tap the CTA — which now works.

**Guest depth (locked in during brainstorming):** thin. Guest sees home map with nearby drivers, plus list-level browse of bus routes / rental cars / chauffeurs / posted P2P rides. Any tap on a detail screen or an action triggers the auth prompt.

**In scope:**
- Drop the hard auth gate on `(drawer)`; render the public home and browse lists for guests.
- Add `Continue as guest` to the existing welcome screen; persist a `hasSeenWelcome` flag.
- New reusable `<AuthGateSheet>` bottom sheet + `useRequireAuth()` hook + `AuthGateProvider`.
- Five new `/public/*` mirror controllers (nearby drivers, bus routes, rentals, chauffeurs, P2P rides).
- Drawer items that require auth still render for discoverability; tap them and the sheet opens.
- Driver/passenger mode toggle hidden for guests — it's only meaningful for users with an account.

**Out of scope** (separate tracking; see `2026-04-16-feature-gap-analysis.md` §9):
- Driver-only / cooperative-employed schema split.
- Rental two-step contact-reveal strictness.
- Live GPS during bus trip (MVP-cut).
- Motor / Car Tax vertical.
- Auto-executing the gated action after auth — by explicit design, the user re-taps.

---

## 3. Architecture

### 3.1 Server (`server/src/`)

**Strategy:** mirror the read-only search endpoints under `/public/*`. Existing authenticated routes stay strict — no `optionalAuth` middleware. This matches the existing pattern (`publicPricingRouter`, `public.routes.ts`).

For each domain, the search/query logic is extracted into a shared service that takes a `viewer: { isGuest: true } | { isGuest: false; userId: string }` parameter, plus a response mapper that strips owner-personal fields when `isGuest`. Both the authenticated and public controllers call into the same service. No duplicated Prisma queries.

**New routes** (all mounted on the existing `publicRoutes` index, no auth middleware):

| Route | Controller | Shape source |
|---|---|---|
| `GET /public/drivers/nearby` | `PublicDriversController.nearby` | `GET /drivers/nearby` payload, owner-personal fields stripped |
| `GET /public/bus-routes/search` | `PublicBusRouteController.search` | `BusRouteController.publicSearch` payload (already nearly public) |
| `GET /public/rentals/search` | `PublicRentalController.list` | Rental cars with rates + photos + operator name; no owner phone/email |
| `GET /public/chauffeur-services/search` | `PublicChauffeurController.list` | Available chauffeurs with rating + languages + rates; no phone |
| `GET /public/rides/search` | `PublicRideController.list` | Posted P2P rides (departure, destination, time, fare, driver name + rating); no driver phone |

**New / extracted services:**

| Service | Responsibility |
|---|---|
| `rentalSearch.service.ts` (extract from `rental.service.ts`) | `list({ viewer, filters })` returns the rental list + response mapper |
| `chauffeurSearch.service.ts` (extract from `chauffeur.service.ts`) | Same shape for chauffeurs |
| `rideSearch.service.ts` (extract from existing P2P search) | Same shape for rides |
| `busRouteSearch.service.ts` (extract from `busRoute.controller.ts:publicSearch`) | Promote the in-controller logic into a service so the public controller can call it cleanly |
| `driverNearbySearch.service.ts` (extract from `driverPresence.service.ts`) | Same shape for nearby drivers |

Each service is the single source of truth for what a guest can vs cannot see. Adding a new field to the API later means updating one mapper.

**Touched files:**
- `server/src/routes/public.routes.ts` — register the five new sub-routes.
- `server/src/routes/index.ts` — no change; `/public` is already mounted.
- `server/src/controllers/public/{drivers,busRoutes,rentals,chauffeurs,rides}.controller.ts` — five new thin controllers.
- `server/src/services/*Search.service.ts` — five new (mostly extracted) services + mappers.
- `server/src/controllers/{rental,chauffeur,ride,driverPresence,busRoute}.controller.ts` — switch the authenticated paths to call the new services so the query logic stays in one place.

### 3.2 Mobile (`mobile/src/`)

| Piece | Path | What it does |
|---|---|---|
| `useRequireAuth()` (new) | `mobile/src/hooks/useRequireAuth.ts` | Returns `requireAuth: (callback, opts?) => void`. If authenticated, runs callback synchronously. Else opens `<AuthGateSheet>` with the optional `reason` headline. |
| `<AuthGateSheet>` (new) | `mobile/src/components/AuthGateSheet.tsx` | Global bottom sheet rendered once near `RootLayout`. Headline + Sign Up button + Log In button + Cancel handle. Routes to `(auth)/register` or `(auth)/login`. |
| `AuthGateProvider` (new) | `mobile/src/providers/AuthGateProvider.tsx` | Hosts the sheet ref and exposes `openSheet({ reason })`. Tracks `isOpen` so re-opens while open are no-ops. Auto-dismisses when `isAuthenticated` flips to true. |
| `_layout.tsx` (modify) | `mobile/src/app/_layout.tsx` | On first launch (no `hasSeenWelcome` flag) push `(auth)/welcome`; otherwise drop straight on `(drawer)` regardless of auth state. Mount `AuthGateProvider` inside the provider tree (between `AuthProvider` and `SocketProvider`). |
| `(drawer)/_layout.tsx` (modify) | line 26 | Remove `if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />`. Keep `LoadingIndicator` for the token-loading frame. Wrap `<DriverPresencePoller />` and `<NotificationsPoller />` in `{isAuthenticated && ...}` so guests don't fire either; check `useDriverPresenceHeartbeat` and `useNotifications` for residual auth-required calls and guard at the hook level if so. |
| `(auth)/welcome.tsx` (modify) | — | Add a third button: **Continue as guest**. On tap: `await authStorage.setHasSeenWelcome(true); router.replace("/(drawer)")`. |
| `authStorage` (extend) | `mobile/src/services/auth.ts` | Add `hasSeenWelcome()` getter and `setHasSeenWelcome(value)` setter using AsyncStorage key `@yourdrive/has_seen_welcome`. |
| `DrawerContent` (modify) | `mobile/src/components/DrawerContent.tsx` | Items that need auth ("My Rides", "Wallet", "Chat", "Profile") render normally for guests; `onPress` wraps `router.push` in `requireAuth(...)`. Mode toggle hidden when `!isAuthenticated`. |
| Mobile API client | `mobile/src/services/api.ts` | New `publicApi` axios instance with no Bearer interceptor. The five list hooks (`useNearbyDrivers`, `useBusRoutes`, `useRentalsList`, `useChauffeurList`, `useRideSearch`) switch the base call by `isAuthenticated`: guest → `publicApi.get("/public/...")`, authed → existing `api.get("/...")`. |

**Gated CTAs (the `useRequireAuth` callsites):**

1. Submit ride request (passenger book button on home / ride-request screen).
2. Submit / accept / counter-offer a bid (driver actions on `(drawer)` DriverHome).
3. Post a P2P ride.
4. Add a vehicle.
5. Request a rental (book button on rental detail).
6. Hire a chauffeur (book button on chauffeur detail).
7. Book a bus seat (proceed to seats button).
8. Top up / view wallet.
9. Toggle GO ONLINE / GO OFFLINE.
10. Open chat thread / send chat message.
11. Tap drawer items: My Rides, Wallet, Chat, Profile.
12. Open any detail screen that leans on personal data — final list determined per-screen during implementation.

---

## 4. Data flow

### First launch (no token, no `hasSeenWelcome`)

1. `RootLayout` mounts → `AuthProvider` loads → `token = null`, `hasSeenWelcome = false`.
2. Root entry guard pushes `(auth)/welcome`.
3. Welcome renders three buttons: Sign Up · Log In · **Continue as guest**.
4. Tap "Continue as guest" → `setHasSeenWelcome(true)` → `router.replace("/(drawer)")`.

### Returning guest (no token, `hasSeenWelcome = true`)

1. `RootLayout` mounts → `AuthProvider` loads → `token = null`, `hasSeenWelcome = true`.
2. Root entry guard drops the user on `(drawer)`.
3. Drawer renders the public home and the drawer items; `ModeProvider` no-ops (mode toggle hidden in drawer).

### Returning authed user (token present)

1. `RootLayout` mounts → `AuthProvider` loads token → `useCurrentUser` fetches → `isAuthenticated = true`.
2. Drawer renders; `ModeProvider` drives DriverHome vs PassengerHome as before. Unchanged from today.

### Guest taps a gated CTA

1. User taps Book ride on rental detail.
2. `onPress = () => requireAuth(() => doBook(payload), { reason: "Sign in to book your ride" })`.
3. `useRequireAuth` sees `isAuthenticated = false` → `AuthGateProvider.openSheet({ reason })`.
4. Sheet shows; user taps Sign Up → `router.push("(auth)/register")`.
5. Register flow runs (existing behavior): capture phone/email → `POST /auth/register` → `AuthProvider.signIn(token)`.
6. `isAuthenticated` flips to true; `AuthGateProvider` `useEffect` auto-dismisses the sheet.
7. User is back on rental detail. They re-tap Book ride → `requireAuth` runs the callback synchronously → `doBook` fires.

### Server-side request flow

```
GET /public/rentals/search?city=Kigali&from=…&to=…
  → PublicRentalController.list
  → rentalSearch.service.list({ viewer: { isGuest: true }, filters })
       → Prisma query (same as authed path)
       → mapper strips owner.phoneNumber, owner.email, fcmTokens, ownerNotes
  → 200 { items: [...], page, total }

GET /rentals/search   (authenticated)
  → existing controller
  → rentalSearch.service.list({ viewer: { isGuest: false, userId }, filters })
       → same query
       → mapper keeps everything the viewer is allowed to see
```

### Storage keys

| Key | Where | Lifetime |
|---|---|---|
| `@yourdrive/auth_token` | `authStorage` (existing) | Until sign out |
| `@yourdrive/has_seen_welcome` | `authStorage` (new) | Until app uninstall — never cleared on sign out |
| `@yourdrive/app_mode` | `ModeProvider` (existing) | Unchanged. `ModeProvider` already clamps stale values to passenger when `!user.isDriverOnboarded`. |

### `useRequireAuth` API sketch

```ts
function RentalDetailScreen() {
  const requireAuth = useRequireAuth();
  return (
    <Button
      title="Book ride"
      onPress={() =>
        requireAuth(() => bookRide(payload), { reason: "Sign in to book your ride" })
      }
    />
  );
}
```

The optional `reason` string customizes the sheet headline. Default headline: `"Sign in to continue"`.

---

## 5. Error handling and edge cases

| Edge case | Behavior |
|---|---|
| `/public/*` endpoint returns 5xx | Same error UI as authed mode; existing TanStack Query error boundaries handle it. |
| Authed user accidentally hits a `/public/*` endpoint | Endpoint serves the public payload — no escalation, no error. The hook layer is the right place to route to the correct endpoint. |
| Token expired while user is mid-browse | `setOnSignOut` (already wired in `AuthProvider:42–45`) flips them to guest state. Sheet doesn't auto-open; next gated CTA tap shows it normally. |
| User cancels the sheet (backdrop tap or back gesture) | Sheet dismisses; callback does not run; user stays on the screen they were on. No error, no toast. |
| Sign Up succeeds but `useCurrentUser` fetch fails | `AuthProvider.isAuthenticated` is `!!token && !!user` — stays false until the user fetch resolves. Sheet stays open with a loading state. On failure, user sees the existing post-register error path. |
| Drawer item like "Wallet" tapped by guest | `DrawerItem.onPress` wraps `router.push` in `requireAuth(... , { reason: "Sign in to view your wallet" })`. After auth, sheet closes; user re-taps to navigate. |
| Race: user taps a gated CTA twice quickly | Second tap is a no-op while the sheet is already open. `AuthGateProvider` tracks `isOpen` and ignores re-opens. |
| First-launch flag corrupted in AsyncStorage | `hasSeenWelcome()` returns `false` on parse error or read failure; user just sees welcome again. Acceptable. |
| User signs out while inside an authed-only screen | `setOnSignOut` clears the query cache and flips `isAuthenticated`. Existing behavior: screens that fetched auth-only data unmount or show empty state. No new handling required. |
| Push notification deep-link arrives while guest | Deep-link target is an authed screen. On open, that screen's data hook returns 401; existing 401 handler signs out (no-op for guest); guest sees empty state. Acceptable for MVP. |
| Guest closes the app mid-register and returns | `hasSeenWelcome = true` already; they land on public home. They can re-tap a gated CTA to retry. The half-filled register form state is lost — acceptable. |

---

## 6. Testing

| Layer | What | Tool |
|---|---|---|
| Server unit | Each public controller returns the correct shape, strips owner phone/email/personal fields, and the shared service emits identical results for `isGuest: true` and `isGuest: false` minus the stripped fields. | Jest with the existing `*.test.ts` pattern; one new test file per public controller (five total). |
| Server integration | Hit each `/public/*` endpoint without a token — assert 200 + expected fields. Hit with a token — assert no escalation. | Add cases to existing supertest-style integration files. |
| Mobile unit | `useRequireAuth` — when authed, runs callback; when guest, opens sheet and doesn't run callback. `AuthGateProvider` — re-opens are ignored while sheet is open; sheet auto-dismisses on auth success. | Jest + `@testing-library/react-native`, mirroring `ModeProvider.test.tsx`. |
| Mobile unit | `authStorage.hasSeenWelcome` round-trips through AsyncStorage. | Existing pattern in `authStorage.test.ts` if present; otherwise new. |
| Mobile component | Welcome screen renders three buttons; tapping Continue as guest persists the flag and navigates. | React Native Testing Library. |
| Mobile component | `<AuthGateSheet>` renders the custom `reason` headline; Sign Up and Log In route correctly. | React Native Testing Library. |
| Mobile E2E (Maestro) | Fresh install → welcome → Continue as guest → home renders → tap "Book a rental" on a listing → sheet appears → tap Sign Up → register flow → land back on listing → tap Book → completes. | Maestro `.yaml` in the existing test-scripts directory. |

**Verification before merge:**
- Server unit + integration test commands stay green.
- Mobile typecheck stays clean.
- The new Maestro flow passes against a local Expo dev build.
- Manual smoke against a public-mode device: home + each browse list renders without a token; each gated CTA opens the sheet; registering through the sheet returns to the originating screen.

---

## 7. Follow-ups (not in this slice)

These come up naturally while doing the work but are deliberately deferred:

- Per-screen audit of which detail screens belong in the gated set (§3.2 callsite list item 12). Walk through every screen during implementation and add `requireAuth` wrappers as needed; record any genuinely-public detail screens in this doc.
- Server response-mapper test coverage that asserts the field strip is identical across all five mappers. Could become a single shared "viewer-aware mapper" helper if the strip rules converge.
- Deep-link handling for guests (push notification opens an authed screen) currently degrades to empty state; revisit if Slice 5 (safety/incident push) requires guest-visible deep links.

---

## 8. Open questions

None blocking implementation. The per-screen audit of gated CTAs and the response-mapper coverage are work-during-implementation tasks, not design questions.
