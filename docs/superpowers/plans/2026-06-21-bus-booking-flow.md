# Bus Booking Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let passengers book bus tickets by browsing **bus operators → their routes → scheduled trips**, picking boarding/drop-off stops, confirming, and receiving a QR ticket — reusing the existing booking system.

**Architecture:** Add 3 unauthenticated read endpoints on the Express/Prisma server (list operators, an operator's routes, a route's upcoming trips). On the React Native (Expo Router) mobile app, branch the home bottom sheet on the **Bus** pill to show an operators list, add 4 screens (routes → trips → booking → ticket), and reuse `POST /rides/{rideId}/book` (which already accepts `boardingStopId`/`alightingStopId`).

**Tech Stack:** Server: TypeScript, Express, Prisma, Jest + ts-jest. Mobile: TypeScript, React Native, Expo Router, React Query (`@tanstack/react-query`), axios, Jest (`jest-expo`) + `@testing-library/react-native`.

## Global Constraints

- A bus operator is a `User` with `role = UserRole.BUS_OPERATOR` (no separate Operator table). User name = `firstName` + `lastName`; avatar = `profileImage.url` (relation, **not** `avatar`/`photo`).
- A trip is a `Ride` with `routeId != null`, `status = RideStatus.PUBLISHED`. Seats: `availableSeats`/`totalSeats`; price: `contribution` (per seat, from `BusRoute.basePrice`).
- New endpoints are **read-only**, unauthenticated, mounted under `/api/v1/public` in `server/src/routes/public.routes.ts`. Booking reuses `POST /rides/{rideId}/book` — no new write endpoints.
- Server controllers are exported **const objects** with `async (req, res, next)` methods. Import prisma as `import { prisma } from "<rel>/config/database"`. Send responses with `res.json({...})` (no wrapper helper). On client error: `res.status(400).json({ error: "CODE" })`.
- Server single-test command: `npx jest <path>`. Mobile single-test command: `npm test -- <path>` (run from `mobile/`).
- Mobile guest browsing uses `publicApi` (no auth header); authenticated calls use `api`. Both from `@/services/api`.
- Mobile theme: `useTheme()` → `colors`; `useMemo(() => makeStyles(colors), [colors])`; tokens `fontSize`/`spacing`/`borderRadius` from `@/lib/theme`. Font family is Jost (loaded globally).
- Pricing is per-route; stop selection affects boarding/alighting info only, **not** fare (v1).

**Working directory note:** server commands run from `/Users/adrianmaenzanise/Projects/Node/your-drive/server`; mobile commands from `/Users/adrianmaenzanise/Projects/Node/your-drive/mobile`.

---

## File Structure

**Server (new):**
- `server/src/controllers/public/operators.controller.ts` — `PublicOperatorController.list`, `.routes`
- `server/src/controllers/public/operators.controller.test.ts`
- `server/src/controllers/public/busRoutes.controller.test.ts` — new test for `.trips`

**Server (modified):**
- `server/src/controllers/public/busRoutes.controller.ts` — add `.trips`
- `server/src/controllers/ride.controller.ts` — add `route.stops` include to `getRideById`
- `server/src/routes/public.routes.ts` — wire 3 routes

**Mobile (new):**
- `mobile/src/hooks/useBus.ts` + `mobile/src/hooks/__tests__/useBus.test.tsx`
- `mobile/src/lib/busBooking.ts` (stop-validation helper) + `mobile/src/lib/__tests__/busBooking.test.ts`
- `mobile/src/components/bus/OperatorListView.tsx` + `mobile/src/components/bus/__tests__/OperatorListView.test.tsx`
- `mobile/src/app/bus/[operatorId]/routes.tsx`
- `mobile/src/app/bus/route/[routeId]/trips.tsx` + `mobile/src/app/bus/route/[routeId]/__tests__/trips.test.tsx`
- `mobile/src/app/bus/trip/[rideId].tsx`
- `mobile/src/app/bus/trip/[rideId]/ticket.tsx`

**Mobile (modified):**
- `mobile/src/lib/types.ts` — add bus types; extend `Ride`
- `mobile/src/lib/constants.ts` — add `bus` query keys
- `mobile/src/hooks/useRides.ts` — extend `useBookRide` + `BookRideResponse`
- `mobile/src/components/HomeBottomSheet.tsx` — branch on `vehicleType === "BUS"`

---

## Task 1: Server — `GET /public/operators`

**Files:**
- Create: `server/src/controllers/public/operators.controller.ts`
- Test: `server/src/controllers/public/operators.controller.test.ts`

**Interfaces:**
- Produces: `PublicOperatorController.list(req, res, next)` → `res.json({ operators: Array<{ id, name, photoUrl, rating, totalRatings, routeCount }> }>`

- [ ] **Step 1: Write the failing test**

```typescript
// server/src/controllers/public/operators.controller.test.ts
jest.mock("../../config/database", () => ({
  prisma: { user: { findMany: jest.fn() } },
}));

import { Request, Response } from "express";
import { PublicOperatorController } from "./operators.controller";
import { prisma } from "../../config/database";

function mockReq(over: Partial<Request> = {}): Request {
  return { query: {}, params: {}, ...over } as any;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}
const flush = () => new Promise<void>((r) => setImmediate(r));
beforeEach(() => jest.clearAllMocks());

describe("PublicOperatorController.list", () => {
  it("queries only BUS_OPERATOR users that have an active route", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    await PublicOperatorController.list(mockReq(), mockRes(), jest.fn());
    await flush();
    const arg = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.role).toBe("BUS_OPERATOR");
    expect(arg.where.operatorRoutes).toEqual({ some: { isActive: true } });
  });

  it("maps rows to the public operator shape with routeCount", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 5, firstName: "City", lastName: "Link",
        averageRating: 4.8, totalRatings: 320,
        profileImage: { url: "http://img/5.png" },
        operatorRoutes: [{ id: 1 }, { id: 2 }],
      },
    ]);
    const res = mockRes();
    await PublicOperatorController.list(mockReq(), res, jest.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({
      operators: [
        { id: 5, name: "City Link", photoUrl: "http://img/5.png", rating: 4.8, totalRatings: 320, routeCount: 2 },
      ],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/controllers/public/operators.controller.test.ts`
Expected: FAIL — "Cannot find module './operators.controller'".

- [ ] **Step 3: Write minimal implementation**

```typescript
// server/src/controllers/public/operators.controller.ts
import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../../config/database";

export const PublicOperatorController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await prisma.user.findMany({
        where: { role: UserRole.BUS_OPERATOR, operatorRoutes: { some: { isActive: true } } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          averageRating: true,
          totalRatings: true,
          profileImage: { select: { url: true } },
          operatorRoutes: { where: { isActive: true }, select: { id: true } },
        },
        orderBy: { firstName: "asc" },
      });
      const operators = rows.map((u) => ({
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "Operator",
        photoUrl: u.profileImage?.url ?? null,
        rating: u.averageRating,
        totalRatings: u.totalRatings,
        routeCount: u.operatorRoutes.length,
      }));
      res.json({ operators });
    } catch (err) {
      next(err);
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/controllers/public/operators.controller.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/public/operators.controller.ts server/src/controllers/public/operators.controller.test.ts
git commit -m "feat(server): public list bus operators endpoint controller"
```

---

## Task 2: Server — operator routes (`GET /public/operators/:operatorId/routes`)

**Files:**
- Modify: `server/src/controllers/public/operators.controller.ts`
- Test: `server/src/controllers/public/operators.controller.test.ts` (add cases)

**Interfaces:**
- Consumes: `prisma.busRoute.findMany`
- Produces: `PublicOperatorController.routes(req, res, next)` → `res.json({ routes: BusRoute[] })` (each route includes `stops` ordered by `order`).

- [ ] **Step 1: Write the failing test** (append to existing test file)

```typescript
describe("PublicOperatorController.routes", () => {
  it("returns the operator's active routes with ordered stops", async () => {
    (prisma as any).busRoute = { findMany: jest.fn().mockResolvedValue([{ id: 1, stops: [] }]) };
    const res = mockRes();
    await PublicOperatorController.routes(mockReq({ params: { operatorId: "5" } } as any), res, jest.fn());
    await flush();
    const arg = (prisma.busRoute.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ operatorId: 5, isActive: true });
    expect(arg.include.stops.orderBy).toEqual({ order: "asc" });
    expect(res.json).toHaveBeenCalledWith({ routes: [{ id: 1, stops: [] }] });
  });
});
```

Also update the top `jest.mock` so prisma includes `busRoute`:

```typescript
jest.mock("../../config/database", () => ({
  prisma: { user: { findMany: jest.fn() }, busRoute: { findMany: jest.fn() } },
}));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/controllers/public/operators.controller.test.ts`
Expected: FAIL — `PublicOperatorController.routes is not a function`.

- [ ] **Step 3: Write minimal implementation** (add method to the const object)

```typescript
  async routes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operatorId = Number(req.params.operatorId);
      const routes = await prisma.busRoute.findMany({
        where: { operatorId, isActive: true },
        include: { stops: { orderBy: { order: "asc" } } },
        orderBy: { originCity: "asc" },
      });
      res.json({ routes });
    } catch (err) {
      next(err);
    }
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/controllers/public/operators.controller.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/public/operators.controller.ts server/src/controllers/public/operators.controller.test.ts
git commit -m "feat(server): public operator routes endpoint controller"
```

---

## Task 3: Server — route trips (`GET /public/bus-routes/:routeId/trips`)

**Files:**
- Modify: `server/src/controllers/public/busRoutes.controller.ts`
- Test: `server/src/controllers/public/busRoutes.controller.test.ts`

**Interfaces:**
- Produces: `PublicBusRouteController.trips(req, res, next)` → `res.json({ trips: Ride[] })` (future PUBLISHED rides on the route with seats; each includes `vehicle` make/model/plate/capacity).

- [ ] **Step 1: Write the failing test**

```typescript
// server/src/controllers/public/busRoutes.controller.test.ts
jest.mock("../../config/database", () => ({
  prisma: { ride: { findMany: jest.fn() } },
}));

import { Request, Response } from "express";
import { PublicBusRouteController } from "./busRoutes.controller";
import { prisma } from "../../config/database";

function mockReq(over: Partial<Request> = {}): Request {
  return { query: {}, params: {}, ...over } as any;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}
const flush = () => new Promise<void>((r) => setImmediate(r));
beforeEach(() => jest.clearAllMocks());

describe("PublicBusRouteController.trips", () => {
  it("returns only future PUBLISHED trips with seats for the route", async () => {
    (prisma.ride.findMany as jest.Mock).mockResolvedValue([{ id: 9 }]);
    const res = mockRes();
    await PublicBusRouteController.trips(mockReq({ params: { routeId: "1" } } as any), res, jest.fn());
    await flush();
    const arg = (prisma.ride.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.routeId).toBe(1);
    expect(arg.where.status).toBe("PUBLISHED");
    expect(arg.where.availableSeats).toEqual({ gt: 0 });
    expect(arg.where.departureTime.gt).toBeInstanceOf(Date);
    expect(arg.orderBy).toEqual({ departureTime: "asc" });
    expect(res.json).toHaveBeenCalledWith({ trips: [{ id: 9 }] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/controllers/public/busRoutes.controller.test.ts`
Expected: FAIL — `PublicBusRouteController.trips is not a function`.

- [ ] **Step 3: Write minimal implementation** (add to the existing const object; add imports)

Add at top of `busRoutes.controller.ts`:

```typescript
import { RideStatus } from "@prisma/client";
import { prisma } from "../../config/database";
```

Add method inside `PublicBusRouteController`:

```typescript
  async trips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const routeId = Number(req.params.routeId);
      const trips = await prisma.ride.findMany({
        where: {
          routeId,
          status: RideStatus.PUBLISHED,
          isBlocked: false,
          departureTime: { gt: new Date() },
          availableSeats: { gt: 0 },
        },
        include: {
          vehicle: { select: { make: true, model: true, plateNumber: true, capacity: true } },
        },
        orderBy: { departureTime: "asc" },
      });
      res.json({ trips });
    } catch (err) {
      next(err);
    }
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/controllers/public/busRoutes.controller.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/public/busRoutes.controller.ts server/src/controllers/public/busRoutes.controller.test.ts
git commit -m "feat(server): public route trips endpoint controller"
```

---

## Task 4: Server — include `route.stops` in `getRideById` + wire all 3 routes

**Files:**
- Modify: `server/src/controllers/ride.controller.ts` (the `getRideById` `include`)
- Modify: `server/src/routes/public.routes.ts`

**Interfaces:**
- Consumes: Task 1–3 controllers.
- Produces: live routes `GET /public/operators`, `GET /public/operators/:operatorId/routes`, `GET /public/bus-routes/:routeId/trips`; and `GET /public/rides/:rideId` response `data.route.stops` (ordered).

- [ ] **Step 1: Add `route` include to `getRideById`**

In `server/src/controllers/ride.controller.ts`, inside the `prisma.ride.findUnique({ ... include: { ... } })` used by `getRideById`, add this entry alongside `preferences`/`departureLocation`:

```typescript
    route: { include: { stops: { orderBy: { order: "asc" } } } },
```

- [ ] **Step 2: Wire the 3 new routes**

In `server/src/routes/public.routes.ts`, add the import near the other public-controller imports:

```typescript
import { PublicOperatorController } from "../controllers/public/operators.controller";
```

Then add these routes (alongside the existing `/bus-routes/search`):

```typescript
router.get("/operators", PublicOperatorController.list);

router.get(
  "/operators/:operatorId/routes",
  param("operatorId").isInt({ gt: 0 }).toInt(),
  validateRequestBody,
  PublicOperatorController.routes
);

router.get(
  "/bus-routes/:routeId/trips",
  param("routeId").isInt({ gt: 0 }).toInt(),
  validateRequestBody,
  PublicBusRouteController.trips
);
```

(`param`, `validateRequestBody`, and `PublicBusRouteController` are already imported in this file.)

- [ ] **Step 3: Type-check and run the full server suite**

Run: `npx tsc --noEmit && npx jest src/controllers/public`
Expected: tsc clean; all public controller tests PASS.

- [ ] **Step 4: Manual smoke (server running locally on :3003)**

Run:
```bash
curl -s "http://localhost:3003/api/v1/public/operators" | head -c 400
```
Expected: JSON `{"operators":[...]}` (HTTP 200; array may be empty if no seeded operators).

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/ride.controller.ts server/src/routes/public.routes.ts
git commit -m "feat(server): wire public bus operator/route/trip endpoints + ride route.stops"
```

---

## Task 5: Mobile — bus types + extend `Ride`

**Files:**
- Modify: `mobile/src/lib/types.ts`

**Interfaces:**
- Produces: `BusOperator`, `BusRouteStop`, `BusRoute`, `BusTrip`; `Ride.route?: BusRoute`.

- [ ] **Step 1: Add the types** (append near other interfaces in `types.ts`)

```typescript
export interface BusRouteStop {
  id: number;
  routeId: number;
  name: string;
  city: string;
  order: number;
  latitude: number | null;
  longitude: number | null;
}

export interface BusRoute {
  id: number;
  operatorId: number;
  originCity: string;
  destCity: string;
  distanceKm: number;
  basePrice: string;
  isActive: boolean;
  stops: BusRouteStop[];
}

export interface BusOperator {
  id: number;
  name: string;
  photoUrl: string | null;
  rating: number | null;
  totalRatings: number;
  routeCount: number;
}

export interface BusTrip {
  id: number;
  departureTime: string;
  estimatedArrivalTime: string | null;
  availableSeats: number;
  totalSeats: number;
  contribution: number;
  vehicle?: Pick<Vehicle, "make" | "model" | "plateNumber" | "capacity">;
}
```

- [ ] **Step 2: Extend `Ride`** — add this field to the existing `Ride` interface:

```typescript
  route?: BusRoute;
```

- [ ] **Step 3: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/lib/types.ts
git commit -m "feat(mobile): bus operator/route/trip types"
```

---

## Task 6: Mobile — query keys + data hooks

**Files:**
- Modify: `mobile/src/lib/constants.ts`
- Create: `mobile/src/hooks/useBus.ts`
- Test: `mobile/src/hooks/__tests__/useBus.test.tsx`

**Interfaces:**
- Consumes: `BusOperator`, `BusRoute`, `BusTrip` (Task 5); `publicApi`.
- Produces: `useBusOperators()` → `{ data?: BusOperator[] }`; `useOperatorRoutes(operatorId?: string)` → `{ data?: BusRoute[] }`; `useRouteTrips(routeId?: string)` → `{ data?: BusTrip[] }`.

- [ ] **Step 1: Add query keys** — inside the `queryKeys` object in `constants.ts`:

```typescript
  bus: {
    operators: ["bus", "operators"] as const,
    routes: (operatorId: string) => ["bus", "routes", operatorId] as const,
    trips: (routeId: string) => ["bus", "trips", routeId] as const,
  },
```

- [ ] **Step 2: Write the failing test**

```tsx
// mobile/src/hooks/__tests__/useBus.test.tsx
import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("@/services/api", () => ({ publicApi: { get: jest.fn() } }));
import { publicApi } from "@/services/api";
import { useBusOperators, useOperatorRoutes, useRouteTrips } from "@/hooks/useBus";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}
beforeEach(() => jest.clearAllMocks());

it("useBusOperators unwraps { operators }", async () => {
  (publicApi.get as jest.Mock).mockResolvedValue({ operators: [{ id: 1, name: "City Link" }] });
  const { result } = renderHook(() => useBusOperators(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: "City Link" }]));
  expect(publicApi.get).toHaveBeenCalledWith("/public/operators");
});

it("useOperatorRoutes is disabled without an id and hits the right url", async () => {
  (publicApi.get as jest.Mock).mockResolvedValue({ routes: [{ id: 7 }] });
  const { result } = renderHook(() => useOperatorRoutes("5"), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 7 }]));
  expect(publicApi.get).toHaveBeenCalledWith("/public/operators/5/routes");
});

it("useRouteTrips unwraps { trips }", async () => {
  (publicApi.get as jest.Mock).mockResolvedValue({ trips: [{ id: 9 }] });
  const { result } = renderHook(() => useRouteTrips("1"), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 9 }]));
  expect(publicApi.get).toHaveBeenCalledWith("/public/bus-routes/1/trips");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `mobile/`): `npm test -- src/hooks/__tests__/useBus.test.tsx`
Expected: FAIL — cannot find module `@/hooks/useBus`.

- [ ] **Step 4: Write minimal implementation**

```typescript
// mobile/src/hooks/useBus.ts
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import { queryKeys } from "@/lib/constants";
import type { BusOperator, BusRoute, BusTrip } from "@/lib/types";

export function useBusOperators() {
  return useQuery({
    queryKey: queryKeys.bus.operators,
    queryFn: () => publicApi.get<{ operators: BusOperator[] }>("/public/operators"),
    select: (r) => r.operators,
  });
}

export function useOperatorRoutes(operatorId?: string) {
  return useQuery({
    queryKey: queryKeys.bus.routes(operatorId ?? ""),
    queryFn: () => publicApi.get<{ routes: BusRoute[] }>(`/public/operators/${operatorId}/routes`),
    select: (r) => r.routes,
    enabled: !!operatorId,
  });
}

export function useRouteTrips(routeId?: string) {
  return useQuery({
    queryKey: queryKeys.bus.trips(routeId ?? ""),
    queryFn: () => publicApi.get<{ trips: BusTrip[] }>(`/public/bus-routes/${routeId}/trips`),
    select: (r) => r.trips,
    enabled: !!routeId,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run (from `mobile/`): `npm test -- src/hooks/__tests__/useBus.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add mobile/src/lib/constants.ts mobile/src/hooks/useBus.ts mobile/src/hooks/__tests__/useBus.test.tsx
git commit -m "feat(mobile): bus data hooks + query keys"
```

---

## Task 7: Mobile — extend `useBookRide` for stop selection

**Files:**
- Modify: `mobile/src/hooks/useRides.ts`
- Test: `mobile/src/hooks/__tests__/useBookRide.test.tsx`

**Interfaces:**
- Produces: `useBookRide().mutateAsync({ rideId, seats, boardingStopId?, alightingStopId? })`; `BookRideResponse.data` now also carries optional `bookingId`, `status`, `seatsBooked`, `attendanceCodes`.

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/src/hooks/__tests__/useBookRide.test.tsx
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("@/services/api", () => ({ api: { post: jest.fn() } }));
import { api } from "@/services/api";
import { useBookRide } from "@/hooks/useRides";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

it("posts boardingStopId and alightingStopId in the body", async () => {
  (api.post as jest.Mock).mockResolvedValue({ success: true, data: { bookingId: 1, attendanceCodes: ["X"] } });
  const { result } = renderHook(() => useBookRide(), { wrapper: wrapper() });
  await act(async () => {
    await result.current.mutateAsync({ rideId: 9, seats: 2, boardingStopId: 3, alightingStopId: 4 });
  });
  expect(api.post).toHaveBeenCalledWith("/rides/9/book", {
    seatsBooked: 2,
    boardingStopId: 3,
    alightingStopId: 4,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `mobile/`): `npm test -- src/hooks/__tests__/useBookRide.test.tsx`
Expected: FAIL — payload lacks `boardingStopId`/`alightingStopId`.

- [ ] **Step 3: Update `BookRideResponse` and `useBookRide`**

Replace the existing `BookRideResponse` interface body's `data` with:

```typescript
interface BookRideResponse {
  success: boolean;
  data: {
    sessionId?: string;
    bookingId?: number;
    status?: string;
    seatsBooked?: number;
    attendanceCodes?: string[];
    baseAmount: number;
    platformAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    currency: string;
  };
}
```

Replace `useBookRide` with:

```typescript
export function useBookRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rideId,
      seats,
      boardingStopId,
      alightingStopId,
    }: {
      rideId: string | number;
      seats: number;
      boardingStopId?: number;
      alightingStopId?: number;
    }) =>
      api.post<BookRideResponse>(`/rides/${rideId}/book`, {
        seatsBooked: seats,
        boardingStopId,
        alightingStopId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `mobile/`): `npm test -- src/hooks/__tests__/useBookRide.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useRides.ts mobile/src/hooks/__tests__/useBookRide.test.tsx
git commit -m "feat(mobile): useBookRide accepts boarding/alighting stop ids"
```

---

## Task 8: Mobile — stop-selection validation helper

**Files:**
- Create: `mobile/src/lib/busBooking.ts`
- Test: `mobile/src/lib/__tests__/busBooking.test.ts`

**Interfaces:**
- Consumes: `BusRouteStop` (Task 5).
- Produces: `isValidStopSelection(stops, boardingStopId, alightingStopId): boolean` — true only when both exist and alighting `order` > boarding `order`.

- [ ] **Step 1: Write the failing test**

```typescript
// mobile/src/lib/__tests__/busBooking.test.ts
import { isValidStopSelection } from "@/lib/busBooking";
import type { BusRouteStop } from "@/lib/types";

const stops: BusRouteStop[] = [
  { id: 1, routeId: 1, name: "A", city: "A", order: 0, latitude: null, longitude: null },
  { id: 2, routeId: 1, name: "B", city: "B", order: 1, latitude: null, longitude: null },
  { id: 3, routeId: 1, name: "C", city: "C", order: 2, latitude: null, longitude: null },
];

it("accepts alighting after boarding", () => {
  expect(isValidStopSelection(stops, 1, 3)).toBe(true);
});
it("rejects alighting before or equal to boarding", () => {
  expect(isValidStopSelection(stops, 3, 1)).toBe(false);
  expect(isValidStopSelection(stops, 2, 2)).toBe(false);
});
it("rejects unknown stop ids", () => {
  expect(isValidStopSelection(stops, 1, 99)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `mobile/`): `npm test -- src/lib/__tests__/busBooking.test.ts`
Expected: FAIL — cannot find module `@/lib/busBooking`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// mobile/src/lib/busBooking.ts
import type { BusRouteStop } from "@/lib/types";

export function isValidStopSelection(
  stops: BusRouteStop[],
  boardingStopId: number,
  alightingStopId: number
): boolean {
  const boarding = stops.find((s) => s.id === boardingStopId);
  const alighting = stops.find((s) => s.id === alightingStopId);
  if (!boarding || !alighting) return false;
  return alighting.order > boarding.order;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `mobile/`): `npm test -- src/lib/__tests__/busBooking.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/busBooking.ts mobile/src/lib/__tests__/busBooking.test.ts
git commit -m "feat(mobile): bus stop-selection validation helper"
```

---

## Task 9: Mobile — `OperatorListView` component + bottom-sheet wiring

**Files:**
- Create: `mobile/src/components/bus/OperatorListView.tsx`
- Test: `mobile/src/components/bus/__tests__/OperatorListView.test.tsx`
- Modify: `mobile/src/components/HomeBottomSheet.tsx`

**Interfaces:**
- Consumes: `BusOperator` (Task 5).
- Produces: `OperatorListView({ operators, onSelect })` — search field (`testID="bus.operatorSearch"`) filtering by name; each row pressable (`testID={`bus.operator.${op.id}`}`) calls `onSelect(op.id)`.

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/src/components/bus/__tests__/OperatorListView.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { OperatorListView } from "@/components/bus/OperatorListView";
import type { BusOperator } from "@/lib/types";

const ops: BusOperator[] = [
  { id: 1, name: "City Link", photoUrl: null, rating: 4.8, totalRatings: 320, routeCount: 12 },
  { id: 2, name: "Pioneer Coaches", photoUrl: null, rating: 4.6, totalRatings: 80, routeCount: 9 },
];

function renderView(onSelect = jest.fn()) {
  return {
    onSelect,
    ...render(
      <ThemeProvider>
        <OperatorListView operators={ops} onSelect={onSelect} />
      </ThemeProvider>
    ),
  };
}

it("renders operators and fires onSelect", () => {
  const { getByTestId, onSelect } = renderView();
  fireEvent.press(getByTestId("bus.operator.1"));
  expect(onSelect).toHaveBeenCalledWith(1);
});

it("filters by search text", () => {
  const { getByTestId, queryByText } = renderView();
  fireEvent.changeText(getByTestId("bus.operatorSearch"), "pioneer");
  expect(queryByText("Pioneer Coaches")).toBeTruthy();
  expect(queryByText("City Link")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `mobile/`): `npm test -- src/components/bus/__tests__/OperatorListView.test.tsx`
Expected: FAIL — cannot find module `@/components/bus/OperatorListView`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// mobile/src/components/bus/OperatorListView.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Bus, Star, ChevronRight, Search } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";
import type { BusOperator } from "@/lib/types";

export function OperatorListView({
  operators,
  onSelect,
}: {
  operators: BusOperator[];
  onSelect: (operatorId: number) => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => operators.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase())),
    [operators, query]
  );

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Bus operators</Text>
      <Text style={s.subtitle}>Choose an operator to see its routes & trips</Text>
      <View style={s.search}>
        <Search size={18} color={colors.text.tertiary} />
        <TextInput
          testID="bus.operatorSearch"
          value={query}
          onChangeText={setQuery}
          placeholder="Search operators"
          placeholderTextColor={colors.text.tertiary}
          style={s.searchInput}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o.id)}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`bus.operator.${item.id}`}
            style={s.row}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
          >
            <View style={s.logo}>
              <Bus size={22} color={colors.primary} />
            </View>
            <View style={s.mid}>
              <Text style={s.name}>{item.name}</Text>
              <View style={s.metaRow}>
                <Star size={13} color={colors.star} />
                <Text style={s.meta}>{item.rating ?? "—"}</Text>
                <Text style={s.dot}>·</Text>
                <Text style={s.meta}>{item.routeCount} routes</Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrap: { flex: 1, gap: spacing.md },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
    subtitle: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      height: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.primary },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.card,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logo: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    mid: { flex: 1, gap: 3 },
    name: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.sm, color: colors.text.primary },
    metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    meta: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    dot: { color: colors.text.tertiary },
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `mobile/`): `npm test -- src/components/bus/__tests__/OperatorListView.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire into `HomeBottomSheet`**

In `HomeBottomSheet.tsx`: add imports at top:

```typescript
import { OperatorListView } from "@/components/bus/OperatorListView";
import { useBusOperators } from "@/hooks/useBus";
```

Inside the component body (with the other hooks), add:

```typescript
const { data: busOperators = [] } = useBusOperators();
```

In the JSX, wrap the existing sheet body (the destination/location fields, mode toggle, fields row, recent list, and the action button) so it only renders when **not** Bus, and render `OperatorListView` when Bus. Concretely, replace the block that currently renders those inputs with:

```tsx
{vehicleType === "BUS" ? (
  <OperatorListView
    operators={busOperators}
    onSelect={(operatorId) =>
      router.push({ pathname: "/bus/[operatorId]/routes", params: { operatorId: String(operatorId) } })
    }
  />
) : (
  <>
    {/* ...existing location/destination fields, mode toggle, fields row, recent list, action button... */}
  </>
)}
```

(Keep the vehicle pills row above this block unchanged so Bus stays selectable.)

- [ ] **Step 6: Type-check + run the home sheet's existing tests if any**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/bus/OperatorListView.tsx mobile/src/components/bus/__tests__/OperatorListView.test.tsx mobile/src/components/HomeBottomSheet.tsx
git commit -m "feat(mobile): operators list in bottom sheet when Bus selected"
```

---

## Task 10: Mobile — Routes screen (`bus/[operatorId]/routes.tsx`)

**Files:**
- Create: `mobile/src/app/bus/[operatorId]/routes.tsx`

**Interfaces:**
- Consumes: `useOperatorRoutes` (Task 6).
- Produces: route screen; tapping a route pushes `/bus/route/[routeId]/trips` with `routeId` and `routeTitle` params.

- [ ] **Step 1: Implement the screen**

```tsx
// mobile/src/app/bus/[operatorId]/routes.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useOperatorRoutes } from "@/hooks/useBus";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";

export default function OperatorRoutesScreen() {
  const { operatorId, operatorName } = useLocalSearchParams<{ operatorId: string; operatorName?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data: routes, isLoading } = useOperatorRoutes(operatorId);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>{operatorName || "Routes"}</Text>
      </View>
      {isLoading ? (
        <LoadingIndicator />
      ) : (
        <FlatList
          data={routes ?? []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>No routes available yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`bus.route.${item.id}`}
              style={s.card}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/bus/route/[routeId]/trips",
                  params: { routeId: String(item.id), routeTitle: `${item.originCity} → ${item.destCity}` },
                })
              }
            >
              <View style={s.cardTop}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.route}>{item.originCity} → {item.destCity}</Text>
                  <Text style={s.meta}>{item.distanceKm} km · {item.stops.length} stops</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.from}>from</Text>
                  <Text style={s.price}>RWF {item.basePrice}</Text>
                </View>
              </View>
              <View style={s.cardBottom}>
                <Text style={s.viewTrips}>View trips</Text>
                <ChevronRight size={18} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    appBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
    list: { padding: spacing.lg, gap: spacing.md },
    empty: { fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center", marginTop: spacing.xxxl },
    card: { gap: spacing.md, padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    route: { fontFamily: "Jost_700Bold", fontSize: fontSize.md, color: colors.text.primary },
    meta: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    from: { fontFamily: "Jost_500Medium", fontSize: 10, color: colors.text.tertiary },
    price: { fontFamily: "Jost_700Bold", fontSize: fontSize.sm, color: colors.primary },
    cardBottom: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 2, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm },
    viewTrips: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.xs, color: colors.primary },
  });
```

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Update the operator select to pass the name** — in `HomeBottomSheet.tsx`, change `OperatorListView`'s `onSelect` to include the operator name so the routes screen can title itself:

```tsx
onSelect={(operatorId) => {
  const op = busOperators.find((o) => o.id === operatorId);
  router.push({
    pathname: "/bus/[operatorId]/routes",
    params: { operatorId: String(operatorId), operatorName: op?.name ?? "" },
  });
}}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/bus/[operatorId]/routes.tsx mobile/src/components/HomeBottomSheet.tsx
git commit -m "feat(mobile): operator routes screen"
```

---

## Task 11: Mobile — Trips/Schedule screen (`bus/route/[routeId]/trips.tsx`)

**Files:**
- Create: `mobile/src/app/bus/route/[routeId]/trips.tsx`
- Test: `mobile/src/app/bus/route/[routeId]/__tests__/trips.test.tsx`

**Interfaces:**
- Consumes: `useRouteTrips` (Task 6); `formatTime` from `@/lib/utils`.
- Produces: trips screen; tapping an available trip pushes `/bus/trip/[rideId]` with `rideId`, `routeId`, `routeTitle`. Sold-out trips (`availableSeats <= 0`) render disabled (but the endpoint already excludes zero-seat trips; the guard is defensive).

- [ ] **Step 1: Write the failing test**

```tsx
// mobile/src/app/bus/route/[routeId]/__tests__/trips.test.tsx
import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ routeId: "1", routeTitle: "Harare → Bulawayo" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock("@/hooks/useBus", () => ({
  useRouteTrips: () => ({
    data: [
      { id: 9, departureTime: "2026-06-22T06:00:00Z", estimatedArrivalTime: "2026-06-22T11:30:00Z", availableSeats: 32, totalSeats: 45, contribution: 25000, vehicle: { make: "Scania", model: "Marcopolo", plateNumber: "AB", capacity: 45 } },
    ],
    isLoading: false,
  }),
}));
import { ThemeProvider } from "@/providers/ThemeProvider";
import TripsScreen from "@/app/bus/route/[routeId]/trips";

it("renders the route title and a trip", () => {
  const { getByText, getByTestId } = render(
    <ThemeProvider>
      <TripsScreen />
    </ThemeProvider>
  );
  expect(getByText("Harare → Bulawayo")).toBeTruthy();
  expect(getByTestId("bus.trip.9")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `mobile/`): `npm test -- src/app/bus/route/[routeId]/__tests__/trips.test.tsx`
Expected: FAIL — cannot find module `@/app/bus/route/[routeId]/trips`.

- [ ] **Step 3: Implement the screen**

```tsx
// mobile/src/app/bus/route/[routeId]/trips.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, EventSeatPlaceholder } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useRouteTrips } from "@/hooks/useBus";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { formatTime } from "@/lib/utils";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";

export default function TripsScreen() {
  const { routeId, routeTitle } = useLocalSearchParams<{ routeId: string; routeTitle?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data: trips, isLoading } = useRouteTrips(routeId);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>{routeTitle || "Trips"}</Text>
      </View>
      {isLoading ? (
        <LoadingIndicator />
      ) : (
        <FlatList
          data={trips ?? []}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>No upcoming trips on this route.</Text>}
          renderItem={({ item }) => {
            const soldOut = item.availableSeats <= 0;
            return (
              <TouchableOpacity
                testID={`bus.trip.${item.id}`}
                style={[s.card, soldOut && { opacity: 0.6 }]}
                disabled={soldOut}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/bus/trip/[rideId]",
                    params: { rideId: String(item.id), routeId: String(routeId), routeTitle: routeTitle ?? "" },
                  })
                }
              >
                <View style={s.schedRow}>
                  <Text style={s.time}>{formatTime(item.departureTime)}</Text>
                  <Text style={s.arrow}>→</Text>
                  <Text style={s.time}>{item.estimatedArrivalTime ? formatTime(item.estimatedArrivalTime) : "--:--"}</Text>
                </View>
                <View style={s.botRow}>
                  <Text style={[s.seats, item.availableSeats <= 8 && { color: colors.warning }]}>
                    {soldOut ? "Sold out" : `${item.availableSeats} seats left`}
                  </Text>
                  <Text style={s.price}>RWF {item.contribution.toLocaleString()}</Text>
                </View>
                {item.vehicle ? (
                  <Text style={s.vehicle}>{item.vehicle.make} {item.vehicle.model}</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    appBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.md, color: colors.text.primary },
    list: { padding: spacing.lg, gap: spacing.md },
    empty: { fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center", marginTop: spacing.xxxl },
    card: { gap: spacing.sm, padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    schedRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    time: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
    arrow: { fontFamily: "Jost_500Medium", fontSize: fontSize.md, color: colors.text.tertiary },
    botRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    seats: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.xs, color: colors.text.secondary },
    price: { fontFamily: "Jost_700Bold", fontSize: fontSize.sm, color: colors.primary },
    vehicle: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.tertiary },
  });
```

> Note: remove the unused `EventSeatPlaceholder` import — it is illustrative only. Import only icons you use (`ArrowLeft`). If you want a seat icon, use a real `lucide-react-native` export (verify it exists first).

- [ ] **Step 4: Run test to verify it passes**

Run (from `mobile/`): `npm test -- src/app/bus/route/[routeId]/__tests__/trips.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/bus/route/[routeId]/trips.tsx mobile/src/app/bus/route/[routeId]/__tests__/trips.test.tsx
git commit -m "feat(mobile): route trips/schedule screen"
```

---

## Task 12: Mobile — Booking screen with stop pickers (`bus/trip/[rideId].tsx`)

**Files:**
- Create: `mobile/src/app/bus/trip/[rideId].tsx`

**Interfaces:**
- Consumes: `useRideDetail` (existing, in `@/hooks/useRides`), `useBookRide` (Task 7), `isValidStopSelection` (Task 8), `useRequireAuth` (existing), `handleApiError` (existing). `ride.route?.stops` populated by Task 4.
- Produces: booking screen; on success navigates `router.replace("/bus/trip/<rideId>/ticket")`.

- [ ] **Step 1: Implement the screen**

```tsx
// mobile/src/app/bus/trip/[rideId].tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useRideDetail, useBookRide } from "@/hooks/useRides";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { isValidStopSelection } from "@/lib/busBooking";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Button } from "@/components/ui/Button";
import { handleApiError } from "@/lib/utils";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";

export default function BusBookingScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  useRequireAuth();
  const { data: ride, isLoading } = useRideDetail(rideId!);
  const book = useBookRide();

  const stops = ride?.route?.stops ?? [];
  const [boardingStopId, setBoardingStopId] = useState<number | null>(null);
  const [alightingStopId, setAlightingStopId] = useState<number | null>(null);
  const [seats] = useState(1);

  useEffect(() => {
    if (stops.length && boardingStopId == null) {
      setBoardingStopId(stops[0].id);
      setAlightingStopId(stops[stops.length - 1].id);
    }
  }, [stops, boardingStopId]);

  if (isLoading || !ride) return <LoadingIndicator />;

  const onConfirm = async () => {
    if (boardingStopId == null || alightingStopId == null || !isValidStopSelection(stops, boardingStopId, alightingStopId)) {
      Alert.alert("Invalid stops", "Your drop-off must be after your boarding stop.");
      return;
    }
    try {
      await book.mutateAsync({ rideId: ride.id, seats, boardingStopId, alightingStopId });
      router.replace(`/bus/trip/${ride.id}/ticket`);
    } catch (e) {
      handleApiError(e);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Confirm booking</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.label}>BOARDING POINT</Text>
        {stops.map((stop) => {
          const selected = stop.id === boardingStopId;
          return (
            <TouchableOpacity
              key={`b-${stop.id}`}
              testID={`bus.boarding.${stop.id}`}
              style={[s.option, selected && s.optionSelected]}
              onPress={() => setBoardingStopId(stop.id)}
            >
              <View style={[s.radio, selected && s.radioOn]}>{selected ? <Check size={12} color={colors.text.inverse} /> : null}</View>
              <Text style={s.optionText}>{stop.name}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={s.label}>DROP-OFF POINT</Text>
        {stops.map((stop) => {
          const selected = stop.id === alightingStopId;
          return (
            <TouchableOpacity
              key={`a-${stop.id}`}
              testID={`bus.alighting.${stop.id}`}
              style={[s.option, selected && s.optionSelected]}
              onPress={() => setAlightingStopId(stop.id)}
            >
              <View style={[s.radio, selected && s.radioOn]}>{selected ? <Check size={12} color={colors.text.inverse} /> : null}</View>
              <Text style={s.optionText}>{stop.name}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={s.priceCard}>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Fare · {seats} seat</Text>
            <Text style={s.priceValue}>RWF {ride.contribution.toLocaleString()}</Text>
          </View>
          <Text style={s.note}>Pay operator on boarding (cash)</Text>
        </View>
      </ScrollView>
      <View style={s.bar}>
        <Button title="Confirm booking" onPress={onConfirm} loading={book.isPending} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    appBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.md, color: colors.text.primary },
    content: { padding: spacing.lg, gap: spacing.sm },
    label: { fontFamily: "Jost_700Bold", fontSize: 11, letterSpacing: 0.6, color: colors.text.secondary, marginTop: spacing.md },
    option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    optionSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    radio: { width: 20, height: 20, borderRadius: 999, borderWidth: 2, borderColor: colors.text.tertiary, alignItems: "center", justifyContent: "center" },
    radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
    optionText: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.sm, color: colors.text.primary },
    priceCard: { marginTop: spacing.lg, gap: spacing.sm, padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    priceRow: { flexDirection: "row", justifyContent: "space-between" },
    priceLabel: { fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.secondary },
    priceValue: { fontFamily: "Jost_700Bold", fontSize: fontSize.sm, color: colors.text.primary },
    note: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.secondary },
    bar: { padding: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  });
```

> Verify `Button` accepts `loading`/`onPress`/`title` props (per `components/ui/Button.tsx` from the existing code). If the prop is named `isLoading`, adjust accordingly.

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/bus/trip/[rideId].tsx
git commit -m "feat(mobile): bus trip booking screen with stop pickers"
```

---

## Task 13: Mobile — Ticket/QR screen (`bus/trip/[rideId]/ticket.tsx`)

**Files:**
- Create: `mobile/src/app/bus/trip/[rideId]/ticket.tsx`

**Interfaces:**
- Consumes: `useRideDetail` (existing), `useAuthContext` (existing), `TicketQr` (existing). Finds the current user's booking on the ride and renders its attendance-code QR(s).

- [ ] **Step 1: Implement the screen**

```tsx
// mobile/src/app/bus/trip/[rideId]/ticket.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, X } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useRideDetail } from "@/hooks/useRides";
import { useAuthContext } from "@/providers/AuthProvider";
import { TicketQr } from "@/components/TicketQr";
import { Button } from "@/components/ui/Button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";

export default function BusTicketScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuthContext();
  const { data: ride, isLoading } = useRideDetail(rideId!, { refetchInterval: 4000 });

  if (isLoading || !ride) return <LoadingIndicator />;

  const myBooking = ride.bookings?.find((b) => String(b.userId) === String(user?.id));
  const codes =
    myBooking?.bookingSeats?.map((bs) => bs.attendanceCode).filter(Boolean) ??
    (myBooking?.attendanceCode ? [myBooking.attendanceCode] : []);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => router.dismissAll?.() ?? router.replace("/")}>
          <X size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Your ticket</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <CheckCircle size={44} color={colors.primary} />
        <Text style={s.h1}>Booking confirmed</Text>
        <Text style={s.sub}>Show this QR to the conductor on boarding</Text>
        <View style={s.qrCard}>
          {codes.length ? (
            codes.map((c, i) => <TicketQr key={i} attendanceCode={c as string} />)
          ) : (
            <Text style={s.pending}>Your ticket code will appear here once confirmed.</Text>
          )}
        </View>
        <Button title="View in My Trips" onPress={() => router.replace("/(drawer)/rides")} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    appBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontFamily: "Jost_700Bold", fontSize: fontSize.md, color: colors.text.primary },
    content: { padding: spacing.lg, gap: spacing.md, alignItems: "center" },
    h1: { fontFamily: "Jost_700Bold", fontSize: fontSize.xl, color: colors.text.primary },
    sub: { fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center" },
    qrCard: { backgroundColor: "#FFFFFF", borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border },
    pending: { fontFamily: "Jost_500Medium", fontSize: fontSize.sm, color: "#6B7280", textAlign: "center" },
  });
```

> `router.dismissAll` may not exist on all expo-router versions; the `?? router.replace("/")` fallback covers that. Verify the `/(drawer)/rides` path matches the My Trips route.

- [ ] **Step 2: Type-check**

Run (from `mobile/`): `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/bus/trip/[rideId]/ticket.tsx
git commit -m "feat(mobile): bus ticket/QR screen"
```

---

## Task 14: Full-flow verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole mobile test suite**

Run (from `mobile/`): `npm test`
Expected: all suites pass (including the new bus tests).

- [ ] **Step 2: Run the whole server test suite + type-check**

Run (from `server/`): `npx tsc --noEmit && npm test`
Expected: pass.

- [ ] **Step 3: Manual E2E against local stack (server :3003, seeded operator with route + future trip)**

In the app: Home → tap **Bus** → operators list appears → pick an operator → routes list → pick a route → trips list → pick a trip → choose boarding/drop-off → **Confirm booking** → ticket screen shows a QR. Confirm the booking appears in My Trips.

- [ ] **Step 4: Commit any fixes found during verification** (if needed)

```bash
git add -A
git commit -m "fix(mobile): bus booking flow verification fixes"
```

---

## Self-Review Notes (coverage vs. spec)

- Spec §4 (3 endpoints): Tasks 1–4. ✅
- Spec §4 (`route.stops` for booking): Task 4 Step 1. ✅
- Spec §5 entry point: Task 9. ✅ Screens: Tasks 10–13. ✅ Hooks/keys/types: Tasks 5–6. ✅ `useBookRide` stops: Task 7. ✅
- Spec §5 stop-ordering validation: Task 8. ✅
- Spec §5 states (low-seats/sold-out, empty): Tasks 10–11. ✅
- Spec §3.6 OFF_PLATFORM "pay on boarding" + immediate QR: Tasks 12–13. ✅
- Spec §3.5 per-route pricing (no per-stop fare): booking screen shows route fare only. ✅
