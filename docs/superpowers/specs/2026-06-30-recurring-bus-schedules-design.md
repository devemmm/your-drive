# Recurring Bus Schedules — Design

**Date:** 2026-06-30
**Status:** Approved (pending spec review)
**Scope:** server (Node/Express/Prisma), client operator dashboard (React), mobile passenger app (Expo)

## Problem

Today a bus operator's "trip" is a single `Ride` row with one concrete
`departureTime` (`server/src/controllers/operatorTrip.controller.ts`). There is no
repeating schedule, so an operator must log in and create every future departure
by hand, and passengers can only book departures the operator has already created.

We want an operator to define a **fixed, repeating schedule once** — e.g. "Harare
→ Bulawayo departs 06:00 / 12:00 / 18:00" — that stays bookable indefinitely while
active, with no daily operator logins and no background job pre-creating rows.

## Mental model

- A **"trip"** is a **route** (Harare → Bulawayo) — already modelled as `BusRoute`,
  which carries operator, fare (`basePrice`), and stops.
- A **"schedule"** is the set of **departure times** attached to that route.
- A passenger flow is: **provider → trips (routes) → schedule (times) → pick a date
  → book.**

So the feature is essentially: attach departure times to a route, show them, and
create a real dated trip only at the moment of booking.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Schedule unit | Departure times attached directly to a `BusRoute` (no separate schedule table) |
| Days | Runs **every day**; no weekday selection, no holiday skips |
| Lifetime | **Indefinite**, gated by an `isActive` flag (no horizon / no window) |
| Capacity | Each departure has a **bus**; seats = that bus's `capacity` (no separate seat field) |
| Bus at runtime | Driver can **swap the bus at check-in** on the materialized trip |
| Date selection | Passenger picks a **travel date** when booking |
| Trip creation | **Lazy** — a `Ride` is created on the explicit date-pick (find-or-create) |

## Non-goals (v1 / YAGNI)

- Weekday selection, holiday / per-date skips, per-date time/seat/bus overrides.
- A recurring fare different from the route's `basePrice`.
- Mixing concrete one-off trips into the passenger schedule screen — the schedule
  screen shows recurring departures only (see "One-off trips" below).

## Data model

One new table; one nullable column on `Ride`.

```prisma
model BusRouteDeparture {
  id        Int      @id @default(autoincrement())
  routeId   Int
  route     BusRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  timeOfDay String   // "HH:mm", 24h, operator local time
  vehicleId Int      // the bus on this timeslot → seats = its capacity
  vehicle   Vehicle  @relation(fields: [vehicleId], references: [id])
  isActive  Boolean  @default(true)
  rides     Ride[]   // materialized occurrences
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([routeId, isActive])
}
```

`Ride` gains:

```prisma
routeDepartureId Int?
routeDeparture   BusRouteDeparture? @relation(fields: [routeDepartureId], references: [id])

@@unique([routeDepartureId, departureTime])  // one Ride per (departure, datetime)
```

Notes:
- `Ride.vehicleId` **stays non-null** — a materialized occurrence uses the
  departure's bus.
- The `@@unique` is what makes find-or-create safe under concurrency.
- `timeOfDay` is stored as text; the concrete `departureTime` for a chosen date is
  computed at materialization.

## Behaviour

### Operator — manage the schedule
In the dashboard **Trips / Schedule** tab, manage a route's departures: add a
departure = `{ route, time, bus }`, toggle `isActive`, delete. Seats are implied by
the chosen bus's capacity.

Operator-scoped endpoints (under `/operator`, behind `isBusOperator`, owner-checked
against the route's `operatorId`):
- `GET    /operator/routes/:routeId/departures`
- `POST   /operator/routes/:routeId/departures`   `{ timeOfDay, vehicleId }`
- `PATCH  /operator/departures/:id`                `{ timeOfDay?, vehicleId?, isActive? }`
- `DELETE /operator/departures/:id`

### Passenger — browse the schedule (existing screens)
Current flow (verified): Home → Bus → operators → `/bus/[operatorId]/routes` →
`/bus/route/[routeId]/trips` → `/bus/trip/[rideId]` → ticket.

Change only the route's trips screen to show the **schedule**:
- `GET /public/bus-routes/:routeId/trips` returns the route's **active departures**
  (not dated rides): `{ departures: [{ id, timeOfDay, fare, vehicle: { make, model,
  plateNumber, capacity } }] }`.
- `mobile/src/app/bus/route/[routeId]/trips.tsx` renders departure times + fare
  (+ bus). It no longer shows per-row "seats left" (no date chosen yet).

### Passenger — pick a date, then book (existing booking screen unchanged)
- Tapping a departure opens a **date picker** (a small sheet on the trips screen).
- Picking a date is a **booking-intent action**, so wrap it in `useRequireAuth`
  (consistent with the guest-browse / just-in-time-auth pattern) — a guest is
  prompted to log in here rather than at the final confirm.
- On the authenticated date-pick, call `POST /rides/from-schedule { routeDepartureId,
  date }` → `{ ride }`:
  - find-or-create a `Ride` for `(routeDepartureId, departureTime = date @ timeOfDay)`
    using the unique constraint; on conflict return the existing one;
  - the materialized `Ride` is owned by the **route's operator** (driver = operator),
    not the passenger — the passenger only triggers creation;
  - reject dates whose `departureTime <= now`.
- Navigate to the existing `/bus/trip/[rideId]` booking screen with the returned
  `rideId`. **Booking + ticket screens are unchanged** — same stop pickers, fare,
  `useBookRide`, QR ticket.

### Shared trip-creation service
Extract the body of `OperatorTripController.create` into
`createBusRide({ operatorId, routeId, vehicleId, departureTime, seats })`
(builds locations from route stops, `contribution = route.basePrice`,
`vehicle`, `driver`, `totalSeats = availableSeats = bus.capacity`,
`status = PUBLISHED`). Both the operator one-off create and `from-schedule` call it;
`from-schedule` derives `vehicleId`/`seats` from the departure's bus and
`departureTime` from date + `timeOfDay`.

### Driver — bus swap at check-in
On a materialized occurrence: `PATCH /operator/trips/:id/bus { vehicleId }` updates
`Ride.vehicleId`. v1 swaps the bus only; existing bookings/seats are untouched
(capacity reconciliation when swapping to a smaller bus is a known limitation).

## Seat / availability semantics
- Each `(departure, date)` is independent and starts at the bus's full capacity.
- Seats are shown on the booking screen once the date is chosen and the `Ride`
  exists; the schedule list itself shows no per-date seats.
- Booking decrements `Ride.availableSeats` via the existing booking transaction —
  unchanged.

## One-off trips
The existing one-off "Schedule trip" creation can remain for ad-hoc single-date
trips, but those concrete `Ride`s are **not** surfaced on the passenger schedule
screen in v1 (which lists recurring departures only). Mixing them back in is a
later enhancement, deliberately deferred to avoid merge complexity.

## Edge cases & known limitations
- **Past datetimes** are rejected by `from-schedule` and disabled in the date picker.
- **Cancelled date:** if a date's materialized `Ride` was cancelled, that date is
  treated as unavailable (find-or-create returns the cancelled ride; booking it
  fails). Acceptable for v1.
- **Deactivated departure:** stops appearing in the schedule; already-booked
  `Ride`s for past picks remain valid.
- **Deleting a bus** attached to a departure: block the delete (or require the
  operator to detach/replace it) so departures never point at a missing bus.
- **Bus swap to a smaller bus** than already-booked seats: not reconciled in v1.
- **Abandoned date-pick:** materializing on date-pick can leave an empty (full-seat)
  `Ride` if the passenger doesn't finish; it is idempotent and harmless.

## Affected existing code
- `schema.prisma` — `BusRouteDeparture` model + `Ride.routeDepartureId` + unique
  index; migration.
- `operatorTrip.controller.ts` — extract shared `createBusRide`; add bus-swap
  endpoint.
- New `operatorDeparture.controller.ts` + validators + routes in `operator.routes.ts`.
- `public/busRoutes.controller.ts` `trips` — return the route's active departures.
- New `POST /rides/from-schedule` controller/route (authenticated passenger).
- Reminder crons query `Ride` by `departureTime`; **unaffected** — departures live
  in the new table; only real `Ride`s exist in `Ride`.
- Client operator dashboard: `TripsTab` + `useOperator` hooks — departures CRUD UI.
- Mobile: `useBus` + `trips.tsx` (render departures + date picker + `from-schedule`);
  booking + ticket screens unchanged.

## Testing
Follow repo conventions (server Jest; mobile/client component tests):
- Unit: `createBusRide` shared service; departures CRUD + route-ownership scoping.
- Integration: `from-schedule` find-or-create idempotency / concurrency (two calls →
  one `Ride`); past-date rejection.
- Existing booking/manifest/ticket tests stay green (materialized `Ride`s behave like
  any other ride).

### End-to-end verification (definition of done)
Both surfaces are exercised against the running stack, the same way the operator
dashboard was verified for this work:
- **Operator / web (Playwright):** operator adds a route departure (time + bus),
  toggles active, confirms it appears; screenshots to `docs/screenshots/`.
- **Mobile passenger (Maestro):** extend `mobile/.maestro/flows/bus/` (alongside the
  existing `passenger-book-and-board.yaml`) with a recurring-schedule flow: provider
  → route → schedule (times) → pick a date → existing booking screen → ticket.
  Run against the same backend so the full path (departure → `from-schedule`
  materialization → booking → manifest) is covered end to end.

The feature is "done" only when both the Playwright (operator) and Maestro
(passenger) flows pass against one running backend.

## Rollout / phasing (for the implementation plan)
1. Schema + migration + shared `createBusRide` service.
2. Operator departures CRUD (API + dashboard UI).
3. Public trips endpoint returns the schedule (departures).
4. `from-schedule` materialization + mobile trips screen (date picker) wiring.
5. Bus-swap-at-check-in endpoint + UI.
6. End-to-end verification: Playwright (operator/web) + Maestro (mobile passenger)
   against one running stack.
