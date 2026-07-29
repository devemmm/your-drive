# Bus Booking — Maestro E2E Design

**Status:** approved by user, ready for implementation plan
**Driver milestone:** Phase B / Payment 3 — Bus Ticket Booking ($250, per `docs/project/contract.md`)
**Related prior spec:** [`2026-05-07-mobile-e2e-maestro-design.md`](./2026-05-07-mobile-e2e-maestro-design.md) (foundational Maestro setup, auth flows)
**Target platform:** iOS only (matches existing Maestro slice; Android remains smoke-only)

## Goal

Prove the bus booking journey works end-to-end via automated UI tests on iOS, suitable for client demo and milestone sign-off. Cover both sides of the journey:

1. **Passenger experience:** search a bus ride, book it, see attendance code, see boarded/completed status.
2. **Driver experience:** post a bus ride through the 5-step wizard, approve a booking, start the ride, mark a passenger boarded on the manifest.

## Non-goals

- In-app payment integration (the app is "cash on trip" today — `docs/mobile-app-test-script.md` §18 and `post-ride/index.tsx:433-443`).
- QR-camera scanning from the manifest (Maestro can't easily produce a camera image; manifest "Board" button covers the same endpoint).
- Driver "Go Online for ride requests" or chauffeur availability (bus booking does not depend on either).
- Two-emulator real-time flows. Each Maestro flow is single-emulator, single-role, partner role puppeted via `/api/v1/test/*`.
- Declined-booking, cancelled-ride, and UI-driven ride completion. Noted as follow-ups at the end.

## Architecture

Two Maestro flows mirror each other across the same bus booking journey on one iOS simulator. They share the same `helpers/reset.yaml`, the same seed extension, and the same set of new test endpoints — only the *direction* changes (who's in UI, who's puppeted).

```
mobile/.maestro/flows/bus/
  passenger-book-and-board.yaml   # passenger UI, driver puppeted
  driver-setup-and-onboard.yaml   # driver UI, passenger puppeted

mobile/.maestro/scripts/
  approve-booking.js              # POST /api/v1/test/bookings/:id/approve
  board-booking.js                # POST /api/v1/test/bookings/:id/board
  set-ride-status.js              # POST /api/v1/test/rides/:id/status
  latest-ride.js                  # GET  /api/v1/test/users/:id/latest-ride
  passenger-book.js               # POST /api/v1/test/rides/:id/book
```

Convention follows `mobile/.maestro/README.md`: the role under test runs in the UI; the partner role's actions are puppeted via `/api/v1/test/*`.

## Flow 1 — Passenger book and board

File: `mobile/.maestro/flows/bus/passenger-book-and-board.yaml`

```
 1. reset.js puppet                         → seeds users, BUS vehicle for Dan,
                                              PUBLISHED bus ride (Kigali → Huye,
                                              today + 1h), wallet/commission rows.
                                              Emits output.passengerEmail,
                                                    output.password,
                                                    output.rideId.
 2. Launch app, clearState, permissions all → welcome screen
 2a. setLocation Kigali                      → simulator GPS = Kigali so the
                                              home sheet's currentAddress
                                              matches the seeded ride's
                                              departureCity. See Risks.
 3. Login as Alice (passenger)              → home.screen + home.map
 4. Open bottom sheet                       → tap home.vehicleTab.BUS
 5. Tap home.searchBar                      → LocationPicker (test-mode list)
 6. Tap picker.item.huye                    → destination set
 7. Tap home.modeBtn.find                   → mode = find, date defaults today,
                                              passengers 1
 8. Tap home.searchRidesButton              → /ride/search-results
 9. Assert search.firstCard visible         → tap it
10. ride/[id]: tap ride.bookButton          → booking PENDING
11. assertVisible ride.bookingBanner with
    ride.bookingStatus = "PENDING"

11a. find-booking.js puppet                  → GET /test/rides/:rideId/booking-
                                              for-passenger/:passengerId,
                                              sets output.bookingId
12. approve-booking.js puppet                → driver approves Alice's booking
13. swipe-down refresh                      → assertVisible ride.bookingStatus
                                              = "APPROVED"
14. assertVisible ride.attendanceQr

15. set-ride-status.js puppet → ONGOING    → driver starts ride
16. Navigate to /ride/{id}/active          → assertVisible rideActive.screen

17. board-booking.js puppet                → driver marks Alice boarded
18. Navigate back to /ride/{id} and pull-refresh
                                             → assertVisible boarded indicator
                                              on ride.bookingBanner

19. set-ride-status.js puppet → COMPLETED  → ride completes
20. Pull-refresh on /ride/{id}              → assertVisible ride.bookingStatus
                                              = "COMPLETED"
```

Pull-to-refresh in steps 13/18/20 leans on React Query's existing refresh hooks. If a step proves flaky, fallback order is: (a) pull-to-refresh, (b) navigate back + re-tap into ride, (c) extend `extendedWaitUntil` timeout. The seeded ride's `bookingId` is returned by `reset.js` only if we choose to pre-create the booking — for Flow 1 the passenger creates it through UI, so `bookingId` is captured by post-tap polling on the `/api/v1/test/users/:id/latest-booking` endpoint (a small additional helper, or by querying the ride detail API and extracting the active booking).

### Bookings ID resolution in Flow 1

Because the passenger creates the booking in UI (step 10), the flow needs the new `bookingId` for the `approve-booking.js` and `board-booking.js` puppets. Step 11a uses a dedicated helper:

- New endpoint: `GET /api/v1/test/rides/:rideId/booking-for-passenger/:passengerId` returns `{ bookingId, status, attendanceCode }` for the most recent booking on that ride owned by that passenger.
- New puppet: `find-booking.js` reads `MAESTRO_RIDE_ID` + `MAESTRO_PASSENGER_ID` (both set by reset.js), calls the GET, sets `output.bookingId`.

Subsequent puppet calls (`approve-booking.js`, `board-booking.js`) read `MAESTRO_BOOKING_ID` from the flow's `env:` block, which is set from `output.bookingId`.

## Flow 2 — Driver setup and onboard

File: `mobile/.maestro/flows/bus/driver-setup-and-onboard.yaml`

```
 1. reset.js puppet                         → same seed (pre-seeded ride is ignored
                                              by this flow). Emits output.driverEmail,
                                                                  output.password,
                                                                  output.driverId,
                                                                  output.bookingPassengerId
                                              (Alice's user id).
 2. Launch app, clearState
 3. Login as Dan (driver)                   → home.screen
 4. Open drawer                             → tap drawer.postRide
 5. Step 1 (Route):                         → form auto-fills today + now()
    - tap postRide.originField              → LocationPicker
    - tap picker.item.kigali                → set
    - tap postRide.destinationField         → LocationPicker
    - tap picker.item.huye                  → set
    - tap postRide.nextButton               → step 2
 6. Step 2 (Vehicle):
    - tap postRide.vehicleCard.{busVehicleId} → selected
    - leave seats default, tap nextButton   → step 3
 7. Step 3 (Preferences): tap nextButton    → step 4 (defaults)
 8. Step 4 (Pricing):
    - inputText "5000" in postRide.contributionInput
    - tap postRide.bookingType.MANUAL
    - tap nextButton                        → step 5
 9. Step 5 (Review): tap postRide.publishButton
                                             → "Success" alert
10. Tap "OK"                                → back on home.screen

11. latest-ride.js puppet                   → GET latest published ride for Dan
                                              → output.rideId
12. passenger-book.js puppet                → Alice books the ride
                                              → output.bookingId

13. Navigate via drawer.rides → tap         → ride detail screen for the new ride.
    newest ride in My Rides                  (Drawer-driven instead of deep-link
                                              because Maestro can't invoke
                                              router.push directly. Requires
                                              testIDs on the My Rides list
                                              items: `myRides.row.{rideId}`.)
14. assertVisible ride.passengers.list
15. assertVisible ride.passenger.{bookingId}.row
16. Tap ride.passenger.{bookingId}.approveButton
                                             → assertVisible
                                               ride.passenger.{bookingId}.status
                                               = "APPROVED"

17. Tap ride.startRideButton                → confirmation alert
18. Tap "Start" on alert                    → assertVisible ride banner
                                              showing ONGOING status

19. Dismiss "Open tracker" alert (tap        → back on ride detail. Then tap a
    "Not yet"). From ride detail tap         "View manifest" entry on the
    ride.viewManifestButton (new testID)     ride detail driver banner — add
                                              this if not present so the
                                              manifest screen is reachable
                                              without a deep link.
20. assertVisible manifest.row.{bookingId}
21. Tap manifest.boardButton.{bookingId}     → assertVisible
                                               manifest.boardedBadge.{bookingId}

22. set-ride-status.js puppet → COMPLETED   → completes ride
    (UI completion button requires now > departureTime, server-side check
     at ride.controller.ts:1897; deferred to follow-up flow)
```

## App-side changes

### testIDs

Convention: `screen.element` (already documented in `mobile/.maestro/README.md`). Bundled into the Flow 2 implementation PR.

| Screen / Component | testIDs |
|---|---|
| `HomeBottomSheet.tsx` | `home.bottomSheet`, `home.vehicleTab.{CAR\|MOTORBIKE\|BUS}`, `home.searchBar`, `home.modeBtn.{request\|find}`, `home.dateField`, `home.paxField`, `home.paxIncrement`, `home.paxDecrement`, `home.searchRidesButton` |
| `LocationPicker.tsx` | `picker.searchInput`, `picker.item.{slug}` on each row (slug derived from city name in test mode) |
| `ride/search-results.tsx` + `RideResultCard` | `search.list`, `search.firstCard`, `search.resultCard.{rideId}`, `search.filterBar.{P2P\|D2D}` |
| `ride/[id]/index.tsx` | `ride.bookButton`, `ride.bookingBanner`, `ride.bookingStatus`, `ride.attendanceQr`, `ride.driverBanner`, `ride.startRideButton`, `ride.cancelBookingButton`, `ride.cancelRideButton`, `ride.viewManifestButton`, `ride.passengers.list`, `ride.passenger.{bookingId}.row`, `ride.passenger.{bookingId}.approveButton`, `ride.passenger.{bookingId}.declineButton`, `ride.passenger.{bookingId}.status` |
| My Rides list (drawer screen) | `myRides.list`, `myRides.row.{rideId}` |
| `ride/[id]/active.tsx` | `rideActive.screen`, `rideActive.eta`, `rideActive.driverName`, `rideActive.callButton`, `rideActive.chatButton` |
| `ride/[id]/manifest.tsx` | `manifest.list`, `manifest.row.{bookingId}`, `manifest.boardButton.{bookingId}`, `manifest.boardedBadge.{bookingId}`, `manifest.scanFab` |
| `ride/[id]/complete.tsx` | `rideComplete.screen`, `rideComplete.rateInput`, `rideComplete.submitButton`, `rideComplete.skipButton` |
| `post-ride/index.tsx` | `postRide.header`, `postRide.nextButton`, `postRide.publishButton`, `postRide.step.{0..4}`, `postRide.originField`, `postRide.destinationField`, `postRide.dateField`, `postRide.timeField`, `postRide.vehicleCard.{vehicleId}`, `postRide.seatsInput`, `postRide.contributionInput`, `postRide.bookingType.{AUTOMATIC\|MANUAL}`, `postRide.acToggle`, `postRide.smokingToggle`, `postRide.successOk` |
| Drawer | confirm `drawer.postRide`, `drawer.rides` exist; add if missing |

### LocationPicker test-mode override

When `process.env.EXPO_PUBLIC_TEST_MODE === "1"` (set on test builds only, via `mobile/.env.test`), `LocationPicker` short-circuits the Google Places autocomplete query. In `cities` mode it renders a curated list from `mobile/src/lib/rwandaCities.ts` (already exists); in `addresses` mode it falls back to the same curated list. List items emit stable testIDs `picker.item.{slug}`. Production builds never set `EXPO_PUBLIC_TEST_MODE` and are unaffected.

## Server-side changes

### Test seed extensions (`server/src/services/testSeed.service.ts`)

After the existing user fixture creation, idempotently:

1. **Settings rows:** upsert one `WalletSettings` row (`enforceDebtLimit: false`, `defaultDebtLimitCents: 500000`), one `CommissionSettings` row (`rate: 10`), one active `FeeSetting` with `type: DEFAULT_PLATFORM_FEE, amount: 1`.
2. **Driver vehicle:** Dan gets a BUS-category vehicle (`make: "Volvo", model: "9700", year: 2022, color: "White", plateNumber: "RAD 999 BUS", capacity: 30, verified: true`), with a `pickupLocation` in Kigali. Delete-then-create on Dan's `userId` so reruns are idempotent.
3. **Funded wallets:** Alice, Bob, Dan, Dora each get `walletBalanceCents: 5_000_000` (RWF 50,000). Defensive; current bus flow doesn't gate on this, but the user explicitly asked the seed to cover wallet state for future-proofing.
4. **Pre-seeded ride:** Dan publishes a BUS ride from Kigali → Huye, `departureTime: now + 1h`, `estimatedArrivalTime: now + 3h`, `contribution: 5000`, `bookingType: MANUAL`, `status: PUBLISHED`. Locations (`Kigali`, `Huye`) are created here from `rwandaCities.ts` coordinates.

`SeedResult` grows to expose:

```ts
{
  rideId: number;
  busVehicleId: number;
  kigaliLocationId: number;
  huyeLocationId: number;
  // existing fields: password, users, registerTarget, inviter
}
```

`reset.js` puppet maps these to `output.rideId`, `output.busVehicleId`, etc.

### New test endpoints

Added to `test.routes.ts` and `test.controller.ts`. All gated by `NODE_ENV !== "production"` and the `x-test-token` header (existing pattern).

| Method | Path | Body / Params | Effect |
|---|---|---|---|
| `POST` | `/api/v1/test/bookings/:id/approve` | — | Sets `Booking.status = APPROVED` |
| `POST` | `/api/v1/test/bookings/:id/board` | — | Updates the booking's first `BookingSeat.attendedAt = now()` |
| `POST` | `/api/v1/test/rides/:id/book` | `{ passengerId: number, seats?: number }` | Creates a `Booking` (status PENDING) on the ride for the passenger, including one `BookingSeat` with a generated `attendanceCode`. Returns `{ bookingId, attendanceCode }`. |
| `GET` | `/api/v1/test/users/:id/latest-ride` | — | Returns the most recently created `PUBLISHED` ride for that driver, `{ rideId, departureTime }` |
| `GET` | `/api/v1/test/rides/:rideId/booking-for-passenger/:passengerId` | — | Returns the most recent booking on that ride for that passenger: `{ bookingId, status, attendanceCode }` |

Reuse existing `POST /api/v1/test/rides/:id/status` for `ONGOING` and `COMPLETED` transitions.

### New Maestro JS puppets (`mobile/.maestro/scripts/`)

All read inputs from env vars set by the calling flow's `env:` block (same pattern as the existing `fetch-otp.js`):

- `approve-booking.js` — reads `MAESTRO_BOOKING_ID`, posts to `/test/bookings/:id/approve`.
- `board-booking.js` — reads `MAESTRO_BOOKING_ID`, posts to `/test/bookings/:id/board`.
- `set-ride-status.js` — reads `MAESTRO_RIDE_ID`, `MAESTRO_RIDE_STATUS`, posts to `/test/rides/:id/status`.
- `latest-ride.js` — reads `MAESTRO_DRIVER_ID`, GETs `/test/users/:id/latest-ride`, sets `output.rideId`.
- `passenger-book.js` — reads `MAESTRO_RIDE_ID`, `MAESTRO_PASSENGER_ID`, posts to `/test/rides/:id/book`, sets `output.bookingId`.
- `find-booking.js` — reads `MAESTRO_RIDE_ID`, `MAESTRO_PASSENGER_ID`, GETs `/test/rides/:rideId/booking-for-passenger/:passengerId`, sets `output.bookingId`.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Native date/time pickers in post-ride wizard are hard to drive from Maestro | Don't drive them. Step 1 of the wizard auto-fills `departureDate` and `departureTime` on mount (`post-ride/index.tsx:234-241`). Flow 2 taps Next on the route step after picking cities — seeded defaults are accepted by validation. Explicit date/time picking is a follow-up flow. |
| `completeRide` server-side check requires `now > departureTime` (`ride.controller.ts:1897`) | Flow 2 uses `set-ride-status.js → COMPLETED` puppet to bypass. The UI completion button gets its own dedicated test later, with seed override that uses a past departure time. |
| React Query cache may not auto-invalidate after API puppet calls | Try in order: (a) pull-to-refresh on the ride detail screen, (b) navigate back + re-tap, (c) longer `extendedWaitUntil` timeout. Socket invalidation hooks likely cover most cases; verify during implementation. |
| Push notification permission prompt fires mid-flow | `launchApp.permissions.all: allow` (already in `smoke.yaml`) auto-grants. JIT permission code in `handleBook`/`handlePublish` won't show a UI prompt because iOS auto-allows. |
| iOS "Save Password" dialog after login | Existing pattern: `tapOn { text: "Not Now", optional: true }` after auth interactions. Both flows pick this up. |
| Google Places latency for non-test builds running tests | `LocationPicker` test-mode override is gated by `EXPO_PUBLIC_TEST_MODE === "1"`. Test build sets it via `mobile/.env.test`; prod builds never set it. |
| Flow 2 wall-clock time (~2 min: wizard + booking + manifest + complete) | Acceptable for a demo flow. Per-action puppets remain composable; can split later. |
| Two-emulator runs | Not needed. Both flows are single-emulator, single-role, partner role puppeted via API. |
| iOS simulator default location is Cupertino — passenger `currentAddress` would not match the seeded ride's `Kigali` origin city, so search returns zero results | Flow 1 step 2a calls Maestro's `setLocation: { latitude: -1.9441, longitude: 30.0619 }` before login. Flow 2 doesn't need it (driver doesn't search). Reverse-geocoding the simulator coords still depends on `useCurrentLocation`'s pipeline — if the resolved address string doesn't include "Kigali", fall back to relaxing the server-side `originCity` filter to allow blank/wildcard so the test passes. Verify during implementation. |

## Out of scope / follow-ups

Captured here so they're tracked but not designed:

- `bus/decline-booking.yaml` — driver declines a PENDING booking with a reason.
- `bus/cancel-ride.yaml` — driver cancels a published ride; passenger sees CANCELLED status.
- `bus/complete-ride-ui.yaml` — completes the ride through the UI completion button (requires a seed variant with `departureTime` in the past).
- Rate-and-complete (`ride/[id]/complete.tsx`) — passenger rates the ride. Same seed variant.
- Android coverage for bus booking — deferred per existing slice convention.

## Acceptance

This spec is accepted when:

1. Both flows pass on iOS simulator locally against the test backend.
2. Running the suite N times in a row produces no flake (per the README's flake check for auth flows).
3. The two flows can be demo'd to the client as proof of Phase B deliverable.
