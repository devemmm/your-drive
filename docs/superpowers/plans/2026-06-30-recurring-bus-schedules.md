# Recurring Bus Schedules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a bus operator attach repeating departure times to a route so passengers can book any future day, with the dated trip created lazily on the date-pick.

**Architecture:** A new `BusRouteDeparture` table hangs departure times (each with a bus) off an existing `BusRoute`. The passenger browse screen lists these departures; picking a travel date calls a `from-schedule` endpoint that find-or-creates a concrete `Ride` for that (departure, datetime) and hands off to the unchanged booking + ticket screens. A shared `createBusRide` service backs both one-off operator trips and lazy materialization.

**Tech Stack:** Node + Express + Prisma (Postgres) server; React (Vite) operator dashboard; Expo/React Native passenger app; Jest (server), Playwright (web e2e), Maestro (mobile e2e).

## Global Constraints

- Currency is **RWF**; fare always comes from `BusRoute.basePrice` (never a separate field).
- All operator endpoints are owner-scoped: `operatorId = (req.user as DbUser).id`, and a departure is reachable only through a route whose `operatorId` matches.
- Seats for a bus trip = the attached `Vehicle.capacity` (`Int @default(4)`, always present).
- A materialized occurrence is owned by the **route's operator** (`driver = operator`), even when a passenger triggers creation.
- `Ride.vehicleId` stays **non-null**.
- One `Ride` per `(routeDepartureId, departureTime)` — enforced by a DB unique and used for find-or-create.
- Follow existing patterns: `catchAsync`, `AppError`, controllers read `req.body`/`req.params` directly (no express-validator on operator routes); server tests invoke controllers directly with mocked prisma.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`). Commit after each task. Do not skip hooks.
- Work happens on branch `feat/bus-recurring-schedules` (already created).

---

## File structure

**Server**
- `server/prisma/schema.prisma` — add `BusRouteDeparture`, relations, `Ride.routeDepartureId` + unique.
- `server/src/services/busRide.service.ts` *(new)* — `createBusRide`, `findOrCreateScheduledRide`, `locationFromStop`.
- `server/src/services/busRide.service.test.ts` *(new)*.
- `server/src/controllers/operatorTrip.controller.ts` — use `createBusRide`; add `swapBus`.
- `server/src/controllers/operatorDeparture.controller.ts` *(new)* + `.test.ts`.
- `server/src/controllers/from-schedule` lives in `server/src/controllers/ride.controller.ts` (add `createFromSchedule`).
- `server/src/controllers/public/busRoutes.controller.ts` — `trips` returns departures; update `.test.ts`.
- `server/src/routes/operator.routes.ts` — departures + bus-swap routes.
- `server/src/routes/ride.routes.ts` — `POST /from-schedule`.

**Client (operator dashboard)**
- `client/src/hooks/useOperator.ts` — departure hooks.
- `client/src/pages/operator/tabs/TripsTab.tsx` — schedule manager + per-trip bus swap.

**Mobile (passenger)**
- `mobile/src/lib/types.ts` — `BusRouteDeparture` type.
- `mobile/src/hooks/useBus.ts` — `useRouteDepartures`, `useMaterializeTrip`.
- `mobile/src/app/bus/route/[routeId]/trips.tsx` — render departures + date picker.

**E2E**
- `mobile/.maestro/flows/bus/passenger-book-recurring.yaml` *(new)*.
- `docs/screenshots/` — Playwright operator screenshots.

---

## Task 1: Schema — `BusRouteDeparture` + `Ride.routeDepartureId`

**Files:**
- Modify: `server/prisma/schema.prisma`
- Migration: `server/prisma/migrations/<generated>/migration.sql`

**Interfaces:**
- Produces: model `BusRouteDeparture { id, routeId, timeOfDay, vehicleId, isActive, createdAt, updatedAt }`; `Ride.routeDepartureId Int?` with unique `routeDepartureId_departureTime`; relations `BusRoute.departures`, `Vehicle.scheduleDepartures`, `Vehicle.scheduleRides`? (no — rides already relate to vehicle).

- [ ] **Step 1: Add the model and relations**

In `server/prisma/schema.prisma`, add the model near `BusRoute`/`BusRouteStop`:

```prisma
model BusRouteDeparture {
  id        Int      @id @default(autoincrement())
  routeId   Int
  route     BusRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  timeOfDay String   // "HH:mm" 24h, operator local time
  vehicleId Int
  vehicle   Vehicle  @relation("VehicleScheduleDepartures", fields: [vehicleId], references: [id])
  isActive  Boolean  @default(true)
  rides     Ride[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([routeId, isActive])
}
```

Add to `model BusRoute { ... }`: `departures BusRouteDeparture[]`.

Add to `model Vehicle { ... }`: `scheduleDepartures BusRouteDeparture[] @relation("VehicleScheduleDepartures")`.

Add to `model Ride { ... }`:

```prisma
  routeDepartureId Int?
  routeDeparture   BusRouteDeparture? @relation(fields: [routeDepartureId], references: [id])

  @@unique([routeDepartureId, departureTime])
```

- [ ] **Step 2: Create the migration**

Run: `cd server && npx prisma migrate dev --name bus_route_departures`
Expected: a new migration folder is created and applied; `prisma generate` runs automatically.

- [ ] **Step 3: Verify the client compiles against the new schema**

Run: `cd server && npx tsc --noEmit`
Expected: exit 0 (no type errors introduced by the schema change).

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations
git commit -m "feat(server): add BusRouteDeparture schema + Ride.routeDepartureId"
```

---

## Task 2: Shared `createBusRide` service + refactor one-off create

**Files:**
- Create: `server/src/services/busRide.service.ts`
- Create: `server/src/services/busRide.service.test.ts`
- Modify: `server/src/controllers/operatorTrip.controller.ts`

**Interfaces:**
- Produces:
  - `createBusRide(params: { operatorId: number; routeId: number; vehicleId: number; departureTime: Date; seats: number; routeDepartureId?: number | null }): Promise<Ride>` — throws `Error("ROUTE_NOT_FOUND")` if the route is not owned by `operatorId`.
  - `rideInclude` (the route+vehicle include used everywhere).
- Consumes: `prisma`, `RideStatus`, `BookingType` from existing modules.

- [ ] **Step 1: Write the failing test**

Create `server/src/services/busRide.service.test.ts`:

```ts
jest.mock("../config/database", () => ({
  prisma: {
    busRoute: { findFirst: jest.fn() },
    ride: { create: jest.fn() },
  },
}));

import { createBusRide } from "./busRide.service";
import { prisma } from "../config/database";

describe("createBusRide", () => {
  beforeEach(() => jest.clearAllMocks());

  it("builds a PUBLISHED ride from the route + bus and connects the departure", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({
      id: 7, originCity: "Harare", destCity: "Bulawayo", basePrice: "15",
      stops: [{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }],
    });
    (prisma.ride.create as jest.Mock).mockResolvedValue({ id: 99 });

    const when = new Date("2026-07-15T06:00:00Z");
    const ride = await createBusRide({
      operatorId: 5, routeId: 7, vehicleId: 8, departureTime: when, seats: 60, routeDepartureId: 3,
    });

    expect(ride).toEqual({ id: 99 });
    const data = (prisma.ride.create as jest.Mock).mock.calls[0][0].data;
    expect(data.status).toBe("PUBLISHED");
    expect(data.totalSeats).toBe(60);
    expect(data.availableSeats).toBe(60);
    expect(data.contribution).toBe(15);
    expect(data.vehicle.connect).toEqual({ id: 8 });
    expect(data.driver.connect).toEqual({ id: 5 });
    expect(data.routeDeparture.connect).toEqual({ id: 3 });
  });

  it("throws ROUTE_NOT_FOUND when the route is not owned by the operator", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      createBusRide({ operatorId: 5, routeId: 7, vehicleId: 8, departureTime: new Date(), seats: 1 })
    ).rejects.toThrow("ROUTE_NOT_FOUND");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd server && npx jest src/services/busRide.service.test.ts`
Expected: FAIL — `Cannot find module './busRide.service'`.

- [ ] **Step 3: Implement the service**

Create `server/src/services/busRide.service.ts`:

```ts
import { RideStatus, BookingType, Prisma } from "@prisma/client";
import { prisma } from "../config/database";

export const rideInclude = {
  route: { select: { id: true, originCity: true, destCity: true } },
  vehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
} as const;

function locationFromStop(city: string, stop?: { latitude?: number | null; longitude?: number | null }) {
  return {
    region: city, city, locationName: city,
    latitude: stop?.latitude ?? 0, longitude: stop?.longitude ?? 0, regionCode: null,
  };
}

export async function createBusRide(params: {
  operatorId: number;
  routeId: number;
  vehicleId: number;
  departureTime: Date;
  seats: number;
  routeDepartureId?: number | null;
}) {
  const route = await prisma.busRoute.findFirst({
    where: { id: params.routeId, operatorId: params.operatorId },
    include: { stops: { orderBy: { order: "asc" } } },
  });
  if (!route) throw new Error("ROUTE_NOT_FOUND");

  const firstStop = route.stops[0];
  const lastStop = route.stops[route.stops.length - 1];

  return prisma.ride.create({
    data: {
      departureTime: params.departureTime,
      availableSeats: params.seats,
      totalSeats: params.seats,
      contribution: Number(route.basePrice),
      status: RideStatus.PUBLISHED,
      publishedAt: new Date(),
      bookingType: BookingType.AUTOMATIC,
      contributionCollectionMethod: "OFF_PLATFORM",
      driver: { connect: { id: params.operatorId } },
      vehicle: { connect: { id: params.vehicleId } },
      route: { connect: { id: route.id } },
      ...(params.routeDepartureId
        ? { routeDeparture: { connect: { id: params.routeDepartureId } } }
        : {}),
      departureLocation: { create: locationFromStop(route.originCity, firstStop) },
      destinationLocation: { create: locationFromStop(route.destCity, lastStop) },
    },
    include: rideInclude,
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && npx jest src/services/busRide.service.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Refactor `OperatorTripController.create` to use the service**

In `server/src/controllers/operatorTrip.controller.ts`, replace the inline `locationFromStop` + `prisma.ride.create` in `create` with a call to the service. Keep the vehicle-ownership and seats checks:

```ts
import { createBusRide } from "../services/busRide.service";
// ...delete the local locationFromStop helper...

static create = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const driverId = (req.user as DbUser).id;
  const { routeId, vehicleId, departureTime, availableSeats } = req.body as {
    routeId: number; vehicleId: number; departureTime: string; availableSeats: number;
  };

  const vehicle = await prisma.vehicle.findFirst({ where: { id: Number(vehicleId), userId: driverId } });
  if (!vehicle) return next(AppError("Vehicle not found", 404));

  const seats = Number(availableSeats);
  if (!Number.isInteger(seats) || seats <= 0) return next(AppError("availableSeats must be a positive integer", 400));

  try {
    const ride = await createBusRide({
      operatorId: driverId, routeId: Number(routeId), vehicleId: Number(vehicleId),
      departureTime: new Date(departureTime), seats,
    });
    res.status(201).json({ trip: ride });
  } catch (e) {
    if (e instanceof Error && e.message === "ROUTE_NOT_FOUND") return next(AppError("Route not found", 404));
    throw e;
  }
});
```

- [ ] **Step 6: Verify existing operator-trip behaviour still compiles & tests pass**

Run: `cd server && npx tsc --noEmit && npx jest src/services/busRide.service.test.ts`
Expected: exit 0; tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/busRide.service.ts server/src/services/busRide.service.test.ts server/src/controllers/operatorTrip.controller.ts
git commit -m "feat(server): shared createBusRide service; reuse in operator one-off create"
```

---

## Task 3: `findOrCreateScheduledRide` (lazy materialization)

**Files:**
- Modify: `server/src/services/busRide.service.ts`
- Modify: `server/src/services/busRide.service.test.ts`

**Interfaces:**
- Produces: `findOrCreateScheduledRide(params: { routeDepartureId: number; date: string }): Promise<Ride>` — throws `Error("DEPARTURE_NOT_FOUND")`, `Error("PAST_DEPARTURE")`. `date` is `"YYYY-MM-DD"`.

- [ ] **Step 1: Write the failing test** (append to `busRide.service.test.ts`)

Extend the prisma mock at the top to include the new calls, then add the describe block:

```ts
// add to the jest.mock("../config/database", ...) prisma object:
//   busRouteDeparture: { findFirst: jest.fn() },
//   ride: { create: jest.fn(), findUnique: jest.fn() },

import { findOrCreateScheduledRide } from "./busRide.service";

describe("findOrCreateScheduledRide", () => {
  beforeEach(() => jest.clearAllMocks());

  const futureDate = "2999-01-01";
  const departure = {
    id: 3, routeId: 7, vehicleId: 8, timeOfDay: "06:00", isActive: true,
    route: { id: 7, operatorId: 5, originCity: "Harare", destCity: "Bulawayo", basePrice: "15" },
    vehicle: { id: 8, capacity: 60 },
  };

  it("returns the existing ride when one is already materialized", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(departure);
    (prisma.ride.findUnique as jest.Mock).mockResolvedValue({ id: 42 });

    const ride = await findOrCreateScheduledRide({ routeDepartureId: 3, date: futureDate });
    expect(ride).toEqual({ id: 42 });
    expect(prisma.ride.create).not.toHaveBeenCalled();
  });

  it("creates a ride owned by the route operator when none exists", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(departure);
    (prisma.ride.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({
      id: 7, originCity: "Harare", destCity: "Bulawayo", basePrice: "15", stops: [],
    });
    (prisma.ride.create as jest.Mock).mockResolvedValue({ id: 100 });

    const ride = await findOrCreateScheduledRide({ routeDepartureId: 3, date: futureDate });
    expect(ride).toEqual({ id: 100 });
    const data = (prisma.ride.create as jest.Mock).mock.calls[0][0].data;
    expect(data.driver.connect).toEqual({ id: 5 });     // route operator, not requester
    expect(data.totalSeats).toBe(60);                   // bus capacity
    expect(data.routeDeparture.connect).toEqual({ id: 3 });
  });

  it("rejects a past departure", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(departure);
    await expect(
      findOrCreateScheduledRide({ routeDepartureId: 3, date: "2000-01-01" })
    ).rejects.toThrow("PAST_DEPARTURE");
  });

  it("throws DEPARTURE_NOT_FOUND for an unknown/inactive departure", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      findOrCreateScheduledRide({ routeDepartureId: 3, date: futureDate })
    ).rejects.toThrow("DEPARTURE_NOT_FOUND");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/services/busRide.service.test.ts`
Expected: FAIL — `findOrCreateScheduledRide is not a function`.

- [ ] **Step 3: Implement**

Append to `server/src/services/busRide.service.ts`:

```ts
export async function findOrCreateScheduledRide(params: { routeDepartureId: number; date: string }) {
  const departure = await prisma.busRouteDeparture.findFirst({
    where: { id: params.routeDepartureId, isActive: true },
    include: { route: true, vehicle: true },
  });
  if (!departure) throw new Error("DEPARTURE_NOT_FOUND");

  const [h, m] = departure.timeOfDay.split(":").map(Number);
  const departureTime = new Date(`${params.date}T00:00:00`);
  departureTime.setHours(h ?? 0, m ?? 0, 0, 0);
  if (departureTime.getTime() <= Date.now()) throw new Error("PAST_DEPARTURE");

  const key = { routeDepartureId_departureTime: { routeDepartureId: departure.id, departureTime } };

  const existing = await prisma.ride.findUnique({ where: key, include: rideInclude });
  if (existing) return existing;

  try {
    return await createBusRide({
      operatorId: departure.route.operatorId,
      routeId: departure.routeId,
      vehicleId: departure.vehicleId,
      departureTime,
      seats: departure.vehicle.capacity,
      routeDepartureId: departure.id,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const raced = await prisma.ride.findUnique({ where: key, include: rideInclude });
      if (raced) return raced;
    }
    throw e;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/services/busRide.service.test.ts`
Expected: PASS (all tests including the 4 new ones).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/busRide.service.ts server/src/services/busRide.service.test.ts
git commit -m "feat(server): findOrCreateScheduledRide for lazy occurrence materialization"
```

---

## Task 4: Operator departures CRUD API

**Files:**
- Create: `server/src/controllers/operatorDeparture.controller.ts`
- Create: `server/src/controllers/operatorDeparture.controller.test.ts`
- Modify: `server/src/routes/operator.routes.ts`

**Interfaces:**
- Consumes: `prisma`, `catchAsync`, `AppError`, `DbUser`.
- Produces routes: `GET /operator/routes/:routeId/departures`, `POST /operator/routes/:routeId/departures`, `PATCH /operator/departures/:id`, `DELETE /operator/departures/:id`.

- [ ] **Step 1: Write the failing test**

Create `server/src/controllers/operatorDeparture.controller.test.ts`:

```ts
jest.mock("../config/database", () => ({
  prisma: {
    busRoute: { findFirst: jest.fn() },
    busRouteDeparture: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import { Request, Response } from "express";
import { OperatorDepartureController } from "./operatorDeparture.controller";
import { prisma } from "../config/database";

function res() {
  const r: Partial<Response> = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  r.end = jest.fn().mockReturnValue(r);
  return r as Response;
}
const flush = () => new Promise<void>((x) => setImmediate(x));

describe("OperatorDepartureController.create", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a departure on an owned route", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({ id: 7 });
    (prisma.busRouteDeparture.create as jest.Mock).mockResolvedValue({ id: 1, timeOfDay: "06:00", vehicleId: 8 });
    const req = { user: { id: 5 }, params: { routeId: "7" }, body: { timeOfDay: "06:00", vehicleId: 8 } } as unknown as Request;
    const r = res();
    await OperatorDepartureController.create(req, r, jest.fn());
    await flush();
    expect(prisma.busRouteDeparture.create).toHaveBeenCalledWith({
      data: { routeId: 7, timeOfDay: "06:00", vehicleId: 8 },
    });
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it("404s when the route is not owned by the operator", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { routeId: "7" }, body: { timeOfDay: "06:00", vehicleId: 8 } } as unknown as Request;
    await OperatorDepartureController.create(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    expect(prisma.busRouteDeparture.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/controllers/operatorDeparture.controller.test.ts`
Expected: FAIL — cannot find module `./operatorDeparture.controller`.

- [ ] **Step 3: Implement the controller**

Create `server/src/controllers/operatorDeparture.controller.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { DbUser } from "../types";

async function ownedRoute(operatorId: number, routeId: number) {
  return prisma.busRoute.findFirst({ where: { id: routeId, operatorId }, select: { id: true } });
}

export class OperatorDepartureController {
  static list = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const routeId = Number(req.params.routeId);
    if (!(await ownedRoute(operatorId, routeId))) return next(AppError("Route not found", 404));
    const departures = await prisma.busRouteDeparture.findMany({
      where: { routeId },
      include: { vehicle: { select: { id: true, make: true, model: true, plateNumber: true, capacity: true } } },
      orderBy: { timeOfDay: "asc" },
    });
    res.json({ departures });
  });

  static create = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const routeId = Number(req.params.routeId);
    if (!(await ownedRoute(operatorId, routeId))) return next(AppError("Route not found", 404));
    const { timeOfDay, vehicleId } = req.body as { timeOfDay: string; vehicleId: number };
    if (!/^\d{2}:\d{2}$/.test(timeOfDay || "")) return next(AppError("timeOfDay must be HH:mm", 400));
    const vehicle = await prisma.vehicle.findFirst({ where: { id: Number(vehicleId), userId: operatorId }, select: { id: true } });
    if (!vehicle) return next(AppError("Vehicle not found", 404));
    const departure = await prisma.busRouteDeparture.create({
      data: { routeId, timeOfDay, vehicleId: Number(vehicleId) },
    });
    res.status(201).json({ departure });
  });

  static update = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const dep = await prisma.busRouteDeparture.findFirst({
      where: { id, route: { operatorId } }, select: { id: true },
    });
    if (!dep) return next(AppError("Departure not found", 404));
    const { timeOfDay, vehicleId, isActive } = req.body as { timeOfDay?: string; vehicleId?: number; isActive?: boolean };
    const departure = await prisma.busRouteDeparture.update({
      where: { id },
      data: {
        ...(timeOfDay !== undefined ? { timeOfDay } : {}),
        ...(vehicleId !== undefined ? { vehicleId: Number(vehicleId) } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    res.json({ departure });
  });

  static delete_ = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const dep = await prisma.busRouteDeparture.findFirst({
      where: { id, route: { operatorId } }, select: { id: true },
    });
    if (!dep) return next(AppError("Departure not found", 404));
    await prisma.busRouteDeparture.delete({ where: { id } });
    res.status(204).end();
  });
}
```

(The vehicle-ownership check requires `prisma.vehicle.findFirst` — add `vehicle: { findFirst: jest.fn() }` to the test's prisma mock and have it resolve `{ id: 8 }` in the create test.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/controllers/operatorDeparture.controller.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the routes**

In `server/src/routes/operator.routes.ts`, add:

```ts
import { OperatorDepartureController } from "../controllers/operatorDeparture.controller";

router.get("/routes/:routeId/departures", OperatorDepartureController.list);
router.post("/routes/:routeId/departures", OperatorDepartureController.create);
router.patch("/departures/:id", OperatorDepartureController.update);
router.delete("/departures/:id", OperatorDepartureController.delete_);
```

- [ ] **Step 6: Verify compile**

Run: `cd server && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/operatorDeparture.controller.ts server/src/controllers/operatorDeparture.controller.test.ts server/src/routes/operator.routes.ts
git commit -m "feat(server): operator route-departure CRUD endpoints"
```

---

## Task 5: Public trips endpoint returns the schedule

**Files:**
- Modify: `server/src/controllers/public/busRoutes.controller.ts`
- Modify: `server/src/controllers/public/busRoutes.controller.test.ts`

**Interfaces:**
- Produces: `GET /public/bus-routes/:routeId/trips` → `{ departures: [{ id, timeOfDay, fare, vehicle: { make, model, plateNumber, capacity } }] }`.

- [ ] **Step 1: Replace the `trips` test**

In `server/src/controllers/public/busRoutes.controller.test.ts`, change the prisma mock to `busRouteDeparture: { findMany: jest.fn() }` and replace the `PublicBusRouteController.trips` describe block:

```ts
describe("PublicBusRouteController.trips", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.busRouteDeparture.findMany as jest.Mock).mockResolvedValue([
      { id: 1, timeOfDay: "06:00", vehicle: { make: "Scania", model: "X", plateNumber: "Z1", capacity: 60 }, route: { basePrice: "15" } },
    ]);
  });

  it("returns active departures for the route as the schedule", async () => {
    const res = mockRes();
    const req = { query: {}, params: { routeId: "1" } } as unknown as Request;
    await PublicBusRouteController.trips(req, res, jest.fn());
    await flushPromises();

    const arg = (prisma.busRouteDeparture.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ routeId: 1, isActive: true });
    expect(res.json).toHaveBeenCalledWith({
      departures: [{ id: 1, timeOfDay: "06:00", fare: 15, vehicle: { make: "Scania", model: "X", plateNumber: "Z1", capacity: 60 } }],
    });
  });
});
```

(Also update the top-level `jest.mock("../../config/database", ...)` to expose `busRouteDeparture: { findMany: jest.fn() }` instead of `ride`.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/controllers/public/busRoutes.controller.test.ts`
Expected: FAIL — current `trips` still queries `prisma.ride`.

- [ ] **Step 3: Implement**

Replace the `trips` method in `server/src/controllers/public/busRoutes.controller.ts`:

```ts
async trips(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const routeId = Number(req.params.routeId);
    const departures = await prisma.busRouteDeparture.findMany({
      where: { routeId, isActive: true },
      include: {
        vehicle: { select: { make: true, model: true, plateNumber: true, capacity: true } },
        route: { select: { basePrice: true } },
      },
      orderBy: { timeOfDay: "asc" },
    });
    res.json({
      departures: departures.map((d) => ({
        id: d.id,
        timeOfDay: d.timeOfDay,
        fare: Number(d.route.basePrice),
        vehicle: d.vehicle,
      })),
    });
  } catch (err) {
    next(err);
  }
}
```

(Remove the now-unused `RideStatus` import if it is no longer referenced.)

- [ ] **Step 4: Run to verify it passes**

Run: `cd server && npx jest src/controllers/public/busRoutes.controller.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/public/busRoutes.controller.ts server/src/controllers/public/busRoutes.controller.test.ts
git commit -m "feat(server): public route trips endpoint returns active departures (schedule)"
```

---

## Task 6: `POST /rides/from-schedule` (authenticated materialize)

**Files:**
- Modify: `server/src/controllers/ride.controller.ts` (add `createFromSchedule`)
- Modify: `server/src/routes/ride.routes.ts`
- Create: `server/src/controllers/ride.fromSchedule.test.ts`

**Interfaces:**
- Consumes: `findOrCreateScheduledRide`.
- Produces: `POST /rides/from-schedule { routeDepartureId, date }` → `{ ride }`; 400 on past/invalid, 404 on unknown departure.

- [ ] **Step 1: Write the failing test**

Create `server/src/controllers/ride.fromSchedule.test.ts`:

```ts
jest.mock("../services/busRide.service", () => ({ findOrCreateScheduledRide: jest.fn() }));

import { Request, Response } from "express";
import { RideController } from "./ride.controller";
import { findOrCreateScheduledRide } from "../services/busRide.service";

function res() {
  const r: Partial<Response> = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r as Response;
}
const flush = () => new Promise<void>((x) => setImmediate(x));

describe("RideController.createFromSchedule", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the materialized ride", async () => {
    (findOrCreateScheduledRide as jest.Mock).mockResolvedValue({ id: 100 });
    const req = { body: { routeDepartureId: 3, date: "2999-01-01" } } as unknown as Request;
    const r = res();
    await RideController.createFromSchedule(req, r, jest.fn());
    await flush();
    expect(findOrCreateScheduledRide).toHaveBeenCalledWith({ routeDepartureId: 3, date: "2999-01-01" });
    expect(r.json).toHaveBeenCalledWith({ ride: { id: 100 } });
  });

  it("maps PAST_DEPARTURE to 400", async () => {
    (findOrCreateScheduledRide as jest.Mock).mockRejectedValue(new Error("PAST_DEPARTURE"));
    const next = jest.fn();
    const req = { body: { routeDepartureId: 3, date: "2000-01-01" } } as unknown as Request;
    await RideController.createFromSchedule(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });
});
```

(`AppError` returns an error object with `statusCode`; confirm the property name in `server/src/utils/AppError.ts` and adjust the assertion if it differs.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/controllers/ride.fromSchedule.test.ts`
Expected: FAIL — `createFromSchedule` is not defined on `RideController`.

- [ ] **Step 3: Implement the controller method**

In `server/src/controllers/ride.controller.ts`, add inside `RideController`:

```ts
import { findOrCreateScheduledRide } from "../services/busRide.service";

static createFromSchedule = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { routeDepartureId, date } = req.body as { routeDepartureId: number; date: string };
  if (!routeDepartureId || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return next(AppError("routeDepartureId and date (YYYY-MM-DD) are required", 400));
  }
  try {
    const ride = await findOrCreateScheduledRide({ routeDepartureId: Number(routeDepartureId), date });
    res.json({ ride });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "DEPARTURE_NOT_FOUND") return next(AppError("Departure not found", 404));
    if (msg === "PAST_DEPARTURE") return next(AppError("That departure is in the past", 400));
    throw e;
  }
});
```

(Ensure `catchAsync` and `AppError` are imported in `ride.controller.ts` — they almost certainly already are.)

- [ ] **Step 4: Wire the route**

In `server/src/routes/ride.routes.ts`, add (the router is already mounted behind `isAuthenticated`):

```ts
router.post("/from-schedule", RideController.createFromSchedule);
```

- [ ] **Step 5: Run to verify it passes & compiles**

Run: `cd server && npx jest src/controllers/ride.fromSchedule.test.ts && npx tsc --noEmit`
Expected: tests PASS; exit 0.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/ride.controller.ts server/src/routes/ride.routes.ts server/src/controllers/ride.fromSchedule.test.ts
git commit -m "feat(server): POST /rides/from-schedule materializes a scheduled occurrence"
```

---

## Task 7: Bus-swap-at-check-in endpoint

**Files:**
- Modify: `server/src/controllers/operatorTrip.controller.ts` (add `swapBus`)
- Modify: `server/src/routes/operator.routes.ts`
- Modify: `server/src/controllers/operatorTrip.swapBus.test.ts` (new)

**Interfaces:**
- Produces: `PATCH /operator/trips/:id/bus { vehicleId }` → `{ trip }`; 404 if the ride is not the operator's.

- [ ] **Step 1: Write the failing test**

Create `server/src/controllers/operatorTrip.swapBus.test.ts`:

```ts
jest.mock("../config/database", () => ({
  prisma: { ride: { findFirst: jest.fn(), update: jest.fn() }, vehicle: { findFirst: jest.fn() } },
}));

import { Request, Response } from "express";
import { OperatorTripController } from "./operatorTrip.controller";
import { prisma } from "../config/database";

function res() {
  const r: Partial<Response> = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r as Response;
}
const flush = () => new Promise<void>((x) => setImmediate(x));

describe("OperatorTripController.swapBus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the ride's vehicle when the operator owns both", async () => {
    (prisma.ride.findFirst as jest.Mock).mockResolvedValue({ id: 10 });
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 8 });
    (prisma.ride.update as jest.Mock).mockResolvedValue({ id: 10, vehicleId: 8 });
    const req = { user: { id: 5 }, params: { id: "10" }, body: { vehicleId: 8 } } as unknown as Request;
    const r = res();
    await OperatorTripController.swapBus(req, r, jest.fn());
    await flush();
    expect(prisma.ride.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { vehicleId: 8 }, include: expect.any(Object) });
    expect(r.json).toHaveBeenCalledWith({ trip: { id: 10, vehicleId: 8 } });
  });

  it("404s when the trip is not the operator's", async () => {
    (prisma.ride.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { id: "10" }, body: { vehicleId: 8 } } as unknown as Request;
    await OperatorTripController.swapBus(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    expect(prisma.ride.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd server && npx jest src/controllers/operatorTrip.swapBus.test.ts`
Expected: FAIL — `swapBus` not defined.

- [ ] **Step 3: Implement**

Add to `OperatorTripController` in `server/src/controllers/operatorTrip.controller.ts`:

```ts
static swapBus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const driverId = (req.user as DbUser).id;
  const id = Number(req.params.id);
  const { vehicleId } = req.body as { vehicleId: number };
  const trip = await prisma.ride.findFirst({ where: { id, driverId }, select: { id: true } });
  if (!trip) return next(AppError("Trip not found", 404));
  const vehicle = await prisma.vehicle.findFirst({ where: { id: Number(vehicleId), userId: driverId }, select: { id: true } });
  if (!vehicle) return next(AppError("Vehicle not found", 404));
  const updated = await prisma.ride.update({
    where: { id },
    data: { vehicleId: Number(vehicleId) },
    include: {
      route: { select: { id: true, originCity: true, destCity: true } },
      vehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
    },
  });
  res.json({ trip: updated });
});
```

- [ ] **Step 4: Wire the route**

In `server/src/routes/operator.routes.ts`, add:

```ts
router.patch("/trips/:id/bus", OperatorTripController.swapBus);
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd server && npx jest src/controllers/operatorTrip.swapBus.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/operatorTrip.controller.ts server/src/routes/operator.routes.ts server/src/controllers/operatorTrip.swapBus.test.ts
git commit -m "feat(server): operator bus-swap endpoint for a materialized trip"
```

---

## Task 8: Operator dashboard — manage departures + swap bus

**Files:**
- Modify: `client/src/hooks/useOperator.ts`
- Modify: `client/src/pages/operator/tabs/TripsTab.tsx`

**Interfaces:**
- Consumes: server endpoints from Tasks 4 & 7.
- Produces: hooks `useRouteDepartures(routeId)`, `useCreateDeparture()`, `useUpdateDeparture()`, `useDeleteDeparture()`, `useSwapTripBus()`.

- [ ] **Step 1: Add the hooks**

Append to `client/src/hooks/useOperator.ts`:

```ts
export interface OperatorDeparture {
  id: number; routeId: number; timeOfDay: string; vehicleId: number; isActive: boolean;
  vehicle?: { id: number; make: string; model: string; plateNumber: string; capacity: number };
}

export function useRouteDepartures(routeId?: number) {
  return useQuery({
    queryKey: ["operator-departures", routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const res = await api.get<{ departures: OperatorDeparture[] }>(`/api/v1/operator/routes/${routeId}/departures`);
      return res.departures ?? [];
    },
  });
}
export function useCreateDeparture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, timeOfDay, vehicleId }: { routeId: number; timeOfDay: string; vehicleId: number }) =>
      api.post(`/api/v1/operator/routes/${routeId}/departures`, { timeOfDay, vehicleId }),
    onSuccess: (_d, v) => { toast.success("Departure added"); qc.invalidateQueries({ queryKey: ["operator-departures", v.routeId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to add departure"),
  });
}
export function useUpdateDeparture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: number; timeOfDay?: string; vehicleId?: number; isActive?: boolean }) =>
      api.patch(`/api/v1/operator/departures/${id}`, patch),
    onSuccess: () => { toast.success("Departure updated"); qc.invalidateQueries({ queryKey: ["operator-departures"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update departure"),
  });
}
export function useDeleteDeparture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/operator/departures/${id}`),
    onSuccess: () => { toast.success("Departure removed"); qc.invalidateQueries({ queryKey: ["operator-departures"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to remove departure"),
  });
}
export function useSwapTripBus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, vehicleId }: { tripId: number; vehicleId: number }) =>
      api.patch(`/api/v1/operator/trips/${tripId}/bus`, { vehicleId }),
    onSuccess: () => { toast.success("Bus updated"); qc.invalidateQueries({ queryKey: ["operator-trips"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to change bus"),
  });
}
```

- [ ] **Step 2: Add a "Recurring schedule" manager to the Trips tab**

In `client/src/pages/operator/tabs/TripsTab.tsx`, add a section (above the one-off form) that lets the operator pick a route, then add/list/toggle/delete departures. Use `useOperatorRoutes`, `useOperatorBuses`, and the new hooks. Minimum viable UI:

```tsx
// new imports
import { useRouteDepartures, useCreateDeparture, useDeleteDeparture, useUpdateDeparture } from "@/hooks/useOperator";

// inside the component, before the one-off form:
const [schedRouteId, setSchedRouteId] = useState("");
const departures = useRouteDepartures(schedRouteId ? Number(schedRouteId) : undefined);
const addDep = useCreateDeparture();
const delDep = useDeleteDeparture();
const updDep = useUpdateDeparture();
const [depTime, setDepTime] = useState("");
const [depBus, setDepBus] = useState("");

// JSX:
<section className="space-y-3 mb-8">
  <h3 className="font-semibold">Recurring schedule</h3>
  <select className="border rounded px-3 py-2" value={schedRouteId} onChange={(e) => setSchedRouteId(e.target.value)}>
    <option value="">Select route</option>
    {routes.map((r) => <option key={r.id} value={r.id}>{r.originCity} → {r.destCity}</option>)}
  </select>

  {schedRouteId && (
    <>
      <form
        className="flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          addDep.mutate(
            { routeId: Number(schedRouteId), timeOfDay: depTime, vehicleId: Number(depBus) },
            { onSuccess: () => { setDepTime(""); setDepBus(""); } }
          );
        }}
      >
        <input type="time" className="border rounded px-3 py-2" value={depTime} onChange={(e) => setDepTime(e.target.value)} required />
        <select className="border rounded px-3 py-2" value={depBus} onChange={(e) => setDepBus(e.target.value)} required>
          <option value="">Select bus</option>
          {buses.map((b) => <option key={b.id} value={b.id}>{b.make} {b.model} ({b.plateNumber})</option>)}
        </select>
        <button className="bg-primary text-white rounded px-4 py-2" disabled={addDep.isPending}>Add time</button>
      </form>

      <table className="w-full text-sm border-collapse">
        <thead><tr className="text-left border-b"><th className="py-2">Time</th><th>Bus</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {(departures.data ?? []).map((d) => (
            <tr key={d.id} className="border-b">
              <td className="py-2">{d.timeOfDay}</td>
              <td>{d.vehicle ? `${d.vehicle.make} ${d.vehicle.model}` : "—"}</td>
              <td>
                <button className="underline" onClick={() => updDep.mutate({ id: d.id, isActive: !d.isActive })}>
                  {d.isActive ? "Yes" : "No"}
                </button>
              </td>
              <td><button className="text-red-600" onClick={() => delDep.mutate(d.id)}>Delete</button></td>
            </tr>
          ))}
          {(departures.data ?? []).length === 0 && <tr><td colSpan={4} className="py-4 text-muted-foreground">No times yet.</td></tr>}
        </tbody>
      </table>
    </>
  )}
</section>
```

Also add a per-trip "Change bus" `<select>` in the existing trips table that calls `useSwapTripBus().mutate({ tripId: t.id, vehicleId })`.

- [ ] **Step 3: Verify the client builds**

Run: `cd client && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useOperator.ts client/src/pages/operator/tabs/TripsTab.tsx
git commit -m "feat(client): operator recurring-schedule manager + per-trip bus swap"
```

---

## Task 9: Mobile — schedule list + date picker + materialize

**Files:**
- Modify: `mobile/src/lib/types.ts`
- Modify: `mobile/src/hooks/useBus.ts`
- Modify: `mobile/src/app/bus/route/[routeId]/trips.tsx`

**Interfaces:**
- Consumes: `GET /public/bus-routes/:routeId/trips` (now `{ departures }`), `POST /rides/from-schedule`.
- Produces: `useRouteDepartures(routeId)`, `useMaterializeTrip()`.

- [ ] **Step 1: Add the type**

In `mobile/src/lib/types.ts`, add:

```ts
export interface BusRouteDeparture {
  id: number;
  timeOfDay: string;
  fare: number;
  vehicle?: { make: string; model: string; plateNumber: string; capacity: number };
}
```

- [ ] **Step 2: Replace the trips hook + add materialize**

In `mobile/src/hooks/useBus.ts`:

```ts
import { api, publicApi } from "@/services/api";
import type { BusRouteDeparture, Ride } from "@/lib/types";

export function useRouteDepartures(routeId?: string) {
  return useQuery({
    queryKey: queryKeys.bus.trips(routeId ?? ""),
    queryFn: () => publicApi.get<{ departures: BusRouteDeparture[] }>(`/public/bus-routes/${routeId}/trips`),
    select: (r) => r.departures,
    enabled: !!routeId,
  });
}

export function useMaterializeTrip() {
  return useMutation({
    mutationFn: (vars: { routeDepartureId: number; date: string }) =>
      api.post<{ ride: Ride }>("/rides/from-schedule", vars),
  });
}
```

(Add `useMutation` to the `@tanstack/react-query` import. Confirm `api` — the authenticated client — is exported from `@/services/api`.)

- [ ] **Step 3: Update the trips screen to a schedule + date picker**

Rewrite `mobile/src/app/bus/route/[routeId]/trips.tsx` to render departures and, on tap, prompt for a date then materialize:

```tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useRouteDepartures, useMaterializeTrip } from "@/hooks/useBus";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { handleApiError } from "@/lib/utils";
import { ColorPalette, fontSize, spacing, borderRadius } from "@/lib/theme";

function toDateString(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ScheduleScreen() {
  const { routeId, routeTitle } = useLocalSearchParams<{ routeId: string; routeTitle?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const requireAuth = useRequireAuth();
  const { data: departures, isLoading } = useRouteDepartures(routeId);
  const materialize = useMaterializeTrip();
  const [pendingDepartureId, setPendingDepartureId] = useState<number | null>(null);

  const onPickDate = (departureId: number) => requireAuth(() => setPendingDepartureId(departureId));

  const onDateChosen = async (_e: unknown, date?: Date) => {
    const departureId = pendingDepartureId;
    setPendingDepartureId(null);
    if (!date || departureId == null) return;
    try {
      const { ride } = await materialize.mutateAsync({ routeDepartureId: departureId, date: toDateString(date) });
      router.push({ pathname: "/bus/trip/[rideId]", params: { rideId: String(ride.id), routeId: String(routeId), routeTitle: routeTitle ?? "" } } as any);
    } catch (e) {
      handleApiError(e, (k: string) => k);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={s.appBar}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color={colors.text.primary} /></TouchableOpacity>
        <Text style={s.title}>{routeTitle || "Schedule"}</Text>
      </View>
      {isLoading ? <LoadingIndicator /> : (
        <FlatList
          data={departures ?? []}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>No scheduled departures on this route.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`bus.departure.${item.id}`} style={s.card} activeOpacity={0.7} onPress={() => onPickDate(item.id)}>
              <Text style={s.time}>{item.timeOfDay}</Text>
              <View style={s.botRow}>
                {item.vehicle ? <Text style={s.vehicle}>{item.vehicle.make} {item.vehicle.model}</Text> : <Text style={s.vehicle} />}
                <Text style={s.price}>RWF {item.fare.toLocaleString()}</Text>
              </View>
              <Text style={s.pick}>Tap to pick a date</Text>
            </TouchableOpacity>
          )}
        />
      )}
      {pendingDepartureId != null && (
        <DateTimePicker value={new Date()} mode="date" minimumDate={new Date()} display={Platform.OS === "ios" ? "inline" : "default"} onChange={onDateChosen} />
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
    time: { fontFamily: "Jost_700Bold", fontSize: fontSize.lg, color: colors.text.primary },
    botRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    vehicle: { fontFamily: "Jost_500Medium", fontSize: fontSize.xs, color: colors.text.tertiary },
    price: { fontFamily: "Jost_700Bold", fontSize: fontSize.sm, color: colors.primary },
    pick: { fontFamily: "Jost_600SemiBold", fontSize: fontSize.xs, color: colors.primary },
  });
```

(Confirm `@react-native-community/datetimepicker` is already a dependency — `post-ride/index.tsx` uses a date picker; reuse the same component/import it uses. Keep the file's existing `testID` scheme so Maestro can target it.)

- [ ] **Step 4: Update the test mock for the renamed hook**

In `mobile/src/app/bus/route/[routeId]/__tests__/trips.test.tsx` and `mobile/src/hooks/__tests__/useBus.test.tsx`, replace `useRouteTrips`/`{ trips }` expectations with `useRouteDepartures`/`{ departures }`.

- [ ] **Step 5: Run mobile tests**

Run: `cd mobile && npx jest src/app/bus/route src/hooks/__tests__/useBus.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/lib/types.ts mobile/src/hooks/useBus.ts mobile/src/app/bus/route/[routeId]/trips.tsx mobile/src/app/bus/route/[routeId]/__tests__/trips.test.tsx mobile/src/hooks/__tests__/useBus.test.tsx
git commit -m "feat(mobile): route schedule list + date-pick materialization"
```

---

## Task 10: End-to-end verification (definition of done)

**Files:**
- Create: `mobile/.maestro/flows/bus/passenger-book-recurring.yaml`
- Output: `docs/screenshots/` (Playwright)

- [ ] **Step 1: Bring up the stack with the new code**

Run: `docker compose up -d --build`
Expected: server, client, db, minio healthy (server logs "Server is running"). Run `npx prisma migrate deploy` is part of the server image start.

- [ ] **Step 2: Playwright — operator adds a departure (web)**

Drive the operator dashboard (login as the seeded operator), Trips tab → Recurring schedule → select route → add a time + bus → confirm it appears. Capture screenshots to `docs/screenshots/`:
- `20-operator-add-departure.png` (the schedule form with a row added)

- [ ] **Step 3: Maestro — passenger books a recurring departure (mobile)**

Create `mobile/.maestro/flows/bus/passenger-book-recurring.yaml` modelled on `passenger-book-and-board.yaml`:

```yaml
appId: ${MAESTRO_APP_ID}
name: Passenger books a recurring scheduled departure
tags:
  - bus
---
- runFlow: ../../helpers/reset.yaml
- launchApp
# Home → Bus → operator → route → schedule
- tapOn: "Bus"
- tapOn:
    id: "bus.operator.*"
    index: 0
- tapOn:
    id: "bus.route.*"
    index: 0
# Schedule of times → tap first departure
- assertVisible:
    id: "bus.departure.*"
- tapOn:
    id: "bus.departure.*"
    index: 0
# Auth prompt (guest) then date picker → confirm a future date
- runFlow:
    when:
      visible: "Sign in"
    file: ../auth/login.yaml
- tapOn: "OK"        # confirm the date picker (adjust per platform control)
# Existing booking screen
- assertVisible: "Confirm booking"
- tapOn: "Confirm booking"
- assertVisible: "ticket"   # ticket screen marker
```

(Adjust selectors to match the existing bus flow's helpers and the date-picker control on the target platform.)

- [ ] **Step 4: Run the Maestro flow against the running backend**

Run: `cd mobile && maestro test .maestro/flows/bus/passenger-book-recurring.yaml`
Expected: flow passes end to end (departure → from-schedule → booking → ticket).

- [ ] **Step 5: Commit the flow + screenshots**

```bash
git add mobile/.maestro/flows/bus/passenger-book-recurring.yaml docs/screenshots
git commit -m "test(e2e): recurring schedule — playwright operator + maestro passenger flows"
```

---

## Self-review notes

- **Spec coverage:** schema (T1), shared service + one-off reuse (T2), lazy materialize (T3), operator CRUD (T4), public schedule (T5), `from-schedule` (T6), bus swap (T7), operator UI (T8), mobile schedule+date+materialize (T9), dual e2e (T10). One-off trips remain (T2 keeps `OperatorTripController.create`).
- **Non-goals honored:** no weekday/holiday/override tables; fare from `basePrice`; schedule screen shows departures only.
- **Type consistency:** `findOrCreateScheduledRide`/`createBusRide` signatures match their consumers (T6, T3); `routeDepartureId_departureTime` composite key used consistently (T3); `{ departures }` wire shape consistent between T5 (server) and T9 (mobile).
- **Known follow-ups (from spec, not in v1):** cancelled-date handling, smaller-bus swap reconciliation, deleting a bus attached to a departure (block), abandoned-date-pick empty rides.
