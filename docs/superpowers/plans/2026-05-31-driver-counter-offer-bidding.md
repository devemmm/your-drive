# Driver Counter-Offer Bidding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inDrive-style counter-offer bidding to ride requests. Drivers see open requests with **Accept** and **Counter-offer** buttons; counter-offers go into a live bid list on the passenger waiting screen; passenger picks one.

**Architecture:** One new `RideBid` table (PENDING / ACCEPTED / DECLINED / EXPIRED). One new column `User.lastBidPushAt` for server-side push debouncing. Extract the post-validation core of `acceptRideRequest` into a service function `createRideFromAcceptedRequest({ requestId, driverId, vehicleId, agreedFare })` so both "Accept at original fare" and "Accept this bid" go through the same code path. Four new endpoints. Driver-side new bottom sheet + waiting screen; passenger-side new bid-list section on the existing waiting screen. Reuses existing FCM pipeline and the existing 5s polling cadence — no websockets.

**Tech Stack:** TypeScript, Prisma (PostgreSQL), Express, Jest, React Native (Expo), React Query (TanStack), Zod.

**Spec:** `docs/superpowers/specs/2026-05-31-driver-counter-offer-bidding-design.md`

---

### Task 1: Prisma schema — `RideBid` model + `User.lastBidPushAt` + relations

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add the enum and model**

Locate the section of `schema.prisma` where other ride-related enums live (search for `enum RideStatus` or `enum RideRequestStatus`). Add:

```prisma
enum RideBidStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
}
```

Locate the section where other models like `RideRequest` and `RideRequestMatch` live. Add at the end:

```prisma
model RideBid {
  id              Int            @id @default(autoincrement())
  rideRequestId   Int
  driverId        Int
  vehicleId       Int
  bidAmount       Decimal        @db.Decimal(10, 2)
  status          RideBidStatus  @default(PENDING)
  createdAt       DateTime       @default(now())
  resolvedAt      DateTime?

  rideRequest     RideRequest    @relation(fields: [rideRequestId], references: [id], onDelete: Cascade)
  driver          User           @relation("DriverRideBids", fields: [driverId], references: [id], onDelete: Cascade)
  vehicle         Vehicle        @relation(fields: [vehicleId], references: [id], onDelete: Restrict)

  @@unique([rideRequestId, driverId])
  @@index([rideRequestId, status])
  @@index([driverId, status])
}
```

- [ ] **Step 2: Add the inverse relations**

In `model RideRequest { ... }`, add inside the relation list:

```prisma
  bids            RideBid[]
```

In `model User { ... }`, add inside the relation list:

```prisma
  rideBids        RideBid[]      @relation("DriverRideBids")
  lastBidPushAt   DateTime?
```

In `model Vehicle { ... }`, add inside the relation list:

```prisma
  rideBids        RideBid[]
```

(The `@relation("DriverRideBids")` named relation is necessary because `User` already has other relations to ride-related tables — naming the relation prevents Prisma from auto-resolving against the wrong field.)

- [ ] **Step 3: Generate the migration**

Run:

```bash
cd server && npx prisma migrate dev --name add_ride_bid_and_last_bid_push_at
```

Expected: a new directory under `server/prisma/migrations/` containing a `migration.sql` that creates the `RideBidStatus` enum, the `RideBid` table with its three indexes, and adds `lastBidPushAt TIMESTAMP(3)` to `User`. Prisma also regenerates the client.

- [ ] **Step 4: Type-check the server**

Run:

```bash
cd server && npx tsc --noEmit
```

Expected: clean. (If anything else in the codebase touched the changed models in a way that breaks, fix it before continuing.)

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations
git commit -m "feat(db): add RideBid model + User.lastBidPushAt for counter-offer bidding"
```

---

### Task 2: Refactor — extract `createRideFromAcceptedRequest` service

**Files:**
- Create: `server/src/services/rideRequestAccept.service.ts`
- Modify: `server/src/controllers/rideRequest.controller.ts` (the `acceptRideRequest` controller around lines 1009–1072 — the `prisma.$transaction` block that creates the ride + booking + match + notification + chat thread)

This is a pure refactor — behavior must not change. The new service receives `agreedFare` instead of reading `request.proposedFare`.

- [ ] **Step 1: Read the existing `acceptRideRequest` body**

Read the entire current implementation of `RideRequestController.acceptRideRequest` (start at the `static acceptRideRequest = catchAsync(` line; end at the closing `);`). You need to understand exactly which Prisma operations are inside the `$transaction` and what they return.

- [ ] **Step 2: Create the service file**

```ts
// server/src/services/rideRequestAccept.service.ts
//
// Extracted from RideRequestController.acceptRideRequest so that both the
// "Accept at original fare" path and the new "Accept this bid" path share
// one transaction body. The only behavioural change vs the pre-refactor
// controller is that the agreed fare is passed in instead of being read
// from rideRequest.proposedFare.
//
// Callers are responsible for KYC / vehicle-ownership / OPEN-status checks
// BEFORE calling. This function trusts its inputs.

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  BookingStatus,
  BookingType,
  ContributionCollectionMethod,
  MonetizationType,
  RideRequestStatus,
  RideStatus,
} from "@prisma/client";
import { profileSelects } from "../types";

export type CreateRideFromAcceptedRequestInput = {
  rideRequest: {
    id: number;
    userId: number;
    seats: number;
    originId: number | null;
    destinationId: number | null;
    originCity: string | null;
    destCity: string | null;
    rideType: RideStatus | string; // matches the existing controller's read
  };
  driver: { id: number; firstName: string };
  vehicle: { id: number; capacity: number };
  agreedFare: number;
  departureTime: Date;
  estimatedArrivalTime: Date;
};

export async function createRideFromAcceptedRequest(
  tx: Prisma.TransactionClient,
  input: CreateRideFromAcceptedRequestInput
) {
  const { rideRequest: rr, driver, vehicle, agreedFare, departureTime, estimatedArrivalTime } = input;

  const createdRide = await tx.ride.create({
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      departureTime,
      estimatedArrivalTime,
      departureLocationId: rr.originId!,
      destinationLocationId: rr.destinationId!,
      availableSeats: Math.max(vehicle.capacity - rr.seats, 0),
      totalSeats: vehicle.capacity,
      contribution: agreedFare,
      bookingType: BookingType.AUTOMATIC,
      status: RideStatus.PUBLISHED,
      publishedAt: new Date(),
      type: rr.rideType as RideStatus,
      monitizationType:
        agreedFare > 0 ? MonetizationType.PAYMENT : MonetizationType.FREE,
      contributionCollectionMethod: ContributionCollectionMethod.OFF_PLATFORM,
      rideRequestId: rr.id,
    },
    include: {
      departureLocation: true,
      destinationLocation: true,
      driver: { select: profileSelects },
      vehicle: true,
    },
  });

  await tx.booking.create({
    data: {
      rideId: createdRide.id,
      userId: rr.userId,
      vehicleId: vehicle.id,
      seats: rr.seats,
      status: BookingStatus.APPROVED,
    },
  });

  await tx.rideRequest.update({
    where: { id: rr.id },
    data: { status: RideRequestStatus.CLOSED, closeAt: new Date() },
  });

  await tx.rideRequestMatch.create({
    data: { requestId: rr.id, rideId: createdRide.id },
  });

  await tx.notification.create({
    data: {
      userId: rr.userId,
      title: "Your ride request was accepted",
      message: `${driver.firstName} accepted your ride from ${rr.originCity} to ${rr.destCity}.`,
      rideRequestId: rr.id,
      rideId: createdRide.id,
    },
  });

  const existingThread = await tx.chatThread.findUnique({
    where: { rideId: createdRide.id },
  });
  if (!existingThread) {
    await tx.chatThread.create({
      data: {
        rideId: createdRide.id,
        participants: { connect: [{ id: rr.userId }, { id: driver.id }] },
      },
    });
  }

  return createdRide;
}
```

If the existing controller does additional work inside the `$transaction` that this draft omits (e.g., more notification rows, presence updates, KYC writes), add it here verbatim. The acceptance test is: diff the controller's pre- and post-refactor behavior — they must be identical when `agreedFare === request.proposedFare`.

- [ ] **Step 3: Replace the inline transaction body in `acceptRideRequest`**

Inside the controller, locate the `await prisma.$transaction(async (tx) => { ... })` block and replace its body with:

```ts
const createdRide = await prisma.$transaction(async (tx) => {
  return createRideFromAcceptedRequest(tx, {
    rideRequest: rr,
    driver,
    vehicle,
    agreedFare: contribution,
    departureTime,
    estimatedArrivalTime: estimatedArrival,
  });
});
```

Add the import at the top of the file:

```ts
import { createRideFromAcceptedRequest } from "../services/rideRequestAccept.service";
```

Anything the controller did **after** the original transaction (the post-transaction response shaping) stays in the controller and continues to operate on `createdRide`.

- [ ] **Step 4: Type-check**

Run:

```bash
cd server && npx tsc --noEmit
```

Expected: clean. If a field name in the input shape doesn't match what the controller passes in, fix the input type.

- [ ] **Step 5: Run the existing test suite to confirm no regression**

Run:

```bash
cd server && npx jest
```

Expected: all currently-passing tests still pass. If any ride-request test fails, the refactor diverged from prior behavior — restore parity.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/rideRequestAccept.service.ts server/src/controllers/rideRequest.controller.ts
git commit -m "refactor(ride-request): extract createRideFromAcceptedRequest service"
```

---

### Task 3: `bid.service.ts` — pure business logic (no HTTP)

**Files:**
- Create: `server/src/services/bid.service.ts`

This module owns the bid lifecycle. The controllers in Task 5 are thin wrappers.

- [ ] **Step 1: Write the service**

```ts
// server/src/services/bid.service.ts
import { prisma } from "../config/prisma";
import {
  KycStatus,
  RideBidStatus,
  RideRequestStatus,
} from "@prisma/client";
import { createRideFromAcceptedRequest } from "./rideRequestAccept.service";
import { sendNotification } from "./notification.service";

const PUSH_DEBOUNCE_MS = 10_000;

export class BidConflictError extends Error {
  constructor(
    public code:
      | "REQUEST_CLOSED"
      | "BID_EXISTS"
      | "BID_NOT_PENDING"
      | "KYC_REQUIRED"
      | "NOT_OWNER"
      | "VEHICLE_NOT_OWNED",
    message: string
  ) {
    super(message);
    this.name = "BidConflictError";
  }
}

export async function submitBid(input: {
  rideRequestId: number;
  driverId: number;
  vehicleId: number;
  amount: number;
}) {
  return prisma.$transaction(async (tx) => {
    const driver = await tx.user.findUnique({
      where: { id: input.driverId },
      select: {
        id: true,
        firstName: true,
        kycStatus: true,
      },
    });
    if (!driver || driver.kycStatus !== KycStatus.APPROVED) {
      throw new BidConflictError("KYC_REQUIRED", "Driver KYC not approved");
    }

    const vehicle = await tx.vehicle.findUnique({
      where: { id: input.vehicleId },
      select: { id: true, userId: true, kycStatus: true },
    });
    if (!vehicle || vehicle.userId !== input.driverId) {
      throw new BidConflictError(
        "VEHICLE_NOT_OWNED",
        "Vehicle does not belong to driver"
      );
    }
    if (vehicle.kycStatus !== KycStatus.APPROVED) {
      throw new BidConflictError("KYC_REQUIRED", "Vehicle KYC not approved");
    }

    const request = await tx.rideRequest.findUnique({
      where: { id: input.rideRequestId },
      select: { id: true, status: true, userId: true },
    });
    if (!request || request.status !== RideRequestStatus.OPEN) {
      throw new BidConflictError("REQUEST_CLOSED", "Ride request is not open");
    }

    const existing = await tx.rideBid.findUnique({
      where: {
        rideRequestId_driverId: {
          rideRequestId: input.rideRequestId,
          driverId: input.driverId,
        },
      },
    });
    if (existing && existing.status === RideBidStatus.PENDING) {
      throw new BidConflictError(
        "BID_EXISTS",
        "Driver already has a pending bid on this request"
      );
    }

    const bid = await tx.rideBid.create({
      data: {
        rideRequestId: input.rideRequestId,
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        bidAmount: input.amount,
        status: RideBidStatus.PENDING,
      },
    });

    // Debounced passenger push — at most one per 10s.
    const passenger = await tx.user.findUnique({
      where: { id: request.userId },
      select: { id: true, lastBidPushAt: true, fcm_token: true },
    });
    const now = new Date();
    const shouldPush =
      passenger?.fcm_token &&
      (!passenger.lastBidPushAt ||
        now.getTime() - passenger.lastBidPushAt.getTime() >= PUSH_DEBOUNCE_MS);

    if (shouldPush) {
      const pendingCount = await tx.rideBid.count({
        where: {
          rideRequestId: input.rideRequestId,
          status: RideBidStatus.PENDING,
        },
      });
      await tx.user.update({
        where: { id: passenger!.id },
        data: { lastBidPushAt: now },
      });
      // Fire FCM after the transaction commits — wrap-after pattern.
      setImmediate(() => {
        void sendNotification(passenger!.fcm_token!, {
          title: "New offer on your ride request",
          body:
            pendingCount === 1
              ? `${driver.firstName} offered RWF ${Math.round(input.amount).toLocaleString()}`
              : `${driver.firstName} offered RWF ${Math.round(input.amount).toLocaleString()} (+${pendingCount - 1} more)`,
          data: { type: "RIDE_BID_CREATED", rideRequestId: String(input.rideRequestId) },
        });
      });
    }

    return bid;
  });
}

export async function listBidsForRequest(input: {
  rideRequestId: number;
  callerId: number;
  isAdmin: boolean;
}) {
  const request = await prisma.rideRequest.findUnique({
    where: { id: input.rideRequestId },
    select: { userId: true },
  });
  if (!request) throw new BidConflictError("REQUEST_CLOSED", "Request not found");
  if (!input.isAdmin && request.userId !== input.callerId) {
    throw new BidConflictError("NOT_OWNER", "Not your ride request");
  }

  const bids = await prisma.rideBid.findMany({
    where: {
      rideRequestId: input.rideRequestId,
      status: RideBidStatus.PENDING,
    },
    include: {
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          averageRating: true,
          totalRatings: true,
          profileImage: { select: { url: true } },
          driverPresence: {
            select: { latitude: true, longitude: true, updatedAt: true },
          },
        },
      },
      vehicle: {
        select: { id: true, make: true, model: true, category: true, tier: true },
      },
    },
    orderBy: { bidAmount: "asc" },
  });

  return bids;
}

export async function getBid(input: { bidId: number }) {
  return prisma.rideBid.findUnique({ where: { id: input.bidId } });
}

export async function acceptBid(input: {
  bidId: number;
  passengerId: number;
}) {
  return prisma.$transaction(async (tx) => {
    const bid = await tx.rideBid.findUnique({
      where: { id: input.bidId },
      include: {
        rideRequest: true,
        driver: { select: { id: true, firstName: true, fcm_token: true } },
        vehicle: { select: { id: true, capacity: true } },
      },
    });
    if (!bid) throw new BidConflictError("BID_NOT_PENDING", "Bid not found");
    if (bid.status !== RideBidStatus.PENDING) {
      throw new BidConflictError("BID_NOT_PENDING", "Bid is not pending");
    }
    if (bid.rideRequest.userId !== input.passengerId) {
      throw new BidConflictError("NOT_OWNER", "Not your ride request");
    }
    if (bid.rideRequest.status !== RideRequestStatus.OPEN) {
      throw new BidConflictError("REQUEST_CLOSED", "Ride request is not open");
    }

    const departureTime =
      bid.rideRequest.timeWindowStart ?? new Date(Date.now() + 60_000);
    const estimatedArrivalTime = new Date(departureTime.getTime() + 30 * 60_000);

    const createdRide = await createRideFromAcceptedRequest(tx, {
      rideRequest: {
        id: bid.rideRequest.id,
        userId: bid.rideRequest.userId,
        seats: bid.rideRequest.seats,
        originId: bid.rideRequest.originId,
        destinationId: bid.rideRequest.destinationId,
        originCity: bid.rideRequest.originCity,
        destCity: bid.rideRequest.destCity,
        rideType: bid.rideRequest.rideType,
      },
      driver: { id: bid.driverId, firstName: bid.driver.firstName },
      vehicle: { id: bid.vehicleId, capacity: bid.vehicle.capacity },
      agreedFare: Number(bid.bidAmount),
      departureTime,
      estimatedArrivalTime,
    });

    const now = new Date();
    await tx.rideBid.update({
      where: { id: bid.id },
      data: { status: RideBidStatus.ACCEPTED, resolvedAt: now },
    });

    const losers = await tx.rideBid.findMany({
      where: {
        rideRequestId: bid.rideRequestId,
        status: RideBidStatus.PENDING,
        id: { not: bid.id },
      },
      include: { driver: { select: { id: true, fcm_token: true } } },
    });
    if (losers.length > 0) {
      await tx.rideBid.updateMany({
        where: { id: { in: losers.map((l) => l.id) } },
        data: { status: RideBidStatus.DECLINED, resolvedAt: now },
      });
    }

    setImmediate(() => {
      if (bid.driver.fcm_token) {
        void sendNotification(bid.driver.fcm_token, {
          title: "Offer accepted",
          body: `Passenger accepted your offer for RWF ${Math.round(Number(bid.bidAmount)).toLocaleString()}`,
          data: { type: "RIDE_BID_ACCEPTED", rideId: String(createdRide.id) },
        });
      }
      for (const l of losers) {
        if (l.driver.fcm_token) {
          void sendNotification(l.driver.fcm_token, {
            title: "Request taken",
            body: "Another driver was selected for that ride request.",
            data: { type: "RIDE_BID_LOST", rideRequestId: String(bid.rideRequestId) },
          });
        }
      }
    });

    return { ride: createdRide, bid };
  });
}

export async function cancelBidByDriver(input: {
  bidId: number;
  driverId: number;
}) {
  const bid = await prisma.rideBid.findUnique({
    where: { id: input.bidId },
    select: { id: true, driverId: true, status: true },
  });
  if (!bid) throw new BidConflictError("BID_NOT_PENDING", "Bid not found");
  if (bid.driverId !== input.driverId) {
    throw new BidConflictError("NOT_OWNER", "Not your bid");
  }
  if (bid.status !== RideBidStatus.PENDING) {
    throw new BidConflictError("BID_NOT_PENDING", "Bid is not pending");
  }
  return prisma.rideBid.update({
    where: { id: bid.id },
    data: { status: RideBidStatus.DECLINED, resolvedAt: new Date() },
  });
}

// Called from anywhere that closes a ride request — both accept paths,
// expiry job, passenger cancel. Idempotent (only flips PENDING).
export async function sweepPendingBids(input: {
  tx: typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  rideRequestId: number;
  reason: "ACCEPTED_ELSEWHERE" | "REQUEST_CANCELLED" | "REQUEST_EXPIRED";
  excludeBidId?: number;
}) {
  const targetStatus =
    input.reason === "REQUEST_EXPIRED"
      ? RideBidStatus.EXPIRED
      : RideBidStatus.DECLINED;

  const losers = await input.tx.rideBid.findMany({
    where: {
      rideRequestId: input.rideRequestId,
      status: RideBidStatus.PENDING,
      ...(input.excludeBidId ? { id: { not: input.excludeBidId } } : {}),
    },
    include: { driver: { select: { fcm_token: true } } },
  });
  if (losers.length === 0) return;

  await input.tx.rideBid.updateMany({
    where: { id: { in: losers.map((l) => l.id) } },
    data: { status: targetStatus, resolvedAt: new Date() },
  });

  setImmediate(() => {
    for (const l of losers) {
      if (!l.driver.fcm_token) continue;
      const body =
        input.reason === "ACCEPTED_ELSEWHERE"
          ? "Another driver was selected for that ride request."
          : input.reason === "REQUEST_EXPIRED"
            ? "Ride request expired."
            : "Passenger cancelled the ride request.";
      void sendNotification(l.driver.fcm_token, {
        title: "Request closed",
        body,
        data: { type: `RIDE_BID_${input.reason}`, rideRequestId: String(input.rideRequestId) },
      });
    }
  });
}
```

If `sendNotification` has a different signature in `server/src/services/notification.service.ts`, adjust the call sites here to match — search for an existing FCM-send call in the codebase (e.g. in `noShow.service.ts` or `rideRequest.controller.ts`) and mirror its shape.

- [ ] **Step 2: Type-check**

Run:

```bash
cd server && npx tsc --noEmit
```

Expected: clean. Fix any signature mismatches.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/bid.service.ts
git commit -m "feat(bid): submit/accept/cancel/sweep service + push debounce"
```

---

### Task 4: Bid request validators

**Files:**
- Create: `server/src/middlewares/validators/bid.request.validator.ts`

- [ ] **Step 1: Write the validators**

```ts
// server/src/middlewares/validators/bid.request.validator.ts
import { body, param } from "express-validator";

export const submitBidValidator = [
  param("id").isInt({ min: 1 }).toInt(),
  body("amount").isFloat({ gt: 0 }).toFloat(),
  body("vehicleId").isInt({ min: 1 }).toInt(),
];

export const bidIdParamValidator = [
  param("id").isInt({ min: 1 }).toInt(),
];
```

- [ ] **Step 2: Type-check**

Run:

```bash
cd server && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add server/src/middlewares/validators/bid.request.validator.ts
git commit -m "feat(bid): request validators for submit/accept/cancel"
```

---

### Task 5: Bid controllers + routes

**Files:**
- Create: `server/src/controllers/bid.controller.ts`
- Create: `server/src/routes/bid.routes.ts`
- Modify: `server/src/routes/rideRequests.routes.ts` (add `POST /:requestId/bids` and `GET /:requestId/bids`)
- Modify: `server/src/routes/index.ts` (mount `bid.routes.ts` at `/bids`)

- [ ] **Step 1: Write the controller**

```ts
// server/src/controllers/bid.controller.ts
import type { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import {
  BidConflictError,
  acceptBid,
  cancelBidByDriver,
  getBid,
  listBidsForRequest,
  submitBid,
} from "../services/bid.service";

function mapBidError(err: unknown): never {
  if (err instanceof BidConflictError) {
    const status = err.code === "NOT_OWNER" || err.code === "VEHICLE_NOT_OWNED" || err.code === "KYC_REQUIRED" ? 403 : 409;
    throw AppError(err.message, status, { code: err.code });
  }
  throw err;
}

export class BidController {
  static submit = catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const { id, amount, vehicleId } = matchedData<{ id: number; amount: number; vehicleId: number }>(req, {
      locations: ["params", "body"],
    });
    try {
      const bid = await submitBid({
        rideRequestId: id,
        driverId: req.user!.id,
        vehicleId,
        amount,
      });
      _res.status(201).json({ success: true, data: bid });
    } catch (err) {
      try {
        mapBidError(err);
      } catch (mapped) {
        return next(mapped);
      }
    }
  });

  static listForRequest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    try {
      const bids = await listBidsForRequest({
        rideRequestId: id,
        callerId: req.user!.id,
        isAdmin: req.user!.role === "ADMIN",
      });
      res.json({ success: true, data: bids });
    } catch (err) {
      try {
        mapBidError(err);
      } catch (mapped) {
        return next(mapped);
      }
    }
  });

  static accept = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    try {
      const result = await acceptBid({ bidId: id, passengerId: req.user!.id });
      res.json({ success: true, data: result });
    } catch (err) {
      try {
        mapBidError(err);
      } catch (mapped) {
        return next(mapped);
      }
    }
  });

  static cancel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    try {
      const bid = await cancelBidByDriver({ bidId: id, driverId: req.user!.id });
      res.json({ success: true, data: bid });
    } catch (err) {
      try {
        mapBidError(err);
      } catch (mapped) {
        return next(mapped);
      }
    }
  });

  static getOne = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    const bid = await getBid({ bidId: id });
    if (!bid) return next(AppError("Bid not found", 404));
    res.json({ success: true, data: bid });
  });
}
```

If `AppError` doesn't accept a third argument in this codebase, drop the `{ code: err.code }` and instead set `err.code` via attaching it to the error object before throwing. Search `server/src/utils/AppError.ts` to confirm the signature.

- [ ] **Step 2: Write the new `/bids` route file**

```ts
// server/src/routes/bid.routes.ts
import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { BidController } from "../controllers/bid.controller";
import { bidIdParamValidator } from "../middlewares/validators/bid.request.validator";

const router = Router();

router
  .get("/:id", bidIdParamValidator, validateRequestBody, BidController.getOne)
  .post("/:id/accept", bidIdParamValidator, validateRequestBody, BidController.accept)
  .post("/:id/cancel", bidIdParamValidator, validateRequestBody, BidController.cancel);

export default router;
```

- [ ] **Step 3: Add submit + list routes to `rideRequests.routes.ts`**

Open `server/src/routes/rideRequests.routes.ts`. Add the import:

```ts
import { submitBidValidator, bidIdParamValidator } from "../middlewares/validators/bid.request.validator";
import { BidController } from "../controllers/bid.controller";
```

Inside the chained `router` calls, add two more entries (place them anywhere in the chain, e.g. after `.post("/:requestId/accept", ...)`):

```ts
  .post(
    "/:id/bids",
    submitBidValidator,
    validateRequestBody,
    BidController.submit
  )
  .get(
    "/:id/bids",
    bidIdParamValidator,
    validateRequestBody,
    BidController.listForRequest
  )
```

Note: the path param name is `:id` (not `:requestId`) because the validator chain matches on `id`. The existing routes use `:requestId`; we deliberately diverge for these two so the validator can be shared with the `/bids` router. If you'd rather keep `:requestId` consistency, rename the validators' `param("id")` to `param("requestId")` and `param("id")` to `param("id")` in the `/bids` router.

- [ ] **Step 4: Mount the new `/bids` router in `index.ts`**

Open `server/src/routes/index.ts`. Add the import near the others:

```ts
import bidRoutes from "./bid.routes";
```

Add the mount near other authenticated routes (e.g. after the `ride-requests` mount):

```ts
router.use("/bids", isAuthenticated, languagePreference, bidRoutes);
```

- [ ] **Step 5: Type-check**

Run:

```bash
cd server && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Boot the server and curl the routes**

```bash
cd server && npm run dev
```

In another terminal (with a valid JWT for a driver):

```bash
curl -i -X POST http://localhost:3000/ride-requests/<rid>/bids \
  -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"amount": 3200, "vehicleId": <vid>}'
```

Expected: 201 with a `RideBid` row in the response, OR a 4xx with a clean `code` field if business rules block (KYC, request closed, duplicate bid).

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/bid.controller.ts server/src/routes/bid.routes.ts server/src/routes/rideRequests.routes.ts server/src/routes/index.ts
git commit -m "feat(bid): controllers + routes for submit/list/accept/cancel"
```

---

### Task 6: Wire Accept-at-original-fare to sweep pending bids

**Files:**
- Modify: `server/src/controllers/rideRequest.controller.ts` (the `acceptRideRequest` controller, inside the `prisma.$transaction` call from Task 2)

- [ ] **Step 1: Import the sweep helper**

At the top of `rideRequest.controller.ts`, add:

```ts
import { sweepPendingBids } from "../services/bid.service";
```

- [ ] **Step 2: Call the sweep inside the transaction**

Inside the `prisma.$transaction(async (tx) => { ... })` of `acceptRideRequest`, after the `createRideFromAcceptedRequest(tx, ...)` call and before `return createdRide;`, add:

```ts
await sweepPendingBids({
  tx,
  rideRequestId: rr.id,
  reason: "ACCEPTED_ELSEWHERE",
});
```

- [ ] **Step 3: Type-check**

Run:

```bash
cd server && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/rideRequest.controller.ts
git commit -m "feat(ride-request): sweep pending bids when accepting at original fare"
```

---

### Task 7: Wire request expiry + cancel paths to sweep pending bids

**Files:**
- Modify: any file that transitions `RideRequest.status` to `EXPIRED` or `CANCELLED`. Find them with:
  ```bash
  cd server && grep -rn "RideRequestStatus.EXPIRED\|RideRequestStatus.CANCELLED" src/
  ```

- [ ] **Step 1: Locate the call sites**

Run the grep above. Expect to find at least:
- A passenger-cancel controller in `rideRequest.controller.ts` (search for `closeRideRequest` or `cancelRideRequest`)
- An expiry job, possibly under `server/src/jobs/` or a cron file — find with `grep -rn "EXPIRED" src/jobs/ 2>/dev/null` or `grep -rn "lastFailedAt\|expireRideRequest" src/`. If no expiry job exists, skip the expiry wiring; flag in the commit message and follow up with a separate slice.

- [ ] **Step 2: Add the sweep at each site**

At each location that does `prisma.rideRequest.update({ ..., data: { status: RideRequestStatus.CANCELLED, ... } })` or similar, wrap the update + sweep in a single `$transaction`:

```ts
await prisma.$transaction(async (tx) => {
  await tx.rideRequest.update({
    where: { id: rideRequestId },
    data: { status: RideRequestStatus.CANCELLED /* or EXPIRED */, closeAt: new Date() },
  });
  await sweepPendingBids({
    tx,
    rideRequestId,
    reason: "REQUEST_CANCELLED", // or "REQUEST_EXPIRED"
  });
});
```

Add `import { sweepPendingBids } from "../services/bid.service";` at the top of any file that didn't have it.

- [ ] **Step 3: Type-check + run the suite**

```bash
cd server && npx tsc --noEmit && npx jest
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add server/src/
git commit -m "feat(bid): sweep pending bids on ride-request cancel/expire paths"
```

---

### Task 8: Bid service unit tests

**Files:**
- Create: `server/src/services/bid.service.test.ts`

- [ ] **Step 1: Write the tests**

This file uses the same Jest + Prisma test pattern as `server/src/services/commission.service.test.ts` and `wallet.service.test.ts` — read one of them to confirm whether the suite uses a real test DB, a transactional rollback wrapper, or mocks. Mirror that pattern. The test cases to cover:

```ts
// server/src/services/bid.service.test.ts
import { prisma } from "../config/prisma";
import { RideBidStatus, RideRequestStatus, KycStatus } from "@prisma/client";
import {
  BidConflictError,
  acceptBid,
  cancelBidByDriver,
  submitBid,
  sweepPendingBids,
} from "./bid.service";

// Helper — create a seeded passenger + driver + vehicle + open ride request.
// Reuse fixtures from existing service tests if they exist; otherwise inline
// minimum-viable factories that satisfy required NOT NULL columns.
async function setup() {
  // (Replace with the project's existing test-data factory; example below.)
  const passenger = await prisma.user.create({
    data: { firstName: "P", lastName: "P", role: "USER", kycStatus: KycStatus.APPROVED, phoneNumber: `+250${Date.now()}` },
  });
  const driver = await prisma.user.create({
    data: { firstName: "D", lastName: "D", role: "DRIVER", kycStatus: KycStatus.APPROVED, phoneNumber: `+251${Date.now()}` },
  });
  const vehicle = await prisma.vehicle.create({
    data: {
      userId: driver.id,
      make: "Toyota",
      model: "Vitz",
      year: 2020,
      plate: `RAB${Date.now() % 10000}`,
      category: "CAR",
      capacity: 4,
      kycStatus: KycStatus.APPROVED,
    },
  });
  const request = await prisma.rideRequest.create({
    data: {
      userId: passenger.id,
      seats: 1,
      status: RideRequestStatus.OPEN,
      originCity: "Kigali",
      destCity: "Nyamirambo",
      rideType: "D2D",
      proposedFare: 3500,
      // originId / destinationId need real Location rows in this project;
      // create stubs or skip the originId/destinationId checks in the service
      // by adjusting setup. Match what other tests do.
    },
  });
  return { passenger, driver, vehicle, request };
}

describe("bid.service", () => {
  afterEach(async () => {
    await prisma.rideBid.deleteMany({});
    await prisma.rideRequest.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.user.deleteMany({ where: { firstName: { in: ["P", "D"] } } });
  });

  test("submitBid creates a PENDING bid", async () => {
    const { driver, vehicle, request } = await setup();
    const bid = await submitBid({
      rideRequestId: request.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      amount: 3200,
    });
    expect(bid.status).toBe(RideBidStatus.PENDING);
    expect(Number(bid.bidAmount)).toBe(3200);
  });

  test("submitBid rejects when driver KYC is not APPROVED", async () => {
    const { driver, vehicle, request } = await setup();
    await prisma.user.update({
      where: { id: driver.id },
      data: { kycStatus: KycStatus.PENDING },
    });
    await expect(
      submitBid({
        rideRequestId: request.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        amount: 3200,
      })
    ).rejects.toBeInstanceOf(BidConflictError);
  });

  test("submitBid rejects duplicate PENDING bid by same driver", async () => {
    const { driver, vehicle, request } = await setup();
    await submitBid({
      rideRequestId: request.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      amount: 3200,
    });
    await expect(
      submitBid({
        rideRequestId: request.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        amount: 3100,
      })
    ).rejects.toMatchObject({ code: "BID_EXISTS" });
  });

  test("submitBid rejects when request is not OPEN", async () => {
    const { driver, vehicle, request } = await setup();
    await prisma.rideRequest.update({
      where: { id: request.id },
      data: { status: RideRequestStatus.CLOSED },
    });
    await expect(
      submitBid({
        rideRequestId: request.id,
        driverId: driver.id,
        vehicleId: vehicle.id,
        amount: 3200,
      })
    ).rejects.toMatchObject({ code: "REQUEST_CLOSED" });
  });

  test("cancelBidByDriver flips PENDING to DECLINED", async () => {
    const { driver, vehicle, request } = await setup();
    const bid = await submitBid({
      rideRequestId: request.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      amount: 3200,
    });
    const cancelled = await cancelBidByDriver({ bidId: bid.id, driverId: driver.id });
    expect(cancelled.status).toBe(RideBidStatus.DECLINED);
    expect(cancelled.resolvedAt).not.toBeNull();
  });

  test("cancelBidByDriver rejects when caller doesn't own the bid", async () => {
    const { driver, vehicle, request } = await setup();
    const bid = await submitBid({
      rideRequestId: request.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      amount: 3200,
    });
    await expect(
      cancelBidByDriver({ bidId: bid.id, driverId: driver.id + 999 })
    ).rejects.toMatchObject({ code: "NOT_OWNER" });
  });

  test("sweepPendingBids on ACCEPTED_ELSEWHERE flips all PENDING to DECLINED", async () => {
    const { driver, vehicle, request, passenger } = await setup();
    const otherDriver = await prisma.user.create({
      data: { firstName: "D", lastName: "2", role: "DRIVER", kycStatus: KycStatus.APPROVED, phoneNumber: `+252${Date.now()}` },
    });
    const otherVehicle = await prisma.vehicle.create({
      data: {
        userId: otherDriver.id,
        make: "Honda",
        model: "Fit",
        year: 2020,
        plate: `RAC${Date.now() % 10000}`,
        category: "CAR",
        capacity: 4,
        kycStatus: KycStatus.APPROVED,
      },
    });
    await submitBid({
      rideRequestId: request.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      amount: 3200,
    });
    await submitBid({
      rideRequestId: request.id,
      driverId: otherDriver.id,
      vehicleId: otherVehicle.id,
      amount: 3400,
    });
    await prisma.$transaction(async (tx) => {
      await sweepPendingBids({ tx, rideRequestId: request.id, reason: "ACCEPTED_ELSEWHERE" });
    });
    const all = await prisma.rideBid.findMany({ where: { rideRequestId: request.id } });
    expect(all.every((b) => b.status === RideBidStatus.DECLINED)).toBe(true);
  });

  test("sweepPendingBids on REQUEST_EXPIRED flips PENDING to EXPIRED", async () => {
    const { driver, vehicle, request } = await setup();
    await submitBid({
      rideRequestId: request.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      amount: 3200,
    });
    await prisma.$transaction(async (tx) => {
      await sweepPendingBids({ tx, rideRequestId: request.id, reason: "REQUEST_EXPIRED" });
    });
    const b = await prisma.rideBid.findFirst({ where: { rideRequestId: request.id } });
    expect(b?.status).toBe(RideBidStatus.EXPIRED);
  });
});
```

If `originId` / `destinationId` are required NOT NULL on `RideRequest` in this project, extend `setup()` to create real `Location` rows. Confirm against `schema.prisma` and any existing test fixture file under `server/src/services/__tests__` or `server/prisma/seed*.ts`.

- [ ] **Step 2: Run the tests**

Run:

```bash
cd server && npx jest src/services/bid.service.test.ts
```

Expected: 8 tests pass. If `setup()` fails because of missing `Location` FK, fix the factory then re-run.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/bid.service.test.ts
git commit -m "test(bid): service-level tests for submit/cancel/sweep/duplicates"
```

---

### Task 9: Mobile — bid hooks

**Files:**
- Create: `mobile/src/hooks/useBids.ts`

- [ ] **Step 1: Write the hooks**

Mirror the existing pattern in `mobile/src/hooks/useRideRequests.ts` — read it first to confirm the TanStack Query client setup, the `api` import, and the response-unwrapping convention (most controllers wrap responses as `{ success: true, data: ... }`).

```ts
// mobile/src/hooks/useBids.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type RideBid = {
  id: number;
  rideRequestId: number;
  driverId: number;
  vehicleId: number;
  bidAmount: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  createdAt: string;
  resolvedAt: string | null;
};

export type BidListItem = RideBid & {
  driver: {
    id: number;
    firstName: string;
    lastName: string;
    averageRating: number | null;
    totalRatings: number;
    profileImage: { url: string } | null;
    driverPresence: { latitude: number; longitude: number; updatedAt: string } | null;
  };
  vehicle: {
    id: number;
    make: string;
    model: string;
    category: "CAR" | "MOTORBIKE" | "BUS";
    tier: "ECONOMY" | "PREMIUM" | null;
  };
};

export function useBidsForRequest(rideRequestId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["bids", "for-request", rideRequestId],
    queryFn: async () => {
      const res = await api.get<{ data: BidListItem[] }>(
        `/ride-requests/${rideRequestId}/bids`
      );
      return res.data.data;
    },
    enabled: enabled && rideRequestId != null,
    refetchInterval: 5_000,
  });
}

export function useBid(bidId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["bids", bidId],
    queryFn: async () => {
      const res = await api.get<{ data: RideBid }>(`/bids/${bidId}`);
      return res.data.data;
    },
    enabled: enabled && bidId != null,
    refetchInterval: 5_000,
  });
}

export function useSubmitBid(rideRequestId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { amount: number; vehicleId: number }) => {
      const res = await api.post<{ data: RideBid }>(
        `/ride-requests/${rideRequestId}/bids`,
        input
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["bids", "for-request", rideRequestId] });
    },
  });
}

export function useAcceptBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bidId: number) => {
      const res = await api.post<{ data: unknown }>(`/bids/${bidId}/accept`, {});
      return res.data.data;
    },
    onSuccess: (_, bidId) => {
      void qc.invalidateQueries({ queryKey: ["bids", bidId] });
      void qc.invalidateQueries({ queryKey: ["bids", "for-request"] });
      void qc.invalidateQueries({ queryKey: ["ride-requests"] });
    },
  });
}

export function useCancelBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bidId: number) => {
      const res = await api.post<{ data: RideBid }>(`/bids/${bidId}/cancel`, {});
      return res.data.data;
    },
    onSuccess: (_, bidId) => {
      void qc.invalidateQueries({ queryKey: ["bids", bidId] });
    },
  });
}
```

If the project's `api` helper has a different signature (e.g., `api("/path")` instead of `api.get(...)`), adapt accordingly — match what `useRideRequests.ts` uses.

- [ ] **Step 2: Type-check the mobile project**

Run:

```bash
cd mobile && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useBids.ts
git commit -m "feat(mobile): bid hooks (submit/list/get/accept/cancel) with 5s polling"
```

---

### Task 10: Mobile — Counter-offer bottom sheet

**Files:**
- Create: `mobile/src/components/CounterOfferSheet.tsx`

- [ ] **Step 1: Write the sheet**

Mirror the existing sheet-style component pattern used elsewhere (e.g., `mobile/src/components/HomeBottomSheet.tsx` for the input pattern + theming, or any existing modal — read one first). The sheet receives `rideRequestId`, `proposedFare`, and a list of the driver's vehicles for the vehicle picker.

```tsx
// mobile/src/components/CounterOfferSheet.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSubmitBid } from "@/hooks/useBids";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, type ColorPalette } from "@/lib/theme";
import { handleApiError } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type CounterOfferSheetRef = { open: () => void; close: () => void };

type Props = {
  rideRequestId: number;
  proposedFare: number;
  vehicleId: number; // the driver's currently-selected vehicle
};

export const CounterOfferSheet = forwardRef<CounterOfferSheetRef, Props>(function CounterOfferSheet(
  { rideRequestId, proposedFare, vehicleId },
  ref
) {
  const sheetRef = useRef<BottomSheet>(null);
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [amount, setAmount] = useState(String(Math.round(proposedFare)));
  const submit = useSubmitBid(rideRequestId);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.expand(),
    close: () => sheetRef.current?.close(),
  }));

  async function onSubmit() {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    try {
      const bid = await submit.mutateAsync({ amount: parsed, vehicleId });
      sheetRef.current?.close();
      router.push(`/bids/${bid.id}/waiting`);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === "REQUEST_CLOSED") {
        handleApiError(err, t, { fallback: "Request was just taken by another driver." });
        sheetRef.current?.close();
      } else if (code === "BID_EXISTS") {
        handleApiError(err, t, { fallback: "You already have an offer on this request." });
      } else {
        handleApiError(err, t);
      }
    }
  }

  return (
    <BottomSheet ref={sheetRef} snapPoints={["50%"]} index={-1} enablePanDownToClose>
      <BottomSheetView style={styles.content}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Text style={styles.title}>Make a counter-offer</Text>
          <Text style={styles.subtitle}>
            Passenger proposed RWF {Math.round(proposedFare).toLocaleString()}
          </Text>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="RWF"
            style={styles.input}
          />
          <Text style={styles.helper}>Your bid will be visible to the passenger.</Text>
          <Button title="Send offer" onPress={onSubmit} loading={submit.isPending} />
        </KeyboardAvoidingView>
      </BottomSheetView>
    </BottomSheet>
  );
});

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    content: { padding: spacing.xxl, gap: spacing.lg },
    title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary },
    subtitle: { fontSize: fontSize.md, color: colors.text.secondary },
    input: { fontSize: fontSize.xxl },
    helper: { fontSize: fontSize.sm, color: colors.text.secondary, marginBottom: spacing.lg },
  });
```

If the project's `handleApiError` doesn't accept a `{ fallback }` option, simplify to `handleApiError(err, t)` and drop the per-code branches — the toast message will come from the server's error response.

- [ ] **Step 2: Type-check**

Run:

```bash
cd mobile && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/CounterOfferSheet.tsx
git commit -m "feat(mobile): CounterOfferSheet component"
```

---

### Task 11: Mobile — wire Accept + Counter-offer buttons on the driver ride-request screen

**Files:**
- Modify: `mobile/src/app/(drawer)/ride-requests/[id].tsx`

- [ ] **Step 1: Read the current screen**

Read the file fully. Identify (a) where the existing "Accept" CTA renders (it probably calls `useD2D`'s acceptRideRequest hook), and (b) what props are available — specifically `request.id`, `request.proposedFare`, and the current driver's selected vehicle. If no vehicle is in scope, the screen needs a vehicle picker; in that case, surface the driver's first APPROVED vehicle via `useMyVehicles` as a default.

- [ ] **Step 2: Add the sheet + the two buttons**

Replace the single Accept CTA with a two-button footer. Pseudocode for what to add:

```tsx
// imports
import { useRef } from "react";
import { CounterOfferSheet, CounterOfferSheetRef } from "@/components/CounterOfferSheet";
import { useMyVehicles } from "@/hooks/useVehicles";  // or the existing vehicle hook

// inside the component
const counterSheetRef = useRef<CounterOfferSheetRef>(null);
const { data: vehicles } = useMyVehicles();
const primaryVehicle = vehicles?.find((v) => v.kycStatus === "APPROVED");

// in the footer area, replace the existing Accept button with:
<View style={styles.footer}>
  <Button
    title={`Accept RWF ${Math.round(parseFloat(request.proposedFare ?? "0")).toLocaleString()}`}
    onPress={onAccept /* the existing accept handler */}
    loading={acceptMutation.isPending}
  />
  <Button
    title="Counter-offer"
    variant="secondary"
    onPress={() => counterSheetRef.current?.open()}
    disabled={!primaryVehicle}
  />
</View>

// near the bottom of the JSX tree (sibling to the root view), mount the sheet:
{primaryVehicle && (
  <CounterOfferSheet
    ref={counterSheetRef}
    rideRequestId={request.id}
    proposedFare={parseFloat(request.proposedFare ?? "0")}
    vehicleId={primaryVehicle.id}
  />
)}
```

Adjust to the file's existing styling system, hook usage, and component types. The structural change is: one button becomes two; a new sheet is mounted.

- [ ] **Step 3: Type-check + manual smoke**

```bash
cd mobile && npx tsc --noEmit
```

Then run the app on a simulator, open an existing ride request as a driver, and verify both buttons render and tapping Counter-offer opens the sheet.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(drawer\)/ride-requests/\[id\].tsx
git commit -m "feat(mobile): Accept + Counter-offer buttons on driver ride-request screen"
```

---

### Task 12: Mobile — driver "waiting for passenger" screen

**Files:**
- Create: `mobile/src/app/bids/[id]/waiting.tsx`
- Create: `mobile/src/app/bids/_layout.tsx` (only if the project requires per-folder layouts; check sibling folders)

- [ ] **Step 1: Write the screen**

```tsx
// mobile/src/app/bids/[id]/waiting.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { useBid, useCancelBid } from "@/hooks/useBids";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, type ColorPalette } from "@/lib/theme";
import { handleApiError } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function BidWaitingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bidId = id ? Number(id) : null;
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data: bid } = useBid(bidId, true);
  const cancel = useCancelBid();

  useEffect(() => {
    if (!bid) return;
    if (bid.status === "ACCEPTED") {
      // Server returned the ride alongside the accept; we re-query the
      // ride list and navigate to the active screen via the standard route.
      // The bid row carries no rideId, so the driver flows through the
      // ride-list refresh which will pick up the new assignment.
      router.replace("/(drawer)");
    } else if (bid.status === "DECLINED" || bid.status === "EXPIRED") {
      router.replace("/(drawer)/ride-requests");
    }
  }, [bid?.status]);

  async function onCancel() {
    if (!bidId) return;
    try {
      await cancel.mutateAsync(bidId);
      router.replace("/(drawer)/ride-requests");
    } catch (err: any) {
      handleApiError(err, t);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your offer</Text>
        <Text style={styles.amount}>
          RWF {bid ? Math.round(parseFloat(bid.bidAmount)).toLocaleString() : "—"}
        </Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xxl }} />
        <Text style={styles.waiting}>Waiting for passenger to choose…</Text>
        <Button
          title="Cancel offer"
          variant="secondary"
          onPress={onCancel}
          loading={cancel.isPending}
          style={{ marginTop: spacing.xxl }}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, padding: spacing.xxl, justifyContent: "center", alignItems: "center" },
    title: { fontSize: fontSize.lg, color: colors.text.secondary },
    amount: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary, marginTop: spacing.sm },
    waiting: { fontSize: fontSize.md, color: colors.text.secondary, textAlign: "center" },
  });
```

If `expo-router` requires a `_layout.tsx` for nested folders in this project (check siblings such as `mobile/src/app/ride-request/_layout.tsx`), create:

```tsx
// mobile/src/app/bids/_layout.tsx
import { Stack } from "expo-router";
export default function BidsLayout() {
  return <Stack />;
}
```

- [ ] **Step 2: Type-check + smoke**

```bash
cd mobile && npx tsc --noEmit
```

Trigger Counter-offer from Task 11 and confirm navigation lands on this screen, the bid amount renders, and Cancel returns to the list.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/bids
git commit -m "feat(mobile): driver waiting-for-passenger screen with cancel + poll"
```

---

### Task 13: Mobile — passenger bid-list section on the waiting screen

**Files:**
- Modify: `mobile/src/app/ride-request/[id].tsx`

- [ ] **Step 1: Read the current screen**

Identify the section where "Looking for a driver…" renders. The bid list slots underneath that, above any chat / track UI that appears once a driver is assigned. Identify how `request.status` is exposed and how the screen detects "driver assigned" (it currently switches based on `matches[].ride.id`).

- [ ] **Step 2: Add the bid list**

Add the hook + render:

```tsx
// imports
import { useBidsForRequest, useAcceptBid, type BidListItem } from "@/hooks/useBids";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StarRating } from "@/components/ui/StarRating";

// inside the component, before render:
const isOpen = request?.status === "OPEN";
const { data: bids = [] } = useBidsForRequest(request?.id ?? null, isOpen);
const accept = useAcceptBid();

async function onAcceptBid(bid: BidListItem) {
  // Optionally show a confirmation sheet here. For first ship, accept directly.
  try {
    await accept.mutateAsync(bid.id);
    // The waiting screen's existing match-detection effect will flip to
    // "Driver assigned" on the next request poll.
  } catch (err: any) {
    handleApiError(err, t);
  }
}

// in the JSX, below the "Looking for a driver" header, only while OPEN:
{isOpen && (
  <View style={styles.bidSection}>
    <Text style={styles.bidHeader}>
      Offers ({bids.length})
    </Text>
    {bids.length === 0 ? (
      <Text style={styles.bidEmpty}>
        Drivers will appear here as they offer. You can wait, or cancel.
      </Text>
    ) : (
      bids.map((bid) => (
        <Card key={bid.id} style={styles.bidCard}>
          <View style={styles.bidRow}>
            <Avatar imageUrl={bid.driver.profileImage?.url ?? null} size={40} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.bidName}>
                {bid.driver.firstName}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <StarRating rating={bid.driver.averageRating ?? 0} />
                <Text style={styles.bidMeta}>
                  · {bid.driver.totalRatings} trips
                </Text>
              </View>
              <Text style={styles.bidMeta}>
                {bid.vehicle.make} {bid.vehicle.model}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.bidAmount}>
                RWF {Math.round(parseFloat(bid.bidAmount)).toLocaleString()}
              </Text>
              <Button
                title="Accept offer"
                onPress={() => onAcceptBid(bid)}
                loading={accept.isPending && accept.variables === bid.id}
              />
            </View>
          </View>
        </Card>
      ))
    )}
  </View>
)}
```

Add the supporting styles using the file's existing `makeStyles` pattern.

- [ ] **Step 3: Type-check + smoke**

```bash
cd mobile && npx tsc --noEmit
```

End-to-end manual smoke:
1. Passenger A creates a ride request.
2. Driver B opens the request, taps Counter-offer with a different amount.
3. Passenger A's waiting screen shows the offer card within ~5s.
4. Passenger A taps Accept offer. Screen flips to "Driver assigned" within ~5s. Driver B is navigated to the active ride screen on the next bid poll.
5. Repeat with two drivers bidding. The losing driver receives a "Request taken" toast and is sent back to the list.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/ride-request/\[id\].tsx
git commit -m "feat(mobile): passenger bid-list section on ride-request waiting screen"
```

---

### Task 14: Final type-check + test sweep

**Files:** none modified — verification only.

- [ ] **Step 1: Server**

```bash
cd server && npx tsc --noEmit && npx jest
```

Expected: clean compile and all tests pass.

- [ ] **Step 2: Mobile**

```bash
cd mobile && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: If anything fails**

Fix in the relevant earlier task, then re-run. Do not commit a green-light commit if the suite is red.

- [ ] **Step 4: Final commit (only if any cleanup was needed)**

Otherwise, skip — earlier tasks already committed everything.

---

## Self-Review Checklist

**Spec coverage:**
- §Goals 1 (drivers submit counter-offers) — Tasks 1, 3, 4, 5
- §Goals 2 (live bid list for passenger) — Tasks 3, 5, 13
- §Goals 3 (Accept-at-original-fare still works) — Task 6
- §Goals 4 (no changes to pricing / KYC / wallet / notifications infra) — Tasks 3, 5 (KYC checked in submit; wallet check inherited via Task 2 service)
- §Data model — Task 1
- §Server endpoints 1–4 — Tasks 4, 5
- §Server endpoints: existing-endpoint change — Task 6
- §Server endpoints: refactor — Task 2
- §Server endpoints: expiry/cancel sweep — Task 7
- §Mobile UI driver — Tasks 10, 11, 12
- §Mobile UI passenger — Task 13
- §Notifications (debounced passenger; per-event driver) — Task 3 (`submitBid` + `acceptBid` + `sweepPendingBids`)
- §Race conditions — covered by `$transaction` + row-level reads in Task 3 service
- §Tests — Task 8 (service), Tasks 11/12/13 (mobile smoke)

**Placeholder scan:** the `setup()` factory in Task 8 has the caveat "extend if Location FK is required" — flagged inline as a known gotcha specific to this repo. All other code is complete.

**Type consistency:**
- `BidConflictError.code` literals match across `submitBid`, `acceptBid`, `cancelBidByDriver`, `sweepPendingBids`, and `bid.controller.ts`'s `mapBidError`.
- `RideBidStatus` enum literals match between Prisma schema (Task 1), service (Task 3), tests (Task 8), and mobile hook type (Task 9).
- `sweepPendingBids` signature `(input: { tx, rideRequestId, reason, excludeBidId? })` is used identically in Task 6 (controller) and Task 7 (expiry/cancel paths).
- `useSubmitBid` returns `RideBid`, which `CounterOfferSheet` (Task 10) consumes via `bid.id` to navigate. Matches.
