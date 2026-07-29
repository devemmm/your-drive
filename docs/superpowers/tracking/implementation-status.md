# YourDrive — Feature-Gap Implementation Status

**Purpose:** single place to see what slices are planned, in flight, and done across the gap-analysis rollout. Survives sessions. Update at slice start, at status changes, and at completion.

**Source specs:**
- `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md`
- `docs/superpowers/specs/2026-04-16-consolidated-requirements.md`

**Last updated:** 2026-06-03 (slice 23 — Guest browse + just-in-time auth — shipped 2026-06-02; AuthGate refactored from bottom sheet to redirect-and-resume on 2026-06-03)

---

## Status legend

- **Not started** — no spec yet.
- **Specced** — design doc written and approved; no plan yet.
- **Planned** — implementation plan written and approved.
- **In progress** — code work underway.
- **In review** — PR open.
- **Done** — merged.
- **Deferred** — intentionally pushed; see "Depends on".

---

## Slice index

| # | Slice | Milestone | Status | Spec | Plan | Depends on |
|---|---|---|---|---|---|---|
| 1 | Buses + Wallet foundation | M2+M1 | **Done** (2026-04-18) | [spec](../specs/2026-04-18-buses-and-wallet-foundation-design.md) | [plan](../plans/2026-04-18-buses-and-wallet-foundation.md) | — |
| 2 | RWF + Rwanda VAT localization | M1 | **Done** (2026-05-04) | [spec](../specs/2026-05-04-rwf-localization-design.md) | [plan](../plans/2026-05-04-rwf-localization.md) | — |
| 3 | KYC (driver + vehicle approval) | M1 | **Done (MVP)** (2026-05-17) | — | inline w/ slice 7 | — |
| 4 | Payment-gateway abstraction + MANUAL gateway | M3 | **Explicitly deferred** (2026-05-17) | — | — | — |
| 5 | Chauffeur safety — MVP via Trip Reports | M1 | **Partial (Reports flow done)** (2026-05-17) | — | — | — |
| 6 | Car-rental condition checklist + photo evidence | M1 | **Partial** — `TRIP_EVIDENCE` category added; capture UI pending | — | — | — |
| 7 | Pricing settings (base/per-km/per-min + commission %) for rides | M1 | **Done** (2026-05-17) | — | — | — |
| 8 | Bus agent cash-sale + printed-ticket flow | M2 | Deferred | — | — | #1 |
| 9 | Bus SMS/USSD booking | M2 | Deferred | — | — | #4 |
| 10 | Real payment-gateway adapters (DPO / MoMo / Airtel) | M3 | Deferred | — | — | #4 |
| 11 | Full `Wallet` + `WalletLedger` + `WalletTopupRequest` tables | M3 | Deferred | — | — | #1 |
| 12 | Reconciliation + fraud dashboards | M3 | Deferred | — | — | #4, #10 |
| 13 | Trip-report MVP (admin flag + review) | M1 | **Done** (2026-05-17) | — | — | — |
| 14 | Tier 1 — vehicle metadata + blocked ranges + languagesSpoken | M1 | **Done** (2026-05-17) | — | — | — |
| 15 | Tier 2 — cancellation refund engine + admin user-create | M1 | **Done** (2026-05-17) | — | — | — |
| 16 | Versioned driver agreement (AgreementVersion model) | M1 | Not started — pending | — | — | — |
| 17 | Dedicated SOS button + emergency-contact SMS | M1 | Descoped to MVP; revisit if reports surface a real safety pattern | — | — | — |
| 18 | GPS trail (`TripGpsPoint` model + admin map) | M1 | Descoped to MVP; depends on real GPS volume need | — | — | — |
| 19 | Pre/post trip photo evidence capture UI | M1 | Partial — `TRIP_EVIDENCE` category landed; UI pending | — | — | — |
| 20 | Admin polish UI — BlockedRange panel, cancellation settings tabs, create-user dialog | M1 | Backend done (2026-05-17); UI deferred | — | — | — |
| 21 | Mobile coupon UI for credit-based Coupon model | M1 | Deferred; needs UX redesign (existing model has no `code` field) | — | — | — |
| 22 | Chauffeur arrival verification (4-digit PIN) | M1 | Not started — small slice | — | — | — |
| 23 | Guest browse + just-in-time auth | M1 | **Done** (2026-06-02) | [spec](../specs/2026-06-02-guest-browse-and-just-in-time-auth-design.md) | [plan](../plans/2026-06-02-guest-browse-and-just-in-time-auth.md) | — |

See gap-analysis §8.1 (session 2026-05-17 log) for the full decision context behind each.

---

## In-flight slice detail

### Slice 1 — Buses + Wallet foundation

- **Status:** Implementation complete, pending manual end-to-end smoke (2026-04-18)
- **Spec:** `docs/superpowers/specs/2026-04-18-buses-and-wallet-foundation-design.md`
- **Plan:** `docs/superpowers/plans/2026-04-18-buses-and-wallet-foundation.md`
- **Branch:** `feat/buses-wallet-foundation`
- **PR:** —

**Bundles these gap-analysis items into one coherent slice:**
- Bus ticketing foundation — §3.4 of gap analysis (entire module)
- Driver wallet (minimal) — §2 cross-cutting and §3.1 row 1.9
- OFF_PLATFORM cash-commission collection — §3.1 row 1.9 (hybrid debt limit) and implicit across cash-ride scope

**Explicitly deferred from this slice:**
- Signed / cryptographic QR, offline scanner
- Bus agent + printed ticket flow
- SMS/USSD booking
- RWF/VAT localization
- Real payment-gateway adapters
- Full Wallet/WalletLedger table migration
- Bus tiered refund rules
- Recurring-schedule auto-spawner

**Key deviations from source specs** (see spec §12):
- `consolidated-requirements.md` §5 rewritten in design: buses ride on existing `Ride`/`Booking` machinery, not a parallel `BusTrip`/`BusSeat`/`BusTicket` module.
- `consolidated-requirements.md` §3.3 simplified: wallet = column + Transaction ledger, not a `Wallet` table.
- `client-requests/bus-ticketing.md` §2.2/§2.3: QR = plain attendance code; no signed payload, no offline validation.

**Implementation commits (in order):**
```
23d3f3d feat(db): add bus routes, wallet fields, commission/credit tx types
12e8b55 feat(db): index Ride.routeId + Restrict delete on Booking stop FKs
a7cf225 feat(db): seed default WalletSettings row
214caff feat(wallet): debit/credit helpers + debt-limit guard
16364fc docs(wallet): atomicity contract JSDoc + zero-boundary tests
f6d5c82 feat(commission): OFF_PLATFORM debit service + per-seat fee math
3fc05e6 feat(settlement): debit OFF_PLATFORM commission inside settleCompletedRides
d097bdb feat(availability): gate online-toggle on wallet debt limit
ac24947 feat(wallet): driver balance endpoint + admin list/credit
b0ac3e1 feat(bus): routes CRUD + public search endpoint
56dec49 feat(wallet): admin settings endpoint
f9558cb feat(booking): boarding/alighting stops + attendByCode endpoint
df63a1c feat(ride-search): filter by vehicle category + bus route match
85fb0c1 feat(admin): BusOperatorsTab
b495d03 feat(admin): BusRoutesTab with stops editor
22f7627 feat(admin): DriverWalletsTab with manual credit
cc97009 feat(admin): WalletSettingsTab
03748a5 feat(admin): BUS vehicle support + route column in rides
ebe51df feat(admin): register BusOperators/BusRoutes/WalletSettings tabs
9853f7e feat(mobile): enable Bus on home + vehicleCategory on ride search
acde1da feat(mobile): QR on booking ticket (attendance code)
8a8e657 feat(mobile): bus-driver manifest screen + QR scanner
3ef1130 feat(mobile): wallet screen + drawer entry
8b18477 feat(mobile): handle WALLET_DEBT_LIMIT on availability toggle
```

**Verification status:**
- Backend unit tests: 17/17 passing (`wallet.service.test.ts`: 9, `commission.service.test.ts`: 3, existing `driverPresenceToken.test.ts`: 5)
- `server/` TypeScript: clean
- `client/` TypeScript: clean
- `mobile/` TypeScript: one pre-existing error in `src/app/ride-request/[id].tsx` (`Property 'data' does not exist on type 'Ride'`) — not from this slice; everything else clean
- **End-to-end manual smoke: not yet performed.** Plan Task 23 §3 describes the 10-step flow to verify: create operator + bus + route + ride in admin; passenger books via mobile; driver scans QR on manifest; settlement cron debits commission; admin credits wallet; debt-limit gate blocks going online below limit.

**Discoveries during implementation (feed back into source specs for future sessions):**

1. **`Transaction` schema gap.** The existing `Transaction` model in `server/prisma/schema.prisma` does not have fields for `bookingSeatId`, `notes`, or `createdById`. Consequences:
   - Commission debits can only be linked back to a `rideId`, not the specific seat that generated them — no per-passenger attribution in the ledger.
   - Admin wallet credits have no `reason` column to persist (the UI collects it but drops it server-side); the only audit trail is the `Transaction` row itself plus what the admin user pastes into the (missing) notes. Follow-up: add these three columns to Transaction — belongs to slice 11 (full Wallet/WalletLedger) or a dedicated small "Transaction audit fields" slice.
   - `Transaction.amount` is `Float`, not `Decimal`. Consistent with every other `transaction.create` callsite in the repo. A schema-wide migration to `Decimal` is its own cross-cutting slice, not in scope here.

2. **No admin API to set `role = BUS_OPERATOR` at user creation.** Admin creates a user via `POST /auth/register` which hardcodes `role = USER`. The admin must promote via UsersTab (if it supports role edits) or DB directly. Follow-up: add an admin users-create endpoint that accepts role and phoneNumber.

3. **`_prisma_migrations` table did not exist pre-slice.** Roughly 90 historical migrations in `server/prisma/migrations/` were untracked. Slice 1's migrations were registered via `prisma migrate resolve --applied ...` during the Task 1 fix. Before any future `prisma migrate dev` is safe, the rest should be resolved — or a fresh DB + `prisma migrate reset` is the safer path. Flag for Task 23 manual smoke.

4. **VIA_PLATFORM booking path doesn't thread `boardingStopId` / `alightingStopId`.** The OFF_PLATFORM path (which buses use) does. If a bus is ever set to VIA_PLATFORM (when payment gateways land), the booking-creation site downstream of `PaymentSession` confirmation will need the same threading.

5. **Admin RidesTab category filter is client-side.** The `useRides` hook gained a `vehicleCategory` optional param but the current RidesTab filters `displayedRides` on the client. Upgrade to server-side pagination when the ride table grows. The server endpoint already supports `vehicleCategory` (Task 11).

6. **BusRoutesTab stop editor uses replace-all.** `PUT /bus-routes/:id/stops` does `deleteMany + createMany`. Because `Booking.boardingStopId` / `alightingStopId` use `onDelete: Restrict`, this will fail once any booking references a stop. Safe now (pre-launch admin-only). Later: diff-based stop editing that keeps referenced stop IDs stable.

7. **Commission flow assumes the vehicle owner is the fee-payer.** `debitCommissionForCompletedRide` debits `ride.vehicle.userId`. For a BUS, that's the operator user (correct). For regular P2P, that's the driver user (also correct, same person owns vehicle). When chauffeur-service rides need this, the relationship may differ (chauffeur drives the customer's car) — verify before extending commission to chauffeur.

**Follow-ups to explicitly track as separate slices (not for this PR):**

- Transaction audit fields (`bookingSeatId`, `notes`, `createdById`) — small schema slice
- Admin user-create endpoint with role + phoneNumber — unblocks BusOperatorsTab properly
- Baseline historical migrations — one-off DB ops task before any `prisma migrate dev` is safe
- Diff-based bus route stop editing — needed before bookings start referencing stops
- Server-side RidesTab filtering with pagination — when ride table grows

### Slice 23 — Guest browse + just-in-time auth

- **Status:** Done (2026-06-02); closes §9 rows 1–3 of the gap analysis
- **Spec:** `docs/superpowers/specs/2026-06-02-guest-browse-and-just-in-time-auth-design.md`
- **Plan:** `docs/superpowers/plans/2026-06-02-guest-browse-and-just-in-time-auth.md`
- **Branch:** `feat/guest-browse-and-just-in-time-auth`

**Closes these §9 gap-analysis rows:**
- Public browse / no auth gate (drawer redirect removed; five new public controllers under `server/src/controllers/public/` backed by shared services under `server/src/services/search/`)
- First-launch "Register now or Skip" splash (`mobile/src/app/(auth)/welcome.tsx` "Continue as guest" CTA; `authStorage.hasSeenWelcome`; first-launch redirect in `mobile/src/app/_layout.tsx`)
- Just-in-time auth prompts at gated CTAs (`AuthGateProvider` + `useRequireAuth` hook; ~25 callsite wraps across DriverHome, CounterOfferSheet, rental detail, chauffeur detail, ride detail, vehicle add/edit, chat, profile, etc.). Initial implementation used `AuthGateSheet` (bottom sheet); refactored 2026-06-03 to redirect to `/(auth)/welcome` and resume the gated action automatically after auth + onboarding settle.

**Implementation commits (in order):**
```
2175212 feat(server): public /rentals/search mirror via shared search service
189f3f9 fix(server): public rental controller consumes validator output via matchedData
ed56fff feat(server): public /chauffeur-services/search mirror via shared service
5a0f919 fix(server): preserve full profileImage shape on chauffeur public response
a5e3844 feat(server): public /rides/search mirror via shared service
db2c70e feat(server): public /bus-routes/search mirror via shared service
1c42aca feat(server): public /drivers/nearby mirror via shared service
0c4176b feat(mobile): publicApi axios instance for guest-visible endpoints
8b92196 feat(mobile): list hooks route public endpoints when unauthenticated
15b7d21 feat(mobile): AuthGateProvider + AuthGateSheet + useRequireAuth hook
c519642 feat(mobile): mount AuthGateProvider + BottomSheetModalProvider in root layout
8be0ac4 feat(mobile): persist hasSeenWelcome flag for guest mode
6959f4c feat(mobile): first-launch routes guests to welcome screen
14b8a30 feat(mobile): add Continue as guest button to welcome screen
d6262ed feat(mobile): allow guests into (drawer) and gate auth-required pollers
73574be feat(mobile): gate auth-required drawer items behind requireAuth; hide mode toggle for guests
65e5077 feat(mobile): gate ride-request, bidding, and DriverHome CTAs behind requireAuth
45efb23 feat(mobile): gate rental, chauffeur, and bus booking CTAs behind requireAuth
fa9b267 feat(mobile): gate vehicle, wallet, chat, and remaining auth CTAs
6572db0 test(mobile): Maestro E2E for guest browse + auth-gate flow
0cfe350 refactor(mobile): replace AuthGate sheet with redirect-and-resume
```

**Outcome:** Guests can browse rides, rentals, chauffeur services, and bus routes without an account; gated CTAs (book, bid, chat, profile, vehicle add/edit, wallet, mode toggle, etc.) redirect to `/(auth)/welcome`. After the user finishes auth (and any onboarding gate), `AuthGateProvider` `router.replace`s back to the originating route and fires the stashed callback, so the booking/post/accept completes without re-tapping. Flips §9 rows 1–3 to Built and removes the last ~1% of contract-scope residual.

---

## Conventions

- One slice = one spec + one plan + one PR (exceptions allowed if justified in the plan).
- Adding a new slice: append a row to the Slice index table, create a spec file in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, link it, then create the plan when ready.
- Moving a slice to "In progress": add a detail block under "In-flight slice detail".
- Completing a slice: set status to Done, leave the detail block with final PR link and a one-line outcome.
- Deviations from gap-analysis or consolidated-requirements go in the spec's `Deviations from source docs` section AND as an update to those source docs.
