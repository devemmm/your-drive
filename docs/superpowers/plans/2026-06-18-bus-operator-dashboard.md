# Bus Operator Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin-created `BUS_OPERATOR` users log into a dedicated `/operator` dashboard and self-manage their own buses, routes, fares, and trip schedules, plus view a read-only passenger manifest — and fix the broken admin "add operator" flow so created operators actually appear in the list.

**Architecture:** Three independently-shippable layers. (1) Repoint the admin create-operator hook to the existing role-aware endpoint. (2) Add operator-scoped backend endpoints (`/api/v1/operator/*`) gated by a new `isBusOperator` middleware, with every query forced to `req.user.id`. (3) Add a role-guarded `/operator` React dashboard with role-based post-login redirect, reusing existing patterns (vehicle CRUD is already owner-scoped and reused as-is).

**Tech Stack:** Server — Node/Express + Prisma + ts-jest (unit tests via direct controller invocation with mocked Prisma; no supertest). Client — React + Vite + TypeScript + @tanstack/react-query + axios wrapper (`@/services/api`) + sonner toasts + react-router-dom.

## Global Constraints

- Server role enum values: `USER | ADMIN | BUS_OPERATOR` (Prisma `UserRole`). User status: `ACTIVE | SUSPENDED`.
- All money on `BusRoute.basePrice` is `Decimal`; `Ride.contribution` is `Float` — convert with `Number(...)`.
- Payments are cash-only in Rwanda: new rides use `contributionCollectionMethod: "OFF_PLATFORM"`.
- A `Ride` is searchable by passengers only when `status = 'PUBLISHED'`, `isBlocked = false`, `isDeleted = false`, and `departureTime >= now`, with `routeId` set.
- Client auth: token in `localStorage["Your-DriveToken"]` (JSON string), role in `localStorage["userRole"]` (JSON string). The axios wrapper (`@/services/api`) unwraps `response.data` and injects the bearer token automatically.
- Operator-scoped endpoints must never leak cross-tenant data: return `404` (not `403`) when a resource exists but is not owned by the caller.
- Follow existing file/casing conventions; do not restructure unrelated code.

---

### Task 1: Fix admin "Add Operator" to create a real BUS_OPERATOR

**Files:**
- Modify: `client/src/hooks/useBusOperators.ts:47-84` (the `useCreateBusOperator` mutation)

**Interfaces:**
- Consumes: existing server endpoint `POST /api/v1/admin/users` with body `{ email, phoneNumber?, firstName, lastName?, password?, role? }`; validator allows `role ∈ {USER, ADMIN, BUS_OPERATOR}`; creates user `status: ACTIVE`, `kycStatus: APPROVED`.
- Produces: a `BUS_OPERATOR` user that `useBusOperators()` (`GET /api/v1/users?role=BUS_OPERATOR`) returns immediately.

- [ ] **Step 1: Replace the mutation body**

In `client/src/hooks/useBusOperators.ts`, replace the entire `mutationFn` and `onSuccess` of `useCreateBusOperator` (currently lines 50-74) with:

```ts
    mutationFn: async (input: CreateBusOperatorInput) => {
      // Admin-only creation endpoint that sets the role atomically.
      // Creates the user ACTIVE + KYC-approved, so it appears in the
      // BUS_OPERATOR list immediately (no manual DB role edit needed).
      const res = await api.post("/api/v1/admin/users", {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        password: input.password,
        role: "BUS_OPERATOR",
      });
      return res;
    },
    onSuccess: () => {
      toast.success("Operator created. They can now log in to the operator dashboard.");
      qc.invalidateQueries({ queryKey: ["bus-operators"] });
    },
```

- [ ] **Step 2: Typecheck the client**

Run: `cd client && bun run build` (or `npx tsc --noEmit -p tsconfig.app.json`)
Expected: build succeeds, no type errors in `useBusOperators.ts`.

- [ ] **Step 3: Manual verification**

Start the stack (`docker-compose up` or the project's run command). As admin: open the Bus Operators tab → add an operator (fill first/last name, email, phone, password) → submit.
Expected: the new operator appears in the operators table on refetch, marked Active.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useBusOperators.ts
git commit -m "fix(admin): create bus operators via /admin/users so they appear in the list"
```

---

### Task 2: `isBusOperator` middleware

**Files:**
- Create: `server/src/middlewares/isBusOperator.ts`
- Test: `server/src/middlewares/isBusOperator.test.ts`

**Interfaces:**
- Produces: `export const isBusOperator: (req, res, next) => void` — calls `next()` when `req.user.role === UserRole.BUS_OPERATOR`, else `next(AppError(<msg>, 403))`.

- [ ] **Step 1: Write the failing test**

Create `server/src/middlewares/isBusOperator.test.ts`:

```ts
import { UserRole } from "@prisma/client";
import { isBusOperator } from "./isBusOperator";

function mockReq(role: UserRole) {
  return { user: { role }, isEnglishPreferred: true } as any;
}

describe("isBusOperator", () => {
  it("calls next() with no error for BUS_OPERATOR", () => {
    const next = jest.fn();
    isBusOperator(mockReq(UserRole.BUS_OPERATOR), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects non-operators with a 403", () => {
    const next = jest.fn();
    isBusOperator(mockReq(UserRole.USER), {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest src/middlewares/isBusOperator.test.ts`
Expected: FAIL — cannot find module `./isBusOperator`.

- [ ] **Step 3: Implement the middleware**

Create `server/src/middlewares/isBusOperator.ts` (mirrors `isAdmin.ts`):

```ts
import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { AppError } from "../utils/AppError";

export const isBusOperator = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role !== UserRole.BUS_OPERATOR) {
    return next(
      AppError(
        req.isEnglishPreferred
          ? "Access denied. Bus operator privileges required"
          : "Accès refusé. Privilèges d'opérateur de bus requis",
        403
      )
    );
  }
  next();
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest src/middlewares/isBusOperator.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/middlewares/isBusOperator.ts server/src/middlewares/isBusOperator.test.ts
git commit -m "feat(server): add isBusOperator middleware"
```

---

### Task 3: Operator-scoped routes API (`/operator/routes`)

**Files:**
- Create: `server/src/controllers/operatorRoute.controller.ts`
- Create: `server/src/routes/operator.routes.ts`
- Modify: `server/src/routes/index.ts` (mount the operator router)
- Test: `server/src/controllers/operatorRoute.controller.test.ts`

**Interfaces:**
- Consumes: `prisma.busRoute`, `req.user` (`DbUser` with `.id`), `catchAsync`, `AppError`.
- Produces: `OperatorRouteController` with `list`, `create`, `update`, `replaceStops`, `delete_` — all scoped to `req.user.id` as `operatorId`. Mounted at `/api/v1/operator/routes` behind `isAuthenticated` + `isBusOperator`.

- [ ] **Step 1: Write the failing test**

Create `server/src/controllers/operatorRoute.controller.test.ts`:

```ts
jest.mock("../config/database", () => ({
  prisma: {
    busRoute: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { Request, Response } from "express";
import { OperatorRouteController } from "./operatorRoute.controller";
import { prisma } from "../config/database";

function mockReq(over: Partial<Request> = {}): Request {
  return { user: { id: 7 }, query: {}, params: {}, body: {}, ...over } as any;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res as Response;
}
const flush = () => new Promise<void>((r) => setImmediate(r));

beforeEach(() => jest.clearAllMocks());

describe("OperatorRouteController.list", () => {
  it("filters by the caller's id as operatorId", async () => {
    (prisma.busRoute.findMany as jest.Mock).mockResolvedValue([]);
    await OperatorRouteController.list(mockReq(), mockRes(), jest.fn());
    await flush();
    const arg = (prisma.busRoute.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.operatorId).toBe(7);
  });
});

describe("OperatorRouteController.create", () => {
  it("forces operatorId to the caller's id, ignoring any body operatorId", async () => {
    (prisma.busRoute.create as jest.Mock).mockResolvedValue({ id: 1 });
    const req = mockReq({ body: { operatorId: 999, originCity: "A", destCity: "B", distanceKm: 10, basePrice: 5 } } as any);
    await OperatorRouteController.create(req, mockRes(), jest.fn());
    await flush();
    const arg = (prisma.busRoute.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.operatorId).toBe(7);
  });
});

describe("OperatorRouteController.update", () => {
  it("scopes the update to the caller's routes and 404s when nothing matched", async () => {
    (prisma.busRoute.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const next = jest.fn();
    await OperatorRouteController.update(mockReq({ params: { id: "3" } } as any), mockRes(), next);
    await flush();
    const arg = (prisma.busRoute.updateMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ id: 3, operatorId: 7 });
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest src/controllers/operatorRoute.controller.test.ts`
Expected: FAIL — cannot find module `./operatorRoute.controller`.

- [ ] **Step 3: Implement the controller**

Create `server/src/controllers/operatorRoute.controller.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { DbUser } from "../types";

export class OperatorRouteController {
  static list = catchAsync(async (req: Request, res: Response) => {
    const operatorId = (req.user as DbUser).id;
    const routes = await prisma.busRoute.findMany({
      where: { operatorId },
      include: { stops: { orderBy: { order: "asc" } } },
      orderBy: [{ originCity: "asc" }, { destCity: "asc" }],
    });
    res.json({ routes });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const operatorId = (req.user as DbUser).id;
    const { originCity, destCity, distanceKm, basePrice, isActive = true, stops = [] } = req.body;
    const route = await prisma.busRoute.create({
      data: {
        operatorId,
        originCity,
        destCity,
        distanceKm,
        basePrice,
        isActive,
        stops: {
          create: stops.map((s: any, i: number) => ({
            name: s.name,
            city: s.city,
            order: s.order ?? i,
            latitude: s.latitude,
            longitude: s.longitude,
          })),
        },
      },
      include: { stops: true },
    });
    res.status(201).json({ route });
  });

  static update = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const { originCity, destCity, distanceKm, basePrice, isActive } = req.body;
    const result = await prisma.busRoute.updateMany({
      where: { id, operatorId },
      data: { originCity, destCity, distanceKm, basePrice, isActive },
    });
    if (result.count === 0) return next(AppError("Route not found", 404));
    const route = await prisma.busRoute.findFirst({
      where: { id, operatorId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    res.json({ route });
  });

  static replaceStops = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const owned = await prisma.busRoute.findFirst({ where: { id, operatorId }, select: { id: true } });
    if (!owned) return next(AppError("Route not found", 404));
    const { stops } = req.body as {
      stops: { name: string; city: string; order: number; latitude?: number; longitude?: number }[];
    };
    await prisma.$transaction([
      prisma.busRouteStop.deleteMany({ where: { routeId: id } }),
      prisma.busRouteStop.createMany({ data: stops.map((s) => ({ ...s, routeId: id })) }),
    ]);
    const fresh = await prisma.busRoute.findUniqueOrThrow({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    res.json({ route: fresh });
  });

  static delete_ = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const result = await prisma.busRoute.deleteMany({ where: { id, operatorId } });
    if (result.count === 0) return next(AppError("Route not found", 404));
    res.status(204).end();
  });
}
```

Note: `replaceStops` carries the same FK caveat as the admin version — it will fail if a `Booking` references a removed stop (`onDelete: Restrict`). Acceptable pre-launch; do not pre-optimize.

- [ ] **Step 4: Create the operator router**

Create `server/src/routes/operator.routes.ts`:

```ts
import { Router } from "express";
import { OperatorRouteController } from "../controllers/operatorRoute.controller";

const router = Router();

// Routes (operator-scoped)
router.get("/routes", OperatorRouteController.list);
router.post("/routes", OperatorRouteController.create);
router.patch("/routes/:id", OperatorRouteController.update);
router.put("/routes/:id/stops", OperatorRouteController.replaceStops);
router.delete("/routes/:id", OperatorRouteController.delete_);

export default router;
```

- [ ] **Step 5: Mount the router**

In `server/src/routes/index.ts`, add the import near the other route imports:

```ts
import operatorRoutes from "./operator.routes";
```

and add the mount alongside the other `/admin`-style mounts (after the existing protected mounts), gated by auth + operator role:

```ts
router.use("/operator", isAuthenticated, languagePreference, isBusOperator, operatorRoutes);
```

Add `import { isBusOperator } from "../middlewares/isBusOperator";` if not already imported (`isAuthenticated` and `languagePreference` are already imported in this file).

- [ ] **Step 6: Run tests + typecheck**

Run: `cd server && npx jest src/controllers/operatorRoute.controller.test.ts && npx tsc --noEmit`
Expected: PASS (3 tests), no type errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/operatorRoute.controller.ts server/src/controllers/operatorRoute.controller.test.ts server/src/routes/operator.routes.ts server/src/routes/index.ts
git commit -m "feat(server): operator-scoped bus route CRUD at /operator/routes"
```

---

### Task 4: Operator trips (schedules) + passenger manifest

**Files:**
- Create: `server/src/controllers/operatorTrip.controller.ts`
- Modify: `server/src/routes/operator.routes.ts` (add trip + manifest routes)
- Test: `server/src/controllers/operatorTrip.controller.test.ts`

**Interfaces:**
- Consumes: `prisma.busRoute`, `prisma.vehicle`, `prisma.ride`, `prisma.booking`, `req.user.id`.
- Produces: `OperatorTripController` with:
  - `list(req,res)` → `{ trips }` — operator's rides where `routeId != null`, scoped by `driverId = req.user.id`.
  - `create(req,res,next)` — body `{ routeId, vehicleId, departureTime, availableSeats }`; validates the route and vehicle belong to the caller; creates a `PUBLISHED` `Ride` linked to the route, with `driverId = caller`, fare from the route's `basePrice`.
  - `manifest(req,res,next)` — `GET /trips/:id/manifest`; verifies the trip belongs to the caller; returns `{ manifest }` of bookings with booker, seats, attendance codes, boarding/alighting stops.

- [ ] **Step 1: Write the failing test**

Create `server/src/controllers/operatorTrip.controller.test.ts`:

```ts
jest.mock("../config/database", () => ({
  prisma: {
    busRoute: { findFirst: jest.fn() },
    vehicle: { findFirst: jest.fn() },
    ride: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    booking: { findMany: jest.fn() },
  },
}));

import { Request, Response } from "express";
import { OperatorTripController } from "./operatorTrip.controller";
import { prisma } from "../config/database";

function mockReq(over: Partial<Request> = {}): Request {
  return { user: { id: 7 }, query: {}, params: {}, body: {}, ...over } as any;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}
const flush = () => new Promise<void>((r) => setImmediate(r));
beforeEach(() => jest.clearAllMocks());

describe("OperatorTripController.create", () => {
  it("404s when the route is not owned by the caller", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    await OperatorTripController.create(
      mockReq({ body: { routeId: 5, vehicleId: 2, departureTime: "2099-01-01T08:00:00Z", availableSeats: 40 } } as any),
      mockRes(),
      next
    );
    await flush();
    expect((prisma.busRoute.findFirst as jest.Mock).mock.calls[0][0].where).toEqual({ id: 5, operatorId: 7 });
    expect(next.mock.calls[0][0].statusCode).toBe(404);
    expect(prisma.ride.create).not.toHaveBeenCalled();
  });

  it("creates a PUBLISHED ride linked to the route with the caller as driver", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({
      id: 5, operatorId: 7, originCity: "Kigali", destCity: "Huye", basePrice: "3000",
      stops: [{ city: "Kigali", latitude: -1.95, longitude: 30.06, order: 0 }, { city: "Huye", latitude: -2.6, longitude: 29.74, order: 1 }],
    });
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 2, userId: 7 });
    (prisma.ride.create as jest.Mock).mockResolvedValue({ id: 99 });
    await OperatorTripController.create(
      mockReq({ body: { routeId: 5, vehicleId: 2, departureTime: "2099-01-01T08:00:00Z", availableSeats: 40 } } as any),
      mockRes(),
      jest.fn()
    );
    await flush();
    const arg = (prisma.ride.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.status).toBe("PUBLISHED");
    expect(arg.data.driver.connect.id).toBe(7);
    expect(arg.data.vehicle.connect.id).toBe(2);
    expect(arg.data.route.connect.id).toBe(5);
    expect(arg.data.contribution).toBe(3000);
    expect(arg.data.availableSeats).toBe(40);
  });
});

describe("OperatorTripController.manifest", () => {
  it("404s when the trip is not the caller's", async () => {
    (prisma.ride.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    await OperatorTripController.manifest(mockReq({ params: { id: "99" } } as any), mockRes(), next);
    await flush();
    expect((prisma.ride.findFirst as jest.Mock).mock.calls[0][0].where).toEqual({ id: 99, driverId: 7 });
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest src/controllers/operatorTrip.controller.test.ts`
Expected: FAIL — cannot find module `./operatorTrip.controller`.

- [ ] **Step 3: Implement the controller**

Create `server/src/controllers/operatorTrip.controller.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { RideStatus, BookingType } from "@prisma/client";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { DbUser } from "../types";

// Build a minimal Location create payload from a route endpoint. Bus trips
// derive departure/destination from the route's first/last stop (lat/long)
// falling back to 0 when a route has no stops yet.
function locationFromStop(city: string, stop?: { latitude?: number | null; longitude?: number | null }) {
  return {
    region: city,
    city,
    locationName: city,
    latitude: stop?.latitude ?? 0,
    longitude: stop?.longitude ?? 0,
    regionCode: null,
  };
}

export class OperatorTripController {
  static list = catchAsync(async (req: Request, res: Response) => {
    const driverId = (req.user as DbUser).id;
    const trips = await prisma.ride.findMany({
      where: { driverId, routeId: { not: null }, isDeleted: false },
      include: {
        route: { select: { id: true, originCity: true, destCity: true, basePrice: true } },
        vehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
      },
      orderBy: { departureTime: "desc" },
    });
    res.json({ trips });
  });

  static create = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = (req.user as DbUser).id;
    const { routeId, vehicleId, departureTime, availableSeats } = req.body as {
      routeId: number; vehicleId: number; departureTime: string; availableSeats: number;
    };

    const route = await prisma.busRoute.findFirst({
      where: { id: Number(routeId), operatorId: driverId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!route) return next(AppError("Route not found", 404));

    const vehicle = await prisma.vehicle.findFirst({ where: { id: Number(vehicleId), userId: driverId } });
    if (!vehicle) return next(AppError("Vehicle not found", 404));

    const seats = Number(availableSeats);
    if (!Number.isInteger(seats) || seats <= 0) return next(AppError("availableSeats must be a positive integer", 400));

    const firstStop = route.stops[0];
    const lastStop = route.stops[route.stops.length - 1];

    const ride = await prisma.ride.create({
      data: {
        departureTime: new Date(departureTime),
        availableSeats: seats,
        totalSeats: seats,
        contribution: Number(route.basePrice),
        status: RideStatus.PUBLISHED,
        publishedAt: new Date(),
        bookingType: BookingType.AUTOMATIC,
        contributionCollectionMethod: "OFF_PLATFORM" as any,
        driver: { connect: { id: driverId } },
        vehicle: { connect: { id: Number(vehicleId) } },
        route: { connect: { id: route.id } },
        departureLocation: { create: locationFromStop(route.originCity, firstStop) },
        destinationLocation: { create: locationFromStop(route.destCity, lastStop) },
      },
      include: {
        route: { select: { id: true, originCity: true, destCity: true } },
        vehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
      },
    });
    res.status(201).json({ trip: ride });
  });

  static manifest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const trip = await prisma.ride.findFirst({ where: { id, driverId }, select: { id: true } });
    if (!trip) return next(AppError("Trip not found", 404));

    const bookings = await prisma.booking.findMany({
      where: { rideId: id },
      include: {
        booker: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        bookingSeats: { select: { attendanceCode: true, attendedAt: true } },
        boardingStop: { select: { name: true, city: true } },
        alightingStop: { select: { name: true, city: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ manifest: bookings });
  });
}
```

- [ ] **Step 4: Add trip + manifest routes**

In `server/src/routes/operator.routes.ts`, add the import and routes:

```ts
import { OperatorTripController } from "../controllers/operatorTrip.controller";
```

```ts
// Trips / schedules (operator-scoped)
router.get("/trips", OperatorTripController.list);
router.post("/trips", OperatorTripController.create);
router.get("/trips/:id/manifest", OperatorTripController.manifest);
```

- [ ] **Step 5: Run tests + typecheck**

Run: `cd server && npx jest src/controllers/operatorTrip.controller.test.ts && npx tsc --noEmit`
Expected: PASS (3 tests), no type errors. (If `tsc` flags the `route.basePrice` Decimal→number conversion, confirm `Number(route.basePrice)` is used — it is.)

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/operatorTrip.controller.ts server/src/controllers/operatorTrip.controller.test.ts server/src/routes/operator.routes.ts
git commit -m "feat(server): operator trip scheduling + passenger manifest endpoints"
```

---

### Task 5: Frontend role model + role-based post-login redirect

**Files:**
- Modify: `client/src/lib/types.ts:7` (add `BUS_OPERATOR` to the role union)
- Modify: `client/src/providers/AuthProvider.tsx:200-224` (`login` redirect by role)
- Modify: `client/src/providers/RouteGuards.tsx:149-175` (`UnauthenticatedGuard` redirect by role)
- Modify: `client/src/pages/Login.tsx:103-124` (don't push operators into passenger-onboarding)

**Interfaces:**
- Consumes: backend returns `user.role === "BUS_OPERATOR"` for operators; client stores it in `localStorage["userRole"]` and exposes it as `user.role`.
- Produces: after login, operators land on `/operator`; admins on `/admin`; everyone else on `/dashboard`. Already-authenticated operators visiting an auth page are sent to `/operator`.

- [ ] **Step 1: Extend the role type**

In `client/src/lib/types.ts`, change line 7 from:

```ts
  role: "driver" | "passenger" | "admin";
```

to:

```ts
  role: "driver" | "passenger" | "admin" | "BUS_OPERATOR";
```

- [ ] **Step 2: Role-based redirect in `login`**

In `client/src/providers/AuthProvider.tsx`, replace the redirect block inside `login` (currently lines 216-218):

```ts
      const postLoginRedirect = localStorage.getItem("postLoginRedirect");
      localStorage.removeItem("postLoginRedirect");
      window.location.replace(postLoginRedirect || "/dashboard");
```

with:

```ts
      const postLoginRedirect = localStorage.getItem("postLoginRedirect");
      localStorage.removeItem("postLoginRedirect");
      const role = String(localUser?.role || localUser?.roles?.[0] || "").toUpperCase();
      const home = role === "ADMIN" ? "/admin" : role === "BUS_OPERATOR" ? "/operator" : "/dashboard";
      window.location.replace(postLoginRedirect || home);
```

- [ ] **Step 3: Role-based redirect in `UnauthenticatedGuard`**

In `client/src/providers/RouteGuards.tsx`, replace the effect body in `UnauthenticatedGuard` (currently lines 154-158):

```ts
    if (!loading && authenticated && user) {
      // Redirect authenticated users away from auth pages
      if (user.role === "admin") navigate("/admin");
      else navigate("/");
    }
```

with:

```ts
    if (!loading && authenticated && user) {
      // Redirect authenticated users away from auth pages, by role
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "BUS_OPERATOR") navigate("/operator");
      else navigate("/");
    }
```

- [ ] **Step 4: Keep operators out of passenger-onboarding**

In `client/src/pages/Login.tsx`, change the post-login branch (currently lines 119-123):

```ts
      if (user && !user.isPassengerOnboarded) {
        navigate("/passenger-onboarding");
      } else {
        toast.success(t("Login.loginSuccess"));
      }
```

to:

```ts
      if (user && user.role !== "BUS_OPERATOR" && !user.isPassengerOnboarded) {
        navigate("/passenger-onboarding");
      } else {
        toast.success(t("Login.loginSuccess"));
      }
```

- [ ] **Step 5: Typecheck**

Run: `cd client && npx tsc --noEmit -p tsconfig.app.json`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/types.ts client/src/providers/AuthProvider.tsx client/src/providers/RouteGuards.tsx client/src/pages/Login.tsx
git commit -m "feat(client): route BUS_OPERATOR users to /operator after login"
```

---

### Task 6: OperatorGuard + `/operator` route + operator data hooks

**Files:**
- Modify: `client/src/providers/RouteGuards.tsx` (add `OperatorGuard`)
- Create: `client/src/hooks/useOperator.ts` (routes, trips, manifest, buses hooks)
- Modify: `client/src/App.tsx` (import guard + dashboard, add `/operator` route)
- Create (placeholder for next tasks): `client/src/pages/operator/OperatorDashboard.tsx` (minimal shell, fleshed out in Task 7)

**Interfaces:**
- Produces:
  - `OperatorGuard` — renders `<Outlet/>` only when authenticated and `user.role === "BUS_OPERATOR"`; sends unauthenticated users to `/login` and wrong-role users to `/`.
  - Hooks: `useOperatorRoutes()`, `useCreateOperatorRoute()`, `useUpdateOperatorRoute()`, `useReplaceOperatorRouteStops()`, `useDeleteOperatorRoute()`, `useOperatorTrips()`, `useCreateOperatorTrip()`, `useOperatorManifest(tripId)`, `useOperatorBuses()`, `useCreateOperatorBus()`. All hit `/api/v1/operator/*` except buses which use `/api/v1/vehicles`.

- [ ] **Step 1: Add `OperatorGuard`**

In `client/src/providers/RouteGuards.tsx`, add this export (mirrors `AuthenticatedGuard` with a role check):

```tsx
export const OperatorGuard = () => {
  const { user, authenticated, loading, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !initialized) return;
    if (!authenticated) {
      localStorage.setItem("postLoginRedirect", location.pathname);
      navigate("/login");
      return;
    }
    if (user && user.role !== "BUS_OPERATOR") {
      navigate("/");
    }
  }, [user, authenticated, loading, initialized, navigate, location.pathname]);

  if (loading || !initialized || !authenticated || user?.role !== "BUS_OPERATOR") {
    return (
      <div className="flex justify-center items-center h-64">
        <CustomLoader />
      </div>
    );
  }
  return <Outlet />;
};
```

- [ ] **Step 2: Create the operator hooks**

Create `client/src/hooks/useOperator.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";

export interface OperatorStop { id?: number; name: string; city: string; order: number; latitude?: number; longitude?: number; }
export interface OperatorRoute { id: number; originCity: string; destCity: string; distanceKm: number; basePrice: string; isActive: boolean; stops: OperatorStop[]; }
export interface OperatorTrip { id: number; departureTime: string; availableSeats: number; totalSeats: number; contribution: number; route?: { id: number; originCity: string; destCity: string }; vehicle?: { id: number; make: string; model: string; plateNumber: string }; }
export interface OperatorBus { id: number; make: string; model: string; year?: number; color: string; plateNumber: string; category: string; capacity?: number; }
export interface ManifestRow { id: number; seats: number; status: string; booker: { firstName: string; lastName: string; phoneNumber?: string }; bookingSeats: { attendanceCode: string; attendedAt?: string }[]; boardingStop?: { name: string; city: string }; alightingStop?: { name: string; city: string }; }

// ---- Routes ----
export function useOperatorRoutes() {
  return useQuery({
    queryKey: ["operator-routes"],
    queryFn: async () => {
      const res = await api.get<{ routes: OperatorRoute[] }>("/api/v1/operator/routes");
      return res.routes ?? [];
    },
  });
}
export function useCreateOperatorRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<OperatorRoute>) => api.post("/api/v1/operator/routes", input),
    onSuccess: () => { toast.success("Route created"); qc.invalidateQueries({ queryKey: ["operator-routes"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create route"),
  });
}
export function useUpdateOperatorRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & Partial<OperatorRoute>) => api.patch(`/api/v1/operator/routes/${id}`, input),
    onSuccess: () => { toast.success("Route updated"); qc.invalidateQueries({ queryKey: ["operator-routes"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update route"),
  });
}
export function useReplaceOperatorRouteStops() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stops }: { id: number; stops: OperatorStop[] }) => api.put(`/api/v1/operator/routes/${id}/stops`, { stops }),
    onSuccess: () => { toast.success("Stops saved"); qc.invalidateQueries({ queryKey: ["operator-routes"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save stops"),
  });
}
export function useDeleteOperatorRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/operator/routes/${id}`),
    onSuccess: () => { toast.success("Route deleted"); qc.invalidateQueries({ queryKey: ["operator-routes"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to delete route"),
  });
}

// ---- Trips ----
export function useOperatorTrips() {
  return useQuery({
    queryKey: ["operator-trips"],
    queryFn: async () => {
      const res = await api.get<{ trips: OperatorTrip[] }>("/api/v1/operator/trips");
      return res.trips ?? [];
    },
  });
}
export function useCreateOperatorTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { routeId: number; vehicleId: number; departureTime: string; availableSeats: number }) =>
      api.post("/api/v1/operator/trips", input),
    onSuccess: () => { toast.success("Trip scheduled"); qc.invalidateQueries({ queryKey: ["operator-trips"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to schedule trip"),
  });
}
export function useOperatorManifest(tripId: number | null) {
  return useQuery({
    queryKey: ["operator-manifest", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const res = await api.get<{ manifest: ManifestRow[] }>(`/api/v1/operator/trips/${tripId}/manifest`);
      return res.manifest ?? [];
    },
  });
}

// ---- Buses (reuse owner-scoped vehicle endpoints) ----
export function useOperatorBuses() {
  return useQuery({
    queryKey: ["operator-buses"],
    queryFn: async () => {
      const res = await api.get<{ data?: OperatorBus[] } | OperatorBus[]>("/api/v1/vehicles");
      const list = (res as any).data ?? res ?? [];
      return (list as OperatorBus[]).filter((v) => v.category === "BUS");
    },
  });
}
export function useCreateOperatorBus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { make: string; model: string; year?: number; color: string; plateNumber: string; capacity?: number }) =>
      api.post("/api/v1/vehicles", { ...input, category: "BUS" }),
    onSuccess: () => { toast.success("Bus added"); qc.invalidateQueries({ queryKey: ["operator-buses"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to add bus"),
  });
}
```

Note: verify the `POST /api/v1/vehicles` request body shape against `vehicle.controller.ts createVehicle` during implementation; adjust field names if the validator differs. The `category: "BUS"` value matches the `VehicleCategory` enum.

- [ ] **Step 3: Minimal dashboard shell**

Create `client/src/pages/operator/OperatorDashboard.tsx` (shell now; tabs wired in Tasks 7-10):

```tsx
import { useState } from "react";

const TABS = ["buses", "routes", "trips", "passengers"] as const;
type Tab = (typeof TABS)[number];
const LABELS: Record<Tab, string> = { buses: "My Buses", routes: "My Routes", trips: "Trips / Schedule", passengers: "Passengers" };

export default function OperatorDashboard() {
  const [tab, setTab] = useState<Tab>("buses");
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Operator Dashboard</h1>
      <div className="flex gap-2 border-b mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>
      {tab === "buses" && <div data-testid="tab-buses" />}
      {tab === "routes" && <div data-testid="tab-routes" />}
      {tab === "trips" && <div data-testid="tab-trips" />}
      {tab === "passengers" && <div data-testid="tab-passengers" />}
    </div>
  );
}
```

- [ ] **Step 4: Register the route**

In `client/src/App.tsx`: add imports near the other guard/page imports:

```tsx
import { OperatorGuard } from "./providers/RouteGuards";
import OperatorDashboard from "@/pages/operator/OperatorDashboard";
```

(extend the existing `RouteGuards` import rather than duplicating it). Then add, just after the closing `</Route>` of the Admin block (after line 104), inside the `<Route path="/" element={<Layout />}>` block:

```tsx
                      {/* Operator Routes */}
                      <Route element={<OperatorGuard />}>
                        <Route path="operator" element={<OperatorDashboard />} />
                      </Route>
```

- [ ] **Step 5: Typecheck + build**

Run: `cd client && npx tsc --noEmit -p tsconfig.app.json && bun run build`
Expected: success.

- [ ] **Step 6: Manual verification**

Log in as the operator created in Task 1.
Expected: redirected to `/operator`, see the dashboard shell with four tabs; visiting `/admin` redirects away.

- [ ] **Step 7: Commit**

```bash
git add client/src/providers/RouteGuards.tsx client/src/hooks/useOperator.ts client/src/pages/operator/OperatorDashboard.tsx client/src/App.tsx
git commit -m "feat(client): operator guard, /operator route, data hooks, dashboard shell"
```

---

### Task 7: My Routes tab

**Files:**
- Create: `client/src/pages/operator/tabs/RoutesTab.tsx`
- Modify: `client/src/pages/operator/OperatorDashboard.tsx` (render `<RoutesTab/>`)

**Interfaces:**
- Consumes: `useOperatorRoutes`, `useCreateOperatorRoute`, `useUpdateOperatorRoute`, `useReplaceOperatorRouteStops`, `useDeleteOperatorRoute` from `@/hooks/useOperator`.
- Produces: `export default function RoutesTab()`.

- [ ] **Step 1: Implement the tab**

Create `client/src/pages/operator/tabs/RoutesTab.tsx`:

```tsx
import { useState } from "react";
import {
  useOperatorRoutes, useCreateOperatorRoute, useDeleteOperatorRoute,
  type OperatorRoute,
} from "@/hooks/useOperator";

const empty = { originCity: "", destCity: "", distanceKm: 0, basePrice: "0", isActive: true };

export default function RoutesTab() {
  const { data: routes = [], isLoading } = useOperatorRoutes();
  const createRoute = useCreateOperatorRoute();
  const deleteRoute = useDeleteOperatorRoute();
  const [form, setForm] = useState(empty);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createRoute.mutate(
      { ...form, distanceKm: Number(form.distanceKm), basePrice: String(form.basePrice) } as Partial<OperatorRoute>,
      { onSuccess: () => setForm(empty) }
    );
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 max-w-2xl">
        <input className="border rounded px-3 py-2" placeholder="Origin city" value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Destination city" value={form.destCity} onChange={(e) => setForm({ ...form, destCity: e.target.value })} required />
        <input className="border rounded px-3 py-2" type="number" placeholder="Distance (km)" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) })} />
        <input className="border rounded px-3 py-2" type="number" placeholder="Base fare" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
        <button className="col-span-2 bg-primary text-white rounded px-4 py-2 disabled:opacity-50" disabled={createRoute.isPending}>
          {createRoute.isPending ? "Saving..." : "Add route"}
        </button>
      </form>

      {isLoading ? <p>Loading…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left border-b"><th className="py-2">Route</th><th>Distance</th><th>Fare</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{r.originCity} → {r.destCity}</td>
                <td>{r.distanceKm} km</td>
                <td>{r.basePrice}</td>
                <td>{r.isActive ? "Yes" : "No"}</td>
                <td><button className="text-red-600" onClick={() => deleteRoute.mutate(r.id)}>Delete</button></td>
              </tr>
            ))}
            {routes.length === 0 && <tr><td colSpan={5} className="py-4 text-muted-foreground">No routes yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

Note: a full stops editor (add/reorder named stops with lat/long) can be layered on later by reusing the admin `BusRoutesTab.tsx` stops UI; v1 ships flat routes. `useUpdateOperatorRoute` / `useReplaceOperatorRouteStops` are wired in the hooks file and used when that editor lands — leaving them unused now is intentional.

- [ ] **Step 2: Render it**

In `OperatorDashboard.tsx`, import `RoutesTab` and replace `{tab === "routes" && <div data-testid="tab-routes" />}` with `{tab === "routes" && <RoutesTab />}`.

- [ ] **Step 3: Typecheck + build**

Run: `cd client && npx tsc --noEmit -p tsconfig.app.json && bun run build`
Expected: success.

- [ ] **Step 4: Manual verification**

On `/operator` → My Routes: add a route → it appears in the table; delete removes it.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/operator/tabs/RoutesTab.tsx client/src/pages/operator/OperatorDashboard.tsx
git commit -m "feat(client): operator My Routes tab"
```

---

### Task 8: My Buses tab

**Files:**
- Create: `client/src/pages/operator/tabs/BusesTab.tsx`
- Modify: `client/src/pages/operator/OperatorDashboard.tsx`

**Interfaces:**
- Consumes: `useOperatorBuses`, `useCreateOperatorBus` from `@/hooks/useOperator`.
- Produces: `export default function BusesTab()`.

- [ ] **Step 1: Implement the tab**

Create `client/src/pages/operator/tabs/BusesTab.tsx`:

```tsx
import { useState } from "react";
import { useOperatorBuses, useCreateOperatorBus } from "@/hooks/useOperator";

const empty = { make: "", model: "", year: undefined as number | undefined, color: "", plateNumber: "", capacity: undefined as number | undefined };

export default function BusesTab() {
  const { data: buses = [], isLoading } = useOperatorBuses();
  const createBus = useCreateOperatorBus();
  const [form, setForm] = useState(empty);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createBus.mutate(form, { onSuccess: () => setForm(empty) });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 max-w-2xl">
        <input className="border rounded px-3 py-2" placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Plate number" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} required />
        <input className="border rounded px-3 py-2" type="number" placeholder="Year" value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : undefined })} />
        <input className="border rounded px-3 py-2" type="number" placeholder="Capacity (seats)" value={form.capacity ?? ""} onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : undefined })} />
        <button className="col-span-2 bg-primary text-white rounded px-4 py-2 disabled:opacity-50" disabled={createBus.isPending}>
          {createBus.isPending ? "Saving..." : "Add bus"}
        </button>
      </form>

      {isLoading ? <p>Loading…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left border-b"><th className="py-2">Bus</th><th>Plate</th><th>Color</th><th>Capacity</th></tr></thead>
          <tbody>
            {buses.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="py-2">{b.make} {b.model}{b.year ? ` (${b.year})` : ""}</td>
                <td>{b.plateNumber}</td>
                <td>{b.color}</td>
                <td>{b.capacity ?? "—"}</td>
              </tr>
            ))}
            {buses.length === 0 && <tr><td colSpan={4} className="py-4 text-muted-foreground">No buses yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render it**

In `OperatorDashboard.tsx`, import `BusesTab` and replace `{tab === "buses" && <div data-testid="tab-buses" />}` with `{tab === "buses" && <BusesTab />}`.

- [ ] **Step 3: Typecheck + build**

Run: `cd client && npx tsc --noEmit -p tsconfig.app.json && bun run build`
Expected: success.

- [ ] **Step 4: Manual verification**

My Buses → add a bus → appears in the table. (If the create call 4xxs, reconcile the body with `vehicle.controller.ts createVehicle` validator per the note in Task 6.)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/operator/tabs/BusesTab.tsx client/src/pages/operator/OperatorDashboard.tsx
git commit -m "feat(client): operator My Buses tab"
```

---

### Task 9: Trips / Schedule tab

**Files:**
- Create: `client/src/pages/operator/tabs/TripsTab.tsx`
- Modify: `client/src/pages/operator/OperatorDashboard.tsx`

**Interfaces:**
- Consumes: `useOperatorTrips`, `useCreateOperatorTrip`, `useOperatorRoutes`, `useOperatorBuses`.
- Produces: `export default function TripsTab()`.

- [ ] **Step 1: Implement the tab**

Create `client/src/pages/operator/tabs/TripsTab.tsx`:

```tsx
import { useState } from "react";
import { useOperatorTrips, useCreateOperatorTrip, useOperatorRoutes, useOperatorBuses } from "@/hooks/useOperator";

export default function TripsTab() {
  const { data: trips = [], isLoading } = useOperatorTrips();
  const { data: routes = [] } = useOperatorRoutes();
  const { data: buses = [] } = useOperatorBuses();
  const createTrip = useCreateOperatorTrip();
  const [form, setForm] = useState({ routeId: "", vehicleId: "", departureTime: "", availableSeats: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createTrip.mutate(
      {
        routeId: Number(form.routeId),
        vehicleId: Number(form.vehicleId),
        departureTime: new Date(form.departureTime).toISOString(),
        availableSeats: Number(form.availableSeats),
      },
      { onSuccess: () => setForm({ routeId: "", vehicleId: "", departureTime: "", availableSeats: "" }) }
    );
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 max-w-2xl">
        <select className="border rounded px-3 py-2" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })} required>
          <option value="">Select route</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.originCity} → {r.destCity}</option>)}
        </select>
        <select className="border rounded px-3 py-2" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
          <option value="">Select bus</option>
          {buses.map((b) => <option key={b.id} value={b.id}>{b.make} {b.model} ({b.plateNumber})</option>)}
        </select>
        <input className="border rounded px-3 py-2" type="datetime-local" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} required />
        <input className="border rounded px-3 py-2" type="number" placeholder="Seats" value={form.availableSeats} onChange={(e) => setForm({ ...form, availableSeats: e.target.value })} required />
        <button className="col-span-2 bg-primary text-white rounded px-4 py-2 disabled:opacity-50" disabled={createTrip.isPending}>
          {createTrip.isPending ? "Scheduling..." : "Schedule trip"}
        </button>
      </form>

      {isLoading ? <p>Loading…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left border-b"><th className="py-2">Route</th><th>Bus</th><th>Departs</th><th>Seats</th><th>Fare</th></tr></thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2">{t.route ? `${t.route.originCity} → ${t.route.destCity}` : "—"}</td>
                <td>{t.vehicle ? `${t.vehicle.make} ${t.vehicle.model}` : "—"}</td>
                <td>{new Date(t.departureTime).toLocaleString()}</td>
                <td>{t.availableSeats}/{t.totalSeats}</td>
                <td>{t.contribution}</td>
              </tr>
            ))}
            {trips.length === 0 && <tr><td colSpan={5} className="py-4 text-muted-foreground">No trips scheduled.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render it**

In `OperatorDashboard.tsx`, import `TripsTab` and replace `{tab === "trips" && <div data-testid="tab-trips" />}` with `{tab === "trips" && <TripsTab />}`.

- [ ] **Step 3: Typecheck + build**

Run: `cd client && npx tsc --noEmit -p tsconfig.app.json && bun run build`
Expected: success.

- [ ] **Step 4: Manual verification**

Trips → pick a route + bus, set a future date/time + seats → schedule → trip appears in the list. (Passenger search should now surface it; verify in the passenger/marketplace bus search if convenient.)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/operator/tabs/TripsTab.tsx client/src/pages/operator/OperatorDashboard.tsx
git commit -m "feat(client): operator Trips/Schedule tab"
```

---

### Task 10: Passengers (manifest) tab

**Files:**
- Create: `client/src/pages/operator/tabs/PassengersTab.tsx`
- Modify: `client/src/pages/operator/OperatorDashboard.tsx`

**Interfaces:**
- Consumes: `useOperatorTrips`, `useOperatorManifest`.
- Produces: `export default function PassengersTab()`.

- [ ] **Step 1: Implement the tab**

Create `client/src/pages/operator/tabs/PassengersTab.tsx`:

```tsx
import { useState } from "react";
import { useOperatorTrips, useOperatorManifest } from "@/hooks/useOperator";

export default function PassengersTab() {
  const { data: trips = [] } = useOperatorTrips();
  const [tripId, setTripId] = useState<number | null>(null);
  const { data: manifest = [], isLoading } = useOperatorManifest(tripId);

  return (
    <div className="space-y-6">
      <select
        className="border rounded px-3 py-2 max-w-md"
        value={tripId ?? ""}
        onChange={(e) => setTripId(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Select a trip</option>
        {trips.map((t) => (
          <option key={t.id} value={t.id}>
            {t.route ? `${t.route.originCity} → ${t.route.destCity}` : `Trip #${t.id}`} · {new Date(t.departureTime).toLocaleString()}
          </option>
        ))}
      </select>

      {!tripId ? <p className="text-muted-foreground">Pick a trip to see its passengers.</p> :
        isLoading ? <p>Loading…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left border-b"><th className="py-2">Passenger</th><th>Phone</th><th>Seats</th><th>Codes</th><th>Boarding</th><th>Alighting</th><th>Status</th></tr></thead>
          <tbody>
            {manifest.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-2">{row.booker.firstName} {row.booker.lastName}</td>
                <td>{row.booker.phoneNumber ?? "—"}</td>
                <td>{row.seats}</td>
                <td>{row.bookingSeats.map((s) => s.attendanceCode).join(", ")}</td>
                <td>{row.boardingStop ? `${row.boardingStop.name} (${row.boardingStop.city})` : "—"}</td>
                <td>{row.alightingStop ? `${row.alightingStop.name} (${row.alightingStop.city})` : "—"}</td>
                <td>{row.status}</td>
              </tr>
            ))}
            {manifest.length === 0 && <tr><td colSpan={7} className="py-4 text-muted-foreground">No bookings for this trip yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Render it**

In `OperatorDashboard.tsx`, import `PassengersTab` and replace `{tab === "passengers" && <div data-testid="tab-passengers" />}` with `{tab === "passengers" && <PassengersTab />}`.

- [ ] **Step 3: Typecheck + build**

Run: `cd client && npx tsc --noEmit -p tsconfig.app.json && bun run build`
Expected: success.

- [ ] **Step 4: Manual verification (full loop)**

Admin creates operator → operator logs in → adds a bus → creates a route → schedules a future trip → (a passenger books a seat on that trip via the mobile/passenger flow) → operator's Passengers tab shows the booking with the seat/attendance code.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/operator/tabs/PassengersTab.tsx client/src/pages/operator/OperatorDashboard.tsx
git commit -m "feat(client): operator Passengers manifest tab"
```

---

## Notes for the implementer

- **Vehicle creation gate:** `vehicle.controller.ts createVehicle` requires the caller's driver KYC to be `APPROVED`. Operators created via Task 1 (`POST /admin/users`) are set `kycStatus: APPROVED`, so this passes. If a bus add returns 403, check the operator's `kycStatus`.
- **Operator login entry point:** operators log in through the standard `/login` page; role-based redirect (Task 5) sends them to `/operator`. They do not use `/admin/login` (which posts `role: "ADMIN"` and would be rejected).
- **No schema migration** is expected — all models already exist. If implementation reveals a missing field, stop and surface it rather than editing the schema ad hoc.
- **UI polish:** tabs use plain inputs/tables for clarity. Reusing the shadcn/admin components (cards, dialogs, the `BusRoutesTab` stops editor) is a fast-follow once the flow works end-to-end.
