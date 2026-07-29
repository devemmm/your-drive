# Buses + Wallet Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the bus-ticketing module on top of existing `Ride` / `Booking` / `BookingSeat` machinery, plus a minimal driver wallet (single column + `Transaction` ledger) that closes OFF_PLATFORM cash-commission collection across all services.

**Architecture:** A scheduled bus trip = a `Ride` with `vehicle.category = BUS` and a new `routeId` → `BusRoute`. Only `BusRoute` + `BusRouteStop` + `WalletSettings` are new tables. Commission is computed per attended seat and debited from the vehicle owner inside the existing `settleCompletedRides()` cron. QR on tickets is the plain `attendanceCode` rendered visually — server is the source of truth for double-scan prevention.

**Tech Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL (server), React + Vite + Tailwind + shadcn/ui (admin), Expo (React Native) + Expo Router (mobile). Tests: Jest + ts-jest. Prisma migrations via `npx prisma migrate dev`.

**Spec:** `docs/superpowers/specs/2026-04-18-buses-and-wallet-foundation-design.md`
**Tracker:** `docs/superpowers/tracking/implementation-status.md`

**Branch:** create `feat/buses-wallet-foundation` from `main`. (Current workspace is on `feat/live-driver-map` — cut the new branch from `main`, not from this one.) A git worktree at `../your-drive-buses` is recommended but optional.

---

## File structure

**Create (server):**
- `server/prisma/migrations/<timestamp>_buses_and_wallet_foundation/migration.sql` (generated)
- `server/src/services/wallet.service.ts` — `getBalance`, `credit`, `debit`, `resolveDebtLimit`, `assertAboveDebtLimit`
- `server/src/services/commission.service.ts` — `computePlatformFeeForSeat`, `debitCommissionForCompletedRide`
- `server/src/controllers/wallet.controller.ts` — `getMyWallet`, `getRecentLedger`, admin: `listWallets`, `creditWallet`
- `server/src/controllers/busRoute.controller.ts` — CRUD for BusRoute + BusRouteStop
- `server/src/controllers/walletSettings.controller.ts` — GET + PATCH the single settings row
- `server/src/controllers/bookingSeat.controller.ts` — `attendByCode`
- `server/src/routes/wallet.routes.ts`, `busRoute.routes.ts`, `walletSettings.routes.ts`, `bookingSeat.routes.ts`
- `server/src/services/commission.service.test.ts`, `wallet.service.test.ts`

**Modify (server):**
- `server/prisma/schema.prisma` — enum additions, new models, field additions
- `server/prisma/seed.ts` — seed `WalletSettings` row
- `server/src/services/ride.service.ts:689` — add commission debit inside `settleCompletedRides()` BEFORE setting `isSettled = true`
- `server/src/controllers/user.controller.ts` — availability-toggle debt-limit gate
- `server/src/controllers/ride.controller.ts` — search filter for bus category + route matching; booking accepts `boardingStopId` / `alightingStopId`
- `server/src/app.ts` (or wherever routers mount) — mount new routers

**Create (admin):**
- `client/src/pages/admin/tabs/BusOperatorsTab.tsx`
- `client/src/pages/admin/tabs/BusRoutesTab.tsx`
- `client/src/pages/admin/tabs/DriverWalletsTab.tsx`
- `client/src/pages/admin/tabs/WalletSettingsTab.tsx`
- `client/src/hooks/useBusRoutes.ts`, `useBusOperators.ts`, `useDriverWallets.ts`, `useWalletSettings.ts`

**Modify (admin):**
- `client/src/pages/admin/AdminDashboard.tsx:22-59, 564-617` — import + register 4 new tabs
- `client/src/pages/admin/tabs/VehiclesTab.tsx` — add BUS to category dropdown; seat-layout JSON editor when BUS
- `client/src/pages/admin/tabs/RidesTab.tsx` — vehicle-category filter; route column

**Create (mobile):**
- `mobile/src/app/(drawer)/wallet.tsx` — driver wallet screen
- `mobile/src/app/ride/[id]/manifest.tsx` — bus-driver manifest + scan FAB
- `mobile/src/components/TicketQr.tsx` — renders attendance code as QR
- `mobile/src/components/QrScannerModal.tsx` — camera-based scanner used by manifest FAB

**Modify (mobile):**
- `mobile/src/components/HomeBottomSheet.tsx:30` — remove `disabled: true` from BUS option
- `mobile/src/app/ride/search-results.tsx` — when vehicleType=BUS, pass `vehicleCategory=BUS` param
- `mobile/src/app/ride/[id]/index.tsx` — render `<TicketQr />` on booked tickets
- `mobile/src/components/DrawerContent.tsx:29-72` — add Wallet menu item
- Availability toggle component (`mobile/src/app/(drawer)/profile.tsx` or equivalent) — handle 403 WALLET_DEBT_LIMIT

**Install (mobile):**
- `react-native-qrcode-svg` + `react-native-svg` (rendering QR)
- `expo-camera` (scanning QR; handles barcode decoding in recent Expo SDKs)

---

## Task map

Backend foundation → backend logic → backend endpoints → admin → mobile. Within each, schema before logic before surface.

| # | Task | Area |
|---|---|---|
| 1 | Schema + migration | server |
| 2 | Seed `WalletSettings` | server |
| 3 | Wallet service + tests | server |
| 4 | Commission service + tests | server |
| 5 | Hook commission debit into `settleCompletedRides()` | server |
| 6 | Debt-limit gate on availability toggles | server |
| 7 | Wallet controller + routes | server |
| 8 | BusRoute controller + routes | server |
| 9 | WalletSettings controller + routes | server |
| 10 | Booking accepts boarding/alighting stops + `attendByCode` endpoint | server |
| 11 | Ride search: vehicle-category filter + route match | server |
| 12 | Admin: BusOperatorsTab | admin |
| 13 | Admin: BusRoutesTab | admin |
| 14 | Admin: DriverWalletsTab | admin |
| 15 | Admin: WalletSettingsTab | admin |
| 16 | Admin: VehiclesTab + RidesTab updates | admin |
| 17 | Admin: register new tabs in `AdminDashboard` | admin |
| 18 | Mobile: enable BUS in HomeBottomSheet + search wiring | mobile |
| 19 | Mobile: TicketQr component on booking detail | mobile |
| 20 | Mobile: bus-driver manifest screen + QR scanner | mobile |
| 21 | Mobile: wallet screen + drawer item | mobile |
| 22 | Mobile: availability-toggle 403 handling | mobile |
| 23 | End-to-end smoke + update tracker | wrap-up |

---

## Task 1: Schema + migration

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_buses_and_wallet_foundation/` (generated)

- [ ] **Step 1: Add enum values**

In `server/prisma/schema.prisma`, find `enum VehicleCategory` (~line 227) and update:

```prisma
enum VehicleCategory {
  CAR
  MOTORBIKE
  BUS
}
```

Find `enum UserRole` and add `BUS_OPERATOR`:

```prisma
enum UserRole {
  USER
  ADMIN
  BUS_OPERATOR
}
```

Find `enum TransactionType` (~line 730) and add two values:

```prisma
enum TransactionType {
  RIDE_POSTING
  RIDE_BOOKING
  SUBSCRIPTION
  CAR_RENTAL
  CAR_RENTAL_DEPOSIT
  CHAUFFEUR_SERVICE
  COMMISSION_DEBIT
  WALLET_CREDIT
}
```

- [ ] **Step 2: Add new models**

Append to `schema.prisma` (after existing models):

```prisma
model BusRoute {
  id          Int      @id @default(autoincrement())
  operatorId  Int
  operator    User     @relation("OperatorRoutes", fields: [operatorId], references: [id])
  originCity  String
  destCity    String
  distanceKm  Float
  basePrice   Decimal  @db.Decimal(10, 2)
  isActive    Boolean  @default(true)
  stops       BusRouteStop[]
  rides       Ride[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([originCity, destCity, isActive])
}

model BusRouteStop {
  id        Int      @id @default(autoincrement())
  routeId   Int
  route     BusRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  name      String
  city      String
  order     Int
  latitude  Float?
  longitude Float?

  boardingBookings  Booking[] @relation("BookingBoardingStop")
  alightingBookings Booking[] @relation("BookingAlightingStop")

  @@index([routeId, order])
}

model WalletSettings {
  id                    Int      @id @default(autoincrement())
  defaultDebtLimitCents Int      @default(500000)
  enforceDebtLimit      Boolean  @default(false)
  updatedAt             DateTime @updatedAt
}
```

- [ ] **Step 3: Add field additions**

In the `User` model (~line 90+), add:

```prisma
  walletBalanceCents   Int     @default(0)
  walletDebtLimitCents Int?
  operatorRoutes       BusRoute[] @relation("OperatorRoutes")
```

In the `Ride` model (~line 160+), add:

```prisma
  routeId Int?
  route   BusRoute? @relation(fields: [routeId], references: [id])
```

In the `Vehicle` model (~line 334+), add:

```prisma
  seatLayout Json?
```

In the `Booking` model, add:

```prisma
  boardingStopId  Int?
  boardingStop    BusRouteStop? @relation("BookingBoardingStop", fields: [boardingStopId], references: [id])
  alightingStopId Int?
  alightingStop   BusRouteStop? @relation("BookingAlightingStop", fields: [alightingStopId], references: [id])
```

Check whether `BookingSeat` has a `lockedUntil DateTime?` field (search in `schema.prisma`). If absent, add it:

```prisma
  lockedUntil DateTime?
```

- [ ] **Step 4: Generate migration**

Run from `server/`:

```bash
npx prisma migrate dev --name buses_and_wallet_foundation
```

Expected: a new directory under `server/prisma/migrations/` with a `migration.sql` that contains `CREATE TABLE "BusRoute"`, `CREATE TABLE "BusRouteStop"`, `CREATE TABLE "WalletSettings"`, `ALTER TABLE "User" ADD COLUMN "walletBalanceCents"`, and enum alterations. Prisma client is regenerated automatically.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add bus routes, wallet fields, commission/credit tx types"
```

---

## Task 2: Seed `WalletSettings`

**Files:**
- Modify: `server/prisma/seed.ts`

- [ ] **Step 1: Add seed block**

Open `server/prisma/seed.ts`. After existing seeds (admin user, coupon rules, tax rates), append:

```typescript
// Ensure a single WalletSettings row exists.
const existingWalletSettings = await prisma.walletSettings.findFirst();
if (!existingWalletSettings) {
  await prisma.walletSettings.create({
    data: {
      defaultDebtLimitCents: 500000,
      enforceDebtLimit: false,
    },
  });
  console.log("Seeded WalletSettings (enforceDebtLimit=false)");
} else {
  console.log("WalletSettings already present");
}
```

- [ ] **Step 2: Run seed**

From `server/`:

```bash
npx prisma db seed
```

Expected output includes: `Seeded WalletSettings (enforceDebtLimit=false)`.

- [ ] **Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat(db): seed default WalletSettings row"
```

---

## Task 3: Wallet service + tests

**Files:**
- Create: `server/src/services/wallet.service.ts`
- Create: `server/src/services/wallet.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/src/services/wallet.service.test.ts`:

```typescript
import { resolveDebtLimit, assertAboveDebtLimit, InsufficientWalletError } from "./wallet.service";

describe("resolveDebtLimit", () => {
  it("returns user override when set", () => {
    expect(resolveDebtLimit({ walletDebtLimitCents: 100000 }, 500000)).toBe(100000);
  });
  it("falls back to settings default when override is null", () => {
    expect(resolveDebtLimit({ walletDebtLimitCents: null }, 500000)).toBe(500000);
  });
});

describe("assertAboveDebtLimit", () => {
  const settings = { defaultDebtLimitCents: 500000, enforceDebtLimit: true };

  it("passes when balance is positive", () => {
    expect(() => assertAboveDebtLimit({ walletBalanceCents: 1000, walletDebtLimitCents: null }, settings)).not.toThrow();
  });
  it("passes when balance equals -limit", () => {
    expect(() => assertAboveDebtLimit({ walletBalanceCents: -500000, walletDebtLimitCents: null }, settings)).not.toThrow();
  });
  it("throws when balance is below -limit", () => {
    expect(() => assertAboveDebtLimit({ walletBalanceCents: -500001, walletDebtLimitCents: null }, settings))
      .toThrow(InsufficientWalletError);
  });
  it("does not throw when enforcement is disabled", () => {
    expect(() => assertAboveDebtLimit(
      { walletBalanceCents: -999999, walletDebtLimitCents: null },
      { ...settings, enforceDebtLimit: false },
    )).not.toThrow();
  });
  it("respects per-user override", () => {
    expect(() => assertAboveDebtLimit(
      { walletBalanceCents: -100001, walletDebtLimitCents: 100000 },
      settings,
    )).toThrow(InsufficientWalletError);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd server && npx jest wallet.service --no-coverage
```

Expected: failures — module not found.

- [ ] **Step 3: Implement `wallet.service.ts`**

Create `server/src/services/wallet.service.ts`:

```typescript
import { Prisma, PrismaClient, TransactionType, TransactionStatus } from "@prisma/client";

export class InsufficientWalletError extends Error {
  code = "WALLET_DEBT_LIMIT";
  constructor() {
    super("Wallet balance is below the configured debt limit");
  }
}

type WalletUser = { walletBalanceCents: number; walletDebtLimitCents: number | null };
type Settings = { defaultDebtLimitCents: number; enforceDebtLimit: boolean };

export function resolveDebtLimit(user: { walletDebtLimitCents: number | null }, defaultLimit: number): number {
  return user.walletDebtLimitCents ?? defaultLimit;
}

export function assertAboveDebtLimit(user: WalletUser, settings: Settings): void {
  if (!settings.enforceDebtLimit) return;
  const limit = resolveDebtLimit(user, settings.defaultDebtLimitCents);
  if (user.walletBalanceCents < -limit) throw new InsufficientWalletError();
}

type PrismaTx = Prisma.TransactionClient;

export async function creditWallet(
  tx: PrismaTx,
  params: {
    userId: number;
    amountCents: number;              // positive
    type: TransactionType;            // WALLET_CREDIT
    rideId?: number | null;
    bookingSeatId?: number | null;
    notes?: string | null;
    performedByUserId?: number | null;
  },
) {
  if (params.amountCents <= 0) throw new Error("creditWallet requires positive amount");
  await tx.user.update({
    where: { id: params.userId },
    data: { walletBalanceCents: { increment: params.amountCents } },
  });
  return tx.transaction.create({
    data: {
      type: params.type,
      status: TransactionStatus.PAID,
      amount: new Prisma.Decimal(params.amountCents / 100),
      userId: params.userId,
      rideId: params.rideId ?? null,
      bookingSeatId: params.bookingSeatId ?? null,
      notes: params.notes ?? null,
      createdById: params.performedByUserId ?? null,
      currency: process.env.DEFAULT_CURRENCY ?? "CAD",
    },
  });
}

export async function debitWallet(
  tx: PrismaTx,
  params: {
    userId: number;
    amountCents: number;              // positive
    type: TransactionType;            // COMMISSION_DEBIT
    rideId?: number | null;
    bookingSeatId?: number | null;
    notes?: string | null;
  },
) {
  if (params.amountCents <= 0) throw new Error("debitWallet requires positive amount");
  await tx.user.update({
    where: { id: params.userId },
    data: { walletBalanceCents: { decrement: params.amountCents } },
  });
  return tx.transaction.create({
    data: {
      type: params.type,
      status: TransactionStatus.PAID,
      amount: new Prisma.Decimal(-params.amountCents / 100),
      userId: params.userId,
      rideId: params.rideId ?? null,
      bookingSeatId: params.bookingSeatId ?? null,
      notes: params.notes ?? null,
      currency: process.env.DEFAULT_CURRENCY ?? "CAD",
    },
  });
}
```

Before saving: verify which fields exist on the `Transaction` model. If any field referenced above doesn't exist (e.g. `bookingSeatId`, `notes`, `createdById`), remove it from both credit and debit call sites and note it in Task 23 wrap-up as a schema gap. Do not invent `Transaction` fields.

- [ ] **Step 4: Run tests to verify pass**

```bash
cd server && npx jest wallet.service --no-coverage
```

Expected: 5 passes.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/wallet.service.ts server/src/services/wallet.service.test.ts
git commit -m "feat(wallet): debit/credit helpers + debt-limit guard"
```

---

## Task 4: Commission service + tests

**Files:**
- Create: `server/src/services/commission.service.ts`
- Create: `server/src/services/commission.service.test.ts`

- [ ] **Step 1: Write failing test for pure math helper**

Create `server/src/services/commission.service.test.ts`:

```typescript
import { computePlatformFeeCentsForSeat } from "./commission.service";

describe("computePlatformFeeCentsForSeat", () => {
  it("applies the commission rate to the seat contribution", () => {
    // contribution per seat = 5000, rate = 10% → fee = 500
    expect(computePlatformFeeCentsForSeat(5000, 10)).toBe(50000); // stored as cents
  });
  it("rounds up fractional cents", () => {
    expect(computePlatformFeeCentsForSeat(33.33, 10)).toBe(333);
  });
  it("returns 0 when contribution is 0", () => {
    expect(computePlatformFeeCentsForSeat(0, 10)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd server && npx jest commission.service --no-coverage
```

Expected: module not found.

- [ ] **Step 3: Implement the service**

Create `server/src/services/commission.service.ts`:

```typescript
import { Prisma, PrismaClient, TransactionType, ContributionCollectionMethod } from "@prisma/client";
import { debitWallet } from "./wallet.service";

export function computePlatformFeeCentsForSeat(perSeatContribution: number, commissionRatePercent: number): number {
  const fee = perSeatContribution * (commissionRatePercent / 100);
  return Math.ceil(fee * 100);
}

type PrismaTx = Prisma.TransactionClient;

/**
 * Debit the platform commission from the vehicle owner's wallet for each attended
 * seat on a completed OFF_PLATFORM ride. Idempotent via caller's `isSettled` flag —
 * caller must ensure this is only invoked once per ride.
 */
export async function debitCommissionForCompletedRide(tx: PrismaTx, rideId: number): Promise<{ seatsDebited: number; totalCents: number }> {
  const ride = await tx.ride.findUnique({
    where: { id: rideId },
    select: {
      id: true,
      contribution: true,
      contributionCollectionMethod: true,
      vehicle: { select: { userId: true } },
      bookingSeats: { where: { attendedAt: { not: null }, isExpired: false }, select: { id: true } },
    },
  });
  if (!ride) throw new Error(`debitCommissionForCompletedRide: ride ${rideId} not found`);
  if (ride.contributionCollectionMethod !== ContributionCollectionMethod.OFF_PLATFORM) {
    return { seatsDebited: 0, totalCents: 0 };
  }

  const commissionSetting = await tx.commissionSettings.findFirst();
  const ratePercent = Number(commissionSetting?.rate ?? 10);
  const feeCentsPerSeat = computePlatformFeeCentsForSeat(ride.contribution, ratePercent);

  let totalCents = 0;
  for (const seat of ride.bookingSeats) {
    if (feeCentsPerSeat <= 0) continue;
    await debitWallet(tx, {
      userId: ride.vehicle.userId,
      amountCents: feeCentsPerSeat,
      type: TransactionType.COMMISSION_DEBIT,
      rideId: ride.id,
      bookingSeatId: seat.id,
      notes: "OFF_PLATFORM commission debit",
    });
    totalCents += feeCentsPerSeat;
  }
  return { seatsDebited: ride.bookingSeats.length, totalCents };
}
```

Before saving: verify the exact field name on `CommissionSettings` (grep `prisma.commissionSettings.findFirst` in controllers — existing code uses `.rate`; confirm and keep).

- [ ] **Step 4: Run tests to verify pass**

```bash
cd server && npx jest commission.service --no-coverage
```

Expected: 3 passes.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/commission.service.ts server/src/services/commission.service.test.ts
git commit -m "feat(commission): OFF_PLATFORM debit service + per-seat fee math"
```

---

## Task 5: Hook commission debit into `settleCompletedRides()`

**Files:**
- Modify: `server/src/services/ride.service.ts` around line 1091 where `isSettled: true` is set

- [ ] **Step 1: Locate the settlement write**

Open `server/src/services/ride.service.ts`. Find the block around line 1091 containing:

```typescript
data: { isSettled: true, ...ride.status !== "COMPLETED" && { status: "COMPLETED", completedAt: new Date() } },
```

Read 40 lines of surrounding context to understand the loop and the transaction boundary.

- [ ] **Step 2: Wrap ride settlement in a Prisma transaction and invoke commission debit**

Replace the settlement write with a `prisma.$transaction` block that:
1. Calls `debitCommissionForCompletedRide(tx, ride.id)` first
2. Then updates the ride with `isSettled: true` and status/completedAt fallback

Pattern (adapt to existing variable names in the surrounding loop):

```typescript
import { debitCommissionForCompletedRide } from "./commission.service";
// ...
await prisma.$transaction(async (tx) => {
  await debitCommissionForCompletedRide(tx, ride.id);
  await tx.ride.update({
    where: { id: ride.id },
    data: {
      isSettled: true,
      ...(ride.status !== "COMPLETED" && { status: "COMPLETED", completedAt: new Date() }),
    },
  });
});
```

If the existing code already runs inside a transaction, splice the debit call before the existing update instead of adding a new `$transaction`.

- [ ] **Step 3: Manual verification**

Start dev server (`npm run dev` in `server/`). Create a minimal script `server/scripts/fake-settle.ts` (or a Prisma Studio check) that:
- Finds an OFF_PLATFORM ride with attended BookingSeats
- Runs `settleCompletedRides()` or waits for the cron
- Confirms: ride has `isSettled = true`; new `Transaction` rows with `type = COMMISSION_DEBIT` exist, one per attended seat; `vehicle.user.walletBalanceCents` decremented by total

Document the manual steps in a short paragraph at the bottom of Task 23's smoke checklist.

- [ ] **Step 4: Commit**

```bash
git add server/src/services/ride.service.ts
git commit -m "feat(settlement): debit OFF_PLATFORM commission inside settleCompletedRides"
```

---

## Task 6: Debt-limit gate on availability toggles

**Files:**
- Modify: `server/src/controllers/user.controller.ts`
- Modify: `server/src/middlewares/validators/user.request.validator.ts` if validator file exposes a typed `req.body`

- [ ] **Step 1: Locate the availability-updating function**

Grep in `server/src/controllers/user.controller.ts` for `isAvailableForRideRequest` and `isAvailableForChauffeur`. Identify the handler (likely `updateChauffeurAvailability` or similar — confirm with the Explore agent's finding).

- [ ] **Step 2: Add the gate**

Before writing the update, fetch the user's wallet fields and the settings row, then call `assertAboveDebtLimit`:

```typescript
import { assertAboveDebtLimit, InsufficientWalletError } from "../services/wallet.service";

// inside the handler, after resolving the incoming boolean(s):
const isGoingOnline =
  req.body.isAvailableForRideRequest === true ||
  req.body.isAvailableForChauffeur === true;

if (isGoingOnline) {
  const [fresh, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { walletBalanceCents: true, walletDebtLimitCents: true },
    }),
    prisma.walletSettings.findFirstOrThrow(),
  ]);
  try {
    assertAboveDebtLimit(fresh, settings);
  } catch (err) {
    if (err instanceof InsufficientWalletError) {
      return res.status(403).json({
        error: "WALLET_DEBT_LIMIT",
        message: "Top up your wallet to go online.",
      });
    }
    throw err;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/user.controller.ts
git commit -m "feat(availability): gate online-toggle on wallet debt limit"
```

---

## Task 7: Wallet controller + routes

**Files:**
- Create: `server/src/controllers/wallet.controller.ts`
- Create: `server/src/routes/wallet.routes.ts`
- Modify: mount point (likely `server/src/app.ts` or `server/src/routes/index.ts`)

- [ ] **Step 1: Controller**

Create `server/src/controllers/wallet.controller.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma"; // use project's existing import path
import { creditWallet } from "../services/wallet.service";
import { TransactionType } from "@prisma/client";
import catchAsync from "../utils/catchAsync"; // existing helper

export class WalletController {
  static getMyWallet = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { walletBalanceCents: true, walletDebtLimitCents: true },
    });
    const settings = await prisma.walletSettings.findFirstOrThrow();
    const ledger = await prisma.transaction.findMany({
      where: { userId, type: { in: [TransactionType.COMMISSION_DEBIT, TransactionType.WALLET_CREDIT] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({
      balanceCents: user.walletBalanceCents,
      debtLimitCents: user.walletDebtLimitCents ?? settings.defaultDebtLimitCents,
      enforceDebtLimit: settings.enforceDebtLimit,
      ledger,
    });
  });

  static listWalletsAdmin = catchAsync(async (req: Request, res: Response) => {
    const { belowLimit, negative } = req.query;
    const where: any = {};
    if (negative === "true") where.walletBalanceCents = { lt: 0 };
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, role: true,
        walletBalanceCents: true, walletDebtLimitCents: true,
      },
      orderBy: { walletBalanceCents: "asc" },
      take: 200,
    });
    res.json({ users });
  });

  static creditWalletAdmin = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    const { amountCents, reason } = req.body as { amountCents: number; reason: string };
    if (!Number.isInteger(amountCents) || amountCents <= 0) return res.status(400).json({ error: "INVALID_AMOUNT" });
    if (!reason || reason.length < 2) return res.status(400).json({ error: "REASON_REQUIRED" });
    const adminId = (req.user as any).id;
    const txResult = await prisma.$transaction(async (tx) => creditWallet(tx, {
      userId,
      amountCents,
      type: TransactionType.WALLET_CREDIT,
      notes: reason,
      performedByUserId: adminId,
    }));
    res.status(201).json({ transaction: txResult });
  });
}
```

- [ ] **Step 2: Routes**

Create `server/src/routes/wallet.routes.ts`:

```typescript
import { Router } from "express";
import { WalletController } from "../controllers/wallet.controller";
import { authenticate } from "../middlewares/authenticate"; // existing
import { requireAdmin } from "../middlewares/requireAdmin"; // existing; use actual name in project

const router = Router();

router.get("/me", authenticate, WalletController.getMyWallet);
router.get("/admin/wallets", authenticate, requireAdmin, WalletController.listWalletsAdmin);
router.post("/admin/wallets/:userId/credit", authenticate, requireAdmin, WalletController.creditWalletAdmin);

export default router;
```

- [ ] **Step 3: Mount router**

In `server/src/app.ts` (or central router file), add:

```typescript
import walletRoutes from "./routes/wallet.routes";
// ...
app.use("/api/wallet", walletRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/wallet.controller.ts server/src/routes/wallet.routes.ts server/src/app.ts
git commit -m "feat(wallet): driver balance endpoint + admin list/credit"
```

---

## Task 8: BusRoute controller + routes

**Files:**
- Create: `server/src/controllers/busRoute.controller.ts`
- Create: `server/src/routes/busRoute.routes.ts`
- Modify: router mount point

- [ ] **Step 1: Controller**

Create `server/src/controllers/busRoute.controller.ts`:

```typescript
import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";

export class BusRouteController {
  static list = catchAsync(async (req: Request, res: Response) => {
    const { operatorId, originCity, destCity, isActive } = req.query;
    const where: any = {};
    if (operatorId) where.operatorId = Number(operatorId);
    if (originCity) where.originCity = String(originCity);
    if (destCity) where.destCity = String(destCity);
    if (isActive !== undefined) where.isActive = isActive === "true";
    const routes = await prisma.busRoute.findMany({
      where,
      include: { stops: { orderBy: { order: "asc" } }, operator: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ originCity: "asc" }, { destCity: "asc" }],
    });
    res.json({ routes });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const { operatorId, originCity, destCity, distanceKm, basePrice, isActive = true, stops = [] } = req.body;
    const route = await prisma.busRoute.create({
      data: {
        operatorId, originCity, destCity, distanceKm, basePrice, isActive,
        stops: { create: stops.map((s: any, i: number) => ({
          name: s.name, city: s.city, order: s.order ?? i, latitude: s.latitude, longitude: s.longitude,
        })) },
      },
      include: { stops: true },
    });
    res.status(201).json({ route });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { originCity, destCity, distanceKm, basePrice, isActive } = req.body;
    const route = await prisma.busRoute.update({
      where: { id },
      data: { originCity, destCity, distanceKm, basePrice, isActive },
    });
    res.json({ route });
  });

  static replaceStops = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { stops } = req.body as { stops: { name: string; city: string; order: number; latitude?: number; longitude?: number }[] };
    await prisma.$transaction([
      prisma.busRouteStop.deleteMany({ where: { routeId: id } }),
      prisma.busRouteStop.createMany({ data: stops.map(s => ({ ...s, routeId: id })) }),
    ]);
    const fresh = await prisma.busRoute.findUniqueOrThrow({
      where: { id },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    res.json({ route: fresh });
  });

  static delete_ = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await prisma.busRoute.delete({ where: { id } });
    res.status(204).end();
  });

  static publicSearch = catchAsync(async (req: Request, res: Response) => {
    const { originCity, destCity } = req.query;
    if (!originCity || !destCity) return res.status(400).json({ error: "ORIGIN_DEST_REQUIRED" });
    const routes = await prisma.busRoute.findMany({
      where: { isActive: true, originCity: String(originCity), destCity: String(destCity) },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    res.json({ routes });
  });
}
```

- [ ] **Step 2: Routes**

Create `server/src/routes/busRoute.routes.ts`:

```typescript
import { Router } from "express";
import { BusRouteController } from "../controllers/busRoute.controller";
import { authenticate } from "../middlewares/authenticate";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/search", BusRouteController.publicSearch);
router.get("/", authenticate, requireAdmin, BusRouteController.list);
router.post("/", authenticate, requireAdmin, BusRouteController.create);
router.patch("/:id", authenticate, requireAdmin, BusRouteController.update);
router.put("/:id/stops", authenticate, requireAdmin, BusRouteController.replaceStops);
router.delete("/:id", authenticate, requireAdmin, BusRouteController.delete_);

export default router;
```

Mount under `/api/bus-routes` in `app.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/busRoute.controller.ts server/src/routes/busRoute.routes.ts server/src/app.ts
git commit -m "feat(bus): routes CRUD + public search endpoint"
```

---

## Task 9: WalletSettings controller + routes

**Files:**
- Create: `server/src/controllers/walletSettings.controller.ts`
- Create: `server/src/routes/walletSettings.routes.ts`
- Modify: router mount point

- [ ] **Step 1: Controller + routes**

Create `server/src/controllers/walletSettings.controller.ts`:

```typescript
import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";

export class WalletSettingsController {
  static get = catchAsync(async (_req: Request, res: Response) => {
    const s = await prisma.walletSettings.findFirstOrThrow();
    res.json({ settings: s });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const { defaultDebtLimitCents, enforceDebtLimit } = req.body as { defaultDebtLimitCents?: number; enforceDebtLimit?: boolean };
    const current = await prisma.walletSettings.findFirstOrThrow();
    const updated = await prisma.walletSettings.update({
      where: { id: current.id },
      data: {
        ...(defaultDebtLimitCents !== undefined && { defaultDebtLimitCents }),
        ...(enforceDebtLimit !== undefined && { enforceDebtLimit }),
      },
    });
    res.json({ settings: updated });
  });
}
```

Create `server/src/routes/walletSettings.routes.ts`:

```typescript
import { Router } from "express";
import { WalletSettingsController } from "../controllers/walletSettings.controller";
import { authenticate } from "../middlewares/authenticate";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();
router.get("/", authenticate, requireAdmin, WalletSettingsController.get);
router.patch("/", authenticate, requireAdmin, WalletSettingsController.update);
export default router;
```

Mount under `/api/admin/wallet-settings` in `app.ts`.

- [ ] **Step 2: Commit**

```bash
git add server/src/controllers/walletSettings.controller.ts server/src/routes/walletSettings.routes.ts server/src/app.ts
git commit -m "feat(wallet): admin settings endpoint"
```

---

## Task 10: Booking accepts boarding/alighting stops + `attendByCode` endpoint

**Files:**
- Modify: `server/src/controllers/ride.controller.ts` (booking handler — search for the `OFF_PLATFORM` block at ~line 1596)
- Modify: validator for booking payload (locate with grep `boardingLocation` or booking validator)
- Create: `server/src/controllers/bookingSeat.controller.ts`
- Create: `server/src/routes/bookingSeat.routes.ts`
- Modify: router mount point

- [ ] **Step 1: Accept the two new fields in the booking payload**

In the booking validator (grep for the booking validator file among `server/src/middlewares/validators/`), add optional integer fields:

```typescript
body("boardingStopId").optional().isInt().toInt(),
body("alightingStopId").optional().isInt().toInt(),
```

In `ride.controller.ts` booking creation (near line 1607), extend the `data` object:

```typescript
const booking = await prisma.booking.create({
  data: {
    rideId: ride.id,
    vehicleId: ride.vehicleId,
    seats: seatsBooked,
    userId: user.id,
    status: isAutomatic ? BookingStatus.APPROVED : BookingStatus.PENDING,
    monitizationType: MonetizationType.PAYMENT,
    boardingStopId: matched_data.boardingStopId ?? null,
    alightingStopId: matched_data.alightingStopId ?? null,
    ...(isAutomatic && seatCodes.length > 0 && { bookingSeats: { create: seatCodes } }),
  },
  include: { bookingSeats: true, booker: { select: profileSelects } },
});
```

- [ ] **Step 2: Create `attendByCode` endpoint**

Create `server/src/controllers/bookingSeat.controller.ts`:

```typescript
import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import catchAsync from "../utils/catchAsync";

export class BookingSeatController {
  static attendByCode = catchAsync(async (req: Request, res: Response) => {
    const { attendanceCode, rideId } = req.body as { attendanceCode: string; rideId: number };
    if (!attendanceCode) return res.status(400).json({ error: "ATTENDANCE_CODE_REQUIRED" });
    const driverId = (req.user as any).id;
    const ride = await prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      select: { id: true, driverId: true, status: true },
    });
    if (ride.driverId !== driverId) return res.status(403).json({ error: "NOT_RIDE_DRIVER" });

    const seat = await prisma.bookingSeat.findUnique({
      where: { attendanceCode },
      include: { booking: true },
    });
    if (!seat || seat.rideId !== rideId) return res.status(404).json({ error: "SEAT_NOT_FOUND" });
    if (seat.attendedAt) return res.status(409).json({ error: "ALREADY_ATTENDED", attendedAt: seat.attendedAt });
    if (seat.isExpired) return res.status(410).json({ error: "SEAT_EXPIRED" });

    const updated = await prisma.bookingSeat.update({
      where: { id: seat.id },
      data: { attendedAt: new Date() },
    });
    res.json({ seat: updated });
  });
}
```

Create `server/src/routes/bookingSeat.routes.ts`:

```typescript
import { Router } from "express";
import { BookingSeatController } from "../controllers/bookingSeat.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();
router.post("/attend", authenticate, BookingSeatController.attendByCode);
export default router;
```

Mount under `/api/booking-seats` in `app.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/ride.controller.ts server/src/controllers/bookingSeat.controller.ts server/src/routes/bookingSeat.routes.ts server/src/middlewares/validators server/src/app.ts
git commit -m "feat(booking): boarding/alighting stops + attendByCode endpoint"
```

---

## Task 11: Ride search — vehicle-category filter + route match

**Files:**
- Modify: `server/src/controllers/ride.controller.ts` (list/search endpoint — grep for `getRides` or `searchRides`)

- [ ] **Step 1: Locate the search endpoint**

Find the public ride search endpoint — the one consumed by `mobile/src/app/ride/search-results.tsx` via `usePublicRides`. Grep for `usePublicRides` under `mobile/` to see the exact API path it calls.

- [ ] **Step 2: Add filters**

In the search handler, extend query param extraction:

```typescript
const vehicleCategory = req.query.vehicleCategory as string | undefined; // "CAR" | "MOTORBIKE" | "BUS"
const originCity = req.query.originCity as string | undefined;
const destCity = req.query.destCity as string | undefined;
```

Extend the `where` clause:

```typescript
if (vehicleCategory) where.vehicle = { ...(where.vehicle ?? {}), category: vehicleCategory };
if (vehicleCategory === "BUS" && originCity && destCity) {
  where.route = { is: { originCity, destCity, isActive: true } };
}
```

Ensure the response `include` pulls `route: { include: { stops: { orderBy: { order: "asc" } } } }` and `vehicle: { select: { ..., category: true, seatLayout: true, userId: true } }`.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/ride.controller.ts
git commit -m "feat(ride-search): filter by vehicle category + bus route match"
```

---

## Task 12: Admin — BusOperatorsTab

**Files:**
- Create: `client/src/pages/admin/tabs/BusOperatorsTab.tsx`
- Create: `client/src/hooks/useBusOperators.ts`

- [ ] **Step 1: Hook**

Create `client/src/hooks/useBusOperators.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api"; // project's existing axios wrapper

export function useBusOperators() {
  return useQuery({
    queryKey: ["bus-operators"],
    queryFn: async () => (await api.get("/users?role=BUS_OPERATOR")).data.users as Array<{
      id: number; firstName: string; lastName: string; email: string; phone: string; isActive: boolean;
    }>,
  });
}

export function useCreateBusOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { firstName: string; lastName: string; email: string; phone: string }) =>
      (await api.post("/users", { ...input, role: "BUS_OPERATOR" })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bus-operators"] }),
  });
}
```

If `/users?role=BUS_OPERATOR` isn't supported by the existing users endpoint, adapt to fetch all users and filter client-side in this hook — admin user lists are small.

- [ ] **Step 2: Tab component**

Create `client/src/pages/admin/tabs/BusOperatorsTab.tsx` following the pattern from `CommissionSettingsTab.tsx:1-27`:

```typescript
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";
import { useBusOperators, useCreateBusOperator } from "@/hooks/useBusOperators";

export const BusOperatorsTab: React.FC = () => {
  const { data: operators, isLoading } = useBusOperators();
  const createMutation = useCreateBusOperator();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(form);
    setForm({ firstName: "", lastName: "", email: "", phone: "" });
  };

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Create bus operator</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Input placeholder="First name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
            <Input placeholder="Last name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
            <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            <Button type="submit" className="col-span-2" disabled={createMutation.isPending}>
              <Plus className="mr-1" size={16} /> Create operator
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Operators ({operators?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>Name</th><th>Email</th><th>Phone</th><th>Status</th></tr></thead>
            <tbody>
              {operators?.map(o => (
                <tr key={o.id} className="border-t">
                  <td className="py-2">{o.firstName} {o.lastName}</td>
                  <td>{o.email}</td>
                  <td>{o.phone}</td>
                  <td>{o.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/tabs/BusOperatorsTab.tsx client/src/hooks/useBusOperators.ts
git commit -m "feat(admin): BusOperatorsTab"
```

---

## Task 13: Admin — BusRoutesTab

**Files:**
- Create: `client/src/pages/admin/tabs/BusRoutesTab.tsx`
- Create: `client/src/hooks/useBusRoutes.ts`

- [ ] **Step 1: Hook**

Create `client/src/hooks/useBusRoutes.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Stop = { id?: number; name: string; city: string; order: number; latitude?: number; longitude?: number };
export type BusRoute = {
  id: number; operatorId: number; originCity: string; destCity: string;
  distanceKm: number; basePrice: string; isActive: boolean; stops: Stop[];
  operator: { id: number; firstName: string; lastName: string };
};

export const useBusRoutes = () => useQuery({
  queryKey: ["bus-routes"],
  queryFn: async () => (await api.get("/bus-routes")).data.routes as BusRoute[],
});

export const useCreateBusRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<BusRoute, "id" | "operator">) => (await api.post("/bus-routes", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bus-routes"] }),
  });
};

export const useReplaceRouteStops = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; stops: Stop[] }) => (await api.put(`/bus-routes/${input.id}/stops`, { stops: input.stops })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bus-routes"] }),
  });
};
```

- [ ] **Step 2: Tab with nested stops editor**

Create `client/src/pages/admin/tabs/BusRoutesTab.tsx`:

```tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { useBusRoutes, useCreateBusRoute, useReplaceRouteStops, type BusRoute } from "@/hooks/useBusRoutes";
import { useBusOperators } from "@/hooks/useBusOperators";

type Stop = { name: string; city: string; order: number; latitude?: number; longitude?: number };

export const BusRoutesTab: React.FC = () => {
  const { data: routes, isLoading } = useBusRoutes();
  const { data: operators } = useBusOperators();
  const create = useCreateBusRoute();
  const replaceStops = useReplaceRouteStops();

  const [form, setForm] = useState({ operatorId: 0, originCity: "", destCity: "", distanceKm: 0, basePrice: 0, isActive: true });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [stopEdits, setStopEdits] = useState<Stop[]>([]);

  if (isLoading) return <Loader2 className="animate-spin" />;

  const submitRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ ...form, basePrice: String(form.basePrice), stops: [] });
    setForm({ operatorId: 0, originCity: "", destCity: "", distanceKm: 0, basePrice: 0, isActive: true });
  };

  const openStops = (r: BusRoute) => {
    setExpanded(r.id);
    setStopEdits(r.stops.map(s => ({ name: s.name, city: s.city, order: s.order, latitude: s.latitude, longitude: s.longitude })));
  };
  const moveStop = (i: number, delta: number) => {
    const next = [...stopEdits];
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((s, idx) => (s.order = idx));
    setStopEdits(next);
  };
  const addStop = () => setStopEdits([...stopEdits, { name: "", city: "", order: stopEdits.length }]);
  const removeStop = (i: number) => setStopEdits(stopEdits.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx })));
  const saveStops = async () => {
    if (expanded == null) return;
    await replaceStops.mutateAsync({ id: expanded, stops: stopEdits });
    setExpanded(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Create route</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submitRoute} className="grid grid-cols-2 gap-3">
            <select className="border rounded p-2" value={form.operatorId} onChange={e => setForm({ ...form, operatorId: Number(e.target.value) })} required>
              <option value={0} disabled>Select operator</option>
              {operators?.map(o => <option key={o.id} value={o.id}>{o.firstName} {o.lastName}</option>)}
            </select>
            <Input placeholder="Origin city" value={form.originCity} onChange={e => setForm({ ...form, originCity: e.target.value })} required />
            <Input placeholder="Destination city" value={form.destCity} onChange={e => setForm({ ...form, destCity: e.target.value })} required />
            <Input placeholder="Distance (km)" type="number" value={form.distanceKm} onChange={e => setForm({ ...form, distanceKm: Number(e.target.value) })} required />
            <Input placeholder="Base price" type="number" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: Number(e.target.value) })} required />
            <Button type="submit" className="col-span-2" disabled={create.isPending}><Plus size={16} className="mr-1" /> Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Routes ({routes?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>Operator</th><th>Origin</th><th>Dest</th><th>Stops</th><th>Price</th><th></th></tr></thead>
            <tbody>
              {routes?.map(r => (
                <React.Fragment key={r.id}>
                  <tr className="border-t">
                    <td className="py-2">{r.operator.firstName} {r.operator.lastName}</td>
                    <td>{r.originCity}</td>
                    <td>{r.destCity}</td>
                    <td>{r.stops.length}</td>
                    <td>{r.basePrice}</td>
                    <td><Button size="sm" variant="outline" onClick={() => openStops(r)}>Edit stops</Button></td>
                  </tr>
                  {expanded === r.id && (
                    <tr><td colSpan={6} className="bg-gray-50 p-3">
                      <div className="space-y-2">
                        {stopEdits.map((s, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input className="flex-1" placeholder="Name" value={s.name} onChange={e => { const n = [...stopEdits]; n[i].name = e.target.value; setStopEdits(n); }} />
                            <Input className="flex-1" placeholder="City" value={s.city} onChange={e => { const n = [...stopEdits]; n[i].city = e.target.value; setStopEdits(n); }} />
                            <Button size="sm" variant="ghost" onClick={() => moveStop(i, -1)}><ArrowUp size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => moveStop(i, 1)}><ArrowDown size={14} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => removeStop(i)}><Trash2 size={14} /></Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={addStop}><Plus size={14} /> Add stop</Button>
                          <Button size="sm" onClick={saveStops} disabled={replaceStops.isPending}><Save size={14} /> Save stops</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>Cancel</Button>
                        </div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/tabs/BusRoutesTab.tsx client/src/hooks/useBusRoutes.ts
git commit -m "feat(admin): BusRoutesTab with stops editor"
```

---

## Task 14: Admin — DriverWalletsTab

**Files:**
- Create: `client/src/pages/admin/tabs/DriverWalletsTab.tsx`
- Create: `client/src/hooks/useDriverWallets.ts`

- [ ] **Step 1: Hook**

Create `client/src/hooks/useDriverWallets.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useDriverWallets = (filters: { negative?: boolean } = {}) => useQuery({
  queryKey: ["driver-wallets", filters],
  queryFn: async () => (await api.get("/wallet/admin/wallets", { params: { negative: filters.negative ? "true" : undefined } })).data.users,
});

export const useCreditWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: number; amountCents: number; reason: string }) =>
      (await api.post(`/wallet/admin/wallets/${input.userId}/credit`, { amountCents: input.amountCents, reason: input.reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["driver-wallets"] }),
  });
};
```

- [ ] **Step 2: Tab with credit modal**

Create `client/src/pages/admin/tabs/DriverWalletsTab.tsx`:

```tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useDriverWallets, useCreditWallet } from "@/hooks/useDriverWallets";

type Row = { id: number; firstName: string; lastName: string; email: string; phone: string; role: string;
  walletBalanceCents: number; walletDebtLimitCents: number | null };

export const DriverWalletsTab: React.FC = () => {
  const [negativeOnly, setNegativeOnly] = useState(false);
  const { data, isLoading } = useDriverWallets({ negative: negativeOnly });
  const credit = useCreditWallet();
  const [open, setOpen] = useState<Row | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  if (isLoading) return <Loader2 className="animate-spin" />;

  const submit = async () => {
    if (!open) return;
    const cents = Math.round(Number(amount) * 100);
    if (!cents || !reason) return;
    await credit.mutateAsync({ userId: open.id, amountCents: cents, reason });
    setOpen(null); setAmount(""); setReason("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Driver wallets ({(data as Row[] | undefined)?.length ?? 0})</CardTitle>
          <label className="text-sm flex items-center gap-2 mt-2">
            <input type="checkbox" checked={negativeOnly} onChange={e => setNegativeOnly(e.target.checked)} />
            Negative balances only
          </label>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th>Name</th><th>Role</th><th>Balance</th><th>Limit</th><th></th></tr></thead>
            <tbody>
              {(data as Row[] | undefined)?.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="py-2">{u.firstName} {u.lastName}</td>
                  <td>{u.role}</td>
                  <td className={u.walletBalanceCents < 0 ? "text-red-600" : ""}>{(u.walletBalanceCents / 100).toLocaleString()}</td>
                  <td>{u.walletDebtLimitCents ? (u.walletDebtLimitCents / 100).toLocaleString() : "default"}</td>
                  <td><Button size="sm" onClick={() => setOpen(u)}>Credit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <Card className="w-96">
            <CardHeader><CardTitle>Credit {open.firstName}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              <Input placeholder="Reason (required)" value={reason} onChange={e => setReason(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
                <Button onClick={submit} disabled={credit.isPending || !amount || !reason}>Confirm</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/tabs/DriverWalletsTab.tsx client/src/hooks/useDriverWallets.ts
git commit -m "feat(admin): DriverWalletsTab with manual credit"
```

---

## Task 15: Admin — WalletSettingsTab

**Files:**
- Create: `client/src/pages/admin/tabs/WalletSettingsTab.tsx`
- Create: `client/src/hooks/useWalletSettings.ts`

- [ ] **Step 1: Hook**

Create `client/src/hooks/useWalletSettings.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Settings = { id: number; defaultDebtLimitCents: number; enforceDebtLimit: boolean };
export const useWalletSettings = () => useQuery({
  queryKey: ["wallet-settings"],
  queryFn: async () => (await api.get("/admin/wallet-settings")).data.settings as Settings,
});
export const useUpdateWalletSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Settings>) => (await api.patch("/admin/wallet-settings", input)).data.settings as Settings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet-settings"] }),
  });
};
```

- [ ] **Step 2: Tab**

Create `client/src/pages/admin/tabs/WalletSettingsTab.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { useWalletSettings, useUpdateWalletSettings } from "@/hooks/useWalletSettings";

export const WalletSettingsTab: React.FC = () => {
  const { data, isLoading } = useWalletSettings();
  const update = useUpdateWalletSettings();
  const [limit, setLimit] = useState(0);
  const [enforce, setEnforce] = useState(false);

  useEffect(() => {
    if (data) { setLimit(data.defaultDebtLimitCents / 100); setEnforce(data.enforceDebtLimit); }
  }, [data]);

  if (isLoading || !data) return <Loader2 className="animate-spin" />;
  const save = () => update.mutateAsync({ defaultDebtLimitCents: Math.round(limit * 100), enforceDebtLimit: enforce });

  return (
    <Card>
      <CardHeader><CardTitle>Wallet settings</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div>
          <label className="text-sm">Default debt limit (whole units)</label>
          <Input type="number" value={limit} onChange={e => setLimit(Number(e.target.value))} />
          <p className="text-xs text-gray-500 mt-1">Drivers can go this far below zero before the toggle blocks them.</p>
        </div>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={enforce} onChange={e => setEnforce(e.target.checked)} />
          Enforce debt limit (block going online below limit)
        </label>
        <Button onClick={save} disabled={update.isPending}><Save size={16} className="mr-1" /> Save</Button>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/admin/tabs/WalletSettingsTab.tsx client/src/hooks/useWalletSettings.ts
git commit -m "feat(admin): WalletSettingsTab"
```

---

## Task 16: Admin — VehiclesTab + RidesTab updates

**Files:**
- Modify: `client/src/pages/admin/tabs/VehiclesTab.tsx`
- Modify: `client/src/pages/admin/tabs/RidesTab.tsx`

- [ ] **Step 1: VehiclesTab — add BUS and seat-layout editor**

In `VehiclesTab.tsx`, find the category dropdown (search for `VehicleCategory` or `"CAR"`). Add `"BUS"` to the options list. Below the category field, conditionally render a seat-layout JSON textarea when `category === "BUS"`:

```tsx
{form.category === "BUS" && (
  <div>
    <label className="text-sm">Seat layout (JSON array of seat labels)</label>
    <textarea
      className="w-full border rounded p-2 font-mono text-sm"
      rows={4}
      placeholder='["1A","1B","2A","2B",...]'
      value={form.seatLayout ?? ""}
      onChange={e => setForm({ ...form, seatLayout: e.target.value })}
    />
  </div>
)}
```

When submitting, `JSON.parse(form.seatLayout)` if non-empty; otherwise send `null`.

- [ ] **Step 2: RidesTab — filter + route column**

Add a select dropdown "Vehicle category" above the existing rides table (`ALL | CAR | MOTORBIKE | BUS`) that appends `vehicleCategory=BUS` (or whichever) to the fetch query. Add a "Route" column rendering `route.originCity → route.destCity` when present.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/tabs/VehiclesTab.tsx client/src/pages/admin/tabs/RidesTab.tsx
git commit -m "feat(admin): BUS vehicle support + route column in rides"
```

---

## Task 17: Admin — register new tabs in `AdminDashboard`

**Files:**
- Modify: `client/src/pages/admin/AdminDashboard.tsx` (imports around line 22–59; tabs array around 564–600; content switch around 599–617)

- [ ] **Step 1: Add imports**

After existing tab imports, add:

```typescript
import { BusOperatorsTab } from "./tabs/BusOperatorsTab";
import { BusRoutesTab } from "./tabs/BusRoutesTab";
import { DriverWalletsTab } from "./tabs/DriverWalletsTab";
import { WalletSettingsTab } from "./tabs/WalletSettingsTab";
import { Bus, Map as MapIcon, Wallet, Settings2 } from "lucide-react";
```

- [ ] **Step 2: Register in `tabs[]` array**

Add entries following the existing pattern (`{ id, icon, label }`):

```typescript
{ id: "bus-operators", icon: Bus, label: "Bus Operators" },
{ id: "bus-routes", icon: MapIcon, label: "Bus Routes" },
{ id: "driver-wallets", icon: Wallet, label: "Driver Wallets" },
{ id: "wallet-settings", icon: Settings2, label: "Wallet Settings" },
```

- [ ] **Step 3: Add content switch cases**

Inside the `TabsContent` switch (the block that renders `activeTab === "commission" ? <CommissionSettingsTab /> : ...`), add the four new cases mirroring existing syntax.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/admin/AdminDashboard.tsx
git commit -m "feat(admin): register bus + wallet tabs in dashboard"
```

---

## Task 18: Mobile — enable BUS in HomeBottomSheet + search wiring

**Files:**
- Modify: `mobile/src/components/HomeBottomSheet.tsx:30` (remove `disabled: true` from BUS option)
- Modify: `mobile/src/app/ride/search-results.tsx` — pass `vehicleCategory` param to API hook

- [ ] **Step 1: Flip BUS enabled**

In `HomeBottomSheet.tsx` change:

```typescript
{ type: "BUS", label: "Bus", icon: Bus, disabled: true },
```

to:

```typescript
{ type: "BUS", label: "Bus", icon: Bus },
```

- [ ] **Step 2: Propagate vehicle category through search**

In the search submission that navigates to `/ride/search-results`, include `vehicleCategory` in the route params (`router.push({ pathname: "/ride/search-results", params: { ..., vehicleCategory: selectedVehicleType } })`).

In `mobile/src/app/ride/search-results.tsx`, read `vehicleCategory` from `useLocalSearchParams()` and pass it to the `usePublicRides({ ..., vehicleCategory })` hook. If the hook's type doesn't include it, extend the hook signature to pass the field as a query param on the outbound request.

- [ ] **Step 3: Manual smoke**

Run `npm run ios` (or android). Open app → home → vehicle type shows Bus not greyed out. Tapping Bus + entering Kigali → Huye + date submits search → list of matching bus rides (seed a route + a Ride in admin first).

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/HomeBottomSheet.tsx mobile/src/app/ride/search-results.tsx mobile/src/hooks/usePublicRides.ts
git commit -m "feat(mobile): enable Bus on home + vehicleCategory on ride search"
```

---

## Task 19: Mobile — TicketQr on booking detail

**Files:**
- Install: `react-native-qrcode-svg`, `react-native-svg`
- Create: `mobile/src/components/TicketQr.tsx`
- Modify: `mobile/src/app/ride/[id]/index.tsx` — render `<TicketQr />` when user has a booking on this ride

- [ ] **Step 1: Install**

From `mobile/`:

```bash
npx expo install react-native-svg react-native-qrcode-svg
```

Expected: both added to `mobile/package.json`.

- [ ] **Step 2: Component**

Create `mobile/src/components/TicketQr.tsx`:

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";

export function TicketQr({ attendanceCode }: { attendanceCode: string }) {
  return (
    <View style={styles.wrap}>
      <QRCode value={attendanceCode} size={180} />
      <Text style={styles.code}>{attendanceCode}</Text>
      <Text style={styles.hint}>Show this to the conductor on boarding.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", padding: 16, gap: 8 },
  code: { fontFamily: "monospace", fontSize: 18, letterSpacing: 2 },
  hint: { fontSize: 12, color: "#666", textAlign: "center" },
});
```

- [ ] **Step 3: Render on booking detail**

In `mobile/src/app/ride/[id]/index.tsx`, locate the section that displays booking/attendance-code info. Import and render `<TicketQr attendanceCode={seat.attendanceCode} />` for each of the current user's `bookingSeats` that are not expired.

- [ ] **Step 4: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/src/components/TicketQr.tsx mobile/src/app/ride/[id]/index.tsx
git commit -m "feat(mobile): QR on booking ticket (attendance code)"
```

---

## Task 20: Mobile — bus-driver manifest + QR scanner

**Files:**
- Install: `expo-camera`
- Create: `mobile/src/app/ride/[id]/manifest.tsx`
- Create: `mobile/src/components/QrScannerModal.tsx`
- Modify: Drawer or active-ride navigation to expose the manifest when the current user is the driver of an active bus ride

- [ ] **Step 1: Install camera**

```bash
cd mobile && npx expo install expo-camera
```

Add required Expo camera permissions to `mobile/app.json` under `expo.plugins`:

```json
["expo-camera", { "cameraPermission": "Allow $(PRODUCT_NAME) to scan passenger QR codes." }]
```

- [ ] **Step 2: Scanner modal**

Create `mobile/src/components/QrScannerModal.tsx`:

```typescript
import React, { useState } from "react";
import { Modal, View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export function QrScannerModal({
  visible, onClose, onScan,
}: { visible: boolean; onClose: () => void; onScan: (code: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.center}>
          <Text>Camera permission required to scan tickets.</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.btn}><Text>Grant</Text></TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.btn}><Text>Close</Text></TouchableOpacity>
        </View>
      </Modal>
    );
  }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={(e) => {
          if (scanned) return;
          setScanned(true);
          onScan(e.data);
        }}
      />
      <TouchableOpacity onPress={onClose} style={[styles.btn, styles.closeBtn]}><Text>Close</Text></TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  btn: { padding: 12, backgroundColor: "#eee", borderRadius: 8 },
  closeBtn: { position: "absolute", top: 40, right: 20, backgroundColor: "rgba(0,0,0,0.5)" },
});
```

- [ ] **Step 3: Manifest screen**

Create `mobile/src/app/ride/[id]/manifest.tsx`:

```typescript
import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { QrScannerModal } from "../../../components/QrScannerModal";
import { useRideManifest, useAttendByCode } from "../../../hooks/useRideManifest";

export default function ManifestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Number(id);
  const { data, refetch } = useRideManifest(rideId);
  const attend = useAttendByCode();
  const [scannerOpen, setScannerOpen] = useState(false);

  const onScan = async (code: string) => {
    setScannerOpen(false);
    try {
      await attend.mutateAsync({ rideId, attendanceCode: code });
      refetch();
    } catch (e: any) {
      Alert.alert("Could not board", e?.response?.data?.error ?? "Unknown error");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data?.bookingSeats ?? []}
        keyExtractor={s => String(s.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={{ flex: 1 }}>{item.passengerName} · {item.attendanceCode}</Text>
            {item.attendedAt ? (
              <Text style={styles.boarded}>Boarded</Text>
            ) : (
              <TouchableOpacity onPress={() => attend.mutateAsync({ rideId, attendanceCode: item.attendanceCode }).then(() => refetch())}>
                <Text style={styles.markBtn}>Board</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setScannerOpen(true)}>
        <Text style={styles.fabTxt}>Scan QR</Text>
      </TouchableOpacity>
      <QrScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScan={onScan} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", padding: 12, borderBottomWidth: 1, borderColor: "#eee", alignItems: "center" },
  boarded: { color: "green", fontWeight: "600" },
  markBtn: { padding: 8, backgroundColor: "#e6f0ff", borderRadius: 6 },
  fab: { position: "absolute", right: 20, bottom: 30, backgroundColor: "#111", paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30 },
  fabTxt: { color: "white", fontWeight: "600" },
});
```

Create the hook file `mobile/src/hooks/useRideManifest.ts`:

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useRideManifest = (rideId: number) => useQuery({
  queryKey: ["ride-manifest", rideId],
  queryFn: async () => (await api.get(`/rides/${rideId}/manifest`)).data,
});

export const useAttendByCode = () => useMutation({
  mutationFn: async (input: { rideId: number; attendanceCode: string }) =>
    (await api.post(`/booking-seats/attend`, input)).data,
});
```

- [ ] **Step 4: Add the manifest endpoint on the server**

Before the mobile code can fetch, add a `GET /api/rides/:id/manifest` endpoint. Grep `server/src/controllers/ride.controller.ts` for an existing "ride details for driver" method; if one already returns bookings with passenger info, extend that route list. Otherwise add:

```typescript
// in ride.controller.ts
static getManifest = catchAsync(async (req: Request, res: Response) => {
  const rideId = Number(req.params.id);
  const driverId = (req.user as any).id;
  const ride = await prisma.ride.findUniqueOrThrow({
    where: { id: rideId },
    select: { id: true, driverId: true },
  });
  if (ride.driverId !== driverId) return res.status(403).json({ error: "NOT_RIDE_DRIVER" });
  const seats = await prisma.bookingSeat.findMany({
    where: { rideId, isExpired: false },
    select: {
      id: true, attendanceCode: true, attendedAt: true,
      booking: { select: { seats: true, boardingStop: { select: { name: true } }, booker: { select: { firstName: true, lastName: true, phone: true } } } },
    },
  });
  const bookingSeats = seats.map(s => ({
    id: s.id,
    attendanceCode: s.attendanceCode,
    attendedAt: s.attendedAt,
    passengerName: s.booking ? `${s.booking.booker.firstName} ${s.booking.booker.lastName}`.trim() : "Walk-up",
    seats: s.booking?.seats ?? 1,
    boardingStop: s.booking?.boardingStop?.name ?? null,
  }));
  res.json({ bookingSeats });
});
```

Add to the rides routes file (wherever ride routes are defined — grep `/rides/:id`):

```typescript
router.get("/:id/manifest", authenticate, RideController.getManifest);
```

- [ ] **Step 5: Commit**

```bash
git add mobile/app.json mobile/package.json mobile/package-lock.json mobile/src/app/ride/\[id\]/manifest.tsx mobile/src/components/QrScannerModal.tsx mobile/src/hooks/useRideManifest.ts server/src/controllers/ride.controller.ts
git commit -m "feat(mobile): bus-driver manifest screen + QR scanner"
```

---

## Task 21: Mobile — wallet screen + drawer item

**Files:**
- Create: `mobile/src/app/(drawer)/wallet.tsx`
- Create: `mobile/src/hooks/useMyWallet.ts`
- Modify: `mobile/src/components/DrawerContent.tsx:29-72` — add Wallet item
- Modify: `mobile/src/app/(drawer)/_layout.tsx` — register the new drawer screen

- [ ] **Step 1: Hook**

`mobile/src/hooks/useMyWallet.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useMyWallet = () => useQuery({
  queryKey: ["my-wallet"],
  queryFn: async () => (await api.get("/wallet/me")).data as {
    balanceCents: number;
    debtLimitCents: number;
    enforceDebtLimit: boolean;
    ledger: Array<{ id: number; type: string; amount: string; createdAt: string; notes: string | null }>;
  },
});
```

- [ ] **Step 2: Wallet screen**

`mobile/src/app/(drawer)/wallet.tsx`:

```typescript
import React from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useMyWallet } from "../../hooks/useMyWallet";

const fmt = (cents: number) => (cents / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function WalletScreen() {
  const { data, isLoading } = useMyWallet();
  if (isLoading || !data) return <ActivityIndicator style={{ marginTop: 40 }} />;
  const balance = data.balanceCents;
  const limit = data.debtLimitCents;
  const available = balance + limit;
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={styles.balance}>{fmt(balance)}</Text>
      <Text style={styles.sub}>Limit: -{fmt(limit)} · Available: {fmt(available)}</Text>
      <Text style={styles.section}>Recent activity</Text>
      <FlatList
        data={data.ledger}
        keyExtractor={l => String(l.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={{ flex: 1 }}>{item.type}</Text>
            <Text>{item.amount}</Text>
          </View>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  balance: { fontSize: 36, fontWeight: "700" },
  sub: { color: "#666", marginBottom: 16 },
  section: { fontWeight: "600", marginVertical: 8 },
  row: { flexDirection: "row", paddingVertical: 10, borderBottomColor: "#eee", borderBottomWidth: 1 },
});
```

- [ ] **Step 3: Drawer integration**

In `DrawerContent.tsx`, add a new entry to `menuItems[]`:

```typescript
{ icon: <Wallet />, label: "Wallet", onPress: () => router.push("/(drawer)/wallet") },
```

In `_layout.tsx`, add:

```tsx
<Drawer.Screen name="wallet" options={{ title: "Wallet" }} />
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/\(drawer\)/wallet.tsx mobile/src/hooks/useMyWallet.ts mobile/src/components/DrawerContent.tsx mobile/src/app/\(drawer\)/_layout.tsx
git commit -m "feat(mobile): wallet screen + drawer entry"
```

---

## Task 22: Mobile — availability-toggle 403 handling

**Files:**
- Modify: the component that calls `PATCH /api/user/availability` (grep for `isAvailableForRideRequest` in `mobile/`)

- [ ] **Step 1: Handle 403**

Wrap the toggle's mutation call to intercept 403 `WALLET_DEBT_LIMIT`:

```typescript
try {
  await updateAvailability.mutateAsync({ isAvailableForRideRequest: nextValue });
} catch (err: any) {
  const code = err?.response?.data?.error;
  if (code === "WALLET_DEBT_LIMIT") {
    Alert.alert(
      "Top up your wallet",
      "Your wallet balance is below the allowed limit. Contact admin to add credit.",
    );
    return;
  }
  throw err;
}
```

Show the toggle as disabled visually while balance is below limit (read `useMyWallet()` in the same component and compute `blocked = data.enforceDebtLimit && data.balanceCents < -data.debtLimitCents`).

- [ ] **Step 2: Commit**

```bash
git add mobile/src/app
git commit -m "feat(mobile): handle WALLET_DEBT_LIMIT on availability toggle"
```

---

## Task 23: End-to-end smoke + update tracker

**Files:**
- Modify: `docs/superpowers/tracking/implementation-status.md`

- [ ] **Step 1: Run migrations and seed on a clean dev DB**

```bash
cd server && npx prisma migrate reset --force && npx prisma db seed
```

Expected: migrations apply cleanly, `WalletSettings` seeded.

- [ ] **Step 2: Backend test suite**

```bash
cd server && npm test
```

Expected: all tests green, including new wallet + commission suites.

- [ ] **Step 3: End-to-end manual smoke**

Document results in a scratch note (not committed):
1. Create BUS_OPERATOR user via admin (seed admin → DashboardTab → Users → create with role).
2. Create a BUS vehicle under that operator user in VehiclesTab (set capacity, seat layout).
3. Create a BusRoute Kigali → Huye with ≥2 stops in BusRoutesTab.
4. Create a Ride via existing admin RidesTab (or mobile "post ride" if supported for BUS) with `vehicle.category = BUS`, `routeId` set, `contributionCollectionMethod = OFF_PLATFORM`.
5. On mobile: login as a passenger, select Bus on home, search Kigali → Huye, book the trip → verify ticket shows QR + attendance code.
6. Login as the bus driver on mobile, open the manifest for that trip, scan the passenger's QR → verify row flips to Boarded.
7. Trigger settlement cron manually (or wait 10 min) → verify: `isSettled = true`; new `Transaction { type: COMMISSION_DEBIT }` row; `vehicle.user.walletBalanceCents` decremented.
8. In admin DriverWalletsTab, locate the operator → use "Credit" action → verify balance rises and new `WALLET_CREDIT` transaction row exists.
9. In WalletSettingsTab, flip `enforceDebtLimit = true`. Drive down a test driver's balance below the limit, try to go online → verify 403 / mobile shows blocked state.
10. Verify a non-bus OFF_PLATFORM P2P ride also generates commission debits on completion (same code path).

- [ ] **Step 4: Update tracker**

In `docs/superpowers/tracking/implementation-status.md`:
- Change slice 1 status to `Done`, add final PR link and one-line outcome.
- Add any deviations encountered during implementation to the slice's "Deviations" section.

```bash
git add docs/superpowers/tracking/implementation-status.md
git commit -m "docs(tracker): mark buses+wallet foundation slice done"
```

---

## Self-review checklist (run once before handing off)

1. **Spec coverage:** all 14 sections of `2026-04-18-buses-and-wallet-foundation-design.md` map to at least one task?
   - §1-3 (context, scope, architecture) — no task; informational.
   - §4 schema → Task 1.
   - §5 passenger → Tasks 18, 19.
   - §6 driver manifest → Task 20.
   - §7 driver wallet UX → Tasks 21, 22.
   - §8 admin tabs → Tasks 12-17.
   - §9 commission debit → Tasks 4, 5.
   - §10 QR details → Task 19.
   - §11 open questions — surfaced during implementation; tracker notes.
   - §12 deviations from source docs — already committed in prior commit; no task.
   - §13 acceptance → Task 23.
   - §14 risks / rollback — test DB reset in Task 23 validates nullable fields.
2. **Placeholders:** none — every code step has a code block; every command has an expected outcome.
3. **Type consistency:** `attendanceCode`, `walletBalanceCents`, `routeId`, `BusRoute`, `WalletSettings`, `COMMISSION_DEBIT`, `WALLET_CREDIT` used consistently across tasks.
