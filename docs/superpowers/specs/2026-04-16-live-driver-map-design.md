# Live Driver Map — Design

**Date:** 2026-04-16
**Audience:** Engineering
**Status:** Approved for planning
**Companion:** `2026-04-16-feature-gap-analysis.md` (this feature is a refinement of §3.1 row 2.1 "passing near you" and fills the gap left by the hardcoded `NEARBY_DRIVERS` constant)

---

## 1. Problem

The customer home screen (`mobile/src/app/(drawer)/index.tsx:20-26`) shows four hardcoded driver markers at fixed Harare coordinates. Customers cannot see real drivers, and drivers get no visibility benefit from being online. The goal is an inDrive-style live map where online drivers appear in near-real-time on the customer map as long as they are available and have the app open.

## 2. Scope

**In scope:**
- Drivers broadcast their location to the server while online and the app is in the foreground.
- Customers see all available drivers within their map bounds, refreshed every ~10s.
- Replace the hardcoded markers on the home screen with live data.

**Out of scope (explicitly deferred):**
- Background location broadcast (deferred to consolidated reqs §3.7 — active-trip GPS trails).
- Socket-based sub-second push (polling is sufficient for MVP).
- Heading/bearing rotation on the car icon.
- Smooth marker interpolation between polls.
- Economy vs Premium tier differentiation on the icon (waits on consolidated reqs §4.1).
- Separate per-account "share my location" toggle distinct from `isAvailableForRideRequest`.

## 3. Decisions

| # | Decision | Chosen | Rationale |
|---|---|---|---|
| 1 | When does a driver broadcast? | While `isAvailableForRideRequest = true` AND app is in the foreground | Matches inDrive-ish behaviour; drivers on any screen (chat, profile) stay visible; background mode deferred. |
| 2 | Transport | HTTP polling | Reuses the pattern chosen for notifications (`2026-04-05-notifications-polling-and-deep-links.md`); 10s latency is acceptable for "is there a car near me". |
| 3 | Storage | Dedicated `DriverPresence` table (1-1 with `User`) | Isolates high-churn writes from the already-crowded `User` model; clean truncation path. |
| 4 | Privacy — coordinate fidelity | Rounded to 4 decimal places (~11m) on server insert | Functionally exact, trims GPS noise, no meaningful information loss. P3 jitter can be added later as a one-line change. |
| 5 | Consent | `isAvailableForRideRequest` itself is the consent | One mental model: online = visible. No hidden-driver loophole. |
| 6 | Drivers on an active trip | Excluded from the public map | Showing a driver who can't accept is misleading; avoids a stream of dead-end requests. |
| 7 | Identity leaked pre-request | Only a hashed opaque `id` + lat/lng + vehicle category | No name/photo/phone/plate until the ride is accepted. Prevents driver-by-driver tracking across sessions. |

## 4. Architecture

```
Driver app (online + foreground)
  useDriverPresenceHeartbeat() hook
    enabled = user.isAvailableForRideRequest
           && AppState === 'active'
           && locationPermission === 'granted'
    Every 10s while enabled:
      expo-location.getCurrentPositionAsync()
      POST /api/driver/presence { lat, lng, accuracy }
    On enabled → false or unmount:
      POST /api/driver/presence/offline (fire-and-forget)

Server
  POST /api/driver/presence
    - Auth: JWT, must be a driver
    - 403 if !isAvailableForRideRequest
    - 403 if user has an active Ride | D2DBookingRequest | ChauffeurService
    - Rounds lat/lng to 4dp
    - Upserts DriverPresence by userId
  POST /api/driver/presence/offline
    - Deletes DriverPresence row (idempotent)
  GET /api/drivers/nearby?swLat=&swLng=&neLat=&neLng=
    - Auth: any authenticated user
    - Bounds clamped to max ~20km diagonal
    - SELECT DriverPresence JOIN User JOIN Vehicle
        WHERE updatedAt > now() - 30s
          AND latitude BETWEEN swLat AND neLat
          AND longitude BETWEEN swLng AND neLng
          AND user.isAvailableForRideRequest = true
          AND NOT EXISTS (Ride in ONGOING
                      | D2DBookingRequest in ACCEPTED|CONFIRMED
                      | ChauffeurService in ACCEPTED|ACTIVE)
        ORDER BY distance ASC LIMIT 50
    - Returns [{ id: hashedToken, latitude, longitude, vehicleCategory }]
    - Rate-limited at 30 req/min per user

Customer app (home map)
  useNearbyDrivers(bounds) — React Query, refetchInterval: 10s
    Paused when app backgrounded or map unmounted
    Bounds updated via onRegionChangeComplete (debounced 500ms)
  Replaces NEARBY_DRIVERS constant in (drawer)/index.tsx
```

## 5. Schema

New model:

```prisma
model DriverPresence {
  userId            Int      @id
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentVehicleId  Int?
  currentVehicle    Vehicle? @relation("DriverPresenceVehicle", fields: [currentVehicleId], references: [id])
  latitude          Float
  longitude         Float
  accuracy          Float?
  updatedAt         DateTime @updatedAt
  createdAt         DateTime @default(now())

  @@index([updatedAt])
  @@index([latitude, longitude])
}
```

Back-relation on `Vehicle`:

```prisma
presenceAsCurrentVehicle  DriverPresence? @relation("DriverPresenceVehicle")
```

**No changes to `User`.** Presence is kept out of the user model deliberately.

**Migration:** new table + back-relation only — zero risk to existing data.

**Stale cleanup:** a small scheduler (reuse whatever interval mechanism the rental reminder flags use, or a plain `setInterval` in server bootstrap for MVP) runs every 60s and deletes rows with `updatedAt < now - 30s`. The nearby query also filters by freshness, so correctness does not depend on the cleanup job — it exists only for table hygiene. The exact "active trip" set that excludes a driver from the public map is the union of: `Ride.status = ONGOING`, `D2DBookingRequest.status in (ACCEPTED, CONFIRMED)`, `ChauffeurService.status in (ACCEPTED, ACTIVE)`. Terminal or pre-trip states (`DRAFT`, `PUBLISHED`, `COMPLETED`, `CANCELLED`, `EXPIRED`, `DECLINED`, `DISPUTED`, `POSTED`) do not exclude the driver.

## 6. API contract

### `POST /api/driver/presence`

Request:
```ts
{
  latitude: number,        // -90..90
  longitude: number,       // -180..180
  accuracy?: number,       // meters
  currentVehicleId?: number
}
```

Response: `{ ok: true, expiresInSec: 30 }`

Errors:
- `400` — lat/lng out of range, or `currentVehicleId` not owned by the user
- `401` — no/invalid JWT
- `403` — user is not a driver, or not available, or on an active trip (code: `ON_ACTIVE_TRIP`)

Server behaviour:
- Rounds `latitude` and `longitude` to 4 decimal places before persisting.
- Upserts the row by `userId`. `updatedAt` is handled by Prisma.

### `POST /api/driver/presence/offline`

No body. Returns `{ ok: true }`. Deletes the user's `DriverPresence` row if one exists; noop otherwise.

### `GET /api/drivers/nearby`

Query params:
```
swLat, swLng, neLat, neLng   (float, required)
```

Response:
```ts
{
  drivers: Array<{
    id: string,                                        // HMAC(userId + rotating-daily-secret)
    latitude: number,
    longitude: number,
    vehicleCategory: 'CAR' | 'MOTORBIKE'
  }>,
  fetchedAt: string                                    // ISO
}
```

Server behaviour:
- Clamps the bounding box to a max diagonal of ~20km. Over-sized requests are clamped silently.
- Caps the result at 50 rows, ordered by distance from bbox centroid.
- Returns the HMAC-hashed `id` token. The secret rotates daily so tokens are not stable across days — prevents long-horizon driver tracking by a hostile customer.
- Rate-limited per requesting user at 30 req/min (headroom over a 10s poll). The same limit applies to `POST /api/driver/presence`.
- The HMAC secret rotation key changes at 00:00 UTC daily.

## 7. Mobile integration

### Driver side

**Hook:** `mobile/src/hooks/useDriverPresenceHeartbeat.ts`

Mounted once in the authenticated drawer layout (`mobile/src/app/(drawer)/_layout.tsx`) so it runs regardless of which screen the driver is on.

```
enabled = user.isAvailableForRideRequest
       && AppState === 'active'
       && locationPermission === 'granted'

On enabled → true:
  Immediate first heartbeat, then setInterval(10s)
  Each tick: getCurrentPositionAsync() → POST /api/driver/presence
  On 403 ON_ACTIVE_TRIP → stop loop silently
  On network error → skip tick, retry next interval (no stacking)

On enabled → false or unmount:
  Clear interval
  POST /api/driver/presence/offline (fire-and-forget)
```

**Availability toggle hardening** (in the profile screen where `isAvailableForRideRequest` is flipped):
- Before flipping ON, request `expo-location` foreground permission.
- If denied, disable the toggle with a tooltip: "Location permission is required to go online."
- If the driver has **zero vehicles**, block the toggle entirely with an alert: "You need at least one vehicle on your profile before you can go online."
- If the driver has more than one vehicle, prompt "Go online with which vehicle?" → stored in AsyncStorage as the current `currentVehicleId`. Single-vehicle drivers skip the prompt.

### Customer side

**Hook:** `mobile/src/hooks/useNearbyDrivers.ts`

```
React Query:
  queryKey: ['drivers-nearby', bounds]
  queryFn: GET /api/drivers/nearby?...
  refetchInterval: 10_000
  enabled: !!bounds && AppState === 'active'
```

**Home screen changes** — `mobile/src/app/(drawer)/index.tsx`:
- Delete the `NEARBY_DRIVERS` constant (lines 20-26).
- Track `bounds` in state, updated from `onRegionChangeComplete` (debounced 500ms — do not use `onRegionChange`).
- `const { data } = useNearbyDrivers(bounds);`
- Render `data?.drivers ?? []` through the same `<Marker>` JSX that currently renders the hardcoded list — keyed on `driver.id`, icon chosen from `vehicleCategory`.

**AppState handling:** both hooks subscribe to a shared `useAppState()` listener to pause intervals when the app is backgrounded. If no shared listener exists, add a small one.

**Translations:** new English + Kinyarwanda strings for the permission prompt and the vehicle picker.

## 8. Acceptance criteria

1. Driver flips "Available for ride requests" ON with location permission granted → their car appears on the customer home map within ~10s at their current location.
2. Driver flips OFF, backgrounds the app, or logs out → their car disappears from the customer map within ~30s.
3. A driver on an active `Ride`, `D2DBookingRequest`, or `ChauffeurService` does **not** appear on the public map.
4. Customer pans or zooms the map → nearby drivers refresh for the new bounds within one poll interval.
5. Network interruption during a heartbeat → next tick recovers silently, no crash, no retries piled up.
6. Permission denied → availability toggle is disabled with an explanatory tooltip; app never crashes trying to read location.
7. The hardcoded `NEARBY_DRIVERS` constant no longer exists in `mobile/src/app/(drawer)/index.tsx`.
8. `GET /api/drivers/nearby` never returns a driver's real `userId`, name, phone, photo, or plate; only the hashed token, coordinates, and vehicle category.

## 9. Testing approach

- **Unit:** coordinate-rounding helper, bounding-box clamp, hashed-id token generator (incl. daily rotation behaviour).
- **Integration:** controller tests for each of the three endpoints, including the 403 active-trip case and the unavailable-driver case.
- **Manual (required):** two physical devices (one driver, one customer) on different accounts. Verify the golden path (driver goes online → visible to customer within 10s → driver accepts a request → disappears from the public map) and the failure cases (permission denied, network drop mid-heartbeat, driver backgrounds the app).

## 10. Open questions

None at design time. Implementation-time uncertainties to flag if they arise:

- If the hashed-id daily rotation causes visible flicker at midnight (marker disappears/reappears), soften by pinning the token within an active session.
- If mobile `AppState` transitions prove unreliable, fall back to heartbeat on a timer + server-side staleness filter (already in place, so this is a belt-and-braces option).
