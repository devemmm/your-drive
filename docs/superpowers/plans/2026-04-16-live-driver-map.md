# Live Driver Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded driver markers on the customer home map with live, polled driver locations. Drivers broadcast their position every 10s while `isAvailableForRideRequest` is true and the app is in the foreground; customers see them within 10s.

**Architecture:** HTTP polling for transport, a dedicated `DriverPresence` 1-1 table off `User` for storage, three REST endpoints (driver heartbeat, driver offline, customer nearby query), React Query `refetchInterval` on both sides. Hashed opaque driver IDs prevent cross-session tracking.

**Tech Stack:** Express 5 + Prisma 5 + PostgreSQL on the backend; Expo SDK 54 + React Native + TanStack React Query + react-native-maps on mobile; existing JWT auth (`isAuthenticated` middleware), `express-validator`, `catchAsync`, `AppError` error plumbing; `cron` package for the cleanup job.

**Related documents:**
- Spec: `docs/superpowers/specs/2026-04-16-live-driver-map-design.md`
- Testing reality: no `.test.ts` files exist in `server/src/` today. The plan adds one unit test for the pure hash-token utility (safe to run without DB) and relies on the spec's mandated manual two-device verification for the rest. Do not invent integration-test infrastructure just for this feature.

---

## File structure

### Server — create
- `server/src/utils/driverPresenceToken.ts` — HMAC-SHA256 hash of `userId` with a daily-rotating secret; pure function
- `server/src/utils/driverPresenceToken.test.ts` — jest unit test for the above
- `server/src/utils/simpleRateLimiter.ts` — tiny in-memory fixed-window rate limiter
- `server/src/services/driverPresence.service.ts` — upsert, active-trip check, nearby query, cleanup cron init
- `server/src/middlewares/validators/driverPresence.validator.ts` — request-body/query validators
- `server/src/controllers/driverPresence.controller.ts` — three handlers
- `server/src/routes/driverPresence.routes.ts` — three routes

### Server — modify
- `server/prisma/schema.prisma` — add `DriverPresence` model + back-relation on `Vehicle`
- `server/src/routes/index.ts` — mount new routes under `/driver-presence` and `/drivers`
- `server/src/config/cron.ts` — call `initializeDriverPresenceCronJobs()`

### Mobile — create
- `mobile/src/hooks/useDriverPresenceHeartbeat.ts` — driver-side 10s heartbeat
- `mobile/src/hooks/useNearbyDrivers.ts` — customer-side polling query

### Mobile — modify
- `mobile/src/lib/constants.ts` — add `queryKeys.drivers.nearby` and a `CURRENT_VEHICLE_ID` storage key
- `mobile/src/app/(drawer)/_layout.tsx` — mount a `DriverPresencePoller` null component next to `NotificationsPoller`
- `mobile/src/app/(drawer)/index.tsx` — delete `NEARBY_DRIVERS` constant, use `useNearbyDrivers(bounds)` instead
- `mobile/src/app/(drawer)/profile.tsx` — permission gate + vehicle picker on availability toggle

---

## Task 1 — Schema migration

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_add_driver_presence/migration.sql` (Prisma will generate this)

- [ ] **Step 1: Add the `DriverPresence` model to `schema.prisma`**

Find the end of the `Vehicle` model (around line ~365 — use `grep -n "^model Vehicle" server/prisma/schema.prisma` to locate it) and append the back-relation line inside the Vehicle model:

```prisma
  presenceAsCurrentVehicle DriverPresence? @relation("DriverPresenceVehicle")
```

Append the new model at the end of the file (before any trailing comments, but after the last existing model):

```prisma
model DriverPresence {
  userId           Int      @id
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentVehicleId Int?
  currentVehicle   Vehicle? @relation("DriverPresenceVehicle", fields: [currentVehicleId], references: [id])
  latitude         Float
  longitude        Float
  accuracy         Float?
  updatedAt        DateTime @updatedAt
  createdAt        DateTime @default(now())

  @@index([updatedAt])
  @@index([latitude, longitude])
}
```

- [ ] **Step 2: Generate and apply the migration**

Run from `server/`:

```bash
cd server
npm run migrate -- --name add_driver_presence
```

Expected: Prisma creates `server/prisma/migrations/<timestamp>_add_driver_presence/migration.sql`, applies it to the local database, and regenerates the client. No errors.

- [ ] **Step 3: Verify the generated Prisma client compiles**

Run:

```bash
cd server
npm run type-check
```

Expected: Exit code 0. If it fails, the back-relation on `Vehicle` is malformed — re-check the relation name matches on both sides (`"DriverPresenceVehicle"`).

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add DriverPresence model"
```

---

## Task 2 — Hash-token utility + unit test

**Files:**
- Create: `server/src/utils/driverPresenceToken.ts`
- Create: `server/src/utils/driverPresenceToken.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/utils/driverPresenceToken.test.ts`:

```ts
import {
  hashDriverToken,
  currentRotationKey,
} from "./driverPresenceToken";

describe("driverPresenceToken", () => {
  const SECRET = "test-secret";

  it("produces a stable token for the same user + rotation key", () => {
    const a = hashDriverToken(42, "2026-04-16", SECRET);
    const b = hashDriverToken(42, "2026-04-16", SECRET);
    expect(a).toBe(b);
  });

  it("produces different tokens for different users on the same day", () => {
    const a = hashDriverToken(42, "2026-04-16", SECRET);
    const b = hashDriverToken(43, "2026-04-16", SECRET);
    expect(a).not.toBe(b);
  });

  it("produces different tokens for the same user on different days", () => {
    const a = hashDriverToken(42, "2026-04-16", SECRET);
    const b = hashDriverToken(42, "2026-04-17", SECRET);
    expect(a).not.toBe(b);
  });

  it("does not reveal the raw user id", () => {
    const token = hashDriverToken(42, "2026-04-16", SECRET);
    expect(token).not.toContain("42");
    expect(token.length).toBeGreaterThan(20);
  });

  it("currentRotationKey returns YYYY-MM-DD in UTC", () => {
    const key = currentRotationKey(new Date("2026-04-16T23:30:00Z"));
    expect(key).toBe("2026-04-16");
    const nextDay = currentRotationKey(new Date("2026-04-17T00:01:00Z"));
    expect(nextDay).toBe("2026-04-17");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd server
npx jest src/utils/driverPresenceToken.test.ts
```

Expected: FAIL with "Cannot find module './driverPresenceToken'".

- [ ] **Step 3: Implement the utility**

Create `server/src/utils/driverPresenceToken.ts`:

```ts
import crypto from "crypto";

const DEFAULT_SECRET =
  process.env.DRIVER_PRESENCE_TOKEN_SECRET ??
  process.env.SECRET_KEY ??
  "dev-driver-presence-secret";

export function currentRotationKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function hashDriverToken(
  userId: number,
  rotationKey: string = currentRotationKey(),
  secret: string = DEFAULT_SECRET
): string {
  return crypto
    .createHmac("sha256", `${secret}:${rotationKey}`)
    .update(String(userId))
    .digest("base64url");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
cd server
npx jest src/utils/driverPresenceToken.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/driverPresenceToken.ts server/src/utils/driverPresenceToken.test.ts
git commit -m "feat(server): add driver presence hash-token util"
```

---

## Task 3 — Simple rate limiter utility

**Files:**
- Create: `server/src/utils/simpleRateLimiter.ts`

A tiny fixed-window in-memory rate limiter is enough for MVP. No `express-rate-limit` dependency — keeps the scope contained. We'll use it for both presence endpoints.

- [ ] **Step 1: Write the utility**

Create `server/src/utils/simpleRateLimiter.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";

type Bucket = { count: number; windowStart: number };

export function createUserRateLimiter(opts: {
  max: number;         // max requests per window
  windowMs: number;    // window size in milliseconds
  key: string;         // unique identifier for this limiter (used for separate buckets per endpoint)
}) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return next();
    const bucketKey = `${opts.key}:${userId}`;
    const now = Date.now();
    const existing = buckets.get(bucketKey);
    if (!existing || now - existing.windowStart >= opts.windowMs) {
      buckets.set(bucketKey, { count: 1, windowStart: now });
      return next();
    }
    existing.count += 1;
    if (existing.count > opts.max) {
      return next(AppError("Too many requests, please slow down", 429));
    }
    next();
  };
}
```

- [ ] **Step 2: Verify it type-checks**

Run:

```bash
cd server
npm run type-check
```

Expected: Exit code 0.

- [ ] **Step 3: Commit**

```bash
git add server/src/utils/simpleRateLimiter.ts
git commit -m "feat(server): add simple in-memory user rate limiter"
```

---

## Task 4 — Driver presence service

**Files:**
- Create: `server/src/services/driverPresence.service.ts`

This service contains all the business logic so controllers stay thin: upsert, offline, active-trip check, nearby query, and cron init.

- [ ] **Step 1: Write the service**

Create `server/src/services/driverPresence.service.ts`:

```ts
import { prisma } from "../config/database";
import { CronJob } from "cron";
import {
  hashDriverToken,
  currentRotationKey,
} from "../utils/driverPresenceToken";
import { logger } from "../utils/logger";
import {
  RideStatus,
  D2DBookingRequestStatus,
  ChauffeurStatus,
  VehicleCategory,
  Prisma,
} from "@prisma/client";

const FRESHNESS_SECONDS = 30;
const MAX_NEARBY_RESULTS = 50;
const MAX_BBOX_DEGREES = 0.2; // ~22km at the equator; good enough for the clamp

export type NearbyDriver = {
  id: string;
  latitude: number;
  longitude: number;
  vehicleCategory: VehicleCategory;
};

export class DriverPresenceService {
  /** Rounds a coordinate to 4 decimal places (~11m precision). */
  static roundCoord(n: number): number {
    return Math.round(n * 10000) / 10000;
  }

  /** True if the driver is currently on an active trip of any kind. */
  static async hasActiveTrip(userId: number): Promise<boolean> {
    const [ride, d2d, chauffeur] = await Promise.all([
      prisma.ride.findFirst({
        where: { driverId: userId, status: RideStatus.ONGOING },
        select: { id: true },
      }),
      prisma.d2DBookingRequest.findFirst({
        where: {
          ride: { driverId: userId },
          status: {
            in: [
              D2DBookingRequestStatus.ACCEPTED,
              D2DBookingRequestStatus.CONFIRMED,
            ],
          },
        },
        select: { id: true },
      }),
      prisma.chauffeurService.findFirst({
        where: {
          driverId: userId,
          status: {
            in: [ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE],
          },
        },
        select: { id: true },
      }),
    ]);
    return !!(ride || d2d || chauffeur);
  }

  /** Upserts a driver's presence row. Caller must have verified availability + active-trip + vehicle ownership. */
  static async upsertPresence(params: {
    userId: number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    currentVehicleId?: number;
  }) {
    const lat = DriverPresenceService.roundCoord(params.latitude);
    const lng = DriverPresenceService.roundCoord(params.longitude);
    return prisma.driverPresence.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        latitude: lat,
        longitude: lng,
        accuracy: params.accuracy,
        currentVehicleId: params.currentVehicleId,
      },
      update: {
        latitude: lat,
        longitude: lng,
        accuracy: params.accuracy,
        currentVehicleId: params.currentVehicleId,
      },
    });
  }

  /** Removes the presence row if any. Idempotent. */
  static async markOffline(userId: number) {
    await prisma.driverPresence.deleteMany({ where: { userId } });
  }

  /** Returns up to MAX_NEARBY_RESULTS drivers inside the bounding box. Hashes IDs. */
  static async nearby(params: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
  }): Promise<NearbyDriver[]> {
    // Clamp the bbox so a zoomed-out map can't ask for the whole country.
    let { swLat, swLng, neLat, neLng } = params;
    if (neLat - swLat > MAX_BBOX_DEGREES) {
      const mid = (neLat + swLat) / 2;
      swLat = mid - MAX_BBOX_DEGREES / 2;
      neLat = mid + MAX_BBOX_DEGREES / 2;
    }
    if (neLng - swLng > MAX_BBOX_DEGREES) {
      const mid = (neLng + swLng) / 2;
      swLng = mid - MAX_BBOX_DEGREES / 2;
      neLng = mid + MAX_BBOX_DEGREES / 2;
    }

    const freshAfter = new Date(Date.now() - FRESHNESS_SECONDS * 1000);

    const rows = await prisma.driverPresence.findMany({
      where: {
        updatedAt: { gt: freshAfter },
        latitude: { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
        user: { isAvailableForRideRequest: true },
      },
      include: {
        user: { select: { id: true } },
        currentVehicle: { select: { category: true } },
      },
      take: MAX_NEARBY_RESULTS * 2, // over-fetch so we can filter active-trip then trim
    });

    if (rows.length === 0) return [];

    // Filter out drivers who have an active trip.
    const activeTripFlags = await Promise.all(
      rows.map((r) => DriverPresenceService.hasActiveTrip(r.userId))
    );
    const available = rows.filter((_, i) => !activeTripFlags[i]);

    const rotation = currentRotationKey();
    return available.slice(0, MAX_NEARBY_RESULTS).map<NearbyDriver>((r) => ({
      id: hashDriverToken(r.userId, rotation),
      latitude: r.latitude,
      longitude: r.longitude,
      vehicleCategory: r.currentVehicle?.category ?? VehicleCategory.CAR,
    }));
  }

  /** Deletes stale rows. Safe to call often. */
  static async cleanupStaleRows(): Promise<number> {
    const cutoff = new Date(Date.now() - FRESHNESS_SECONDS * 1000);
    const res = await prisma.driverPresence.deleteMany({
      where: { updatedAt: { lt: cutoff } },
    });
    return res.count;
  }
}

/** Registered by the central cron bootstrap. Runs every 60s. */
export function initializeDriverPresenceCronJobs() {
  const job = new CronJob("*/60 * * * * *", async () => {
    try {
      const n = await DriverPresenceService.cleanupStaleRows();
      if (n > 0) logger.debug(`[driver-presence] cleaned up ${n} stale rows`);
    } catch (err) {
      logger.error("[driver-presence] cleanup failed", err as Prisma.PrismaClientKnownRequestError);
    }
  });
  job.start();
  return job;
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
cd server
npm run type-check
```

Expected: Exit code 0. If Prisma complains that `driverPresence` is not on the client, run `npx prisma generate` and retry.

If any of the enum values (`ONGOING`, `POSTED/ACCEPTED/CONFIRMED`, `ACCEPTED/ACTIVE`) don't exist, check `server/prisma/schema.prisma` — the plan relies on `RideStatus`, `D2DBookingRequestStatus`, and `ChauffeurStatus` as they are at spec time.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/driverPresence.service.ts
git commit -m "feat(server): add driver presence service"
```

---

## Task 5 — Validators

**Files:**
- Create: `server/src/middlewares/validators/driverPresence.validator.ts`

- [ ] **Step 1: Write the validators**

Create `server/src/middlewares/validators/driverPresence.validator.ts`:

```ts
import { body, query } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const upsertPresenceValidator = [
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage(validationMsg("validation.latitude_invalid")),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage(validationMsg("validation.longitude_invalid")),
  body("accuracy")
    .optional()
    .isFloat({ min: 0, max: 100000 })
    .withMessage(validationMsg("validation.accuracy_invalid")),
  body("currentVehicleId")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.currentVehicleId_invalid")),
];

export const nearbyValidator = [
  query("swLat")
    .isFloat({ min: -90, max: 90 })
    .withMessage(validationMsg("validation.swLat_invalid")),
  query("swLng")
    .isFloat({ min: -180, max: 180 })
    .withMessage(validationMsg("validation.swLng_invalid")),
  query("neLat")
    .isFloat({ min: -90, max: 90 })
    .withMessage(validationMsg("validation.neLat_invalid")),
  query("neLng")
    .isFloat({ min: -180, max: 180 })
    .withMessage(validationMsg("validation.neLng_invalid")),
];
```

- [ ] **Step 2: Type-check**

Run:

```bash
cd server
npm run type-check
```

Expected: Exit code 0. The `validationMsg` helper will accept any string key — no need to add translation entries for this feature; the English fallback is the key itself.

- [ ] **Step 3: Commit**

```bash
git add server/src/middlewares/validators/driverPresence.validator.ts
git commit -m "feat(server): add driver presence request validators"
```

---

## Task 6 — Controller

**Files:**
- Create: `server/src/controllers/driverPresence.controller.ts`

- [ ] **Step 1: Write the controller**

Create `server/src/controllers/driverPresence.controller.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/database";
import { DriverPresenceService } from "../services/driverPresence.service";

export class DriverPresenceController {
  /** POST /api/v1/driver-presence */
  static upsert = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { latitude, longitude, accuracy, currentVehicleId } =
        matchedData<{
          latitude: number;
          longitude: number;
          accuracy?: number;
          currentVehicleId?: number;
        }>(req);

      const user = req.user!;

      if (!user.isAvailableForRideRequest) {
        return next(AppError("You are not currently available for rides", 403));
      }

      if (currentVehicleId !== undefined) {
        const owned = await prisma.vehicle.findFirst({
          where: { id: currentVehicleId, driverId: user.id },
          select: { id: true },
        });
        if (!owned) {
          return next(AppError("Vehicle not found or not yours", 400));
        }
      }

      const onTrip = await DriverPresenceService.hasActiveTrip(user.id);
      if (onTrip) {
        return next(
          AppError("You are on an active trip", 403, { code: "ON_ACTIVE_TRIP" })
        );
      }

      await DriverPresenceService.upsertPresence({
        userId: user.id,
        latitude,
        longitude,
        accuracy,
        currentVehicleId,
      });

      res.json({ ok: true, expiresInSec: 30 });
    }
  );

  /** POST /api/v1/driver-presence/offline */
  static offline = catchAsync(async (req: Request, res: Response) => {
    await DriverPresenceService.markOffline(req.user!.id);
    res.json({ ok: true });
  });

  /** GET /api/v1/drivers/nearby?swLat=&swLng=&neLat=&neLng= */
  static nearby = catchAsync(async (req: Request, res: Response) => {
    const { swLat, swLng, neLat, neLng } = matchedData<{
      swLat: number;
      swLng: number;
      neLat: number;
      neLng: number;
    }>(req);

    const drivers = await DriverPresenceService.nearby({
      swLat,
      swLng,
      neLat,
      neLng,
    });
    res.json({ drivers, fetchedAt: new Date().toISOString() });
  });
}
```

Note: `AppError` in this codebase is called as `AppError(msg, status, extra?)`. If the signature does not accept a third metadata arg, drop it from `ON_ACTIVE_TRIP` — the status code 403 alone is enough for the mobile client to branch on.

- [ ] **Step 2: Verify AppError signature**

Run:

```bash
cd server
cat src/utils/AppError.ts
```

If `AppError` only accepts two args, remove the third `{ code: "ON_ACTIVE_TRIP" }` argument above. In the mobile hook we will detect the case by status 403 + URL, which is sufficient.

- [ ] **Step 3: Type-check**

Run:

```bash
cd server
npm run type-check
```

Expected: Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/driverPresence.controller.ts
git commit -m "feat(server): add driver presence controller"
```

---

## Task 7 — Routes + mount + cron wiring

**Files:**
- Create: `server/src/routes/driverPresence.routes.ts`
- Modify: `server/src/routes/index.ts`
- Modify: `server/src/config/cron.ts`

- [ ] **Step 1: Write the routes file**

Create `server/src/routes/driverPresence.routes.ts`:

```ts
import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { DriverPresenceController } from "../controllers/driverPresence.controller";
import {
  upsertPresenceValidator,
  nearbyValidator,
} from "../middlewares/validators/driverPresence.validator";
import { createUserRateLimiter } from "../utils/simpleRateLimiter";

const presenceLimiter = createUserRateLimiter({
  max: 30,
  windowMs: 60_000,
  key: "driver-presence",
});
const nearbyLimiter = createUserRateLimiter({
  max: 30,
  windowMs: 60_000,
  key: "drivers-nearby",
});

export const driverPresenceRouter = Router();
driverPresenceRouter
  .post(
    "/",
    presenceLimiter,
    upsertPresenceValidator,
    validateRequestBody,
    DriverPresenceController.upsert
  )
  .post("/offline", DriverPresenceController.offline);

export const driversRouter = Router();
driversRouter.get(
  "/nearby",
  nearbyLimiter,
  nearbyValidator,
  validateRequestBody,
  DriverPresenceController.nearby
);
```

- [ ] **Step 2: Mount the routes in `routes/index.ts`**

Open `server/src/routes/index.ts`. Add imports at the top alongside the others:

```ts
import {
  driverPresenceRouter,
  driversRouter,
} from "./driverPresence.routes";
```

After the existing `ride-requests` line (around line 61), add:

```ts
router.use("/driver-presence", isAuthenticated, languagePreference, driverPresenceRouter);
router.use("/drivers", isAuthenticated, languagePreference, driversRouter);
```

- [ ] **Step 3: Wire the cron job in `config/cron.ts`**

Open `server/src/config/cron.ts`. Add the import at the top:

```ts
import { initializeDriverPresenceCronJobs } from "../services/driverPresence.service";
```

Inside the `try` block of `initializeCronJobs`, after `initializeChauffeurCronJobs();`, add:

```ts
    initializeDriverPresenceCronJobs();
```

- [ ] **Step 4: Type-check and start the server**

Run in two terminals (or check the first, then start the second):

```bash
cd server
npm run type-check
```

Expected: Exit code 0.

Then:

```bash
cd server
npm run dev
```

Expected: Server starts, logs "All cron jobs initialized successfully", no runtime errors.

- [ ] **Step 5: Smoke-test the endpoints with curl**

With the dev server running and a valid JWT in `$TOKEN`:

```bash
# Posting presence as a driver who is not available → 403
curl -i -X POST http://localhost:3003/api/v1/driver-presence \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": -1.9536, "longitude": 30.0606}'
# expect HTTP/1.1 403

# Posting presence as an available driver → 200
# (after flipping isAvailableForRideRequest on for the user)
curl -i -X POST http://localhost:3003/api/v1/driver-presence \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": -1.9536, "longitude": 30.0606}'
# expect HTTP/1.1 200, {"ok":true,"expiresInSec":30}

# Nearby query as any authenticated user → 200 with drivers array
curl -i "http://localhost:3003/api/v1/drivers/nearby?swLat=-2.00&swLng=30.00&neLat=-1.90&neLng=30.10" \
  -H "Authorization: Bearer $TOKEN"
# expect HTTP/1.1 200, payload contains the driver posted above
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/driverPresence.routes.ts server/src/routes/index.ts server/src/config/cron.ts
git commit -m "feat(server): wire driver presence routes and cleanup cron"
```

---

## Task 8 — Mobile query keys + storage key constants

**Files:**
- Modify: `mobile/src/lib/constants.ts`

- [ ] **Step 1: Add the new keys**

Open `mobile/src/lib/constants.ts`. Inside the `queryKeys` object, after the `rideRequests` block and before the closing `} as const;`, add:

```ts
  drivers: {
    nearby: (bounds: { swLat: number; swLng: number; neLat: number; neLng: number }) =>
      ["drivers", "nearby", bounds] as const,
  },
```

Inside the `STORAGE_KEYS` object, add a new line before the closing brace:

```ts
  CURRENT_VEHICLE_ID: "yourdrive_current_vehicle_id",
```

- [ ] **Step 2: Type-check mobile**

Run:

```bash
cd mobile
npx tsc --noEmit
```

Expected: Exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/constants.ts
git commit -m "feat(mobile): add driver-nearby query keys and current-vehicle storage key"
```

---

## Task 9 — Driver-side heartbeat hook

**Files:**
- Create: `mobile/src/hooks/useDriverPresenceHeartbeat.ts`

The hook runs a 10s interval while (a) the user is a driver with `isAvailableForRideRequest`, (b) the app is in the foreground, and (c) foreground location permission is granted. On unmount or enable → false it sends an `offline` beacon.

- [ ] **Step 1: Write the hook**

Create `mobile/src/hooks/useDriverPresenceHeartbeat.ts`:

```ts
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/services/api";
import { useAuthContext } from "@/providers/AuthProvider";
import { STORAGE_KEYS } from "@/lib/constants";

const HEARTBEAT_MS = 10_000;

async function postHeartbeat() {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const vehicleIdStr = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_VEHICLE_ID);
    const currentVehicleId = vehicleIdStr ? Number(vehicleIdStr) : undefined;
    await api.post("/driver-presence", {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      currentVehicleId,
    });
    return { ok: true as const };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 403) {
      // Driver is on an active trip or not available; stop the loop.
      return { ok: false as const, stopLoop: true };
    }
    return { ok: false as const, stopLoop: false };
  }
}

async function postOffline() {
  try {
    await api.post("/driver-presence/offline");
  } catch {
    // fire-and-forget
  }
}

export function useDriverPresenceHeartbeat() {
  const { user } = useAuthContext();
  const isAvailable = !!user?.isAvailableForRideRequest;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedByServerRef = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;
      if (next === "active") {
        stoppedByServerRef.current = false;
        void tick(); // resume immediately when the app comes back
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isAvailable) {
      stop(true);
      return;
    }

    let cancelled = false;

    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted" || cancelled) return;
      await tick();
      intervalRef.current = setInterval(tick, HEARTBEAT_MS);
    })();

    return () => {
      cancelled = true;
      stop(true);
    };
  }, [isAvailable]);

  async function tick() {
    if (stoppedByServerRef.current) return;
    if (appStateRef.current !== "active") return;
    if (!isAvailable) return;
    const result = await postHeartbeat();
    if (!result.ok && result.stopLoop) {
      stoppedByServerRef.current = true;
      stop(false);
    }
  }

  function stop(sendOffline: boolean) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sendOffline) void postOffline();
  }
}
```

- [ ] **Step 2: Type-check mobile**

Run:

```bash
cd mobile
npx tsc --noEmit
```

Expected: Exit code 0. If `AsyncStorage` is not already installed, check `mobile/package.json`; the project uses `expo-secure-store` and may also have `@react-native-async-storage/async-storage` via expo's inclusion list. If not installed, run `npx expo install @react-native-async-storage/async-storage` and commit the lock change in this same task.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useDriverPresenceHeartbeat.ts mobile/package.json mobile/package-lock.json 2>/dev/null
git commit -m "feat(mobile): add driver presence heartbeat hook"
```

---

## Task 10 — Customer-side nearby-drivers hook

**Files:**
- Create: `mobile/src/hooks/useNearbyDrivers.ts`

- [ ] **Step 1: Write the hook**

Create `mobile/src/hooks/useNearbyDrivers.ts`:

```ts
import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKeys } from "@/lib/constants";

export interface NearbyDriver {
  id: string;
  latitude: number;
  longitude: number;
  vehicleCategory: "CAR" | "MOTORBIKE";
}

interface NearbyResponse {
  drivers: NearbyDriver[];
  fetchedAt: string;
}

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

function useForegroundActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) =>
      setActive(next === "active")
    );
    return () => sub.remove();
  }, []);
  return active;
}

export function useNearbyDrivers(bounds: MapBounds | null) {
  const isActive = useForegroundActive();
  return useQuery({
    queryKey: bounds
      ? queryKeys.drivers.nearby(bounds)
      : ["drivers", "nearby", "none"],
    queryFn: () =>
      api
        .get<NearbyResponse>("/drivers/nearby", { params: bounds! })
        .then((r) => r.data),
    enabled: !!bounds && isActive,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
cd mobile
npx tsc --noEmit
```

Expected: Exit code 0. If `api.get` returns `AxiosResponse<T>` rather than a wrapped object, match the pattern already used in `useRideRequests.ts` (`.then((r) => r.data)`).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useNearbyDrivers.ts
git commit -m "feat(mobile): add nearby drivers polling hook"
```

---

## Task 11 — Mount the heartbeat in the drawer layout

**Files:**
- Modify: `mobile/src/app/(drawer)/_layout.tsx`

The existing layout already mounts `NotificationsPoller` as a null component. We do the same thing for presence.

- [ ] **Step 1: Add the poller component**

Open `mobile/src/app/(drawer)/_layout.tsx`. Add an import at the top, next to `useNotifications`:

```ts
import { useDriverPresenceHeartbeat } from "@/hooks/useDriverPresenceHeartbeat";
```

Add a second null-component under the existing `NotificationsPoller`:

```tsx
function DriverPresencePoller() {
  useDriverPresenceHeartbeat();
  return null;
}
```

In the JSX returned by `DrawerLayout`, add `<DriverPresencePoller />` next to `<NotificationsPoller />`:

```tsx
  return (
    <>
      <NotificationsPoller />
      <DriverPresencePoller />
      <Drawer
```

- [ ] **Step 2: Type-check**

Run:

```bash
cd mobile
npx tsc --noEmit
```

Expected: Exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/(drawer)/_layout.tsx
git commit -m "feat(mobile): mount driver presence heartbeat in drawer layout"
```

---

## Task 12 — Replace hardcoded markers on the home map

**Files:**
- Modify: `mobile/src/app/(drawer)/index.tsx`

- [ ] **Step 1: Swap the hardcoded list for live data**

Open `mobile/src/app/(drawer)/index.tsx`. Make the following changes:

**(a)** Add imports at the top (next to the existing imports):

```ts
import { useState, useCallback } from "react";
import { useNearbyDrivers, MapBounds } from "@/hooks/useNearbyDrivers";
import type { Region } from "react-native-maps";
```

**(b)** Delete the `NEARBY_DRIVERS` constant (current lines 20–26).

**(c)** Inside `HomeScreen`, add bounds state and a region-change handler:

```ts
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const { data: nearbyData } = useNearbyDrivers(bounds);
  const nearbyDrivers = nearbyData?.drivers ?? [];

  const handleRegionChangeComplete = useCallback((region: Region) => {
    setBounds({
      swLat: region.latitude - region.latitudeDelta / 2,
      swLng: region.longitude - region.longitudeDelta / 2,
      neLat: region.latitude + region.latitudeDelta / 2,
      neLng: region.longitude + region.longitudeDelta / 2,
    });
  }, []);
```

**(d)** On the `<MapView>` element, add the handler:

```tsx
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        mapPadding={{ top: 0, right: 0, bottom: 200, left: 0 }}
      >
```

**(e)** Replace the existing markers block (the `{NEARBY_DRIVERS.map(...)}` section at current lines 87–102) with:

```tsx
        {nearbyDrivers.map((driver) => (
          <Marker
            key={driver.id}
            coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
            title={driver.vehicleCategory === "CAR" ? "Car" : "Moto"}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={s.markerIcon}>
              {driver.vehicleCategory === "CAR" ? (
                <Car size={18} color={colors.primary} />
              ) : (
                <Bike size={18} color={colors.primary} />
              )}
            </View>
          </Marker>
        ))}
```

- [ ] **Step 2: Type-check**

Run:

```bash
cd mobile
npx tsc --noEmit
```

Expected: Exit code 0.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/(drawer)/index.tsx
git commit -m "feat(mobile): use live driver presence on home map"
```

---

## Task 13 — Permission gate + vehicle picker on availability toggle

**Files:**
- Modify: `mobile/src/app/(drawer)/profile.tsx`

We want: if the driver flips "Available for ride requests" ON without location permission, prompt; if denied, don't flip. If the driver has more than one vehicle, ask which one to go online with.

- [ ] **Step 1: Modify the toggle handler**

Open `mobile/src/app/(drawer)/profile.tsx`. Add imports at the top:

```ts
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { useMyVehicles } from "@/hooks/useVehicles";
```

Inside `ProfileScreen`, before the existing `handleToggleAvailability`:

```ts
  const { data: myVehicles } = useMyVehicles();

  async function ensureLocationPermission(): Promise<boolean> {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.status === "granted") return true;
    const requested = await Location.requestForegroundPermissionsAsync();
    return requested.status === "granted";
  }

  async function pickVehicleIfNeeded(): Promise<boolean> {
    const vehicles = myVehicles ?? [];
    if (vehicles.length === 0) {
      Alert.alert(
        "Add a vehicle first",
        "You need at least one vehicle on your profile before you can go online."
      );
      return false;
    }
    if (vehicles.length === 1) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_VEHICLE_ID,
        String(vehicles[0].id)
      );
      return true;
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Go online with which vehicle?",
        "Choose the vehicle you're driving right now.",
        [
          ...vehicles.map((v: any) => ({
            text: `${v.make} ${v.model} (${v.plateNumber})`,
            onPress: async () => {
              await AsyncStorage.setItem(
                STORAGE_KEYS.CURRENT_VEHICLE_ID,
                String(v.id)
              );
              resolve(true);
            },
          })),
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        ]
      );
    });
  }
```

Replace the body of `handleToggleAvailability` with:

```ts
  const handleToggleAvailability = useCallback(
    async (next: boolean) => {
      try {
        if (next) {
          const ok = await ensureLocationPermission();
          if (!ok) {
            Alert.alert(
              "Location permission required",
              "To go online you need to grant location access to this app."
            );
            return;
          }
          const picked = await pickVehicleIfNeeded();
          if (!picked) return;
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_VEHICLE_ID);
        }
        await toggleAvailability.mutateAsync(next);
      } catch (err: any) {
        Alert.alert(
          "Couldn't update availability",
          err?.response?.data?.message || "Please try again."
        );
      }
    },
    [toggleAvailability, myVehicles]
  );
```

- [ ] **Step 2: Type-check**

Run:

```bash
cd mobile
npx tsc --noEmit
```

Expected: Exit code 0. If `useMyVehicles` is not exported from `@/hooks/useVehicles`, check the file and import whatever hook lists the current user's vehicles (the ride-request accept flow already uses it — `ride-request/open.tsx` imports it from the same path).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/(drawer)/profile.tsx
git commit -m "feat(mobile): gate availability toggle on location permission + vehicle picker"
```

---

## Task 14 — Manual two-device verification

**Files:** none

The spec mandates manual verification on physical devices. This task is the acceptance gate before the feature is called done.

- [ ] **Step 1: Start the backend and mobile dev server**

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd mobile
npx expo start --tunnel
```

- [ ] **Step 2: On device A (driver), sign in and prepare**

- Sign in as a driver user who has at least one `Vehicle` row (`category = CAR` or `MOTORBIKE`).
- Grant location permission when prompted.
- Flip "Available for ride requests" ON from the profile screen.
- Confirm the vehicle-picker modal appears if the driver owns >1 vehicles.

- [ ] **Step 3: On device B (customer), sign in and view the home map**

- Sign in as any non-driver user (or a different driver account).
- Open the home screen. Within 10-20 seconds, device A's car should appear at A's real location.

- [ ] **Step 4: Verify the acceptance criteria**

For each criterion below, check that it holds on the devices:

1. Driver goes online → appears on customer map within ~10s. ✓/✗
2. Driver flips OFF → disappears from customer map within ~30s. ✓/✗
3. Driver backgrounds the app → disappears within ~30s. ✓/✗
4. Driver completes a request and starts an active trip (`Ride.ONGOING`, `D2DBookingRequest` in ACCEPTED/CONFIRMED, or `ChauffeurService` in ACCEPTED/ACTIVE) → disappears from public map within ~30s. ✓/✗
5. Customer pans the map to a new area → nearby drivers refresh within one poll interval. ✓/✗
6. Airplane-mode the driver briefly → next tick recovers silently, no crash. ✓/✗
7. Deny location permission on driver → toggle cannot be flipped ON; explanatory alert shown. ✓/✗
8. `GET /api/v1/drivers/nearby` response contains only `id` (hashed), `latitude`, `longitude`, `vehicleCategory` — no `userId`, `firstName`, `lastName`, `phoneNumber`, or `plateNumber`. Verify via `curl` with a valid token.

- [ ] **Step 5: Record results**

If any criterion fails, file a follow-up and do not mark the feature done. If all pass, proceed.

- [ ] **Step 6: Commit verification notes (optional)**

If you want a record, create `docs/superpowers/plans/2026-04-16-live-driver-map-verification.md` with the criteria list + pass/fail + device models used.

---

## Self-review checklist (fill in when complete)

- [ ] Spec §3 (Decisions) — every decision row has a task that implements it (Task 1 schema, Task 4-7 server decisions, Task 9-13 mobile decisions).
- [ ] Spec §5 (Schema) — Task 1.
- [ ] Spec §6 (API contract) — Tasks 5-7.
- [ ] Spec §7 (Mobile integration) — Tasks 8-13.
- [ ] Spec §8 (Acceptance criteria) — Task 14 checks all 8.
- [ ] No "TBD"/"TODO"/"implement later" strings in the plan.
- [ ] Every code step shows complete code.
- [ ] Type and method names match across tasks (e.g., `DriverPresenceService.hasActiveTrip`, `hashDriverToken`, `createUserRateLimiter`).
