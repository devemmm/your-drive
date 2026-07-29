# Driver Counter-Offer Bidding — Design

**Status:** Draft for review
**Date:** 2026-05-31
**Branch:** TBD on plan
**Source:** Phase 1 deferral — `docs/superpowers/specs/2026-05-23-test-script-fixes-phase-1-design.md` §198 ("Phase 2 backlog"). Client framing: "when a driver sees a ride request, they have two buttons — Accept and Counter-offer. Customer sees a popup similar to inDrive."

## Background

The passenger-side ride-request flow already exists: passenger enters pickup + destination, the `PricingSettings`-backed `/public/fare-estimate` endpoint suggests a fare, the passenger can edit it, and the request lands in the DB with `RideRequest.proposedFare`. Drivers browse open requests and currently have one action — accept at the proposed fare via `POST /ride-requests/:id/accept`.

The gap: drivers cannot negotiate. They either take the fare as offered or skip the request. Real ride-hailing apps (inDrive, Bolt) let drivers bid, and the passenger picks. This spec closes that gap.

## Goals

1. Drivers can submit a counter-offer at their own price on any open ride request.
2. Passengers see all incoming counter-offers as a live list and pick one.
3. The existing "Accept at original fare" path keeps working unchanged — first driver to accept wins.
4. Zero changes to the pricing engine, KYC gates, wallet debt-limit logic, or notification infrastructure.

## Non-goals

- Counter-back from passenger (passenger accepts or rejects only; no multi-round negotiation).
- Per-bid expiry timers visible in UI (bids die when the parent request ends).
- Driver-side visibility into competing bids (drivers bid blind).
- "Best offer" badges, sort-by-rating controls, or any ML-driven ranking.
- Websockets — we reuse the existing 5-second polling cadence on the waiting screen.

## Settled UX decisions

Captured during brainstorming on 2026-05-31:

1. **Auction list (inDrive style).** All drivers can counter concurrently. Passenger sees a live list of counter-offers as they arrive.
2. **One round only.** Passenger accepts a bid or rejects all by cancelling the request. No counter-back.
3. **Accept locks instantly.** If a driver hits Accept-at-original-fare, the ride is created immediately and all pending counter-offers are auto-declined. This preserves current behavior — drivers who want a guaranteed ride hit Accept.
4. **Bid lifetime = ride-request lifetime.** Bids die when the parent `RideRequest` expires, is cancelled, or is accepted.
5. **Driver locked after countering.** Once a driver submits a counter-offer, they wait. They can cancel their own bid, but cannot re-bid with a new amount or switch to Accept on the same request.
6. **Push debounced.** Passenger receives at most one push notification per 10 seconds, summarising new offers. Avoids flood when 8 drivers bid in 30s.

## Data model

One new table. No changes to existing models.

```prisma
enum RideBidStatus {
  PENDING    // driver waiting on passenger
  ACCEPTED   // passenger picked this bid; ride created
  DECLINED   // passenger picked someone else, OR Accept-at-original closed the request, OR driver cancelled, OR passenger cancelled the request
  EXPIRED    // ride request expired before any pick
}

model RideBid {
  id              Int            @id @default(autoincrement())
  rideRequestId   Int
  driverId        Int
  vehicleId       Int            // bid is for a specific vehicle (drivers may own multiple)
  bidAmount       Decimal        @db.Decimal(10, 2)
  status          RideBidStatus  @default(PENDING)
  createdAt       DateTime       @default(now())
  resolvedAt      DateTime?      // set when status moves off PENDING

  rideRequest     RideRequest    @relation(fields: [rideRequestId], references: [id], onDelete: Cascade)
  driver          User           @relation(fields: [driverId], references: [id], onDelete: Cascade)
  vehicle         Vehicle        @relation(fields: [vehicleId], references: [id], onDelete: Restrict)

  @@unique([rideRequestId, driverId])    // one open bid per (request, driver) — DB-level enforcement of "driver locked after countering"
  @@index([rideRequestId, status])
  @@index([driverId, status])
}
```

**Inverse relations to add:**
- `RideRequest.bids RideBid[]`
- `User.rideBids RideBid[]`
- `Vehicle.rideBids RideBid[]`

**Migration:** purely additive. No backfill needed.

**Why `Decimal(10,2)`:** matches `RideRequest.proposedFare`. The repo-wide Float→Decimal migration is out of scope for this slice.

## Server endpoints

### 1. `POST /ride-requests/:id/bids` — driver submits a counter-offer

**Auth:** driver only.

**Body:** `{ amount: number, vehicleId: number }`

**Validation:**
- Caller is a driver with `kycStatus === APPROVED`.
- `vehicleId` belongs to caller and `kycStatus === APPROVED`.
- Parent request status is `OPEN`.
- No existing PENDING bid by this driver on this request (the unique index also enforces this; we check explicitly for a clean 409 response).
- `amount` is positive and within configured bounds (reuse any min-fare from `PricingSettings`; otherwise no upper bound).

**Behavior:** Create `RideBid` (PENDING) in a transaction. Trigger debounced passenger push (see Notifications).

**Returns:** the created bid.

**Failure codes:**
- `409 REQUEST_CLOSED` — request is no longer OPEN (mobile uses this to dismiss the counter-offer sheet with a toast).
- `409 BID_EXISTS` — driver already has a PENDING bid on this request.
- `403 KYC_REQUIRED` — driver or vehicle not APPROVED.

### 2. `GET /ride-requests/:id/bids` — passenger lists incoming bids

**Auth:** passenger who owns the request, or admin.

**Returns:** PENDING bids for the request, each enriched with:
- `driver`: `{ id, firstName, lastName, profileImage, averageRating, totalRatings }`
- `vehicle`: `{ id, make, model, category, tier }`
- `distanceKm` from pickup, computed via `DriverPresence` (latest known driver location); `null` if unknown
- `bidAmount`, `createdAt`

**Sort:** `bidAmount ASC` (lowest first).

**Polling:** the existing waiting screen polls every 5 seconds; this endpoint plugs into the same hook.

### 3. `POST /bids/:id/accept` — passenger picks a winning bid

**Auth:** passenger who owns the parent request.

**Behavior** (single transaction):
1. Row-lock the `RideBid` and the parent `RideRequest`. Reject if bid is not PENDING or request is not OPEN.
2. Call extracted service `createRideFromAcceptedRequest({ requestId, driverId, vehicleId, agreedFare })` — see Refactor below.
3. Flip the winning bid to ACCEPTED with `resolvedAt = now`.
4. Flip all other PENDING bids on the same request to DECLINED with `resolvedAt = now`.
5. Trigger FCM: winner gets "Passenger accepted your offer"; losers get "Request taken by another driver".

**Failure codes:**
- `409 BID_NOT_PENDING` — bid was cancelled by driver or auto-resolved.
- `409 REQUEST_CLOSED` — request was already assigned (someone else's Accept landed first).
- `403` if caller doesn't own the request.

### 4. `POST /bids/:id/cancel` — driver cancels their own bid

**Auth:** driver who owns the bid.

**Behavior:** flip PENDING → DECLINED with `resolvedAt = now`. No FCM — passenger sees the bid drop on next poll.

**Failure codes:**
- `409 BID_NOT_PENDING` — already resolved.

### Existing endpoint behavior change

**`POST /ride-requests/:id/accept`** (driver Accept-at-original-fare): API unchanged. Inside its existing transaction, after the ride is created, flip all PENDING bids on this request to DECLINED with `resolvedAt = now` and fan out FCM to losing bidders. Same `updateMany` + `fcm.send` pattern used elsewhere.

### Refactor: extract `createRideFromAcceptedRequest` service

`acceptRideRequest` in `server/src/controllers/rideRequest.controller.ts:1009-1072` currently hardcodes the fare from `request.proposedFare`. Extract the post-validation core (ride create + booking create + notification) into a service function that takes `agreedFare` explicitly. Both the "Accept at original fare" controller and the new `accept-bid` controller call it.

This is the only refactor in the slice. Stays focused.

## Mobile UI

### Driver side

**Ride request card** (`mobile/src/app/(drawer)/ride-requests/index.tsx`, `[id].tsx`) gains a two-button footer:

```
┌─────────────────────────────────────┐
│ Kigali → Nyamirambo · 5.2 km        │
│ Passenger: J. Mukamana · ★ 4.8      │
│ Proposed: RWF 3,500                 │
├─────────────────────────────────────┤
│  [ Accept RWF 3,500 ]               │  ← primary, full width
│  [ Counter-offer ]                  │  ← secondary, full width
└─────────────────────────────────────┘
```

Both buttons use existing `Button` primitive (`primary` and `secondary` variants).

**Counter-offer bottom sheet** — new component `mobile/src/components/CounterOfferSheet.tsx`:
- Title: "Make a counter-offer"
- Subtitle: "Passenger proposed RWF X,XXX"
- Numeric `Input` pre-filled with `proposedFare`, RWF prefix, large font
- Helper line: "Your bid will be visible to the passenger"
- Primary button: `Send offer` → calls `POST /ride-requests/:id/bids` → on success navigates to `/bids/[id]/waiting`
- Handles `409 REQUEST_CLOSED` → toast "Request was just taken by another driver" → dismiss sheet → return to list

**Waiting-for-passenger screen** — new route `mobile/src/app/bids/[id]/waiting.tsx`:
- Shows ride details (pickup, destination, distance)
- Big card: "Your offer: RWF X,XXX" + spinner + "Waiting for passenger to choose"
- Polls `GET /bids/:id` every 5s
  - Status `ACCEPTED` → navigate to `/ride/[rideId]/active` (existing)
  - Status `DECLINED` / `EXPIRED` → toast → back to `/ride-requests`
- Secondary button: `Cancel offer` → `POST /bids/:id/cancel` → back to ride-requests list

### Passenger side

The existing waiting screen (`mobile/src/app/ride-request/[id].tsx`) gets a **bid list section** below the existing "Looking for a driver" header.

```
┌─────────────────────────────────────┐
│ Looking for a driver…               │
│ Your offer: RWF 3,500               │
│                       [ Cancel ]    │
├─────────────────────────────────────┤
│ Offers (2)                          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⊙ Patrick · ★ 4.9 · 142 trips   │ │
│ │   Toyota Vitz · 1.2 km away     │ │
│ │             RWF 3,200           │ │
│ │             [ Accept offer ]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⊙ Aimé · ★ 4.7 · 88 trips       │ │
│ │   Honda Fit · 2.0 km away       │ │
│ │             RWF 3,800           │ │
│ │             [ Accept offer ]    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- Uses existing `Card`, `Button`, `ThemedText`, `Avatar`, `StarRating`. No new design tokens.
- Sort: lowest bid first.
- Empty state (no bids yet): "Drivers will appear here as they offer. You can wait, or cancel."
- Tap **Accept offer** → confirmation sheet ("Accept Patrick's offer for RWF 3,200?") → confirm → `POST /bids/:id/accept` → screen transitions to existing "Driver assigned" view (chat, call, track).
- New bids animate in via existing `LayoutAnimation`.
- When an Accept-at-original-fare closes the request mid-flow, the next poll returns the ride detail (ASSIGNED state) and the screen flips to "Driver assigned" — bid list disappears.

### Hooks added

- `useSubmitBid(rideRequestId)` — mutation for `POST /ride-requests/:id/bids`
- `useBidsForRequest(rideRequestId)` — query for `GET /ride-requests/:id/bids` (5s polling, enabled while parent request is OPEN)
- `useBid(bidId)` — query for `GET /bids/:id` (5s polling on driver waiting screen)
- `useAcceptBid()` — mutation for `POST /bids/:id/accept`
- `useCancelBid()` — mutation for `POST /bids/:id/cancel`

## Notifications

**Passenger** — debounced server-side. Each bid creation checks `User.lastBidPushAt` (new nullable `DateTime?` column on `User` — trivial additive migration). If `now - lastBidPushAt < 10s`, skip the push. Otherwise send and update the timestamp. Payload:
- Single new bid: `"<driverFirstName> offered RWF X,XXX"`
- Multiple coalesced (counter > 1): `"<driverFirstName> offered RWF X,XXX (+N more)"` — N from a count of PENDING bids created in the last 10s window.

Tap opens the existing waiting screen.

**Driver** — non-debounced (one push, one event):
- Winner: `"<passengerFirstName> accepted your offer for RWF X,XXX"`
- Loser: `"Request taken by another driver"`
- Request closed by passenger cancel or expiry: `"Ride request cancelled"` / `"Ride request expired"`

All reuse the existing FCM pipeline via `User.fcm_token`. No new infrastructure.

## Race conditions and edge cases

**Driver A Accepts while Driver B is mid-counter-offer.** A's accept runs first → request → ASSIGNED, B's bid (if landed) → DECLINED in the same transaction. B's POST (if it arrives after) hits the validator's `request.status === OPEN` check → 409 REQUEST_CLOSED. Mobile dismisses the counter-offer sheet with a toast.

**Passenger accepts Bid #1 while Bid #2 arrives.** Accept row-locks the parent request and re-reads its status. Only one acceptance wins. Bid #2's insert succeeds (different driver, unique constraint not violated) but on the next passenger poll the bids endpoint returns empty (request no longer OPEN). The post-accept cleanup sweep flips Bid #2 to DECLINED and FCMs its driver.

**Driver cancels at the same instant passenger accepts that bid.** Both transactions race for the same `RideBid` row. First commit wins. Loser sees the row in non-PENDING state and returns 409. Mobile copy:
- Passenger loses: "Driver is no longer available." Bid disappears from list.
- Driver loses: "Your offer was just accepted." Navigates to active-ride screen.

**Two passengers accepting two different bids on the same request.** Impossible — a `RideRequest` has exactly one `passengerId`. The validator enforces `bid.rideRequest.passengerId === req.user.id`.

**Driver goes offline with a PENDING bid.** Bid stays. If passenger accepts, the existing no-show machinery handles the absent driver. Auto-cancelling bids on offline-toggle is a polish item, out of scope.

**Request expires or is cancelled.** Wherever `RideRequest.status` moves to `EXPIRED` or `CANCELLED`, add `prisma.rideBid.updateMany({ where: { rideRequestId, status: PENDING }, data: { status: EXPIRED, resolvedAt: now } })` in the same transaction. Single FCM per losing bidder.

**Wallet debt-limit gate.** The existing `assertAboveDebtLimit` runs at ride-creation time inside `createRideFromAcceptedRequest`, not at bid-creation time. A driver in debt can submit bids but the accept will fail and surface a 409 to the passenger; the bid flips to DECLINED. Intentional — bid submission is cheap; eligibility is checked at the merge point.

## Tests

**Server (Jest + supertest):**
- `rideBid.controller.test.ts` — happy path bid → accept; bid → cancel; bid → request closed by Accept-at-original; bid → request expired; concurrent accept races (sequential simulation); KYC denial; duplicate-bid 409; non-owner accept 403.
- `createRideFromAcceptedRequest.service.test.ts` — both callers produce identical ride/booking shape given the same agreed fare.

**Mobile:**
- Manual smoke per the flow above (no Maestro flow this slice).

## Open questions

None. All UX decisions are settled (see Settled UX decisions).

## Future polish (out of scope)

- Auto-cancel a driver's PENDING bids when they go offline.
- Per-bid expiry timer surfaced in UI.
- Distance-based bid sorting (closer drivers first).
- Driver-side hint of competing bid count ("3 other drivers have bid").
- Maestro flow.
- "Bid history" admin view for support.

## Cross-references

- `docs/superpowers/specs/2026-05-23-test-script-fixes-phase-1-design.md` §198 (deferral note)
- `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md` (overall scope; this slice closes the only real-app feature gap)
- `server/src/controllers/rideRequest.controller.ts` (the refactor target)
