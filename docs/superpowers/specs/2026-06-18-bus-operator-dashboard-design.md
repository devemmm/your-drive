# Bus Operator Dashboard — Design

**Date:** 2026-06-18
**Status:** Approved (pending spec review)

## Problem

The client wants bus operators to self-manage their **buses, routes, fares, and trip schedules**, and to see who has booked (a passenger manifest). Two concrete defects block this today:

1. **Admin-created operators never appear in the operators list.** The admin "Add Operator" form (`client/src/hooks/useBusOperators.ts` → `useCreateBusOperator`) posts to the self-signup endpoint `POST /api/v1/auth/register`, which **ignores the `role` field** and creates a plain `USER`. The operators list (`useBusOperators` → `GET /api/v1/users?role=BUS_OPERATOR`, plus a client-side `role === "BUS_OPERATOR"` filter) therefore never matches the new user. "Approving" only toggles `status` (ACTIVE/SUSPENDED) and never changes the role, so the operator stays invisible permanently. The hook even documents this as a known compromise (lines 52–57).

2. **There is no operator dashboard.** The frontend role model knows only `driver | passenger | admin` (`client/src/lib/types.ts:7`). After login, non-admins are redirected to `/dashboard`, and the route guard bounces unrecognized roles to `/` (home). A `BUS_OPERATOR` lands in the passenger area with no operator screens. The only bus-operator features that exist are **admin-only** tabs (`BusOperatorsTab`, `BusRoutesTab`); route/trip endpoints are admin-gated, not operator-scoped.

## Goals (v1)

A logged-in `BUS_OPERATOR` can, from a dedicated `/operator` dashboard:

- Manage **their own buses** (vehicles with `category: BUS`).
- Manage **their own routes** (origin → destination, ordered stops, distance, base fare).
- Schedule **trips/departures** on their routes (date/time + bus + seats) so they become bookable and appear in passenger search.
- View a **read-only passenger manifest** per trip (passenger names, seats, seat/attendance codes, boarding/alighting stops).

## Non-Goals (explicitly deferred)

- GPS / live bus tracking.
- Operator self-registration (admin-created only in v1).
- Per-segment / per-stop pricing (flat fare per route only).
- A separate driver roster — **the operator account is the trip driver** in v1.
- Operator-facing analytics/earnings dashboards.

## Product Decisions (locked)

| Decision | Choice |
|---|---|
| v1 scope | Buses, Routes+schedules, Prices, read-only Manifest. No GPS. |
| Approval gate | None — admin-created operators go live immediately. |
| Onboarding | Admin-created only. |
| Pricing | Flat `basePrice` per route. |
| Trip driver | The operator's own account (`driverId = operator.id`). |

## Domain Model (existing — no schema changes expected)

- **`User`** has `role: USER | ADMIN | BUS_OPERATOR` and `status: ACTIVE | SUSPENDED`.
- **`BusRoute`** (`operatorId`, `originCity`, `destCity`, `distanceKm`, `basePrice`, `isActive`, `stops[]`, `rides[]`). A route *definition*.
- **`BusRouteStop`** (`routeId`, `name`, `city`, `order`, `lat/long`).
- **`Vehicle`** (`userId`, `make/model/year/color/plateNumber`, `category`, `capacity`, KYC fields). A bus = `category: BUS`, `userId = operator`.
- **`Ride`** (`departureTime`, `vehicleId`, `driverId`, `totalSeats`, `availableSeats`, `status`, optional `routeId`). A bookable *departure* on a route.
- **`Booking`** / **`BookingSeat`** (`attendanceCode` = the passenger-facing "trip code"; `boardingStopId`/`alightingStopId`). Source of the manifest.

A trip becomes bookable when a `Ride` exists with `routeId` set; passenger search (`rideSearch.service.ts`) already surfaces rides with their `BusRoute`. No new tables anticipated; if a migration proves necessary it will be called out in the implementation plan.

## Solution

### Layer 1 — Fix the operator create flow (bug #1)

Repoint `useCreateBusOperator()` to the existing admin endpoint `POST /api/v1/admin/users`
(`server/src/controllers/adminUsers.controller.ts`, validator allows `role ∈ {USER, ADMIN, BUS_OPERATOR}`), sending:

```
{ firstName, lastName, email, phoneNumber, password, role: "BUS_OPERATOR" }
```

That endpoint creates the user `status: ACTIVE`, `kycStatus: APPROVED`, with the requested role — so it appears in the `role=BUS_OPERATOR` list immediately. Remove the obsolete "set role in DB" success toast and the misleading code comments. The suspend/activate endpoints remain the enable/disable control for an operator.

**Acceptance:** Admin adds an operator → it appears in the operators list on the next refetch, marked Active.

### Layer 2 — Backend operator-scoped API

New `isBusOperator` middleware (mirrors `isAdmin`): requires `req.user.role === "BUS_OPERATOR"`.

New router mounted at `/api/v1/operator/*` behind `isAuthenticated` + `isBusOperator`. **Every query is scoped to `req.user.id`** so one operator can never read or mutate another's data.

- **Buses** — reuse the existing owner-scoped vehicle controller (`vehicle.controller.ts` already filters by `userId` for non-admins). Operator UI calls the existing `/api/v1/vehicles` endpoints; no new backend code beyond confirming a `BUS_OPERATOR` is treated as a non-admin owner. Vehicle creation currently gates on driver KYC APPROVED — operators are created KYC-approved, so this passes.
- **Routes** — `GET/POST/PATCH/DELETE /api/v1/operator/routes` and `PUT /api/v1/operator/routes/:id/stops`. Logic mirrors `BusRouteController`, but `operatorId` is **forced** to `req.user.id` on create and **enforced** as a `where` filter on read/update/delete (operator cannot pass another `operatorId`).
- **Trips/schedules** — `GET/POST/PATCH /api/v1/operator/trips`. Create a `Ride` with `routeId` (must belong to the operator), `vehicleId` (must belong to the operator), `driverId = req.user.id`, `departureTime`, `totalSeats`/`availableSeats` (default from bus capacity), and the route's `basePrice` as contribution. List returns the operator's own rides.
- **Manifest** — `GET /api/v1/operator/trips/:id/manifest` (trip must belong to the operator): returns bookings → booker name, seat count, `BookingSeat.attendanceCode`, boarding/alighting stop names, booking status.

### Layer 3 — Frontend operator dashboard

- **Role model & auth:** add `BUS_OPERATOR` (frontend value `"operator"`/`"BUS_OPERATOR"` normalized consistently) to `lib/types.ts`. Add an `OperatorGuard` in `RouteGuards.tsx`. Update post-login redirect (`AuthProvider.login` + `Login.tsx` + `UnauthenticatedGuard`): `admin → /admin`, `operator → /operator`, else existing behavior. Operators are blocked from `/admin`; admins are not pulled into `/operator`.
- **Routes:** add an `<Route element={<OperatorGuard/>}>` wrapping `/operator` in `App.tsx`.
- **Dashboard:** new `client/src/pages/operator/` area reusing the admin dashboard's tab/table/form/dialog components for visual consistency. Tabs:
  - **My Buses** — list/add/edit operator's `BUS` vehicles.
  - **My Routes** — list/create/edit routes + ordered stops editor (reuse the `BusRoutesTab` stops UI; drop the operator-picker dropdown since it's implicit).
  - **Trips / Schedule** — list operator's trips; create a departure (pick route + bus, set date/time + seats).
  - **Passengers** — pick a trip → read-only manifest table.
- **Hooks:** `useOperatorRoutes`, `useOperatorTrips`, `useOperatorManifest`, and reuse/wrap the vehicle hooks, all hitting the `/api/v1/operator/*` (and existing `/vehicles`) endpoints.

## Components & Boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `useCreateBusOperator` (edited) | Create operator via admin endpoint | `POST /admin/users` |
| `isBusOperator` middleware | Gate operator routes | `req.user.role` |
| `operator.routes.ts` + controllers | Operator-scoped routes/trips/manifest CRUD | Prisma, `req.user.id` |
| `OperatorGuard` | Restrict `/operator` to operators | auth context |
| `pages/operator/*` | Operator dashboard UI | operator hooks, shared admin UI components |

## Error Handling

- Operator endpoints return `403` for non-operators (middleware) and `404` when a resource exists but isn't owned by the requester (never leak other operators' data via `403` vs `404` distinction — prefer `404` for cross-tenant access).
- Trip creation validates route + bus ownership and seat count > 0 before writing.
- Frontend surfaces API errors via existing `toast` patterns; guards redirect unauthorized users rather than rendering a blank page.

## Testing

- **Backend:** unit/integration tests for operator scoping — an operator cannot read/edit another operator's route, bus, trip, or manifest (cross-tenant returns 404); trip creation rejects routes/buses not owned by the caller; `POST /admin/users` with `role: BUS_OPERATOR` produces a user that the operators-list query returns.
- **Frontend:** operator login redirects to `/operator`; operator blocked from `/admin`; create-operator flow shows the new operator in the list.
- Manual: full loop — admin creates operator → operator logs in → adds a bus → creates a route → schedules a trip → (passenger books) → operator sees the booking in the manifest.

## Rollout / Sequencing

1. Bug #1 fix (independent, shippable alone).
2. Backend operator middleware + routes/trips/manifest endpoints (+ tests).
3. Frontend role/auth/routing + operator dashboard pages.

Each layer is independently verifiable; Layer 1 can merge before Layers 2–3 are complete.
