# Buses + Wallet Foundation — Design

**Date:** 2026-04-18
**Slice:** 1 of N in the feature-gap implementation rollout
**Tracker:** `docs/superpowers/tracking/implementation-status.md`
**Source specs:**
- `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md`
- `docs/superpowers/specs/2026-04-16-consolidated-requirements.md` (§5 bus, §3.3 wallet)
- `docs/client-requests/bus-ticketing.md` (original client request; see §12 for deviations)

---

## 1. Summary

Build the bus-ticketing module and the driver wallet together, because they share one piece of new infrastructure (cash-trip commission debit) and neither works without it.

The bus module rides on the existing `Ride` / `Booking` / `BookingSeat` machinery: a scheduled bus trip is a `Ride` whose vehicle has `category = BUS` and whose `routeId` points to a new `BusRoute`. All booking, seat-holding, attendance, and notification code is reused. The only genuinely new code is: route CRUD, route-based search, QR-rendering of the existing `attendanceCode`, and the cash commission debit.

The wallet is a single column (`User.walletBalanceCents`) and two new `TransactionType` values, not a separate `Wallet` table. Debts create a negative Transaction and decrement the column atomically. A debt-limit check gates the existing availability toggles. Admin can manually credit. Full `Wallet`/`WalletLedger` tables (§3.3 of consolidated reqs) are a deferred upgrade path.

## 2. Scope

**In scope:**
- Bus module foundation: operators, routes with stops, BUS vehicle category, route-based search, passenger booking (reuses existing ride booking), bus-driver manifest with QR-scan boarding.
- Minimal wallet: `walletBalanceCents` column, debt limit, debt-limit gate on availability toggles, driver-facing balance screen, admin manual-credit tab.
- OFF_PLATFORM commission debit applied to **all** OFF_PLATFORM rides (buses + any future cash-collected P2P trips), not just buses.

**Out of scope (deferred to later slices, tracked):**
- Signed / cryptographic QR payloads, offline scanner with public-key validation
- Bus agent cash-sale + printed-ticket flow (§5.4 of consolidated reqs)
- SMS/USSD booking (§5.7–8; depends on gateway + MoMo)
- Real payment-gateway adapters (DPO / MoMo / Airtel); MANUAL gateway scaffolding
- Full `Wallet` + `WalletLedger` + `WalletTopupRequest` table migration
- RWF / Rwanda VAT localization
- Bus-specific cancellation refund rules (§5.10 of consolidated reqs) — cash trips have no platform-held funds to refund
- KYC + background-check gating
- Recurring-schedule auto-spawner (admin creates each Ride manually; a Schedule model can come later)

## 3. Architecture decision

**Decision: buses are a vehicle-category specialization of the existing `Ride`/`Booking` model, not a parallel module.**

A scheduled bus trip =
- `Ride` with `type = P2P`, `vehicle.category = BUS`, `routeId = <BusRoute>`, `contributionCollectionMethod = OFF_PLATFORM`, `driverId = <bus driver user>`, `totalSeats = <bus capacity>`, `contribution = <fare>`.
- `vehicle.userId` = the operator user (User with `role = BUS_OPERATOR`).
- Passenger bookings = existing `Booking` rows with seats and `attendanceCode`.

Alternatives considered and rejected:
- **Parallel `BusTrip` / `BusSeat` / `BusTicket` tables (per §5.2 of consolidated reqs).** Rejected — duplicates ride/booking/settlement machinery; doubles surface area.
- **`Trip` supertype with Ride/BusTrip subclasses.** Rejected — too much refactor of working code for MVP with no immediate benefit.

Consequences:
- The only bus-specific rows are `BusRoute` + `BusRouteStop`. Everything else reuses existing machinery.
- `Ride` takes a nullable `routeId`; non-bus rides keep it null.
- Bus drivers and operators are both just `User` rows. Operator has `role = BUS_OPERATOR`; the bus driver is assigned per-trip via `Ride.driverId`.
- Server-side filtering and admin filters use `vehicle.category = BUS` to pick out bus workflows.

## 4. Schema deltas

**Enums:**
```prisma
enum VehicleCategory {
  CAR
  MOTORBIKE
  BUS          // new
}

enum UserRole {
  USER
  ADMIN
  BUS_OPERATOR // new
}

enum TransactionType {
  // existing values...
  COMMISSION_DEBIT  // new — ride commission collected from owner/operator on OFF_PLATFORM completion
  WALLET_CREDIT     // new — admin manual credit to driver wallet
}
```

**New models:**
```prisma
model BusRoute {
  id          Int      @id @default(autoincrement())
  operatorId  Int
  operator    User     @relation("OperatorRoutes", fields: [operatorId], references: [id])
  originCity  String
  destCity    String
  distanceKm  Float
  basePrice   Decimal  @db.Decimal(10, 2)
  isActive    Boolean  @default(true)
  stops       BusRouteStop[]
  rides       Ride[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([originCity, destCity, isActive])
}

model BusRouteStop {
  id        Int      @id @default(autoincrement())
  routeId   Int
  route     BusRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  name      String
  city      String
  order     Int
  latitude  Float?
  longitude Float?

  @@index([routeId, order])
}

model WalletSettings {
  id                    Int     @id @default(autoincrement())
  defaultDebtLimitCents Int     @default(500000) // 5,000 RWF placeholder (see §11 open questions)
  enforceDebtLimit      Boolean @default(false)  // off by default on migration; admin flips on after wallets are seeded
  updatedAt             DateTime @updatedAt
}
```

**Field additions:**
- `User.walletBalanceCents Int @default(0)`
- `User.walletDebtLimitCents Int?` — per-user override of `WalletSettings.defaultDebtLimitCents`
- `Ride.routeId Int?` + `route BusRoute? @relation(fields: [routeId], references: [id])`
- `Vehicle.seatLayout Json?` — ordered list of seat labels for the seat-picker grid (e.g. `["1A","1B","2A",...]`). Null = flat seat count, existing behavior.
- `Booking.boardingStopId Int?` + `boardingStop BusRouteStop?` — optional passenger-selected boarding point
- `Booking.alightingStopId Int?` + `alightingStop BusRouteStop?` — optional passenger-selected alighting point

**`BookingSeat.lockedUntil`** — may already exist as part of seat-hold logic. If not, add: `lockedUntil DateTime?` with a 2-minute hold on booking initiation and release on timeout. Verify during implementation.

## 5. Mobile — passenger

The home-screen vehicle-type selector already has a disabled `BUS` option. This slice enables it.

1. **Select Bus** on vehicle type → search form (origin, destination, date).
2. **Server matches** `BusRoute.originCity` / `destCity` against entered values instead of free-form geocoding when vehicle category is BUS.
3. **Results** = list of `Ride` rows where `vehicle.category = BUS`, route matches, `departureTime` is on the selected date, `availableSeats > 0`. Each row shows: operator name, departure time, fare, stops.
4. **Trip detail** — full stop list (times, boarding/alighting options), operator, plate, seat count, fare. Passenger optionally picks boarding and alighting stops (default = origin / dest).
5. **Seat pick** — if `vehicle.seatLayout` present, show grid; else pick quantity (existing behavior). Selected seats lock via `BookingSeat.lockedUntil` for 2 min.
6. **Confirm booking** — calls existing `POST /api/ride/:id/book` with `contributionCollectionMethod = OFF_PLATFORM`. Response = existing Booking + BookingSeat rows.
7. **Ticket view** — existing booking detail, with:
   - Prominent attendance code.
   - **QR code rendered visually** — plain text of the attendance code, encoded as a QR. No JWT, no signature.
   - Route, stops, departure time.
   - Banner: "Pay cash to conductor on boarding."

## 6. Mobile — bus driver

New screen: trip **manifest** (`mobile/src/app/ride/[id]/manifest.tsx` or a mode of the existing active-ride screen).

- Rows: `{ passengerName, seats, attendanceCode (short), boardingStopName, [Boarded ✓ | ⬜] }`.
- **FAB: Scan QR.** Opens camera → decodes → extracts attendance code → calls existing attend endpoint → row flips to ✓. On double-scan, server returns an error and UI shows "Already boarded".
- **Tap row → "Mark boarded" button** — fallback when QR won't scan (lighting, damaged screen). Same endpoint.
- Manifest is fetched when driver opens the screen; no offline sync. Drivers have mobile data on a bus; if they don't, they can mark boarded after the fact.
- Server endpoint (existing or new): `PATCH /api/booking-seat/attend` body `{ attendanceCode }` — validates code belongs to an active ride and seat is not already attended, sets `attendedAt`.

## 7. Mobile — driver wallet

New drawer item: **Wallet**.
- Balance (formatted: "RWF 7,500" once localization lands; today, currency comes from `DEFAULT_CURRENCY`).
- Debt-limit line: "Limit: -RWF 5,000 / Available: RWF 12,500".
- Recent 20 `Transaction` rows (debits and credits).

**Availability-toggle gate:**
- `PATCH /api/user/availability` with `isAvailableForRideRequest = true` or `isAvailableForChauffeur = true`:
  - If `WalletSettings.enforceDebtLimit = true` and `walletBalanceCents < -(walletDebtLimitCents ?? WalletSettings.defaultDebtLimitCents)`, return 403 `{ error: "WALLET_DEBT_LIMIT", message: "Top up wallet to go online" }`.
- Mobile UI: toggle disabled with inline message when 403 received; "How do I top up?" link → info screen ("Contact your admin to add credit").

**Low-balance banner** (home screen): when balance drops below 50% of remaining room to debt limit, show a dismissable banner.

## 8. Admin

**New tabs** under `client/src/pages/admin/tabs/`:
- `BusOperatorsTab` — list users with `role = BUS_OPERATOR`; create / edit (name, phone, email, status). Reuses existing user form plumbing.
- `BusRoutesTab` — CRUD routes. Form: operator picker, originCity, destCity, distanceKm, basePrice, isActive, nested ordered-stops editor.
- `DriverWalletsTab` — table of users with `walletBalanceCents`; filter: `< 0`, `< -debtLimit`, `role = BUS_OPERATOR`, etc. **Credit action** → modal (amount, reason, required) → atomically: insert `Transaction { type: WALLET_CREDIT, amount, userId, notes: reason, adminUserId }` and increment `walletBalanceCents`.
- `WalletSettingsTab` — edit the single `WalletSettings` row (`defaultDebtLimitCents`, `enforceDebtLimit`).

**Changes to existing tabs:**
- `VehiclesTab` — Category dropdown gains BUS; when BUS is selected, show capacity + seat-layout JSON editor.
- `RidesTab` — filter "Vehicle category"; route column; stops visible in drill-down.
- `UsersTab` — role column surfaces BUS_OPERATOR; optional balance column (can be a secondary/admin-only view).

## 9. Commission debit + cancellation

**Trigger:** when a `Ride` transitions to completed (`completedAt IS NOT NULL`, status → COMPLETED) **and** `contributionCollectionMethod = OFF_PLATFORM`.

**Per-attended-seat debit** (not per booking — no-show seats don't generate revenue, so no debit):
```
for each BookingSeat where ride.id = R and attendedAt IS NOT NULL:
  fee = computePlatformFee(ride.contribution, commissionSettings)  // existing helper
  in a DB transaction:
    create Transaction {
      type: COMMISSION_DEBIT,
      amount: -fee,
      userId: ride.vehicle.userId,    // operator for bus, driver-owner for regular P2P
      rideId: R,
      bookingSeatId: seat.id,
      notes: "OFF_PLATFORM commission"
    }
    User(id = ride.vehicle.userId).walletBalanceCents -= fee * 100
```

This applies to all OFF_PLATFORM rides, not just buses (regular P2P cash rides too).

**Idempotency:** `Ride.isSettled` flag (already on the schema) prevents double-firing. Set after successful debit loop.

**Cancellation:** existing cancellation flows unchanged. Cancelled rides don't trigger debit. Passenger refunds for OFF_PLATFORM = N/A (platform never held the money).

**Bus-specific cancellation rules** (§5.10 of consolidated reqs — tiered refund) **deferred**. Revisit when MoMo/gateway flow lands, at which point platform-held funds make tiered refund meaningful.

## 10. QR-code details

The QR on the passenger's ticket encodes **just the attendance code** (e.g. `"A7K-92P"`). No JSON payload, no signature, no expiry field. Two reasons:

1. Scanning only works while the bus-driver app is online — server is the source of truth for "has this code been used?". Offline validation would require asymmetric signing + key distribution, which §5.5 of the consolidated reqs called for but buys nothing in this MVP.
2. Attendance codes are already unique per `BookingSeat` and guarded by `attendedAt` — double-scan returns "already boarded" from the server.

Deviation from `docs/client-requests/bus-ticketing.md` §2.2 / §2.3 is intentional. This spec is the source of truth for the decision; the client-request doc is input, not a contract.

## 11. Open questions (for the plan or the client)

- Rwanda-equivalent debt limit in RWF (default stored as cents; client originally said `-$5`; pending the RWF-localization slice to convert the default).
- Commission rate for buses — same 10% as existing `CommissionSettings`, or a bus-specific setting? Assume 10% for this slice; client can override later.
- Does the existing `Ride` booking flow already accept `OFF_PLATFORM` for any vehicle category, or is it gated? Verify during implementation. If gated, lift the gate.
- Does `BookingSeat.lockedUntil` exist? If not, add it.
- How to present operators that have multiple drivers employed by them — for this slice the operator user adds a Ride and sets `driverId` to whichever user they hire. Self-employed operators set `driverId = their own id`. Good enough for MVP.

## 12. Deviations from source docs (to be updated)

Alongside this spec, update:
- `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md`:
  - §3.4 Bus ticketing: row statuses change from "Missing (entire module)" to point to this slice.
  - §6 Decisions log: add rows for "QR = plain attendance code", "Offline scanner cut", "SMS/USSD deferred to post-MoMo slice".
  - §2 Cross-cutting driver-wallet row: reflect minimal-wallet approach.
- `docs/superpowers/specs/2026-04-16-consolidated-requirements.md`:
  - §3.3 (Driver wallet): adopt minimal-wallet approach with upgrade path to full `Wallet`/`WalletLedger`.
  - §5 (Bus ticketing): rewrite to "buses ride on rides" and note the deferrals.
  - §8 (Open questions): add the ones surfaced above.

## 13. Acceptance criteria

Demonstrable end-to-end after merge:
1. Admin creates an operator user (`role = BUS_OPERATOR`), a BUS vehicle under that user, a BusRoute Kigali→Huye with ≥2 stops, and a Ride on that route.
2. Passenger on mobile picks "Bus" on home, searches Kigali→Huye on the date, sees the trip, books a seat OFF_PLATFORM, receives a ticket with attendance code and QR.
3. Bus driver opens trip manifest, uses FAB to scan passenger QR, row flips to boarded. Manual tap-to-board also works.
4. On trip completion, the operator user's `walletBalanceCents` decrements by the platform fee per attended seat; matching `Transaction` rows exist with `type = COMMISSION_DEBIT`. `Ride.isSettled = true`.
5. Toggling availability on when balance < debt limit returns 403 with a clear error; mobile reflects blocked state.
6. Admin credits the operator's wallet via `DriverWalletsTab`; balance rises; `Transaction` row with `type = WALLET_CREDIT` recorded.
7. A non-bus P2P ride set to OFF_PLATFORM generates a commission debit on completion (same code path).

## 14. Risks & rollback

- **Settlement logic fires on already-completed rides during migration** — guarded by `Ride.isSettled`; existing completed rides won't be re-settled. Verify migration doesn't reset this flag.
- **Debt-limit gate locks drivers out in production** — feature-flagged via `WalletSettings.enforceDebtLimit`. Default false on migration; admin enables after top-ups are seeded.
- **Schema additions only** — all new fields are nullable or defaulted. Rollback = remove the new tables/columns; existing data untouched.
