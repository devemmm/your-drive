# Bus Booking Flow — Design Spec

**Date:** 2026-06-21
**Branch:** `feature/bus-operator-dashboard`
**Status:** Approved (design + client sign-off). Ready for implementation planning.

## 1. Problem & Goal

On the mobile app, selecting the **Bus** vehicle type currently runs the same ad-hoc
ride flow as Car/Moto (pick pickup/destination/date → search rides). The client wants a
different UX for buses:

> Bus → list of **bus operators** → select operator → see its **routes** → select a route →
> see scheduled **trips** → book a ticket → get a **QR ticket**.

This is primarily a **UX change** that reuses existing booking infrastructure, plus a small
amount of new **read-only** backend surface to support browsing by operator.

## 2. Domain Facts (existing system)

- A **bus operator** is a `User` with `role = BUS_OPERATOR` (no separate Operator table).
- A **route** is a `BusRoute` (origin/dest cities, `distanceKm`, `basePrice`, `isActive`,
  ordered `BusRouteStop[]`), owned by an operator via `operatorId`.
- A **trip** is a `Ride` with `routeId != null` (departureTime, vehicle, `totalSeats`,
  `availableSeats`, `contribution` = per-seat price). Created by operators via
  `POST /operator/trips` with `status = PUBLISHED`, `bookingType = AUTOMATIC`,
  `contributionCollectionMethod = OFF_PLATFORM`.
- **Booking** is the existing `POST /rides/{rideId}/book`. It already accepts optional
  `boardingStopId` and `alightingStopId`, decrements `availableSeats`, and (for
  OFF_PLATFORM + AUTOMATIC) creates an APPROVED booking with `BookingSeat` attendance
  codes immediately — **no Stripe step**.
- The **QR ticket** is `mobile/src/components/TicketQr.tsx` (QR of `attendanceCode` +
  monospace code + "Show this to the conductor on boarding."). It currently renders inline
  in the booking banner on `ride/[id]/index.tsx`.

## 3. Scope Decisions (locked)

1. **Entry point:** Tapping **Bus** in the home bottom sheet expands the sheet and replaces
   the location/date/passenger inputs with a searchable **operators list**. Car/Moto are
   unchanged.
2. **Hierarchy:** Operator → Routes → Trips → Book → Ticket.
3. **Stop selection:** Passenger picks **boarding** and **alighting** stops on the booking
   screen (reuses `boardingStopId`/`alightingStopId`).
4. **Operator filter:** Only operators with **≥ 1 active route** are listed.
5. **Pricing:** Per-route `basePrice`. The current model has **no per-stop pricing**, so
   stop selection affects boarding/alighting info on the manifest, **not** the fare in v1.
6. **Payment:** OFF_PLATFORM — booking confirms immediately; fare shown as "pay operator on
   boarding (cash)". Service/platform fee still displayed.
7. **Post-booking:** Promote the existing inline QR into a **dedicated ticket screen** shown
   after "Confirm booking", reusing `TicketQr`.

## 4. Backend (server) — 3 new PUBLIC read endpoints

Unauthenticated, mounted under `/api/v1/public` (same pattern as existing public routes;
thin wrappers over existing Prisma queries). No new write endpoints — booking reuses
`POST /rides/{rideId}/book`.

| Endpoint | Returns |
|---|---|
| `GET /public/operators` | `BUS_OPERATOR` users with ≥1 active route. Fields: `id`, display name, photo, `routeCount`, optional rating. |
| `GET /public/operators/:operatorId/routes` | That operator's `isActive` `BusRoute`s, each with ordered `stops`. |
| `GET /public/bus-routes/:routeId/trips` | Upcoming `Ride`s for the route: `routeId` set, `status = PUBLISHED`, `departureTime` in future, `availableSeats > 0`; include `vehicle`, seats, price. |

Trip detail for the booking screen uses the existing `GET /public/rides/:rideId` (must
include `route.stops` so the stop pickers have data; if it doesn't already, extend the
include).

Server tests: one controller/integration test per endpoint (operator-with-no-routes
hidden; only active routes; only future PUBLISHED trips with seats).

## 5. Mobile (client)

### Navigation (Expo Router) — new screens under `mobile/src/app/bus/`
- `bus/[operatorId]/routes.tsx` — operator header + routes list.
- `bus/route/[routeId]/trips.tsx` — date context + trips/schedule; tap → booking.
- `bus/trip/[rideId].tsx` — trip booking: summary, boarding/alighting stop pickers,
  passenger stepper, fare breakdown, Confirm booking.
- `bus/trip/[rideId]/ticket.tsx` — confirmation/ticket screen (reuses `TicketQr`) with trip
  summary, APPROVED badge, Message/Call, "View in My Trips".

### Entry point
- `components/HomeBottomSheet.tsx`: when `vehicleType === "BUS"`, render a new
  `OperatorListView` (operators list + search) in the expanded sheet instead of the
  location/date/passenger inputs and mode toggle. Selecting an operator navigates to
  `bus/[operatorId]/routes`. Car/Moto paths untouched.

### Data layer (React Query, axios `services/api.ts`)
- `useBusOperators()` → `GET /public/operators`
- `useOperatorRoutes(operatorId)` → `GET /public/operators/:operatorId/routes`
- `useRouteTrips(routeId)` → `GET /public/bus-routes/:routeId/trips`
- Reuse `usePublicRide(rideId)` for trip detail (ensure stops present).
- Reuse `useBookRide()` — extend to pass `boardingStopId`/`alightingStopId` and navigate to
  the ticket screen on success.
- Add query keys to `lib/constants.ts`.

### Types (`lib/types.ts`)
- `BusOperator`, `BusRoute`, `BusRouteStop`, `BusTrip` (ported from the web
  `client/src/hooks/useOperator.ts` shapes).

### States & edge cases
- Empty: no operators; operator with no routes; route with no upcoming trips.
- Trip card: **low-seats** warning style; **Sold out / Full** disabled.
- Stop picker validation: alighting stop must come after boarding stop (`order`).
- Booking already-handled server rules surfaced in UI: 10-minute cutoff, no self-booking,
  insufficient seats.

### Tests
- Hook tests with mocked api (`useBusOperators`, `useOperatorRoutes`, `useRouteTrips`).
- Component tests: `OperatorListView` (renders/search), stop picker (selection + ordering
  validation).

## 6. Approved Designs

Pencil deck `your-drive.pen`, sections **Light Mode — Bus Booking Flow** /
**Dark Mode — Bus Booking Flow**; 5 screens each:
1. Bus selected → Operators (expanded sheet)
2. Operator → Routes
3. Route → Trips / Schedule
4. Book ticket (stop pickers)
5. Ticket / QR

Exports: `/Users/adrianmaenzanise/Documents/designs/exports/YourDrive-Bus-Booking-{Light,Dark}.pdf`.

## 7. Out of Scope (v1)
- Per-stop / distance-based pricing.
- In-app (VIA_PLATFORM/Stripe) payment for bus trips.
- Operator management from mobile (exists on web dashboard).
- Seat-map / specific seat selection (only seat count).
