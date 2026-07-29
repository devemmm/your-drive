# InDrive-Style Driver Home

## Overview

Merge the driver's "Live Ride Requests" screen into the driver-mode home so a driver lands on a map-first workspace that mirrors inDrive: full-screen map, a single online/offline toggle, incoming requests presented as a focused bottom sheet with a countdown, and a small backlog chip for older open requests.

This replaces the current behavior where driver mode lands on a list screen (`ride-requests/index.tsx`) and the only way to start broadcasting location is a switch buried in the profile screen — which is also why the passenger map currently shows zero drivers: no driver ever toggles `isAvailableForRideRequest` on, so the heartbeat never fires.

Companion doc: the passenger side is covered by `2026-04-06-indrive-style-home-redesign.md`. This spec is the driver-side equivalent and shares the map-first / bottom-sheet aesthetic.

## Goals

- Driver lands on a map. Going online is one tap from there.
- New ride requests command attention via a focused sheet with a countdown, not a list to scroll.
- Older open requests stay accessible without interrupting the focused one.
- The "no drivers on passenger map" bug is resolved as a side effect — drivers will actually toggle online because the affordance is now where they look.

## Non-Goals

- No backend changes. All endpoints, hooks, and the heartbeat pipeline already exist.
- No new APIs for declining a request server-side. Skip / countdown-expiry are local-only dismissals.
- No demand heatmap, no surge UI, no earnings widget. MVP focuses on the request loop.
- No drawn route polyline between pickup and drop. Fit-bounds is enough.

## Architecture

### Routing & file structure

- `mobile/src/app/(drawer)/index.tsx` becomes the single home route. At the top of the route component it branches on `useMode().isDriverMode` to render either `<PassengerHome />` (current map+search UI extracted into its own file) or `<DriverHome />` (new).
- New file: `mobile/src/app/(drawer)/_components/DriverHome.tsx` — the new screen.
- New file: `mobile/src/app/(drawer)/_components/PassengerHome.tsx` — current passenger home extracted unchanged.
- `mobile/src/app/(drawer)/ride-requests/index.tsx` is deleted.
- `mobile/src/app/(drawer)/_layout.tsx`: drop the `initialRouteName = isDriverMode ? "ride-requests" : "index"` branch (always `"index"` now) and drop `<Drawer.Screen name="ride-requests" />`.
- `mobile/src/components/DrawerContent.tsx`: remove the ride-requests menu entry; the mode toggle navigates to `/` for both modes (current code already routes there for passenger).

### Reused infrastructure

No new hooks, no new endpoints. The new screen composes:

- `useDriverPresenceHeartbeat` — already mounted in `_layout.tsx` as `<DriverPresencePoller />`. No change.
- `useOpenRideRequestsForDrivers(enabled)` — polls `/ride-requests/open-for-drivers` every 8 s. Reused.
- `useAcceptRideRequest` — accept mutation. Reused.
- `useToggleRideRequestAvailability` (in `hooks/useUser.ts:38`) — toggles `isAvailableForRideRequest`. Reused.
- `useMyVehicles` — vehicle list for "Change vehicle". Reused.
- `CounterOfferSheet` component — reused unchanged.
- `RideRequestCard` component — moves out of the deleted screen file into `_components/RideRequestCard.tsx` and is reused by the backlog sheet.
- `STORAGE_KEYS.CURRENT_VEHICLE_ID` — already used by the heartbeat; reused as the default vehicle for accept.

## Screen Design

Full-screen `MapView` (react-native-maps) is the workspace. A hamburger button (top-left) opens the drawer. Everything else is overlay.

### Map content

- Driver's current position rendered as the user pin (uses `showsUserLocation`).
- Map centers on driver on mount, follows until the user pans (standard behavior).
- When a request is focused, the map fit-bounds to (driver, pickup, drop) so the route is visible behind the sheet. Pickup pin (primary color) and drop pin (error color). No polyline.

### States

#### 1. Offline (default for a freshly-onboarded driver)

- Map + user pin.
- Bottom overlay: large primary-color **GO ONLINE** button (full-width, sticky bottom-safe-area).
- Disabled-and-greyed if the driver has zero vehicles. Inline CTA below: "Add a vehicle to go online" linking to the vehicles screen.
- Disabled-and-greyed if foreground-location permission is not granted. Inline CTA: "Grant location to go online".

#### 2. Online, idle (no incoming request focused)

- Map + user pin with a subtle pulse animation overlay.
- Bottom overlay: **GO OFFLINE** button (secondary-style) with caption "Looking for requests…" above it.
- If backlog count > 0: backlog chip floats just above the GO OFFLINE button, e.g. "3 requests waiting".

#### 3. Online, request focused

A bottom sheet covering ~60% of screen height slides up over the map. The sheet is non-dismissable by swipe; it only closes via Accept, Counter-offer (which transitions to the existing CounterOfferSheet), Skip, or countdown expiry.

Contents (top to bottom):

- Passenger row: avatar, name, rating + total trips (if present).
- Route: origin city → destination city, two lines with pin icons.
- Fare badge (proposed fare).
- Meta row: seats, time window (formatted date/time).
- Vehicle line: "Vehicle: {make} {model} · Change". Pre-selected from `STORAGE_KEYS.CURRENT_VEHICLE_ID`; falls back to the first item in `useMyVehicles`. "Change" opens a vehicle picker modal — extracted from today's `ride-requests/index.tsx` (lines 154-223 of that file) into a reusable `_components/VehiclePickerSheet.tsx` as part of this work, since the source file is being deleted. When the driver changes the vehicle here, the choice is persisted to `CURRENT_VEHICLE_ID`.
- Countdown ring (20 s) at top-right of the sheet, ticking down. Visible color shift in the last 5 s.
- Action buttons (in order, vertically):
  - **Accept {fare}** — primary. Calls `useAcceptRideRequest` with the selected vehicle. On success: close sheet, navigate to `/ride/{id}`. On "no longer available" / 409 error: close sheet, remove from backlog, toast "Request was taken by another driver".
  - **Counter-offer** — secondary. Opens the existing `CounterOfferSheet`. On submit/close: focused sheet closes; request goes into backlog (driver can re-open if they change their mind).
  - **Skip** — tertiary text button. Closes sheet; request id added to local `dismissed` Set; request moves to backlog.

#### 4. Backlog sheet

Triggered by tapping the backlog chip. A draggable bottom sheet over the map, ~50% height. Contains a `ScrollView` of `RideRequestCard`s for every request in the dismissed Set that is still present in the latest `useOpenRideRequestsForDrivers` payload. Tapping a card re-focuses it as state 3 (removing it from `dismissed` temporarily; on subsequent skip, it returns to backlog).

#### 5. No location permission

- Map renders normally (react-native-maps doesn't require permission to draw tiles) but without the user pin.
- GO ONLINE disabled with CTA "Grant location to go online". Tapping the CTA calls `Location.requestForegroundPermissionsAsync()`; if the user previously denied and the prompt won't re-show, the CTA opens app settings via `Linking.openSettings()`.

## State machine for incoming requests

Local state on `DriverHome`:

- `focusedRequestId: number | null`
- `dismissed: Set<number>` — request ids the driver has skipped, counter-offered, or that expired.
- `vehicleId: number | null` — currently chosen vehicle.

Selection algorithm, runs whenever `useOpenRideRequestsForDrivers` returns:

1. If `focusedRequestId` is set and that request is still present in the payload → keep it focused.
2. If `focusedRequestId` is set but the request has disappeared from the payload (accepted by someone else, cancelled) → clear it, no toast (silent — happens routinely).
3. Otherwise, pick the first request in the payload whose id is NOT in `dismissed`. That becomes `focusedRequestId`. Countdown starts at 20 s.

Backlog chip count = `payload.filter(r => dismissed.has(r.id)).length`. (Requests still open server-side but skipped locally.)

App-launch behavior: `dismissed` is initialized empty per session. To avoid bombarding a driver who opens the app while many requests are open, on first poll we treat the entire current payload as "seen": every request id in the first response goes into `dismissed`. The driver sees the backlog chip with count = N and opts in by tapping it. New requests arriving after first poll trigger the focused sheet normally.

Going offline (toggle off) while focused: close sheet, clear `focusedRequestId`, clear `dismissed`. Heartbeat stops via the existing `useDriverPresenceHeartbeat` `useEffect` that watches `isAvailableForRideRequest`.

## Error handling

- Accept fails with "already taken" / 409 → close sheet, remove from `dismissed` (it's gone anyway), toast.
- Accept fails for any other reason → keep sheet open, toast the error via `handleApiError`.
- Toggle-availability mutation fails → revert button state, toast the error.
- Heartbeat 403 → existing behavior: stop loop. The user object's `isAvailableForRideRequest` is whatever the server says after the next user fetch.
- Location permission revoked while online → next heartbeat tick will fail silently; show a one-time inline banner "Location permission required" and offer GO OFFLINE.

## Testing

Unit / interaction tests (Jest + React Native Testing Library, the existing setup used by `ModeProvider.test.tsx`):

- `DriverHome.test.tsx`:
  - Renders offline state when `isAvailableForRideRequest === false`.
  - Tapping GO ONLINE calls `toggleAvailability(true)`.
  - When availability flips true and a new request arrives, the focused sheet renders.
  - First-poll behavior: with three open requests on mount-online, no sheet appears and the chip reads "3 requests waiting".
  - Skipping a focused request moves it to backlog (chip increments, sheet closes).
  - Countdown expiry behaves identically to Skip.
  - Tapping the backlog chip opens the backlog sheet listing the dismissed requests.
  - Tapping a card in the backlog sheet re-focuses that request.
  - Changing vehicle inside the focused sheet persists to `STORAGE_KEYS.CURRENT_VEHICLE_ID`.
  - GO ONLINE is disabled when `useMyVehicles` returns an empty list, with the CTA visible.
- Existing `useDriverPresenceHeartbeat` and `ModeProvider` tests are unchanged.

Visual confirmation (manual): iOS sim run-through of offline → online → focused request → skip → backlog → re-focus → accept. No e2e harness exists for these flows.

## Migration & rollout

Single PR. No feature flag — the new behavior is strictly better and the old path (driver lands on /ride-requests) has no users who depend on it as a distinct URL (it's a drawer destination, not a deep link surface used externally).

Build number bump (iOS) as per existing release cadence. Android no special handling.

## What this fixes incidentally

"No drivers on passenger map" — once GO ONLINE is one tap from where a driver lands, drivers will toggle online and the heartbeat → `/driver-presence` → `/drivers/nearby` pipeline (already working) will populate the passenger map.

## Out of Scope

- Server-side decline endpoint (could be added later; current dismissal is local-only).
- Demand heatmap or surge visualization.
- Earnings or stats widget on driver home.
- Drawn polyline for the focused request's route.
- Push notifications for new requests when app is backgrounded (separate concern; existing notifications system covers ride-accepted but not new-request alerts to drivers — out of scope here).
- Pencil design updates (`.pen` file) — to be done after the implementation lands and we know the final visual.
