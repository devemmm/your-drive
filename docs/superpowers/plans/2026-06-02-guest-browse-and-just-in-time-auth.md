# Guest Browse + Just-in-Time Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** let unauthenticated users browse the app's public surfaces (home map + four service catalogues); fire a just-in-time auth prompt only at gated CTAs.

**Architecture:** five new `/public/*` mirror endpoints on the server (each reusing a shared search service via a `viewer` param + response mapper); a single `<AuthGateSheet>` bottom sheet on mobile triggered by a `useRequireAuth()` hook; the existing welcome screen gains a "Continue as guest" button; the drawer's hard auth gate is dropped.

**Tech Stack:** Node.js / Express / Prisma on server; React Native / Expo Router / TanStack Query / AsyncStorage / Jest / RTNTL on mobile; Maestro for E2E.

**Spec:** `docs/superpowers/specs/2026-06-02-guest-browse-and-just-in-time-auth-design.md`

---

## File Structure

### Server — new files
- `server/src/controllers/public/rentals.controller.ts`
- `server/src/controllers/public/chauffeurs.controller.ts`
- `server/src/controllers/public/rides.controller.ts`
- `server/src/controllers/public/busRoutes.controller.ts`
- `server/src/controllers/public/drivers.controller.ts`
- `server/src/services/search/rentalSearch.service.ts`
- `server/src/services/search/chauffeurSearch.service.ts`
- `server/src/services/search/rideSearch.service.ts`
- `server/src/services/search/busRouteSearch.service.ts`
- `server/src/services/search/driverNearbySearch.service.ts`
- Test files mirroring each (`*.test.ts`)

### Server — modified files
- `server/src/routes/public.routes.ts` — register the 5 new sub-routes
- `server/src/controllers/{rental,chauffeur,ride,driverPresence,busRoute}.controller.ts` — switch authed paths to call shared search services

### Mobile — new files
- `mobile/src/providers/AuthGateProvider.tsx`
- `mobile/src/components/AuthGateSheet.tsx`
- `mobile/src/hooks/useRequireAuth.ts`
- Test files for each

### Mobile — modified files
- `mobile/src/lib/constants.ts` — add `STORAGE_KEYS.HAS_SEEN_WELCOME`
- `mobile/src/services/auth.ts` — add `hasSeenWelcome()` / `setHasSeenWelcome()`
- `mobile/src/services/api.ts` — add `publicApi` instance + export
- `mobile/src/app/_layout.tsx` — mount `AuthGateProvider`, first-launch routing
- `mobile/src/app/(drawer)/_layout.tsx` — drop the auth redirect; guard pollers
- `mobile/src/app/(auth)/welcome.tsx` — add "Continue as guest" button
- `mobile/src/components/DrawerContent.tsx` — gate auth-required items, hide mode toggle for guests
- `mobile/src/hooks/{useNearbyDrivers,useBusRoutes,useRentalsList,useChauffeurList,useRideSearch}.ts` — route by `isAuthenticated`
- Each gated-CTA call site (~10–12 screens) — wrap `onPress` in `requireAuth(...)`

### Tests — new files
- `server/src/services/search/*.test.ts` (one per service)
- `server/src/controllers/public/*.test.ts` (one per controller)
- `mobile/src/providers/__tests__/AuthGateProvider.test.tsx`
- `mobile/src/hooks/__tests__/useRequireAuth.test.tsx`
- `mobile/src/components/__tests__/AuthGateSheet.test.tsx`
- `mobile/.maestro/guest-browse-and-auth-prompt.yaml`

---

## Phase A — Server public endpoints

### Task 1: Rentals — extract search service + add public mirror

**Files:**
- Create: `server/src/services/search/rentalSearch.service.ts`
- Create: `server/src/services/search/rentalSearch.service.test.ts`
- Create: `server/src/controllers/public/rentals.controller.ts`
- Modify: `server/src/routes/public.routes.ts`
- Modify: `server/src/controllers/rental.controller.ts` — switch the existing list endpoint to call the new service

- [ ] **Step 1: Write the failing test for the shared service**

```ts
// server/src/services/search/rentalSearch.service.test.ts
import { listRentals } from "./rentalSearch.service";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: { vehicle: { findMany: jest.fn(), count: jest.fn() } },
}));

describe("rentalSearch.service.listRentals", () => {
  beforeEach(() => jest.clearAllMocks());

  it("strips owner phone and email when viewer.isGuest is true", async () => {
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: "v1", make: "Toyota", model: "Vitz", year: 2020, dailyRate: 30000,
        user: { id: "u1", firstName: "Jane", lastName: "Doe", phoneNumber: "+250...", email: "jane@x.com" },
        images: [],
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: true }, filters: {} });
    expect(result.items[0]).not.toHaveProperty("user.phoneNumber");
    expect(result.items[0]).not.toHaveProperty("user.email");
    expect(result.items[0].user).toEqual({ id: "u1", firstName: "Jane", lastName: "Doe" });
  });

  it("keeps owner phone and email when viewer is authenticated", async () => {
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      { id: "v1", user: { id: "u1", firstName: "Jane", lastName: "Doe", phoneNumber: "+250...", email: "jane@x.com" }, images: [] },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: false, userId: "viewer1" }, filters: {} });
    expect(result.items[0].user.phoneNumber).toBe("+250...");
    expect(result.items[0].user.email).toBe("jane@x.com");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `cd server && npx jest src/services/search/rentalSearch.service.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Implement the shared service**

Open the existing rental list logic in `server/src/services/rental.service.ts` (or `rental.controller.ts` if the query lives there) and identify the Prisma query that powers the rental list endpoint. Copy that query into the new service. Add a `viewer` parameter and a response mapper.

```ts
// server/src/services/search/rentalSearch.service.ts
import { prisma } from "../../lib/prisma";

export type Viewer =
  | { isGuest: true }
  | { isGuest: false; userId: string };

export interface RentalSearchFilters {
  city?: string;
  startDate?: Date;
  endDate?: Date;
  category?: string;
  page?: number;
  pageSize?: number;
}

export async function listRentals(args: {
  viewer: Viewer;
  filters: RentalSearchFilters;
}) {
  const { viewer, filters } = args;
  const where = buildRentalWhereClause(filters);
  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: {
        user: { select: viewer.isGuest
          ? { id: true, firstName: true, lastName: true }
          : { id: true, firstName: true, lastName: true, phoneNumber: true, email: true }
        },
        images: true,
      },
      skip: ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20),
      take: filters.pageSize ?? 20,
    }),
    prisma.vehicle.count({ where }),
  ]);
  return { items, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 };
}

function buildRentalWhereClause(filters: RentalSearchFilters) {
  // Mirror the existing filter logic from rental.controller.ts / rental.service.ts.
  // Pull the exact predicates from there so this stays a drop-in replacement.
  return {
    kycStatus: "APPROVED" as const,
    status: "AVAILABLE" as const,
    // … city, dates, category as the existing endpoint already implements
  };
}
```

The implementer's first action here is to **read the existing list endpoint** for rentals and port the exact `where` clause + include shape over. If the existing query references a security deposit or rate calculation, those carry over too. The viewer-aware bit is only the `user.select` choice.

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd server && npx jest src/services/search/rentalSearch.service.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for the public controller**

```ts
// server/src/controllers/public/rentals.controller.test.ts
import request from "supertest";
import { app } from "../../app";
import * as rentalSearch from "../../services/search/rentalSearch.service";

jest.mock("../../services/search/rentalSearch.service");

describe("GET /api/v1/public/rentals/search", () => {
  it("returns 200 without auth header", async () => {
    (rentalSearch.listRentals as jest.Mock).mockResolvedValue({
      items: [], total: 0, page: 1, pageSize: 20,
    });
    const res = await request(app).get("/api/v1/public/rentals/search?city=Kigali");
    expect(res.status).toBe(200);
    expect(rentalSearch.listRentals).toHaveBeenCalledWith({
      viewer: { isGuest: true },
      filters: expect.objectContaining({ city: "Kigali" }),
    });
  });
});
```

- [ ] **Step 6: Run to confirm failure**

Run: `cd server && npx jest src/controllers/public/rentals.controller.test.ts`
Expected: FAIL (controller / route does not exist)

- [ ] **Step 7: Implement the public controller**

```ts
// server/src/controllers/public/rentals.controller.ts
import { Request, Response, NextFunction } from "express";
import { listRentals } from "../../services/search/rentalSearch.service";

export const PublicRentalController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await listRentals({
        viewer: { isGuest: true },
        filters: {
          city: req.query.city as string | undefined,
          startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          category: req.query.category as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        },
      });
      res.json(result);
    } catch (err) { next(err); }
  },
};
```

- [ ] **Step 8: Register the route on public.routes.ts**

Edit `server/src/routes/public.routes.ts`. Add:

```ts
import { PublicRentalController } from "../controllers/public/rentals.controller";

router.get("/rentals/search", PublicRentalController.list);
```

- [ ] **Step 9: Run the controller test to confirm it passes**

Run: `cd server && npx jest src/controllers/public/rentals.controller.test.ts`
Expected: PASS

- [ ] **Step 10: Switch the existing authed controller to call the shared service**

Open `server/src/controllers/rental.controller.ts`, find the list/search endpoint (likely `RentalController.list` or similar). Replace its query body with a call into `listRentals({ viewer: { isGuest: false, userId: req.user.id }, filters })`. Behavior for authed users must remain identical — confirm by running existing rental controller tests.

- [ ] **Step 11: Run existing rental controller tests + new tests to confirm nothing regressed**

Run: `cd server && npx jest src/controllers/rental.controller.test.ts src/controllers/public/rentals.controller.test.ts src/services/search/rentalSearch.service.test.ts`
Expected: ALL PASS

- [ ] **Step 12: Commit**

```bash
git add server/src/services/search/rentalSearch.service.ts \
        server/src/services/search/rentalSearch.service.test.ts \
        server/src/controllers/public/rentals.controller.ts \
        server/src/controllers/public/rentals.controller.test.ts \
        server/src/routes/public.routes.ts \
        server/src/controllers/rental.controller.ts
git commit -m "feat(server): public /rentals/search mirror via shared search service"
```

---

### Task 2: Chauffeur — extract search service + add public mirror

**Files:**
- Create: `server/src/services/search/chauffeurSearch.service.ts` + test
- Create: `server/src/controllers/public/chauffeurs.controller.ts` + test
- Modify: `server/src/routes/public.routes.ts`
- Modify: `server/src/controllers/chauffeur.controller.ts`

Same shape as Task 1, applied to chauffeurs.

- [ ] **Step 1: Write failing service test**

```ts
// server/src/services/search/chauffeurSearch.service.test.ts
import { listChauffeurs } from "./chauffeurSearch.service";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: { user: { findMany: jest.fn(), count: jest.fn() } },
}));

describe("chauffeurSearch.service.listChauffeurs", () => {
  it("strips phone and email for guest viewer", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "u1", firstName: "John", phoneNumber: "+250...", email: "j@x.com", languagesSpoken: ["en"], averageRating: 4.5 },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await listChauffeurs({ viewer: { isGuest: true }, filters: {} });
    expect(result.items[0]).not.toHaveProperty("phoneNumber");
    expect(result.items[0]).not.toHaveProperty("email");
    expect(result.items[0]).toMatchObject({ id: "u1", firstName: "John", languagesSpoken: ["en"], averageRating: 4.5 });
  });

  it("keeps phone and email for authenticated viewer", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "u1", firstName: "John", phoneNumber: "+250...", email: "j@x.com", languagesSpoken: ["en"] },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await listChauffeurs({ viewer: { isGuest: false, userId: "v1" }, filters: {} });
    expect(result.items[0].phoneNumber).toBe("+250...");
    expect(result.items[0].email).toBe("j@x.com");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `cd server && npx jest src/services/search/chauffeurSearch.service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the service**

Open `server/src/services/chauffeur.service.ts` (or wherever the existing chauffeur-list query lives) and port the query. Adapt the `user.select` (or `findMany` select) to drop `phoneNumber` / `email` when `viewer.isGuest`.

```ts
// server/src/services/search/chauffeurSearch.service.ts
import { prisma } from "../../lib/prisma";
import type { Viewer } from "./rentalSearch.service";

export interface ChauffeurSearchFilters {
  city?: string;
  language?: string;
  serviceType?: string;
  page?: number;
  pageSize?: number;
}

export async function listChauffeurs(args: {
  viewer: Viewer;
  filters: ChauffeurSearchFilters;
}) {
  const { viewer, filters } = args;
  const guestSelect = {
    id: true, firstName: true, lastName: true, profileImage: true,
    languagesSpoken: true, averageRating: true, completedTripsCount: true,
    isAvailableForChauffeur: true, drivingExperience: true,
  };
  const authedSelect = { ...guestSelect, phoneNumber: true, email: true };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        isAvailableForChauffeur: true,
        kycStatus: "APPROVED",
        // … any existing filters (language, city, serviceType)
      },
      select: viewer.isGuest ? guestSelect : authedSelect,
      skip: ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20),
      take: filters.pageSize ?? 20,
    }),
    prisma.user.count({ where: { isAvailableForChauffeur: true, kycStatus: "APPROVED" } }),
  ]);
  return { items, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `cd server && npx jest src/services/search/chauffeurSearch.service.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing controller test**

```ts
// server/src/controllers/public/chauffeurs.controller.test.ts
import request from "supertest";
import { app } from "../../app";
import * as chauffeurSearch from "../../services/search/chauffeurSearch.service";

jest.mock("../../services/search/chauffeurSearch.service");

describe("GET /api/v1/public/chauffeur-services/search", () => {
  it("returns 200 without auth", async () => {
    (chauffeurSearch.listChauffeurs as jest.Mock).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const res = await request(app).get("/api/v1/public/chauffeur-services/search?language=en");
    expect(res.status).toBe(200);
    expect(chauffeurSearch.listChauffeurs).toHaveBeenCalledWith({
      viewer: { isGuest: true },
      filters: expect.objectContaining({ language: "en" }),
    });
  });
});
```

- [ ] **Step 6: Run, expect FAIL**

Run: `cd server && npx jest src/controllers/public/chauffeurs.controller.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement the public controller + route**

```ts
// server/src/controllers/public/chauffeurs.controller.ts
import { Request, Response, NextFunction } from "express";
import { listChauffeurs } from "../../services/search/chauffeurSearch.service";

export const PublicChauffeurController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await listChauffeurs({
        viewer: { isGuest: true },
        filters: {
          city: req.query.city as string | undefined,
          language: req.query.language as string | undefined,
          serviceType: req.query.serviceType as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        },
      });
      res.json(result);
    } catch (err) { next(err); }
  },
};
```

Edit `server/src/routes/public.routes.ts`:

```ts
import { PublicChauffeurController } from "../controllers/public/chauffeurs.controller";

router.get("/chauffeur-services/search", PublicChauffeurController.list);
```

- [ ] **Step 8: Switch the existing authed chauffeur list to call the service**

In `server/src/controllers/chauffeur.controller.ts`, find the list endpoint and replace its body with `listChauffeurs({ viewer: { isGuest: false, userId: req.user.id }, filters })`. Existing chauffeur controller tests must continue to pass.

- [ ] **Step 9: Run all related tests**

Run: `cd server && npx jest src/controllers/chauffeur.controller.test.ts src/controllers/public/chauffeurs.controller.test.ts src/services/search/chauffeurSearch.service.test.ts`
Expected: ALL PASS

- [ ] **Step 10: Commit**

```bash
git add server/src/services/search/chauffeurSearch.service.ts \
        server/src/services/search/chauffeurSearch.service.test.ts \
        server/src/controllers/public/chauffeurs.controller.ts \
        server/src/controllers/public/chauffeurs.controller.test.ts \
        server/src/routes/public.routes.ts \
        server/src/controllers/chauffeur.controller.ts
git commit -m "feat(server): public /chauffeur-services/search mirror via shared service"
```

---

### Task 3: Rides — extract search service + add public mirror

Same shape as Task 1 for posted P2P rides.

**Files:**
- Create: `server/src/services/search/rideSearch.service.ts` + test
- Create: `server/src/controllers/public/rides.controller.ts` + test
- Modify: `server/src/routes/public.routes.ts`
- Modify: `server/src/controllers/ride.controller.ts` (the search endpoint, not the full ride detail one)

- [ ] **Step 1: Failing service test**

```ts
// server/src/services/search/rideSearch.service.test.ts
import { listRides } from "./rideSearch.service";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: { ride: { findMany: jest.fn(), count: jest.fn() } },
}));

describe("rideSearch.service.listRides", () => {
  it("strips driver phone and email when viewer is guest", async () => {
    (prisma.ride.findMany as jest.Mock).mockResolvedValue([
      {
        id: "r1", fare: 5000, departureTime: new Date(),
        driver: { id: "u1", firstName: "Sam", phoneNumber: "+250...", email: "s@x.com", averageRating: 4.7 },
        vehicle: { id: "v1", make: "Toyota", category: "CAR", tier: "ECONOMY" },
      },
    ]);
    (prisma.ride.count as jest.Mock).mockResolvedValue(1);

    const result = await listRides({ viewer: { isGuest: true }, filters: {} });
    expect(result.items[0]).not.toHaveProperty("driver.phoneNumber");
    expect(result.items[0]).not.toHaveProperty("driver.email");
    expect(result.items[0].driver).toMatchObject({ firstName: "Sam", averageRating: 4.7 });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd server && npx jest src/services/search/rideSearch.service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the service**

Port the existing posted-ride search query from `server/src/services/ride.service.ts` (or wherever it lives). Same viewer-aware `select` pattern.

```ts
// server/src/services/search/rideSearch.service.ts
import { prisma } from "../../lib/prisma";
import type { Viewer } from "./rentalSearch.service";

export interface RideSearchFilters {
  origin?: string;
  destination?: string;
  departAfter?: Date;
  departBefore?: Date;
  vehicleCategory?: "CAR" | "MOTORBIKE" | "BUS";
  page?: number;
  pageSize?: number;
}

export async function listRides(args: { viewer: Viewer; filters: RideSearchFilters }) {
  const { viewer, filters } = args;
  const driverSelect = viewer.isGuest
    ? { id: true, firstName: true, lastName: true, profileImage: true, averageRating: true, completedTripsCount: true }
    : { id: true, firstName: true, lastName: true, profileImage: true, averageRating: true, completedTripsCount: true, phoneNumber: true, email: true };

  const where = {
    status: "POSTED",
    // … existing filters: origin city, destination city, departureTime range, vehicle category, etc.
  };

  const [items, total] = await Promise.all([
    prisma.ride.findMany({
      where,
      include: {
        driver: { select: driverSelect },
        vehicle: { select: { id: true, make: true, model: true, year: true, category: true, tier: true, images: true } },
      },
      orderBy: { departureTime: "asc" },
      skip: ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20),
      take: filters.pageSize ?? 20,
    }),
    prisma.ride.count({ where }),
  ]);

  return { items, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `cd server && npx jest src/services/search/rideSearch.service.test.ts`
Expected: PASS

- [ ] **Step 5: Failing controller test**

```ts
// server/src/controllers/public/rides.controller.test.ts
import request from "supertest";
import { app } from "../../app";
import * as rideSearch from "../../services/search/rideSearch.service";

jest.mock("../../services/search/rideSearch.service");

describe("GET /api/v1/public/rides/search", () => {
  it("returns 200 without auth", async () => {
    (rideSearch.listRides as jest.Mock).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const res = await request(app).get("/api/v1/public/rides/search");
    expect(res.status).toBe(200);
    expect(rideSearch.listRides).toHaveBeenCalledWith({
      viewer: { isGuest: true },
      filters: expect.any(Object),
    });
  });
});
```

- [ ] **Step 6: Run, expect FAIL**

Run: `cd server && npx jest src/controllers/public/rides.controller.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement controller + route**

```ts
// server/src/controllers/public/rides.controller.ts
import { Request, Response, NextFunction } from "express";
import { listRides } from "../../services/search/rideSearch.service";

export const PublicRideController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await listRides({
        viewer: { isGuest: true },
        filters: {
          origin: req.query.origin as string | undefined,
          destination: req.query.destination as string | undefined,
          departAfter: req.query.departAfter ? new Date(req.query.departAfter as string) : undefined,
          departBefore: req.query.departBefore ? new Date(req.query.departBefore as string) : undefined,
          vehicleCategory: req.query.vehicleCategory as any,
          page: req.query.page ? Number(req.query.page) : undefined,
          pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        },
      });
      res.json(result);
    } catch (err) { next(err); }
  },
};
```

Edit `server/src/routes/public.routes.ts`:

```ts
import { PublicRideController } from "../controllers/public/rides.controller";

router.get("/rides/search", PublicRideController.list);
```

- [ ] **Step 8: Switch the existing authed search endpoint**

In `server/src/controllers/ride.controller.ts`, find the posted-ride search/list endpoint and replace its body with `listRides({ viewer: { isGuest: false, userId: req.user.id }, filters })`.

- [ ] **Step 9: Run all ride tests**

Run: `cd server && npx jest src/controllers/ride.controller.test.ts src/controllers/public/rides.controller.test.ts src/services/search/rideSearch.service.test.ts`
Expected: ALL PASS

- [ ] **Step 10: Commit**

```bash
git add server/src/services/search/rideSearch.service.ts \
        server/src/services/search/rideSearch.service.test.ts \
        server/src/controllers/public/rides.controller.ts \
        server/src/controllers/public/rides.controller.test.ts \
        server/src/routes/public.routes.ts \
        server/src/controllers/ride.controller.ts
git commit -m "feat(server): public /rides/search mirror via shared service"
```

---

### Task 4: Bus routes — promote in-controller search to a service + add public mirror

**Files:**
- Create: `server/src/services/search/busRouteSearch.service.ts` + test
- Create: `server/src/controllers/public/busRoutes.controller.ts` + test
- Modify: `server/src/routes/public.routes.ts`
- Modify: `server/src/controllers/busRoute.controller.ts` — `publicSearch` calls the new service

- [ ] **Step 1: Failing service test**

```ts
// server/src/services/search/busRouteSearch.service.test.ts
import { listBusRoutes } from "./busRouteSearch.service";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: { busRoute: { findMany: jest.fn(), count: jest.fn() } },
}));

describe("busRouteSearch.service.listBusRoutes", () => {
  it("returns routes regardless of viewer (no auth-only fields on routes)", async () => {
    (prisma.busRoute.findMany as jest.Mock).mockResolvedValue([
      { id: "r1", name: "Kigali→Musanze", operator: { id: "o1", name: "Volcano" }, stops: [] },
    ]);
    (prisma.busRoute.count as jest.Mock).mockResolvedValue(1);

    const guest = await listBusRoutes({ viewer: { isGuest: true }, filters: {} });
    const authed = await listBusRoutes({ viewer: { isGuest: false, userId: "u1" }, filters: {} });
    expect(guest.items).toEqual(authed.items);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd server && npx jest src/services/search/busRouteSearch.service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement service**

Lift the body of `BusRouteController.publicSearch` (already public-friendly) into a service:

```ts
// server/src/services/search/busRouteSearch.service.ts
import { prisma } from "../../lib/prisma";
import type { Viewer } from "./rentalSearch.service";

export interface BusRouteSearchFilters {
  origin?: string;
  destination?: string;
  page?: number;
  pageSize?: number;
}

export async function listBusRoutes(args: { viewer: Viewer; filters: BusRouteSearchFilters }) {
  const { filters } = args;
  const where = {
    isActive: true,
    // … existing filters from BusRouteController.publicSearch
  };
  const [items, total] = await Promise.all([
    prisma.busRoute.findMany({
      where,
      include: { operator: { select: { id: true, name: true } }, stops: true },
      skip: ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20),
      take: filters.pageSize ?? 20,
    }),
    prisma.busRoute.count({ where }),
  ]);
  return { items, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `cd server && npx jest src/services/search/busRouteSearch.service.test.ts`
Expected: PASS

- [ ] **Step 5: Failing controller test**

```ts
// server/src/controllers/public/busRoutes.controller.test.ts
import request from "supertest";
import { app } from "../../app";
import * as busRouteSearch from "../../services/search/busRouteSearch.service";

jest.mock("../../services/search/busRouteSearch.service");

describe("GET /api/v1/public/bus-routes/search", () => {
  it("returns 200 without auth", async () => {
    (busRouteSearch.listBusRoutes as jest.Mock).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const res = await request(app).get("/api/v1/public/bus-routes/search");
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 6: Run, expect FAIL**

Run: `cd server && npx jest src/controllers/public/busRoutes.controller.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement public controller + route**

```ts
// server/src/controllers/public/busRoutes.controller.ts
import { Request, Response, NextFunction } from "express";
import { listBusRoutes } from "../../services/search/busRouteSearch.service";

export const PublicBusRouteController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await listBusRoutes({
        viewer: { isGuest: true },
        filters: {
          origin: req.query.origin as string | undefined,
          destination: req.query.destination as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
        },
      });
      res.json(result);
    } catch (err) { next(err); }
  },
};
```

Edit `server/src/routes/public.routes.ts`:

```ts
import { PublicBusRouteController } from "../controllers/public/busRoutes.controller";

router.get("/bus-routes/search", PublicBusRouteController.search);
```

- [ ] **Step 8: Switch existing authed `BusRouteController.publicSearch` to call the service**

In `server/src/controllers/busRoute.controller.ts`, replace `publicSearch` body with `listBusRoutes({ viewer: { isGuest: false, userId: req.user.id }, filters })`. Existing bus-route tests must continue to pass.

- [ ] **Step 9: Run all bus-route tests**

Run: `cd server && npx jest src/controllers/busRoute.controller.test.ts src/controllers/public/busRoutes.controller.test.ts src/services/search/busRouteSearch.service.test.ts`
Expected: ALL PASS

- [ ] **Step 10: Commit**

```bash
git add server/src/services/search/busRouteSearch.service.ts \
        server/src/services/search/busRouteSearch.service.test.ts \
        server/src/controllers/public/busRoutes.controller.ts \
        server/src/controllers/public/busRoutes.controller.test.ts \
        server/src/routes/public.routes.ts \
        server/src/controllers/busRoute.controller.ts
git commit -m "feat(server): public /bus-routes/search mirror via shared service"
```

---

### Task 5: Nearby drivers — extract + public mirror

**Files:**
- Create: `server/src/services/search/driverNearbySearch.service.ts` + test
- Create: `server/src/controllers/public/drivers.controller.ts` + test
- Modify: `server/src/routes/public.routes.ts`
- Modify: `server/src/controllers/driverPresence.controller.ts` — `nearby` calls the new service

- [ ] **Step 1: Failing service test**

```ts
// server/src/services/search/driverNearbySearch.service.test.ts
import { listNearbyDrivers } from "./driverNearbySearch.service";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: { driverPresence: { findMany: jest.fn() } },
}));

describe("driverNearbySearch.service", () => {
  it("returns the same lat/lng/category for guests and authed users", async () => {
    const rows = [
      { user: { id: "u1", phoneNumber: "+250..." }, latitude: -1.95, longitude: 30.06, vehicle: { category: "CAR" } },
    ];
    (prisma.driverPresence.findMany as jest.Mock).mockResolvedValue(rows);

    const guest = await listNearbyDrivers({ viewer: { isGuest: true }, bounds: { swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 } });
    expect(guest.drivers[0]).toEqual({ id: "u1", latitude: -1.95, longitude: 30.06, vehicleCategory: "CAR" });
    expect(guest.drivers[0]).not.toHaveProperty("phoneNumber");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd server && npx jest src/services/search/driverNearbySearch.service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement service**

Port the query from `server/src/services/driverPresence.service.ts` (or wherever `nearby` lives). The mapper always returns only `id`, `latitude`, `longitude`, `vehicleCategory` — nothing else — so guest and authed responses are identical. The viewer parameter is reserved for future personalization.

```ts
// server/src/services/search/driverNearbySearch.service.ts
import { prisma } from "../../lib/prisma";
import type { Viewer } from "./rentalSearch.service";
import type { MapBounds } from "../../types/MapBounds"; // or re-declare here

export async function listNearbyDrivers(args: { viewer: Viewer; bounds: MapBounds }) {
  const { bounds } = args;
  const rows = await prisma.driverPresence.findMany({
    where: {
      latitude: { gte: bounds.swLat, lte: bounds.neLat },
      longitude: { gte: bounds.swLng, lte: bounds.neLng },
      user: { isAvailableForRideRequest: true, kycStatus: "APPROVED" },
      // … any TTL / staleness predicates already present
    },
    include: { user: { select: { id: true } }, vehicle: { select: { category: true } } },
    take: 100,
  });
  return {
    drivers: rows.map((r) => ({
      id: r.user.id,
      latitude: r.latitude,
      longitude: r.longitude,
      vehicleCategory: r.vehicle?.category ?? "CAR",
    })),
    fetchedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `cd server && npx jest src/services/search/driverNearbySearch.service.test.ts`
Expected: PASS

- [ ] **Step 5: Failing controller test**

```ts
// server/src/controllers/public/drivers.controller.test.ts
import request from "supertest";
import { app } from "../../app";
import * as drvSearch from "../../services/search/driverNearbySearch.service";

jest.mock("../../services/search/driverNearbySearch.service");

describe("GET /api/v1/public/drivers/nearby", () => {
  it("returns 200 without auth", async () => {
    (drvSearch.listNearbyDrivers as jest.Mock).mockResolvedValue({ drivers: [], fetchedAt: new Date().toISOString() });
    const res = await request(app).get("/api/v1/public/drivers/nearby?swLat=-2&swLng=30&neLat=-1.9&neLng=30.1");
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 6: Run, expect FAIL**

Run: `cd server && npx jest src/controllers/public/drivers.controller.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement controller + route**

```ts
// server/src/controllers/public/drivers.controller.ts
import { Request, Response, NextFunction } from "express";
import { listNearbyDrivers } from "../../services/search/driverNearbySearch.service";

export const PublicDriversController = {
  async nearby(req: Request, res: Response, next: NextFunction) {
    try {
      const bounds = {
        swLat: Number(req.query.swLat),
        swLng: Number(req.query.swLng),
        neLat: Number(req.query.neLat),
        neLng: Number(req.query.neLng),
      };
      if ([bounds.swLat, bounds.swLng, bounds.neLat, bounds.neLng].some(Number.isNaN)) {
        return res.status(400).json({ message: "Invalid bounds" });
      }
      const result = await listNearbyDrivers({ viewer: { isGuest: true }, bounds });
      res.json(result);
    } catch (err) { next(err); }
  },
};
```

Edit `server/src/routes/public.routes.ts`:

```ts
import { PublicDriversController } from "../controllers/public/drivers.controller";

router.get("/drivers/nearby", PublicDriversController.nearby);
```

- [ ] **Step 8: Switch the existing authed `/drivers/nearby` to call the service**

In `server/src/controllers/driverPresence.controller.ts`, replace the `nearby` body with `listNearbyDrivers({ viewer: { isGuest: false, userId: req.user.id }, bounds })`. Run the existing nearby tests to confirm behavior is unchanged.

- [ ] **Step 9: Run all driver-presence tests**

Run: `cd server && npx jest src/controllers/driverPresence.controller.test.ts src/controllers/public/drivers.controller.test.ts src/services/search/driverNearbySearch.service.test.ts`
Expected: ALL PASS

- [ ] **Step 10: Commit**

```bash
git add server/src/services/search/driverNearbySearch.service.ts \
        server/src/services/search/driverNearbySearch.service.test.ts \
        server/src/controllers/public/drivers.controller.ts \
        server/src/controllers/public/drivers.controller.test.ts \
        server/src/routes/public.routes.ts \
        server/src/controllers/driverPresence.controller.ts
git commit -m "feat(server): public /drivers/nearby mirror via shared service"
```

---

## Phase B — Mobile foundations

### Task 6: Extend authStorage with `hasSeenWelcome`

**Files:**
- Modify: `mobile/src/lib/constants.ts`
- Modify: `mobile/src/services/auth.ts`
- Create: `mobile/src/services/__tests__/auth.test.ts` (if not present, otherwise add cases)

- [ ] **Step 1: Add the storage key**

Edit `mobile/src/lib/constants.ts`. Find the `STORAGE_KEYS` constant and add:

```ts
export const STORAGE_KEYS = {
  AUTH_TOKEN: "@yourdrive/auth_token",
  // … existing keys
  HAS_SEEN_WELCOME: "@yourdrive/has_seen_welcome",
};
```

- [ ] **Step 2: Failing test for the new flag**

```ts
// mobile/src/services/__tests__/auth.test.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authStorage } from "../auth";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
}));

describe("authStorage.hasSeenWelcome", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns false when no value is stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await authStorage.hasSeenWelcome()).toBe(false);
  });

  it("returns true after setHasSeenWelcome(true)", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    expect(await authStorage.hasSeenWelcome()).toBe(true);
  });

  it("returns false on AsyncStorage read failure", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("boom"));
    expect(await authStorage.hasSeenWelcome()).toBe(false);
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

Run: `cd mobile && npx jest src/services/__tests__/auth.test.ts`
Expected: FAIL (function does not exist)

- [ ] **Step 4: Implement the flag helpers**

Edit `mobile/src/services/auth.ts`:

```ts
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/constants";

let cachedToken: string | null = null;

export const authStorage = {
  // existing token methods unchanged …
  async getToken(): Promise<string | null> { /* … */ },
  async setToken(token: string): Promise<void> { /* … */ },
  async removeToken(): Promise<void> { /* … */ },
  getCachedToken(): string | null { return cachedToken; },

  async hasSeenWelcome(): Promise<boolean> {
    try {
      const v = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME);
      return v === "true";
    } catch {
      return false;
    }
  },
  async setHasSeenWelcome(value: boolean): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_WELCOME, value ? "true" : "false");
  },
};
```

(Keep the existing token methods. Only add the two new methods + the AsyncStorage import.)

- [ ] **Step 5: Run, expect PASS**

Run: `cd mobile && npx jest src/services/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/src/lib/constants.ts \
        mobile/src/services/auth.ts \
        mobile/src/services/__tests__/auth.test.ts
git commit -m "feat(mobile): persist hasSeenWelcome flag for guest mode"
```

---

### Task 7: Add `publicApi` axios instance

**Files:**
- Modify: `mobile/src/services/api.ts`

- [ ] **Step 1: Add the public client**

Edit `mobile/src/services/api.ts`. After the existing `apiClient` definition, add a second axios instance with no Bearer interceptor (keeps the `lang` param interceptor):

```ts
// existing imports unchanged

const publicAxios: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

publicAxios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.params = { ...config.params, lang: i18next.language || "en" };
  return config;
});

// Note: no response interceptor — public endpoints should not trigger sign-out on 401
// (they should never return 401, but if they do, we don't want side effects).

export const publicApi = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    publicAxios.get<T>(url, { params }).then((res) => res.data),
};
```

Export `publicApi` alongside the existing `api` export.

- [ ] **Step 2: Type-check mobile**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(mobile): publicApi axios instance for guest-visible endpoints"
```

---

### Task 8: Route the five list hooks by `isAuthenticated`

**Files:**
- Modify: `mobile/src/hooks/useNearbyDrivers.ts`
- Modify: `mobile/src/hooks/useBusRoutes.ts` (or whichever file holds the bus-route search hook)
- Modify: `mobile/src/hooks/useRentalsList.ts` (likely under `useRentals.ts`)
- Modify: `mobile/src/hooks/useChauffeurList.ts` (likely under `useChauffeur.ts`)
- Modify: `mobile/src/hooks/useRideSearch.ts` (likely under `useRides.ts`)

> If any of the above hook files have a different exact name, locate the equivalent hook (the one that calls the corresponding authed `/rentals/search`, `/chauffeur-services/search`, etc.) and modify that one.

- [ ] **Step 1: Update `useNearbyDrivers` to switch by auth state**

Edit `mobile/src/hooks/useNearbyDrivers.ts`. Replace the `queryFn` line:

```ts
import { api, publicApi } from "@/services/api";
import { useAuthContext } from "@/providers/AuthProvider";

export function useNearbyDrivers(bounds: MapBounds | null) {
  const { isAuthenticated } = useAuthContext();
  const isActive = useForegroundActive();
  return useQuery<NearbyResponse>({
    queryKey: bounds
      ? [...queryKeys.drivers.nearby(bounds), { guest: !isAuthenticated }]
      : ["drivers", "nearby", "none"],
    queryFn: () => {
      const url = isAuthenticated ? "/drivers/nearby" : "/public/drivers/nearby";
      const client = isAuthenticated ? api : publicApi;
      return client.get<NearbyResponse>(url, bounds! as unknown as Record<string, unknown>);
    },
    enabled: !!bounds && isActive,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
```

The query key gets a `{ guest: boolean }` suffix so cached data doesn't bleed between guest and authed mode after sign-in.

- [ ] **Step 2: Apply the same pattern to the four remaining hooks**

For each of `useBusRoutes`, `useRentalsList`, `useChauffeurList`, `useRideSearch`, repeat:
- Import `publicApi` and `useAuthContext`.
- Pull `isAuthenticated` at the top of the hook.
- Add `{ guest: !isAuthenticated }` to the query key.
- Choose `api` + `/...search` when authed, `publicApi` + `/public/...search` when guest.

- [ ] **Step 3: Type-check mobile**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke (optional but recommended)**

Start the server and the mobile dev build. Without a token, watch the network tab on the home screen → confirm `GET /api/v1/public/drivers/nearby` fires (not the authed variant). Repeat for the rental list screen, etc.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useNearbyDrivers.ts mobile/src/hooks/useBusRoutes.ts \
        mobile/src/hooks/useRentalsList.ts mobile/src/hooks/useChauffeurList.ts \
        mobile/src/hooks/useRideSearch.ts
git commit -m "feat(mobile): list hooks route public endpoints when unauthenticated"
```

---

## Phase C — Mobile auth-gate primitives

### Task 9: AuthGateProvider + AuthGateSheet + useRequireAuth

**Files:**
- Create: `mobile/src/providers/AuthGateProvider.tsx` + test
- Create: `mobile/src/components/AuthGateSheet.tsx` + test
- Create: `mobile/src/hooks/useRequireAuth.ts` + test

- [ ] **Step 1: Failing test for the hook**

```tsx
// mobile/src/hooks/__tests__/useRequireAuth.test.tsx
import { renderHook, act } from "@testing-library/react-native";
import { useRequireAuth } from "../useRequireAuth";
import { AuthGateProvider } from "@/providers/AuthGateProvider";

const mockOpenSheet = jest.fn();
const mockIsAuthenticated = jest.fn();

jest.mock("@/providers/AuthGateProvider", () => ({
  AuthGateProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuthGate: () => ({ openSheet: mockOpenSheet }),
}));
jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({ isAuthenticated: mockIsAuthenticated() }),
}));

describe("useRequireAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs the callback synchronously when authenticated", () => {
    mockIsAuthenticated.mockReturnValue(true);
    const { result } = renderHook(() => useRequireAuth());
    const cb = jest.fn();
    act(() => result.current(cb));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(mockOpenSheet).not.toHaveBeenCalled();
  });

  it("opens the sheet and does NOT run callback when guest", () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useRequireAuth());
    const cb = jest.fn();
    act(() => result.current(cb, { reason: "Sign in to continue" }));
    expect(cb).not.toHaveBeenCalled();
    expect(mockOpenSheet).toHaveBeenCalledWith({ reason: "Sign in to continue" });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd mobile && npx jest src/hooks/__tests__/useRequireAuth.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement the provider, sheet, and hook**

```tsx
// mobile/src/providers/AuthGateProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthGateSheet, AuthGateSheetRef } from "@/components/AuthGateSheet";
import { useAuthContext } from "./AuthProvider";

interface OpenOptions { reason?: string; }

interface AuthGateContextValue {
  openSheet: (opts?: OpenOptions) => void;
  closeSheet: () => void;
  isOpen: boolean;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const sheetRef = useRef<AuthGateSheetRef>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const { isAuthenticated } = useAuthContext();

  function openSheet(opts?: OpenOptions) {
    if (isOpen) return;          // ignore re-opens while already open
    setReason(opts?.reason);
    setIsOpen(true);
    sheetRef.current?.present();
  }
  function closeSheet() {
    setIsOpen(false);
    setReason(undefined);
    sheetRef.current?.dismiss();
  }

  // Auto-dismiss when the user becomes authenticated mid-flow.
  useEffect(() => {
    if (isAuthenticated && isOpen) closeSheet();
  }, [isAuthenticated, isOpen]);

  return (
    <AuthGateContext.Provider value={{ openSheet, closeSheet, isOpen }}>
      {children}
      <AuthGateSheet ref={sheetRef} reason={reason} onDismiss={() => setIsOpen(false)} />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used within AuthGateProvider");
  return ctx;
}
```

```tsx
// mobile/src/components/AuthGateSheet.tsx
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import BottomSheetModal, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export interface AuthGateSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  reason?: string;
  onDismiss?: () => void;
}

export const AuthGateSheet = forwardRef<AuthGateSheetRef, Props>(({ reason, onDismiss }, ref) => {
  const sheet = useRef<BottomSheetModal>(null);
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  useImperativeHandle(ref, () => ({
    present: () => sheet.current?.present(),
    dismiss: () => sheet.current?.dismiss(),
  }), []);

  return (
    <BottomSheetModal
      ref={sheet}
      snapPoints={["35%"]}
      enablePanDownToClose
      onDismiss={onDismiss}
      backdropComponent={(p) => <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} />}
    >
      <View style={s.container} testID="authGate.sheet">
        <Text style={s.headline}>{reason ?? "Sign in to continue"}</Text>
        <Text style={s.body}>Create an account or log in to keep going.</Text>
        <View style={s.buttons}>
          <Button
            testID="authGate.signUp"
            title="Sign up"
            onPress={() => { sheet.current?.dismiss(); router.push("/(auth)/register"); }}
            style={{ flex: 1 }}
          />
          <Button
            testID="authGate.logIn"
            title="Log in"
            variant="secondary"
            onPress={() => { sheet.current?.dismiss(); router.push("/(auth)/login"); }}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
});

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { padding: spacing.xxl, gap: spacing.lg },
  headline: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary, textAlign: "center" },
  body: { fontSize: fontSize.md, color: colors.text.secondary, textAlign: "center" },
  buttons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
});
```

```ts
// mobile/src/hooks/useRequireAuth.ts
import { useCallback } from "react";
import { useAuthContext } from "@/providers/AuthProvider";
import { useAuthGate } from "@/providers/AuthGateProvider";

interface Options { reason?: string; }

export function useRequireAuth() {
  const { isAuthenticated } = useAuthContext();
  const { openSheet } = useAuthGate();

  return useCallback(
    (callback: () => void, opts?: Options) => {
      if (isAuthenticated) {
        callback();
        return;
      }
      openSheet({ reason: opts?.reason });
    },
    [isAuthenticated, openSheet]
  );
}
```

- [ ] **Step 4: Run hook test, expect PASS**

Run: `cd mobile && npx jest src/hooks/__tests__/useRequireAuth.test.tsx`
Expected: PASS

- [ ] **Step 5: Add provider test**

```tsx
// mobile/src/providers/__tests__/AuthGateProvider.test.tsx
import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthGateProvider, useAuthGate } from "../AuthGateProvider";

let authState = { isAuthenticated: false };
jest.mock("../AuthProvider", () => ({
  useAuthContext: () => authState,
}));

function Probe() {
  const { isOpen, openSheet, closeSheet } = useAuthGate();
  return (
    <>
      <Text testID="probe.state">{isOpen ? "open" : "closed"}</Text>
      <Text testID="probe.open" onPress={() => openSheet()}>open</Text>
      <Text testID="probe.close" onPress={() => closeSheet()}>close</Text>
    </>
  );
}

describe("AuthGateProvider", () => {
  beforeEach(() => { authState = { isAuthenticated: false }; });

  it("ignores re-open while already open", () => {
    const { getByTestId } = render(
      <AuthGateProvider><Probe /></AuthGateProvider>
    );
    act(() => getByTestId("probe.open").props.onPress());
    expect(getByTestId("probe.state").props.children).toBe("open");
    // Second openSheet does not change state.
    act(() => getByTestId("probe.open").props.onPress());
    expect(getByTestId("probe.state").props.children).toBe("open");
  });

  it("auto-closes when isAuthenticated flips to true", () => {
    const { getByTestId, rerender } = render(
      <AuthGateProvider><Probe /></AuthGateProvider>
    );
    act(() => getByTestId("probe.open").props.onPress());
    expect(getByTestId("probe.state").props.children).toBe("open");
    authState = { isAuthenticated: true };
    rerender(<AuthGateProvider><Probe /></AuthGateProvider>);
    expect(getByTestId("probe.state").props.children).toBe("closed");
  });
});
```

- [ ] **Step 6: Run, expect PASS**

Run: `cd mobile && npx jest src/providers/__tests__/AuthGateProvider.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add mobile/src/providers/AuthGateProvider.tsx \
        mobile/src/providers/__tests__/AuthGateProvider.test.tsx \
        mobile/src/components/AuthGateSheet.tsx \
        mobile/src/hooks/useRequireAuth.ts \
        mobile/src/hooks/__tests__/useRequireAuth.test.tsx
git commit -m "feat(mobile): AuthGateProvider + AuthGateSheet + useRequireAuth hook"
```

---

### Task 10: Mount the provider in the root layout

**Files:**
- Modify: `mobile/src/app/_layout.tsx`

- [ ] **Step 1: Mount `AuthGateProvider` between `AuthProvider` and `SocketProvider`**

Edit `mobile/src/app/_layout.tsx`. Update the provider tree:

```tsx
import { AuthGateProvider } from "@/providers/AuthGateProvider";

// inside RootLayout:
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <AuthGateProvider>          {/* new */}
            <SocketProvider>
              <AppContent />
            </SocketProvider>
          </AuthGateProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  </GestureHandlerRootView>
);
```

`AuthGateProvider` uses `useAuthContext` so it MUST sit inside `AuthProvider`. The sheet uses gestures so it MUST sit inside `GestureHandlerRootView` (already the outer wrapper). If the project uses `BottomSheetModalProvider` elsewhere, wrap `AuthGateProvider`'s children in one too (verify by looking at `HomeBottomSheet` mounts).

- [ ] **Step 2: Type-check + manual smoke**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

Boot the app; confirm the existing UI still renders (no visible change yet).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/_layout.tsx
git commit -m "feat(mobile): mount AuthGateProvider in root layout"
```

---

## Phase D — Mobile flow

### Task 11: First-launch routing in root `_layout.tsx`

**Files:**
- Modify: `mobile/src/app/_layout.tsx`

The goal: on first launch (no `hasSeenWelcome`) push the user to `(auth)/welcome`; otherwise drop them on `(drawer)` regardless of auth state.

- [ ] **Step 1: Add a first-launch effect**

Add a new component inside `_layout.tsx` (or extract to `mobile/src/app/_RootEntry.tsx` if cleaner) that runs an effect on mount:

```tsx
import { useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { authStorage } from "@/services/auth";

function FirstLaunchGuard() {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const seen = await authStorage.hasSeenWelcome();
      // If user hasn't seen welcome AND isn't already on an auth route, push to welcome.
      const isOnAuthRoute = segments[0] === "(auth)";
      if (!seen && !isOnAuthRoute) {
        router.replace("/(auth)/welcome");
      }
      setChecked(true);
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
```

Render `<FirstLaunchGuard />` inside `AppContent`, alongside the `Stack` (sibling, not parent — the `Stack` renders the actual routes; the guard just dispatches navigation).

- [ ] **Step 2: Manual smoke**

Clear AsyncStorage on the simulator/device:

```bash
# iOS simulator
xcrun simctl erase booted
# Android: adb shell pm clear <package>
```

Launch the app cold. Expected: lands on `(auth)/welcome`. Verify the existing Login + Sign Up still work, and bringing up the welcome screen still rolls forward correctly.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/_layout.tsx
git commit -m "feat(mobile): first-launch routes guests to welcome screen"
```

---

### Task 12: Add "Continue as guest" to welcome screen

**Files:**
- Modify: `mobile/src/app/(auth)/welcome.tsx`
- Modify: `mobile/src/translations/en.json` + `fr.json` (if used)

- [ ] **Step 1: Update the welcome screen**

Replace the buttons block with three buttons. Keep the existing styling.

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { authStorage } from "@/services/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  async function continueAsGuest() {
    await authStorage.setHasSeenWelcome(true);
    router.replace("/(drawer)");
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.logo}>YourDrive</Text>
        <Text style={s.tagline}>{t("auth.welcome")}</Text>
      </View>
      <View style={s.buttons} testID="welcome.actions">
        <Button
          testID="welcome.signUpButton"
          title={t("auth.signUp")}
          onPress={() => router.push("/(auth)/register")}
        />
        <Button
          testID="welcome.loginButton"
          title={t("auth.login")}
          variant="secondary"
          onPress={() => router.push("/(auth)/login")}
        />
        <Button
          testID="welcome.guestButton"
          title={t("auth.continueAsGuest")}
          variant="ghost"
          onPress={continueAsGuest}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  content: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.lg },
  logo: { fontSize: fontSize.title, fontWeight: "700", color: colors.primary },
  tagline: { fontSize: fontSize.md, color: colors.text.secondary, textAlign: "center" },
  buttons: { gap: spacing.md, paddingBottom: spacing.xxxl },
});
```

If `Button` doesn't have a `ghost` variant, use `secondary` or add the variant first per existing patterns.

- [ ] **Step 2: Add translation keys**

Edit `mobile/src/translations/en.json` (and `fr.json` if present) — add:

```json
"auth": {
  "continueAsGuest": "Continue as guest"
}
```

- [ ] **Step 3: Failing component test**

```tsx
// mobile/src/app/(auth)/__tests__/welcome.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import WelcomeScreen from "../welcome";

const mockReplace = jest.fn();
const mockSetHasSeenWelcome = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn() }) }));
jest.mock("@/services/auth", () => ({ authStorage: { setHasSeenWelcome: mockSetHasSeenWelcome } }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe("WelcomeScreen", () => {
  it("renders three buttons", () => {
    const { getByTestId } = render(<WelcomeScreen />);
    expect(getByTestId("welcome.signUpButton")).toBeTruthy();
    expect(getByTestId("welcome.loginButton")).toBeTruthy();
    expect(getByTestId("welcome.guestButton")).toBeTruthy();
  });

  it("Continue as guest persists the flag and navigates to /(drawer)", async () => {
    const { getByTestId } = render(<WelcomeScreen />);
    fireEvent.press(getByTestId("welcome.guestButton"));
    await Promise.resolve();
    expect(mockSetHasSeenWelcome).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith("/(drawer)");
  });
});
```

- [ ] **Step 4: Run, expect PASS**

Run: `cd mobile && npx jest "src/app/(auth)/__tests__/welcome.test.tsx"`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/\(auth\)/welcome.tsx \
        mobile/src/app/\(auth\)/__tests__/welcome.test.tsx \
        mobile/src/translations/en.json
git commit -m "feat(mobile): add Continue as guest button to welcome screen"
```

(If `fr.json` was modified, include it.)

---

### Task 13: Drop the drawer auth gate + guard pollers

**Files:**
- Modify: `mobile/src/app/(drawer)/_layout.tsx`
- Verify: `mobile/src/hooks/useNotifications.ts`, `mobile/src/hooks/useDriverPresenceHeartbeat.ts`

- [ ] **Step 1: Remove the redirect; wrap pollers in isAuthenticated guard**

Edit `mobile/src/app/(drawer)/_layout.tsx`. Replace line 26 and the surrounding return block:

```tsx
export default function DrawerLayout() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const { colors } = useTheme();

  if (isLoading) return <LoadingIndicator fullScreen />;
  // NOTE: no auth redirect. Guests render the drawer too.

  return (
    <>
      {isAuthenticated && <NotificationsPoller />}
      {isAuthenticated && <DriverPresencePoller />}
      <Drawer /* … unchanged props … */>
        {/* … unchanged Drawer.Screen entries … */}
      </Drawer>
    </>
  );
}
```

- [ ] **Step 2: Audit the two pollers' hooks**

Open `mobile/src/hooks/useNotifications.ts` — if it makes any auth-required network calls unconditionally, add `const { isAuthenticated } = useAuthContext(); if (!isAuthenticated) return;` early or set `enabled: isAuthenticated` on its query.

Same audit on `mobile/src/hooks/useDriverPresenceHeartbeat.ts`.

(Wrapping the components above is the primary defense; this step is a belt-and-braces hook-level guard if the hooks ever get re-used elsewhere.)

- [ ] **Step 3: Manual smoke**

With `hasSeenWelcome = true` and no token, launch the app. Expected: lands directly on `(drawer)` with the home map rendering. No 401s in the request log.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(drawer\)/_layout.tsx \
        mobile/src/hooks/useNotifications.ts \
        mobile/src/hooks/useDriverPresenceHeartbeat.ts
git commit -m "feat(mobile): allow guests into (drawer) and gate auth-required pollers"
```

---

### Task 14: Gate auth-required drawer items + hide mode toggle for guests

**Files:**
- Modify: `mobile/src/components/DrawerContent.tsx`

- [ ] **Step 1: Wire `useRequireAuth` into the menu navigate function**

Edit `mobile/src/components/DrawerContent.tsx`. Add `requireAuth` to the imports / hook list:

```tsx
import { useRequireAuth } from "@/hooks/useRequireAuth";

// inside DrawerContent component:
const requireAuth = useRequireAuth();
const { user, isAuthenticated } = useAuthContext();   // also pull isAuthenticated
```

Update the per-item `MenuItem` type to add an optional `requiresAuth` flag, then mark items that need auth:

```tsx
interface MenuItem {
  // … existing fields
  requiresAuth?: boolean;
}

const menuItems: MenuItem[] = [
  { icon: …, label: "Home", route: "/", testID: "drawer.home" },                       // public
  { icon: …, label: "My Rides", route: "/rides", testID: "drawer.rides", requiresAuth: true },
  { icon: …, label: "Wallet", route: "/wallet", testID: "drawer.wallet", requiresAuth: true },
  { icon: …, label: "Post a Ride", route: "/post-ride", testID: "drawer.post", mode: "driver", requiresAuth: true },
  { icon: …, label: "Rent a Car", route: "/rental", testID: "drawer.rental", mode: "passenger" },     // browse OK as guest
  { icon: …, label: "Hire a Driver", route: "/chauffeur", testID: "drawer.chauffeur", mode: "passenger" },
  { icon: …, label: "Chat", route: "/chat", testID: "drawer.chat", requiresAuth: true },
  { icon: …, label: "Profile", route: "/profile", testID: "drawer.profile", requiresAuth: true },
];
```

Update the per-item `onPress`:

```tsx
onPress={() => {
  const go = () => navigate(item.route);
  if (item.requiresAuth) {
    requireAuth(go, { reason: `Sign in to view ${item.label.toLowerCase()}` });
  } else {
    go();
  }
}}
```

- [ ] **Step 2: Hide mode toggle when guest**

Wrap the existing footer mode toggle:

```tsx
{isAuthenticated && (
  <View style={s.footer}>
    {/* existing modeCaption + modeToggle */}
  </View>
)}
```

When a guest opens the drawer, the footer disappears entirely (or render a Sign-up CTA in its place — keep it simple and just hide for MVP).

- [ ] **Step 3: Failing test**

```tsx
// mobile/src/components/__tests__/DrawerContent.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DrawerContent } from "../DrawerContent";

const openSheet = jest.fn();
const navigatePush = jest.fn();
let authState = { isAuthenticated: false, user: null };

jest.mock("@/providers/AuthProvider", () => ({ useAuthContext: () => authState }));
jest.mock("@/providers/AuthGateProvider", () => ({ useAuthGate: () => ({ openSheet }) }));
jest.mock("@/providers/ModeProvider", () => ({ useMode: () => ({ mode: "passenger", isDriverMode: false, setMode: jest.fn() }) }));
jest.mock("@/providers/ThemeProvider", () => ({ useTheme: () => ({ colors: { background: "#fff", text: { primary: "#000", secondary: "#666", tertiary: "#999", inverse: "#fff" }, primary: "#000", primaryLight: "#eee", border: "#ddd" } }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: navigatePush }), usePathname: () => "/" }));

const props = { navigation: { closeDrawer: jest.fn() }, state: {}, descriptors: {} } as any;

describe("DrawerContent (guest)", () => {
  beforeEach(() => { jest.clearAllMocks(); authState = { isAuthenticated: false, user: null }; });

  it("opens auth gate when tapping a requiresAuth item", () => {
    const { getByTestId } = render(<DrawerContent {...props} />);
    fireEvent.press(getByTestId("drawer.wallet"));
    expect(openSheet).toHaveBeenCalled();
    expect(navigatePush).not.toHaveBeenCalled();
  });

  it("navigates straight for public items", () => {
    const { getByTestId } = render(<DrawerContent {...props} />);
    fireEvent.press(getByTestId("drawer.rental"));
    expect(navigatePush).toHaveBeenCalledWith("/rental");
    expect(openSheet).not.toHaveBeenCalled();
  });

  it("hides mode toggle for guest", () => {
    const { queryByTestId } = render(<DrawerContent {...props} />);
    expect(queryByTestId("drawer.modeToggle")).toBeNull();
  });
});

describe("DrawerContent (authed)", () => {
  beforeEach(() => { jest.clearAllMocks(); authState = { isAuthenticated: true, user: { isDriverOnboarded: true } } as any; });

  it("navigates straight for any item", () => {
    const { getByTestId } = render(<DrawerContent {...props} />);
    fireEvent.press(getByTestId("drawer.wallet"));
    expect(navigatePush).toHaveBeenCalledWith("/wallet");
  });

  it("shows mode toggle for authed user", () => {
    const { getByTestId } = render(<DrawerContent {...props} />);
    expect(getByTestId("drawer.modeToggle")).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run, expect PASS**

Run: `cd mobile && npx jest src/components/__tests__/DrawerContent.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/DrawerContent.tsx \
        mobile/src/components/__tests__/DrawerContent.test.tsx
git commit -m "feat(mobile): gate auth-required drawer items behind requireAuth; hide mode toggle for guests"
```

---

## Phase E — Wire gated CTAs across feature screens

The pattern repeats: at each gated CTA call site, replace the bare `onPress` with `() => requireAuth(() => doAction(...), { reason })`. The next three tasks split the call sites by area to keep commits reviewable.

### Task 15: Wire requireAuth on ride-request, bidding, and DriverHome CTAs

**Files (verify exact paths during implementation):**
- Modify: `mobile/src/app/(drawer)/_components/DriverHome.tsx`
- Modify: `mobile/src/app/(drawer)/_components/FocusedRideRequestSheet.tsx`
- Modify: `mobile/src/components/CounterOfferSheet.tsx`
- Modify: `mobile/src/components/HomeBottomSheet.tsx` (the passenger ride-request submit button)
- Modify: any "Post a P2P ride" CTA in `mobile/src/app/post-ride/index.tsx`

- [ ] **Step 1: Wrap each CTA's onPress in `requireAuth`**

For every callsite below, follow the same pattern. Example (passenger book button in `HomeBottomSheet`):

```tsx
import { useRequireAuth } from "@/hooks/useRequireAuth";

const requireAuth = useRequireAuth();

<Button
  title="Confirm ride"
  testID="home.confirmRideButton"
  onPress={() => requireAuth(() => submitRideRequest(payload), { reason: "Sign in to book your ride" })}
/>
```

Repeat for:
- DriverHome **GO ONLINE / GO OFFLINE** toggle button → `reason: "Sign in to go online"`.
- FocusedRideRequestSheet **Accept** button → `reason: "Sign in to accept ride requests"`.
- FocusedRideRequestSheet **Counter-offer** open → wrap the bottom-sheet open call, not the submit-inside-sheet (you only want one prompt).
- CounterOfferSheet **Submit bid** button → `reason: "Sign in to submit a bid"`.
- Passenger ride-request screen **Accept this offer** button (where passenger picks a bid) → `reason: "Sign in to book"`.
- `post-ride` screen **Post ride** submit → `reason: "Sign in to post a ride"`.

- [ ] **Step 2: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke**

As a guest, open the app → tap Confirm ride from home → expect sheet. Sign up. Re-tap Confirm ride → expect normal submission.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(drawer\)/_components/DriverHome.tsx \
        mobile/src/app/\(drawer\)/_components/FocusedRideRequestSheet.tsx \
        mobile/src/components/CounterOfferSheet.tsx \
        mobile/src/components/HomeBottomSheet.tsx \
        mobile/src/app/post-ride/index.tsx
git commit -m "feat(mobile): gate ride-request, bidding, and DriverHome CTAs behind requireAuth"
```

---

### Task 16: Wire requireAuth on rental, chauffeur, and bus booking CTAs

**Files (verify exact paths):**
- Modify: `mobile/src/app/rental/[id].tsx` — Book button
- Modify: `mobile/src/components/RentalBookingModal.tsx` — confirm submission
- Modify: `mobile/src/app/chauffeur/[id].tsx` — Hire button
- Modify: `mobile/src/app/chauffeur/service/[id].tsx` — any actions
- Modify: `mobile/src/app/ride/[id]/index.tsx` — seat-book CTA for bus rides

- [ ] **Step 1: Wrap each CTA**

Same pattern as Task 15. For each:

```tsx
const requireAuth = useRequireAuth();

<Button
  title="Book this car"
  testID="rental.bookButton"
  onPress={() => requireAuth(() => openBookingModal(), { reason: "Sign in to book this rental" })}
/>
```

CTAs in scope:
- Rental detail **Book** → `reason: "Sign in to book this rental"`.
- RentalBookingModal **Confirm** → wrap the confirm; or simpler, ensure the open of the modal goes through `requireAuth` so the unauthenticated user never reaches it.
- Chauffeur detail **Hire** → `reason: "Sign in to hire a chauffeur"`.
- Chauffeur service **Cancel / Confirm** actions if shown to guests → also gated.
- Bus seat picker **Continue / Pay / Reserve** → `reason: "Sign in to reserve a seat"`.

- [ ] **Step 2: Type-check + smoke**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/rental/\[id\].tsx \
        mobile/src/components/RentalBookingModal.tsx \
        mobile/src/app/chauffeur/\[id\].tsx \
        mobile/src/app/chauffeur/service/\[id\].tsx \
        mobile/src/app/ride/\[id\]/index.tsx
git commit -m "feat(mobile): gate rental, chauffeur, and bus booking CTAs behind requireAuth"
```

---

### Task 17: Wire requireAuth on vehicle add, wallet, chat, and remaining CTAs

**Files (verify exact paths):**
- Modify: `mobile/src/app/vehicle/add.tsx` — Save / Submit button
- Modify: `mobile/src/app/vehicle/index.tsx` — Add new vehicle button
- Modify: `mobile/src/app/(drawer)/wallet.tsx` — Top up button
- Modify: `mobile/src/app/chat/[threadId].tsx` — Send message button
- Modify: any other gated CTA found during implementation (per the §3.2 callsite list in the spec)

- [ ] **Step 1: Wrap each CTA**

Same pattern. The drawer items already gate at the menu level (Task 14), so direct-link arrivals are the remaining gap.

Examples:
- Vehicle add **Save** → `reason: "Sign in to add a vehicle"`.
- Wallet **Top up** → `reason: "Sign in to manage your wallet"`. (If the screen itself is unreachable for guests via the drawer, still gate the button — deep-link arrivals can land here.)
- Chat thread **Send** → `reason: "Sign in to chat"`.

- [ ] **Step 2: Walk every detail screen in (drawer) and any direct-link route**

Open each `mobile/src/app/**/*.tsx`. If you see an `onPress` that triggers a server-mutating call or a navigation to an authed-only route, wrap it. Add a `// auth-gated` comment so future readers know.

- [ ] **Step 3: Type-check + smoke**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/vehicle/add.tsx \
        mobile/src/app/vehicle/index.tsx \
        mobile/src/app/\(drawer\)/wallet.tsx \
        mobile/src/app/chat/\[threadId\].tsx
git commit -m "feat(mobile): gate vehicle add, wallet, chat, and remaining auth CTAs"
```

---

## Phase F — End-to-end verification

### Task 18: Maestro E2E flow

**Files:**
- Create: `mobile/.maestro/guest-browse-and-auth-prompt.yaml`

- [ ] **Step 1: Write the flow**

```yaml
# mobile/.maestro/guest-browse-and-auth-prompt.yaml
appId: com.yourdrive.app
---
- clearState
- launchApp
- assertVisible:
    id: "welcome.actions"
- tapOn:
    id: "welcome.guestButton"
- assertVisible:
    id: "home.screen"

# Browse the rental list as a guest
- tapOn:
    id: "home.menuButton"
- tapOn:
    id: "drawer.rental"
- assertVisible: "Rent a Car"

# Tap a rental detail (assumes seed data exists)
- tapOn:
    index: 0
    id: "rental.listItem"
- assertVisible:
    id: "rental.bookButton"

# Tap Book → expect auth gate sheet
- tapOn:
    id: "rental.bookButton"
- assertVisible:
    id: "authGate.sheet"

# Sign up and come back
- tapOn:
    id: "authGate.signUp"
- inputText:
    id: "register.phoneInput"
    text: "+250788000999"
# (rest of the register flow steps depend on existing Maestro patterns;
#  reuse mobile/.maestro/register-happy-path.yaml as a template if present)
- assertVisible:
    id: "rental.bookButton"        # back on the same screen, signed in
- tapOn:
    id: "rental.bookButton"
- assertVisible:
    id: "rental.bookingModal"      # booking proceeds
```

(Step IDs reference `testID` attributes added in earlier tasks. If a step's `id` doesn't exist yet in the codebase, add the `testID` in the corresponding screen file as part of this task.)

- [ ] **Step 2: Run the flow against a local Expo dev build**

Run:
```bash
cd mobile
maestro test .maestro/guest-browse-and-auth-prompt.yaml
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/.maestro/guest-browse-and-auth-prompt.yaml
git commit -m "test(mobile): Maestro E2E for guest browse + auth-gate flow"
```

---

## Phase G — Documentation

### Task 19: Update gap analysis and implementation tracker

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md` — §9 status flips
- Modify: `docs/superpowers/tracking/implementation-status.md` — add slice row + completion note

- [ ] **Step 1: Flip §9 statuses**

In `2026-04-16-feature-gap-analysis.md` §9 table, change:
- "Public browse / no auth gate" → **Built**, with file refs to the new public controllers + the dropped redirect.
- "First-launch 'Register now or Skip' splash" → **Built**, file ref `mobile/src/app/(auth)/welcome.tsx`.
- "Just-in-time auth prompts at gated CTAs" → **Built**, file refs `mobile/src/providers/AuthGateProvider.tsx`, `useRequireAuth.ts`.

Update the §8.3 completion estimate to note that §9 closure removes the remaining `intended-flow` residual.

- [ ] **Step 2: Add slice row to tracker**

Edit `docs/superpowers/tracking/implementation-status.md`. Add a new row to the Slice index:

```markdown
| 13 | Guest browse + just-in-time auth | M1 | **Done** | [spec](../specs/2026-06-02-guest-browse-and-just-in-time-auth-design.md) | [plan](../plans/2026-06-02-guest-browse-and-just-in-time-auth.md) | — |
```

(Slice number depends on what's already there — pick the next free number.)

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-16-feature-gap-analysis.md \
        docs/superpowers/tracking/implementation-status.md
git commit -m "docs: mark §9 guest-browse work Built; add slice 13 to tracker"
```

---

## Verification before merge

Run the full server + mobile test suites end-to-end before opening the PR:

- [ ] `cd server && npx jest` — all suites pass
- [ ] `cd server && npx tsc --noEmit` — clean
- [ ] `cd mobile && npx jest` — all suites pass
- [ ] `cd mobile && npx tsc --noEmit` — clean
- [ ] `cd mobile && maestro test .maestro/guest-browse-and-auth-prompt.yaml` — pass
- [ ] Manual smoke on a fresh-install device: welcome → guest → browse → gated CTA → sheet → sign up → return → CTA works.
