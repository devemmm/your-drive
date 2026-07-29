# Bus Booking Maestro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two iOS Maestro flows (`passenger-book-and-board.yaml`, `driver-setup-and-onboard.yaml`) that exercise the bus booking journey end-to-end. Unblocks Phase B / Payment 3 client sign-off.

**Architecture:** One simulator per flow. Role under test runs in UI; partner role puppeted via `/api/v1/test/*`. Seed extension creates a BUS vehicle for the seeded driver, funded wallets, settings rows, and (for Flow 1) a pre-published bus ride. New test endpoints handle booking approval, boarding, ride creation by passenger, latest-ride lookup, and booking lookup.

**Tech Stack:** Maestro 1.x, iOS Simulator (iPhone 15+), Node 20 + Express + Prisma on the server, React Native + Expo Router 4 + TanStack Query on the mobile side.

**Spec:** `docs/superpowers/specs/2026-05-12-bus-booking-maestro-design.md`

---

## File Structure

### Server (TypeScript / Express / Prisma)

| File | Action | Responsibility |
|---|---|---|
| `server/src/services/testSeed.service.ts` | Modify | Extend seed: settings rows, funded wallets, BUS vehicle for Dan, pre-published Kigali→Huye bus ride. Return new fixture IDs. |
| `server/src/controllers/test.controller.ts` | Modify | Add five new handlers: `approveBooking`, `boardBooking`, `bookRideAsPassenger`, `getLatestRideForDriver`, `getBookingForPassenger`. |
| `server/src/routes/test.routes.ts` | Modify | Register the five new routes. |

### Mobile (React Native / Expo Router 4)

| File | Action | Responsibility |
|---|---|---|
| `mobile/.env.test` | Create or modify | Add `EXPO_PUBLIC_TEST_MODE=1` so test builds short-circuit Places autocomplete. |
| `mobile/src/components/LocationPicker.tsx` | Modify | When `EXPO_PUBLIC_TEST_MODE === "1"`, replace Google Places autocomplete results with curated rows from `mobile/src/lib/rwandaCities.ts`. Add testIDs. |
| `mobile/src/components/HomeBottomSheet.tsx` | Modify | testIDs on vehicle tabs, search bar, mode toggle, search button, etc. |
| `mobile/src/components/RideResultCard.tsx` | Modify | testID `search.resultCard.{rideId}`. |
| `mobile/src/app/ride/search-results.tsx` | Modify | testIDs on list, filterbar. |
| `mobile/src/app/ride/[id]/index.tsx` | Modify | testIDs on book button, banner, passenger rows, approve/decline, start, view manifest. |
| `mobile/src/app/ride/[id]/active.tsx` | Modify | testIDs on screen, eta, driver row. |
| `mobile/src/app/ride/[id]/manifest.tsx` | Modify | testIDs on rows, board button, badge. |
| `mobile/src/app/(drawer)/rides.tsx` | Modify | testIDs on My Rides list rows. |
| `mobile/src/app/post-ride/index.tsx` | Modify | testIDs across all 5 wizard steps + step components. |

### Maestro

| File | Action | Responsibility |
|---|---|---|
| `mobile/.maestro/scripts/approve-booking.js` | Create | POST `/test/bookings/:id/approve`. |
| `mobile/.maestro/scripts/board-booking.js` | Create | POST `/test/bookings/:id/board`. |
| `mobile/.maestro/scripts/set-ride-status.js` | Create | POST `/test/rides/:id/status`. |
| `mobile/.maestro/scripts/latest-ride.js` | Create | GET `/test/users/:id/latest-ride`, sets `output.rideId`. |
| `mobile/.maestro/scripts/passenger-book.js` | Create | POST `/test/rides/:id/book`, sets `output.bookingId`. |
| `mobile/.maestro/scripts/find-booking.js` | Create | GET `/test/rides/:rideId/booking-for-passenger/:passengerId`, sets `output.bookingId`. |
| `mobile/.maestro/flows/bus/passenger-book-and-board.yaml` | Create | Passenger UI, driver puppeted. |
| `mobile/.maestro/flows/bus/driver-setup-and-onboard.yaml` | Create | Driver UI, passenger puppeted. |
| `mobile/.maestro/README.md` | Modify | Update Phase 1 status table; add bus flows section. |

---

## Task 1: Extend test seed with settings rows and funded wallets

**Files:**
- Modify: `server/src/services/testSeed.service.ts:53-99`

- [ ] **Step 1: Add settings upserts above the user creation loop**

In `seedTestFixtures`, replace the existing function body so the prelude (after user deletion, before user creation) upserts singleton settings rows. The rest of the function stays the same; the snippet below is just the insertion to add immediately after the existing `prisma.user.deleteMany({ ... })` call and before the password hash:

```ts
// Singleton settings rows. They are upserted by `id: 1` because each table
// is read with `findFirst()`/`findFirstOrThrow()` in the app, so only one
// row is ever expected.
await prisma.walletSettings.upsert({
  where: { id: 1 },
  update: { defaultDebtLimitCents: 500_000, enforceDebtLimit: false },
  create: { id: 1, defaultDebtLimitCents: 500_000, enforceDebtLimit: false },
});
await prisma.commissionSettings.upsert({
  where: { id: 1 },
  update: { rate: 10 },
  create: { id: 1, rate: 10 },
});
await prisma.feeSetting.upsert({
  where: { id: 1 },
  update: { active: true, type: "DEFAULT_PLATFORM_FEE", amount: 1 },
  create: { id: 1, active: true, type: "DEFAULT_PLATFORM_FEE", amount: 1 },
});
```

If any of the settings models do not have an `id: 1` accessor (e.g., natural keys differ), use `prisma.<model>.findFirst()` then `update`/`create`. Run a quick grep in `server/prisma/schema.prisma` to confirm primary keys.

- [ ] **Step 2: Fund the seeded wallets**

In the existing user creation loop, set `walletBalanceCents: 5_000_000` (RWF 50,000) on both the `create` and the (now redundant) `update` branches. The current `prisma.user.create` only sets `email`, `password`, etc. — add `walletBalanceCents: 5_000_000` to that data block:

```ts
const u = await prisma.user.create({
  data: {
    email: f.email,
    password,
    firstName: f.firstName,
    lastName: f.lastName,
    phoneNumber: f.phoneNumber,
    referralCode,
    isVerified: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    isOnboarded: true,
    isPassengerOnboarded: !f.driver,
    isDriverOnboarded: f.driver,
    termsAccepted: true,
    walletBalanceCents: 5_000_000, // funded for QAT bus flow
  },
  select: { id: true, email: true, phoneNumber: true, referralCode: true },
});
```

- [ ] **Step 3: Manual verification**

Run the dev server, then:

```sh
curl -X POST http://localhost:3000/api/v1/test/reset \
  -H "x-test-token: $TEST_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

Expected: 200 with `data.users[*]` returned. Check the DB:

```sh
docker exec -i $(docker ps -qf name=postgres) psql -U postgres -d yourdrive \
  -c "SELECT email, \"walletBalanceCents\" FROM \"User\" WHERE email LIKE '%@yourdrive.test';"
```

Expected: all rows show `walletBalanceCents = 5000000`.

- [ ] **Step 4: Commit**

```sh
git add server/src/services/testSeed.service.ts
git commit -m "test(seed): fund wallets + ensure settings rows for QAT bus flow"
```

---

## Task 2: Extend test seed with BUS vehicle and pre-published bus ride

**Files:**
- Modify: `server/src/services/testSeed.service.ts` (continue from Task 1; add to `seedTestFixtures` return, add new exports)

- [ ] **Step 1: Add module-level constants**

At the top of the file, near `TEST_PASSWORD`/`TEST_EMAIL_DOMAIN`:

```ts
// Seeded BUS ride: Kigali → Huye, departs in 1 hour.
// Returned to Maestro flows so they can find it via output.rideId.
const KIGALI = { city: "Kigali", region: "Kigali City", latitude: -1.9441, longitude: 30.0619 };
const HUYE = { city: "Huye", region: "Southern Province", latitude: -2.5964, longitude: 29.7395 };
const BUS_VEHICLE = {
  make: "Volvo",
  model: "9700",
  year: 2022,
  color: "White",
  plateNumber: "RAD 999 BUS",
  capacity: 30,
};
```

- [ ] **Step 2: Extend the `SeedResult` type**

Replace the existing `SeedResult` export:

```ts
export type SeedResult = {
  password: string;
  users: SeededUser[];
  registerTarget: typeof REGISTER_TARGET;
  inviter: { id: number; email: string; referralCode: string };
  bus: {
    rideId: number;
    vehicleId: number;
    departureLocationId: number;
    destinationLocationId: number;
    driverId: number;
  };
};
```

- [ ] **Step 3: Add bus-fixture creation at the end of `seedTestFixtures`**

After the existing `inviterFixture` block and before `return { ... }`, insert:

```ts
const driverDan = users.find((u) => u.email === `e2e+driver.dan@${TEST_EMAIL_DOMAIN}`);
if (!driverDan) throw new Error("testSeed: driver Dan fixture not created");

// Tear down any pre-existing bus fixture for Dan (idempotency on re-run).
// Order matters: BookingSeats → Bookings → Ride → Vehicle → Locations.
const oldRides = await prisma.ride.findMany({
  where: { driverId: driverDan.id, vehicle: { category: "BUS" } },
  select: { id: true, departureLocationId: true, destinationLocationId: true, vehicleId: true },
});
const oldRideIds = oldRides.map((r) => r.id);
const oldLocationIds = oldRides.flatMap((r) => [r.departureLocationId, r.destinationLocationId]);
const oldVehicleIds = Array.from(new Set(oldRides.map((r) => r.vehicleId)));

await prisma.bookingSeat.deleteMany({ where: { rideId: { in: oldRideIds } } });
await prisma.booking.deleteMany({ where: { rideId: { in: oldRideIds } } });
await prisma.ride.deleteMany({ where: { id: { in: oldRideIds } } });
await prisma.vehicle.deleteMany({ where: { id: { in: oldVehicleIds } } });
await prisma.location.deleteMany({ where: { id: { in: oldLocationIds } } });

const busVehicle = await prisma.vehicle.create({
  data: {
    userId: driverDan.id,
    make: BUS_VEHICLE.make,
    model: BUS_VEHICLE.model,
    year: BUS_VEHICLE.year,
    color: BUS_VEHICLE.color,
    plateNumber: BUS_VEHICLE.plateNumber,
    category: "BUS",
    capacity: BUS_VEHICLE.capacity,
    verified: true,
  },
});

const departure = await prisma.location.create({
  data: {
    country: "Rwanda", region: KIGALI.region, city: KIGALI.city,
    locationName: "Nyabugogo Bus Park", address: "Nyabugogo, Kigali",
    latitude: KIGALI.latitude, longitude: KIGALI.longitude,
  },
});
const destination = await prisma.location.create({
  data: {
    country: "Rwanda", region: HUYE.region, city: HUYE.city,
    locationName: "Huye Bus Station", address: "Huye, Southern Province",
    latitude: HUYE.latitude, longitude: HUYE.longitude,
  },
});

const now = new Date();
const departureTime = new Date(now.getTime() + 60 * 60 * 1000);  // +1h
const arrivalTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3h

const bus = await prisma.ride.create({
  data: {
    driverId: driverDan.id,
    vehicleId: busVehicle.id,
    departureLocationId: departure.id,
    destinationLocationId: destination.id,
    departureTime,
    estimatedArrivalTime: arrivalTime,
    availableSeats: BUS_VEHICLE.capacity,
    totalSeats: BUS_VEHICLE.capacity,
    contribution: 5000,
    bookingType: "MANUAL",
    status: "PUBLISHED",
    publishedAt: now,
    contributionCollectionMethod: "DIRECT",
    type: "P2P",
  },
});
```

- [ ] **Step 4: Update the `return` block of `seedTestFixtures`**

```ts
return {
  password: TEST_PASSWORD,
  users,
  registerTarget: REGISTER_TARGET,
  inviter: {
    id: inviterFixture.id,
    email: inviterFixture.email,
    referralCode: inviterFixture.referralCode,
  },
  bus: {
    rideId: bus.id,
    vehicleId: busVehicle.id,
    departureLocationId: departure.id,
    destinationLocationId: destination.id,
    driverId: driverDan.id,
  },
};
```

- [ ] **Step 5: Manual verification**

```sh
curl -X POST http://localhost:3000/api/v1/test/reset \
  -H "x-test-token: $TEST_AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.data.bus'
```

Expected: JSON with non-null `rideId`, `vehicleId`, `driverId`, `departureLocationId`, `destinationLocationId`.

Run twice in a row to confirm idempotency — the second response should have a new `rideId` (locations and ride are recreated each time) but the call should succeed without unique-constraint errors.

- [ ] **Step 6: Commit**

```sh
git add server/src/services/testSeed.service.ts
git commit -m "test(seed): add BUS vehicle + pre-published Kigali→Huye ride for QAT"
```

---

## Task 3: Add `approveBooking` test endpoint

**Files:**
- Modify: `server/src/controllers/test.controller.ts`
- Modify: `server/src/routes/test.routes.ts`

- [ ] **Step 1: Add the controller method**

In `test.controller.ts`, after the existing `setRideStatus` method, add:

```ts
static approveBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return next(AppError("Invalid booking id", 400));
  const booking = await prisma.booking.update({
    where: { id },
    data: { status: "APPROVED" },
    select: { id: true, status: true, rideId: true, userId: true },
  });
  return res.json({ success: true, data: booking });
});
```

- [ ] **Step 2: Register the route**

In `test.routes.ts`, after the existing `setRideStatus` route:

```ts
router.post("/bookings/:id/approve", TestController.approveBooking);
```

- [ ] **Step 3: Manual verification**

After running `/test/reset` and booking a ride manually through the app (or via task 5's `bookRideAsPassenger` once it lands), call:

```sh
curl -X POST http://localhost:3000/api/v1/test/bookings/<bookingId>/approve \
  -H "x-test-token: $TEST_AUTH_TOKEN"
```

Expected: 200 with `{ id, status: "APPROVED", rideId, userId }`.

- [ ] **Step 4: Commit**

```sh
git add server/src/controllers/test.controller.ts server/src/routes/test.routes.ts
git commit -m "test(api): add /test/bookings/:id/approve endpoint"
```

---

## Task 4: Add `boardBooking` test endpoint

**Files:**
- Modify: `server/src/controllers/test.controller.ts`
- Modify: `server/src/routes/test.routes.ts`

- [ ] **Step 1: Add the controller method**

```ts
static boardBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return next(AppError("Invalid booking id", 400));

  // Mark the first non-expired BookingSeat as attended. If the booking has
  // multiple seats, the QAT flow only ever uses 1 — we don't need to handle
  // the multi-seat case here.
  const seat = await prisma.bookingSeat.findFirst({
    where: { bookingId: id, isExpired: false, attendedAt: null },
    select: { id: true },
  });
  if (!seat) return next(AppError("No bookable seat found for booking", 404));

  const updated = await prisma.bookingSeat.update({
    where: { id: seat.id },
    data: { attendedAt: new Date() },
    select: { id: true, bookingId: true, attendanceCode: true, attendedAt: true },
  });
  return res.json({ success: true, data: updated });
});
```

- [ ] **Step 2: Register the route**

In `test.routes.ts`:

```ts
router.post("/bookings/:id/board", TestController.boardBooking);
```

- [ ] **Step 3: Manual verification**

```sh
curl -X POST http://localhost:3000/api/v1/test/bookings/<bookingId>/board \
  -H "x-test-token: $TEST_AUTH_TOKEN"
```

Expected: 200 with `attendedAt` set to a recent ISO timestamp.

- [ ] **Step 4: Commit**

```sh
git add server/src/controllers/test.controller.ts server/src/routes/test.routes.ts
git commit -m "test(api): add /test/bookings/:id/board endpoint"
```

---

## Task 5: Add `bookRideAsPassenger` test endpoint

**Files:**
- Modify: `server/src/controllers/test.controller.ts`
- Modify: `server/src/routes/test.routes.ts`

- [ ] **Step 1: Add the controller method**

```ts
static bookRideAsPassenger = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const rideId = Number(req.params.id);
  const { passengerId, seats } = req.body as { passengerId?: number; seats?: number };
  const seatsToBook = Number.isFinite(seats) && seats! > 0 ? Number(seats) : 1;
  if (!Number.isFinite(rideId)) return next(AppError("Invalid ride id", 400));
  if (!Number.isFinite(Number(passengerId))) return next(AppError("passengerId required", 400));

  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    select: { id: true, vehicleId: true, availableSeats: true },
  });
  if (!ride) return next(AppError("Ride not found", 404));

  // Generate a stable 6-char attendance code. QAT flows only need uniqueness
  // within the test DB run, so a Math.random-based code is fine.
  const attendanceCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        rideId,
        vehicleId: ride.vehicleId,
        userId: Number(passengerId),
        seats: seatsToBook,
        status: "PENDING",
      },
      select: { id: true, rideId: true, userId: true, status: true },
    });
    await tx.bookingSeat.create({
      data: {
        bookingId: b.id,
        rideId,
        attendanceCode,
      },
    });
    await tx.ride.update({
      where: { id: rideId },
      data: { availableSeats: { decrement: seatsToBook } },
    });
    return { ...b, attendanceCode };
  });

  return res.json({ success: true, data: booking });
});
```

- [ ] **Step 2: Register the route**

```ts
router.post("/rides/:id/book", TestController.bookRideAsPassenger);
```

- [ ] **Step 3: Manual verification**

```sh
# Reset first
RESET=$(curl -s -X POST http://localhost:3000/api/v1/test/reset \
  -H "x-test-token: $TEST_AUTH_TOKEN" -H "Content-Type: application/json")
RIDE_ID=$(echo $RESET | jq -r '.data.bus.rideId')
PASSENGER_ID=$(echo $RESET | jq -r '.data.users[] | select(.role=="passenger") | .id' | head -1)

curl -X POST http://localhost:3000/api/v1/test/rides/$RIDE_ID/book \
  -H "x-test-token: $TEST_AUTH_TOKEN" -H "Content-Type: application/json" \
  -d "{\"passengerId\": $PASSENGER_ID, \"seats\": 1}"
```

Expected: 200 with `{ id, rideId, userId, status: "PENDING", attendanceCode }`.

- [ ] **Step 4: Commit**

```sh
git add server/src/controllers/test.controller.ts server/src/routes/test.routes.ts
git commit -m "test(api): add /test/rides/:id/book endpoint for passenger puppet"
```

---

## Task 6: Add `getLatestRideForDriver` test endpoint

**Files:**
- Modify: `server/src/controllers/test.controller.ts`
- Modify: `server/src/routes/test.routes.ts`

- [ ] **Step 1: Add the controller method**

```ts
static getLatestRideForDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const driverId = Number(req.params.id);
  if (!Number.isFinite(driverId)) return next(AppError("Invalid user id", 400));
  const ride = await prisma.ride.findFirst({
    where: { driverId, status: "PUBLISHED", isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, departureTime: true, status: true },
  });
  if (!ride) return next(AppError("No published ride found for driver", 404));
  return res.json({ success: true, data: { rideId: ride.id, departureTime: ride.departureTime, status: ride.status } });
});
```

- [ ] **Step 2: Register the route**

```ts
router.get("/users/:id/latest-ride", TestController.getLatestRideForDriver);
```

- [ ] **Step 3: Manual verification**

```sh
DRIVER_ID=$(echo $RESET | jq -r '.data.bus.driverId')
curl http://localhost:3000/api/v1/test/users/$DRIVER_ID/latest-ride \
  -H "x-test-token: $TEST_AUTH_TOKEN"
```

Expected: 200 with `{ rideId, departureTime, status: "PUBLISHED" }`.

- [ ] **Step 4: Commit**

```sh
git add server/src/controllers/test.controller.ts server/src/routes/test.routes.ts
git commit -m "test(api): add /test/users/:id/latest-ride endpoint"
```

---

## Task 7: Add `getBookingForPassenger` test endpoint

**Files:**
- Modify: `server/src/controllers/test.controller.ts`
- Modify: `server/src/routes/test.routes.ts`

- [ ] **Step 1: Add the controller method**

```ts
static getBookingForPassenger = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const rideId = Number(req.params.rideId);
  const passengerId = Number(req.params.passengerId);
  if (!Number.isFinite(rideId) || !Number.isFinite(passengerId)) {
    return next(AppError("Invalid ride or passenger id", 400));
  }
  const booking = await prisma.booking.findFirst({
    where: { rideId, userId: passengerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      bookingSeats: { select: { attendanceCode: true }, take: 1 },
    },
  });
  if (!booking) return next(AppError("No booking found for ride+passenger", 404));
  return res.json({
    success: true,
    data: {
      bookingId: booking.id,
      status: booking.status,
      attendanceCode: booking.bookingSeats[0]?.attendanceCode ?? null,
    },
  });
});
```

- [ ] **Step 2: Register the route**

```ts
router.get("/rides/:rideId/booking-for-passenger/:passengerId", TestController.getBookingForPassenger);
```

- [ ] **Step 3: Manual verification**

```sh
# Use bookingId from Task 5 verification
curl "http://localhost:3000/api/v1/test/rides/$RIDE_ID/booking-for-passenger/$PASSENGER_ID" \
  -H "x-test-token: $TEST_AUTH_TOKEN"
```

Expected: 200 with `{ bookingId, status, attendanceCode }`.

- [ ] **Step 4: Commit**

```sh
git add server/src/controllers/test.controller.ts server/src/routes/test.routes.ts
git commit -m "test(api): add /test/rides/:rideId/booking-for-passenger/:passengerId endpoint"
```

---

## Task 8: Add `EXPO_PUBLIC_TEST_MODE` to mobile env

**Files:**
- Create or modify: `mobile/.env.test`

- [ ] **Step 1: Set the flag**

The `mobile/.maestro/README.md` instructs creating `mobile/.env.test` for the test build. Add (or append):

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
EXPO_PUBLIC_TEST_MODE=1
```

(Keep any existing values; if the file already exists, append `EXPO_PUBLIC_TEST_MODE=1` only.)

- [ ] **Step 2: Verify Expo picks it up**

```sh
cd mobile
EXPO_PUBLIC_TEST_MODE=1 npx expo config --type prebuild | grep -i test_mode
```

Expected: the env value appears in the prebuilt config. If not, restart the dev server with `--clear` after setting the env.

- [ ] **Step 3: Commit**

```sh
git add mobile/.env.test
git commit -m "test(mobile): add EXPO_PUBLIC_TEST_MODE for QAT location picker override"
```

---

## Task 9: LocationPicker test-mode override + testIDs

**Files:**
- Modify: `mobile/src/components/LocationPicker.tsx`

- [ ] **Step 1: Add the curated list + override**

At the top of `LocationPicker.tsx`, after the existing imports, add:

```ts
import { RWANDA_CITIES } from "@/lib/rwandaCities";

const TEST_MODE = process.env.EXPO_PUBLIC_TEST_MODE === "1";

// Stable testID slug per curated city.
function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z]/g, "-");
}

// Synthetic PlacePrediction-shaped items so test mode reuses the same render
// path as the real Google Places results. `place_id` doubles as the testID
// key so flows can target an exact city.
const TEST_PREDICTIONS = Object.values(RWANDA_CITIES).map((c) => ({
  place_id: `test:${citySlug(c.city)}`,
  description: `${c.city}, ${c.region}`,
  structured_formatting: { main_text: c.city, secondary_text: c.region },
}));
```

- [ ] **Step 2: Short-circuit autocomplete + bypass Place Details**

Replace the prediction wiring inside `LocationPicker`. Specifically:

```ts
const citiesQuery = useCityAutocomplete(
  !TEST_MODE && mode === "cities" ? debouncedQuery : "",
  sessionToken
);
const addressesQuery = useAddressAutocomplete(
  !TEST_MODE && mode === "addresses" ? debouncedQuery : "",
  sessionToken
);
const activeQuery = mode === "cities" ? citiesQuery : addressesQuery;

const predictions: PlacePrediction[] = TEST_MODE
  ? TEST_PREDICTIONS.filter((p) =>
      debouncedQuery.length === 0
        ? true
        : p.structured_formatting.main_text.toLowerCase().includes(debouncedQuery.toLowerCase())
    )
  : (activeQuery.data?.data?.predictions ?? []);
```

Replace `handleSelect` with a branched version that skips the network call in test mode:

```ts
async function handleSelect(prediction: PlacePrediction) {
  if (TEST_MODE && prediction.place_id.startsWith("test:")) {
    const slug = prediction.place_id.slice("test:".length);
    const match = Object.values(RWANDA_CITIES).find((c) => citySlug(c.city) === slug);
    if (match) {
      onSelect({
        country: "Rwanda",
        region: match.region,
        city: match.city,
        locationName: match.city,
        address: `${match.city}, ${match.region}`,
        latitude: match.latitude,
        longitude: match.longitude,
      });
      setQuery("");
      onClose();
    }
    return;
  }
  setLoadingDetails(true);
  try {
    const details = await fetchPlaceDetails(prediction.place_id, sessionToken);
    if (details) {
      const location = extractLocation(details);
      onSelect(location);
      setQuery("");
      onClose();
    }
  } finally {
    setLoadingDetails(false);
  }
}
```

- [ ] **Step 3: Add testIDs**

In the `TextInput` for search, set `testID="picker.searchInput"`. In the FlatList renderItem `TouchableOpacity`, set `testID={\`picker.item.${citySlug(item.structured_formatting.main_text)}\`}` so test flows tap `picker.item.kigali`, `picker.item.huye`, etc. Example renderItem change:

```tsx
renderItem={({ item }) => (
  <TouchableOpacity
    style={s.item}
    onPress={() => handleSelect(item)}
    testID={`picker.item.${citySlug(item.structured_formatting.main_text)}`}
  >
    <MapPin size={18} color={colors.text.secondary} />
    <View style={s.itemText}>
      <Text style={s.itemMain}>{item.structured_formatting.main_text}</Text>
      <Text style={s.itemSub} numberOfLines={1}>{item.structured_formatting.secondary_text}</Text>
    </View>
  </TouchableOpacity>
)}
```

- [ ] **Step 4: Confirm `RWANDA_CITIES` keys cover what the seed uses**

`mobile/src/lib/rwandaCities.ts` already includes Kigali, Huye, Butare. No edits needed unless the curated map is missing one of those.

- [ ] **Step 5: Manual smoke**

With a non-test build, the picker should behave as before (Google autocomplete). With `EXPO_PUBLIC_TEST_MODE=1`, opening the picker should show Kigali/Huye/etc. immediately without network calls.

- [ ] **Step 6: Commit**

```sh
git add mobile/src/components/LocationPicker.tsx
git commit -m "feat(mobile): LocationPicker test-mode override with stable testIDs"
```

---

## Task 10: testIDs on `HomeBottomSheet`

**Files:**
- Modify: `mobile/src/components/HomeBottomSheet.tsx`

- [ ] **Step 1: Add testIDs around the existing JSX**

The component is in `mobile/src/components/HomeBottomSheet.tsx`. Add the following testID props inline (no structural changes):

- The `<BottomSheet ref={ref} ...>` parent: add `containerStyle` is fine; instead wrap the `BottomSheetScrollView` with `testID="home.bottomSheet"` on the inner content view if BottomSheet's API doesn't accept testID directly. Simplest: add `testID="home.bottomSheet"` to the outermost `View` inside `BottomSheetScrollView.contentContainerStyle`. If there is no wrapper, add one.
- Vehicle tab `TouchableOpacity` (inside `VEHICLE_OPTIONS.map`): `testID={\`home.vehicleTab.${opt.type}\`}` → produces `home.vehicleTab.CAR`, `.MOTORBIKE`, `.BUS`.
- Search bar `TouchableOpacity`: `testID="home.searchBar"`.
- Mode toggle Request/Find `TouchableOpacity`s: `testID={\`home.modeBtn.${"request" | "find"}\`}`.
- Date field `TouchableOpacity`: `testID="home.dateField"`.
- Passenger Plus / Minus icons (the two `TouchableOpacity`s wrapping `Minus` / `Plus`): `testID="home.paxDecrement"` and `testID="home.paxIncrement"`.
- The wrapping View around the pax counter: `testID="home.paxField"`.
- Action button (`mode === "request" ? "Request Ride" : "Search Rides"`): `testID="home.searchRidesButton"`.

- [ ] **Step 2: Verify the file still renders**

```sh
cd mobile && npm run typecheck
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```sh
git add mobile/src/components/HomeBottomSheet.tsx
git commit -m "test(mobile): add testIDs to HomeBottomSheet for QAT bus flow"
```

---

## Task 11: testIDs on search-results + RideResultCard

**Files:**
- Modify: `mobile/src/app/ride/search-results.tsx`
- Modify: `mobile/src/components/RideResultCard.tsx`

- [ ] **Step 1: testIDs on `search-results.tsx`**

- On the `FlatList`: add `testID="search.list"`.
- On the `FilterBar` (or its wrapper if FilterBar doesn't accept testID): wrap with `<View testID="search.filterBar">` or pass through.

- [ ] **Step 2: testIDs on `RideResultCard.tsx`**

Read the file to find the outermost `TouchableOpacity` / `Card`. Add:

```tsx
<TouchableOpacity
  onPress={...}
  testID={`search.resultCard.${ride.id}`}
  ...
>
```

If multiple ride cards may render with the same first-card pattern, also expose `testID="search.firstCard"` on the first item by reading `index` from the FlatList renderItem (`renderItem={({ item, index }) => <RideResultCard ride={item} isFirst={index === 0} />}` and accepting an `isFirst` prop on the card). Keep it minimal — if the test only needs `firstCard`, the per-ride testID suffices for now.

- [ ] **Step 3: Commit**

```sh
git add mobile/src/app/ride/search-results.tsx mobile/src/components/RideResultCard.tsx
git commit -m "test(mobile): add testIDs to search results"
```

---

## Task 12: testIDs on `ride/[id]/index.tsx`

**Files:**
- Modify: `mobile/src/app/ride/[id]/index.tsx`

- [ ] **Step 1: Add testIDs to existing elements**

Map these props onto the existing JSX (no behavior changes):

- "Book this ride" `Button` (line ~302): pass `testID="ride.bookButton"` (Button is a wrapper; if it doesn't pass testID through, change Button.tsx to forward `testID` via the underlying `Pressable`/`TouchableOpacity`). Same applies to all `<Button />` testID additions below.
- Booking banner `Card` (line ~190 `style={rd.bookingBanner}`): `testID="ride.bookingBanner"`.
- The status `Text` inside the banner (line ~194 `{myBooking.status}`): `testID="ride.bookingStatus"`. Maestro can assert `assertVisible: { id: "ride.bookingStatus", text: "APPROVED" }`.
- `TicketQr` rendered under the banner: pass `testID="ride.attendanceQr"` (or wrap it in `<View testID="ride.attendanceQr">`).
- Driver banner `Card` (line ~153 `style={rd.driverBanner}`): `testID="ride.driverBanner"`.
- "Start ride" `Button`: `testID="ride.startRideButton"`.
- "Cancel ride" `Button`: `testID="ride.cancelRideButton"`.
- "Cancel Booking" `Button`: `testID="ride.cancelBookingButton"`.
- Add a new **"View Manifest"** entry on the driver banner: under "Cancel ride", add a new `<Button title="View Manifest" onPress={() => router.push(\`/ride/${ride.id}/manifest\`)} testID="ride.viewManifestButton" />`. Wrap it so it only appears when `ride.status === "ONGOING"`.
- Passengers section: the outer `Card` gets `testID="ride.passengers.list"`. Each `View style={rd.passengerRow}`: `testID={\`ride.passenger.${booking.id}.row\`}`. The status `Text` showing `booking.status`: `testID={\`ride.passenger.${booking.id}.status\`}`. The Approve `TouchableOpacity`: `testID={\`ride.passenger.${booking.id}.approveButton\`}`. The Decline `TouchableOpacity`: `testID={\`ride.passenger.${booking.id}.declineButton\`}`.

- [ ] **Step 2: typecheck**

```sh
cd mobile && npm run typecheck
```

- [ ] **Step 3: Commit**

```sh
git add mobile/src/app/ride/\[id\]/index.tsx
# also stage Button.tsx if you needed to forward testID
git commit -m "test(mobile): add testIDs to ride detail screen + view manifest button"
```

---

## Task 13: testIDs on `ride/[id]/active.tsx` and `ride/[id]/manifest.tsx`

**Files:**
- Modify: `mobile/src/app/ride/[id]/active.tsx`
- Modify: `mobile/src/app/ride/[id]/manifest.tsx`

- [ ] **Step 1: testIDs on `active.tsx`**

- Top-level `<View style={ar.container}>` (line ~75): `testID="rideActive.screen"`.
- ETA `Text` (line ~84): `testID="rideActive.eta"`.
- Driver name `Text` (line ~81): `testID="rideActive.driverName"`.
- Call button: `testID="rideActive.callButton"`.
- Chat button: `testID="rideActive.chatButton"`.

- [ ] **Step 2: testIDs on `manifest.tsx`**

- `FlatList`: `testID="manifest.list"`.
- Row `View style={styles.row}` (line ~30): `testID={\`manifest.row.${item.id}\`}`.
- "Boarded" `Text` (line ~32): `testID={\`manifest.boardedBadge.${item.id}\`}`.
- "Board" `TouchableOpacity` (line ~35): `testID={\`manifest.boardButton.${item.id}\`}`.
- "Scan QR" `TouchableOpacity` (FAB at line ~42): `testID="manifest.scanFab"`.

- [ ] **Step 3: Commit**

```sh
git add "mobile/src/app/ride/[id]/active.tsx" "mobile/src/app/ride/[id]/manifest.tsx"
git commit -m "test(mobile): add testIDs to active ride + manifest screens"
```

---

## Task 14: testIDs on My Rides drawer screen

**Files:**
- Modify: `mobile/src/app/(drawer)/rides.tsx`

- [ ] **Step 1: Read the file and locate the ride list renderer**

The screen renders three segments. For Flow 2, the driver lands on this screen and needs to tap the newest published ride. Find the FlatList/section that renders driver-owned rides (look for `useMyRides` consumer) and add testIDs on:

- The `FlatList` rendering driver rides: `testID="myRides.list"`.
- Each row's outer `TouchableOpacity`: `testID={\`myRides.row.${ride.id}\`}`.

- [ ] **Step 2: Commit**

```sh
git add "mobile/src/app/(drawer)/rides.tsx"
git commit -m "test(mobile): add testIDs to My Rides list"
```

---

## Task 15: testIDs on `post-ride/index.tsx` (5-step wizard)

**Files:**
- Modify: `mobile/src/app/post-ride/index.tsx`

This task bundles all wizard testIDs because Flow 2's first stage drives the entire wizard.

- [ ] **Step 1: testIDs on the wizard header + footer**

- `<View style={ps.header}>` (line ~190): `testID="postRide.header"`.
- "Next" `Button` (line ~217): `testID="postRide.nextButton"`.
- "Publish Ride" `Button` (line ~219): `testID="postRide.publishButton"`.

- [ ] **Step 2: testIDs on each step's content view**

In each step's outermost `<View style={ps.stepContent}>`, add `testID={\`postRide.step.${0..4}\`}` corresponding to that step. Easiest: pass `step` down to the step components and have them use the appropriate testID, or add the testID at the call site:

```tsx
{step === 0 && (
  <View testID="postRide.step.0">
    <RouteStep ... />
  </View>
)}
{step === 1 && (
  <View testID="postRide.step.1">
    <VehicleStep ... />
  </View>
)}
// ... and so on through step 4
```

- [ ] **Step 3: Step 1 (Route) field testIDs**

In `RouteStep`:

- The origin `TouchableOpacity` (line ~252 `style={ps.locationPickerBtn}`): `testID="postRide.originField"`.
- The destination `TouchableOpacity` (line ~280): `testID="postRide.destinationField"`.
- The departure date `TouchableOpacity` (line ~306): `testID="postRide.dateField"`.
- The departure time `TouchableOpacity` (line ~328): `testID="postRide.timeField"`.

- [ ] **Step 4: Step 2 (Vehicle) field testIDs**

In `VehicleStep`:

- The vehicle card `TouchableOpacity` (line ~379): `testID={\`postRide.vehicleCard.${v.id}\`}`.
- The seats `<Field />` for Available Seats: extend `Field` to forward `testID`; tag the input with `testID="postRide.seatsInput"`.

- [ ] **Step 5: Step 4 (Pricing) field testIDs**

In `PricingStep`:

- Contribution `<Field />`: `testID="postRide.contributionInput"`.
- Booking type `TouchableOpacity`s (line ~426): `testID={\`postRide.bookingType.${type}\`}`.

- [ ] **Step 6: Step 3 (Preferences) toggle testIDs (optional but tidy)**

In `PreferencesStep`:

- AC `ToggleRow`: pass `testID="postRide.acToggle"` (extend `ToggleRow` to forward).
- Smoking `ToggleRow`: `testID="postRide.smokingToggle"`.

- [ ] **Step 7: testID on the success alert OK button**

The success alert at line ~177 (`Alert.alert("Success", "...", [{ text: "OK", ... }])`) is a native alert and testIDs don't apply. Maestro can tap by text: `tapOn { text: "OK" }`. Note in the flow that this is the affordance.

- [ ] **Step 8: typecheck + commit**

```sh
cd mobile && npm run typecheck
git add mobile/src/app/post-ride/index.tsx
git commit -m "test(mobile): add testIDs across post-ride wizard for QAT bus flow"
```

---

## Task 16: Maestro JS puppet scripts

**Files:**
- Create: `mobile/.maestro/scripts/approve-booking.js`
- Create: `mobile/.maestro/scripts/board-booking.js`
- Create: `mobile/.maestro/scripts/set-ride-status.js`
- Create: `mobile/.maestro/scripts/latest-ride.js`
- Create: `mobile/.maestro/scripts/passenger-book.js`
- Create: `mobile/.maestro/scripts/find-booking.js`

All scripts follow the existing `fetch-otp.js` shape: read env vars set by the calling flow, call the test API, throw on non-200, optionally set `output.*`.

- [ ] **Step 1: `approve-booking.js`**

```js
// Marks a booking as APPROVED. Inputs:
//   MAESTRO_BOOKING_ID — booking id to approve
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const id = MAESTRO_BOOKING_ID;
if (!id) throw new Error('approve-booking: MAESTRO_BOOKING_ID is required');

const res = http.post(`${apiUrl}/api/v1/test/bookings/${id}/approve`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: '{}',
});
if (res.status !== 200) throw new Error(`approve-booking failed: ${res.status} ${res.body}`);
```

- [ ] **Step 2: `board-booking.js`**

```js
// Marks the first non-expired BookingSeat as boarded. Inputs:
//   MAESTRO_BOOKING_ID — booking id to board
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const id = MAESTRO_BOOKING_ID;
if (!id) throw new Error('board-booking: MAESTRO_BOOKING_ID is required');

const res = http.post(`${apiUrl}/api/v1/test/bookings/${id}/board`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: '{}',
});
if (res.status !== 200) throw new Error(`board-booking failed: ${res.status} ${res.body}`);
```

- [ ] **Step 3: `set-ride-status.js`**

```js
// Transitions a ride's status. Inputs:
//   MAESTRO_RIDE_ID
//   MAESTRO_RIDE_STATUS — DRAFT|PUBLISHED|ONGOING|COMPLETED|CANCELLED|EXPIRED|BLOCKED
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const rideId = MAESTRO_RIDE_ID;
const status = MAESTRO_RIDE_STATUS;
if (!rideId || !status) throw new Error('set-ride-status: MAESTRO_RIDE_ID and MAESTRO_RIDE_STATUS are required');

const res = http.post(`${apiUrl}/api/v1/test/rides/${rideId}/status`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ status }),
});
if (res.status !== 200) throw new Error(`set-ride-status failed: ${res.status} ${res.body}`);
```

- [ ] **Step 4: `latest-ride.js`**

```js
// Resolves the latest published ride for a driver. Inputs:
//   MAESTRO_DRIVER_ID
// Output: output.rideId
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const driverId = MAESTRO_DRIVER_ID;
if (!driverId) throw new Error('latest-ride: MAESTRO_DRIVER_ID is required');

const res = http.get(`${apiUrl}/api/v1/test/users/${driverId}/latest-ride`, {
  headers: { 'x-test-token': token },
});
if (res.status !== 200) throw new Error(`latest-ride failed: ${res.status} ${res.body}`);
const data = json(res.body).data;
output.rideId = String(data.rideId);
```

- [ ] **Step 5: `passenger-book.js`**

```js
// Books a ride as a passenger (server-side, bypasses UI). Inputs:
//   MAESTRO_RIDE_ID
//   MAESTRO_PASSENGER_ID
// Output: output.bookingId, output.attendanceCode
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const rideId = MAESTRO_RIDE_ID;
const passengerId = MAESTRO_PASSENGER_ID;
if (!rideId || !passengerId) throw new Error('passenger-book: MAESTRO_RIDE_ID and MAESTRO_PASSENGER_ID are required');

const res = http.post(`${apiUrl}/api/v1/test/rides/${rideId}/book`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ passengerId: Number(passengerId), seats: 1 }),
});
if (res.status !== 200) throw new Error(`passenger-book failed: ${res.status} ${res.body}`);
const data = json(res.body).data;
output.bookingId = String(data.id);
output.attendanceCode = data.attendanceCode;
```

- [ ] **Step 6: `find-booking.js`**

```js
// Resolves the latest booking on a ride for a passenger. Inputs:
//   MAESTRO_RIDE_ID
//   MAESTRO_PASSENGER_ID
// Output: output.bookingId
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const rideId = MAESTRO_RIDE_ID;
const passengerId = MAESTRO_PASSENGER_ID;
if (!rideId || !passengerId) throw new Error('find-booking: MAESTRO_RIDE_ID and MAESTRO_PASSENGER_ID are required');

const res = http.get(`${apiUrl}/api/v1/test/rides/${rideId}/booking-for-passenger/${passengerId}`, {
  headers: { 'x-test-token': token },
});
if (res.status !== 200) throw new Error(`find-booking failed: ${res.status} ${res.body}`);
const data = json(res.body).data;
output.bookingId = String(data.bookingId);
```

- [ ] **Step 7: Commit**

```sh
git add mobile/.maestro/scripts/approve-booking.js \
        mobile/.maestro/scripts/board-booking.js \
        mobile/.maestro/scripts/set-ride-status.js \
        mobile/.maestro/scripts/latest-ride.js \
        mobile/.maestro/scripts/passenger-book.js \
        mobile/.maestro/scripts/find-booking.js
git commit -m "test(maestro): add bus booking puppet scripts"
```

---

## Task 17: Maestro flow — `passenger-book-and-board.yaml`

**Files:**
- Create: `mobile/.maestro/flows/bus/passenger-book-and-board.yaml`

- [ ] **Step 1: Make the directory**

```sh
mkdir -p mobile/.maestro/flows/bus
```

- [ ] **Step 2: Write the flow**

```yaml
# Bus booking: passenger UI, driver puppeted.
# Covers: passenger searches a bus ride, books it, sees attendance code,
# driver (puppet) approves → starts → marks boarded → completes.
appId: ${MAESTRO_APP_ID}
---
- runScript: ../../scripts/reset.js
- launchApp:
    clearState: true
    permissions:
      all: allow
- setLocation:
    latitude: -1.9441
    longitude: 30.0619

# Login as the seeded passenger.
- tapOn: { id: "welcome.loginButton" }
- tapOn: { id: "auth.emailInput" }
- inputText: ${output.passengerEmail}
- tapOn: { id: "auth.passwordInput" }
- inputText: ${output.password}
- tapOn: { id: "auth.loginButton" }
- tapOn: { text: "Not Now", optional: true }
- extendedWaitUntil:
    visible: { id: "home.screen" }
    timeout: 15000

# Pull bottom sheet up, pick BUS, pick Huye as destination.
- tapOn: { id: "home.bottomSheet" }
- tapOn: { id: "home.vehicleTab.BUS" }
- tapOn: { id: "home.searchBar" }
- extendedWaitUntil:
    visible: { id: "picker.item.huye" }
    timeout: 5000
- tapOn: { id: "picker.item.huye" }

# Switch to Find mode, search.
- tapOn: { id: "home.modeBtn.find" }
- tapOn: { id: "home.searchRidesButton" }

# Search results — tap the seeded ride.
- extendedWaitUntil:
    visible: { id: "search.list" }
    timeout: 10000
- tapOn: { id: "search.resultCard.${output.bus.rideId}" }

# Book this ride.
- tapOn: { id: "ride.bookButton" }
- extendedWaitUntil:
    visible:
      id: "ride.bookingStatus"
      text: "PENDING"
    timeout: 10000

# Resolve the new booking id for downstream puppets.
- env:
    MAESTRO_RIDE_ID: ${output.bus.rideId}
    MAESTRO_PASSENGER_ID: ${output.passengerId}
  runScript: ../../scripts/find-booking.js

# Driver puppet: approve the booking.
- env:
    MAESTRO_BOOKING_ID: ${output.bookingId}
  runScript: ../../scripts/approve-booking.js
- swipe: { direction: DOWN, from: { id: "ride.bookingBanner" } }
- extendedWaitUntil:
    visible:
      id: "ride.bookingStatus"
      text: "APPROVED"
    timeout: 10000
- assertVisible: { id: "ride.attendanceQr" }

# Driver puppet: start the ride.
- env:
    MAESTRO_RIDE_ID: ${output.bus.rideId}
    MAESTRO_RIDE_STATUS: ONGOING
  runScript: ../../scripts/set-ride-status.js

# Driver puppet: mark passenger boarded.
- env:
    MAESTRO_BOOKING_ID: ${output.bookingId}
  runScript: ../../scripts/board-booking.js
- swipe: { direction: DOWN, from: { id: "ride.bookingBanner" } }
- extendedWaitUntil:
    visible:
      id: "ride.bookingStatus"
      text: "APPROVED"
    timeout: 5000
# (Boarded state is recorded server-side via BookingSeat.attendedAt; today's UI
# doesn't render a distinct "boarded" badge on the passenger booking banner.
# Adjust this assertion once the passenger UI surfaces boarded state.)

# Driver puppet: complete the ride.
- env:
    MAESTRO_RIDE_ID: ${output.bus.rideId}
    MAESTRO_RIDE_STATUS: COMPLETED
  runScript: ../../scripts/set-ride-status.js
- swipe: { direction: DOWN, from: { id: "ride.bookingBanner" } }
- extendedWaitUntil:
    visible:
      id: "ride.bookingStatus"
      text: "COMPLETED"
    timeout: 10000
```

- [ ] **Step 3: Run the flow against a live test stack**

Boot the test backend (`server/`) and the test build on an iOS simulator. Then:

```sh
export MAESTRO_APP_ID=com.yourdrive.mobile.test
export MAESTRO_TEST_API_URL=http://localhost:3000
export MAESTRO_TEST_AUTH_TOKEN=<your token>
maestro test mobile/.maestro/flows/bus/passenger-book-and-board.yaml
```

Expected: green run. If a step times out, screenshot dump in `~/.maestro/tests/<run-id>/` shows the current state — common causes: (a) testID typo, (b) React Query hasn't refetched (try a fallback `back → tap into ride again` instead of swipe), (c) `output.bus.rideId` not populated (verify `reset.js` exposes `output.bus.*`).

If `reset.js` doesn't already expose `output.bus.rideId` etc., update it to spread the new `bus` field:

```js
// In mobile/.maestro/scripts/reset.js, after the existing output.* assignments:
if (payload.bus) {
  output.bus = payload.bus;
  output.bus.rideId = String(payload.bus.rideId);
}
```

Maestro's JS runtime supports nested objects on `output`, but template substitution typically expects flat keys. If `${output.bus.rideId}` doesn't interpolate, flatten in `reset.js`:

```js
output.busRideId = String(payload.bus.rideId);
output.busDriverId = String(payload.bus.driverId);
```

And update the YAML to reference `${output.busRideId}` etc.

- [ ] **Step 4: Commit**

```sh
git add mobile/.maestro/flows/bus/passenger-book-and-board.yaml mobile/.maestro/scripts/reset.js
git commit -m "test(maestro): add passenger bus booking flow"
```

---

## Task 18: Maestro flow — `driver-setup-and-onboard.yaml`

**Files:**
- Create: `mobile/.maestro/flows/bus/driver-setup-and-onboard.yaml`

- [ ] **Step 1: Write the flow**

```yaml
# Bus booking: driver UI, passenger puppeted.
# Covers: driver posts a bus ride through the wizard, passenger (puppet) books,
# driver approves → starts → marks passenger boarded on the manifest → completes.
appId: ${MAESTRO_APP_ID}
---
- runScript: ../../scripts/reset.js
- launchApp:
    clearState: true
    permissions:
      all: allow

# Login as the seeded driver.
- tapOn: { id: "welcome.loginButton" }
- tapOn: { id: "auth.emailInput" }
- inputText: ${output.driverEmail}
- tapOn: { id: "auth.passwordInput" }
- inputText: ${output.password}
- tapOn: { id: "auth.loginButton" }
- tapOn: { text: "Not Now", optional: true }
- extendedWaitUntil:
    visible: { id: "home.screen" }
    timeout: 15000

# Open the drawer, tap "Post a Ride".
- tapOn: { id: "home.menuButton" }
- tapOn: { id: "drawer.post" }
- extendedWaitUntil:
    visible: { id: "postRide.step.0" }
    timeout: 10000

# Step 1 — Route: pick Kigali → Huye. Date/time defaults are accepted.
- tapOn: { id: "postRide.originField" }
- tapOn: { id: "picker.item.kigali" }
- tapOn: { id: "postRide.destinationField" }
- tapOn: { id: "picker.item.huye" }
- tapOn: { id: "postRide.nextButton" }

# Step 2 — Vehicle: pick the seeded BUS vehicle.
- extendedWaitUntil:
    visible: { id: "postRide.step.1" }
    timeout: 5000
- tapOn: { id: "postRide.vehicleCard.${output.busVehicleId}" }
- tapOn: { id: "postRide.nextButton" }

# Step 3 — Preferences: accept defaults.
- tapOn: { id: "postRide.nextButton" }

# Step 4 — Pricing: 5000 RWF, MANUAL booking.
- tapOn: { id: "postRide.contributionInput" }
- inputText: "5000"
- hideKeyboard
- tapOn: { id: "postRide.bookingType.MANUAL" }
- tapOn: { id: "postRide.nextButton" }

# Step 5 — Review + Publish.
- tapOn: { id: "postRide.publishButton" }
- extendedWaitUntil:
    visible: { text: "Success" }
    timeout: 15000
- tapOn: { text: "OK" }

# Puppet: resolve the newly published ride id.
- env:
    MAESTRO_DRIVER_ID: ${output.driverId}
  runScript: ../../scripts/latest-ride.js

# Puppet: Alice (passenger) books the ride.
- env:
    MAESTRO_RIDE_ID: ${output.rideId}
    MAESTRO_PASSENGER_ID: ${output.passengerId}
  runScript: ../../scripts/passenger-book.js

# Navigate to the ride via My Rides.
- tapOn: { id: "home.menuButton" }
- tapOn: { id: "drawer.rides" }
- extendedWaitUntil:
    visible: { id: "myRides.row.${output.rideId}" }
    timeout: 10000
- tapOn: { id: "myRides.row.${output.rideId}" }

# Approve the pending booking.
- extendedWaitUntil:
    visible: { id: "ride.passenger.${output.bookingId}.row" }
    timeout: 10000
- tapOn: { id: "ride.passenger.${output.bookingId}.approveButton" }
- extendedWaitUntil:
    visible:
      id: "ride.passenger.${output.bookingId}.status"
      text: "APPROVED"
    timeout: 10000

# Start the ride.
- tapOn: { id: "ride.startRideButton" }
- tapOn: { text: "Start" }
- tapOn: { text: "Not yet", optional: true }

# Open manifest from the driver banner.
- extendedWaitUntil:
    visible: { id: "ride.viewManifestButton" }
    timeout: 10000
- tapOn: { id: "ride.viewManifestButton" }

# Mark the passenger boarded.
- extendedWaitUntil:
    visible: { id: "manifest.row.${output.bookingId}" }
    timeout: 10000
- tapOn: { id: "manifest.boardButton.${output.bookingId}" }
- extendedWaitUntil:
    visible: { id: "manifest.boardedBadge.${output.bookingId}" }
    timeout: 10000

# Puppet: complete the ride (UI button requires past departureTime, deferred).
- env:
    MAESTRO_RIDE_ID: ${output.rideId}
    MAESTRO_RIDE_STATUS: COMPLETED
  runScript: ../../scripts/set-ride-status.js
```

- [ ] **Step 2: Run the flow**

```sh
maestro test mobile/.maestro/flows/bus/driver-setup-and-onboard.yaml
```

Expected: green run from login → publish → approve → start → manifest → board → complete.

Common issues and fixes:
- Step "tap drawer.post" doesn't reach `postRide.step.0`: confirm the drawer entry routes to the wizard. If it goes to a stub screen instead, navigate via the wizard route directly with `openLink: yourdrive://post-ride` (deferred — add the deep link if needed).
- `postRide.vehicleCard.${output.busVehicleId}` not visible: make sure `reset.js` exposes `output.busVehicleId` (flat key). If not, flatten in `reset.js` like in Task 17.
- "Open tracker" alert appears after Start: the existing dialog has "Open tracker" or "Not yet". The flow taps "Not yet" so we stay on the ride detail screen to find the manifest button.

- [ ] **Step 3: Commit**

```sh
git add mobile/.maestro/flows/bus/driver-setup-and-onboard.yaml
git commit -m "test(maestro): add driver bus booking flow"
```

---

## Task 19: Update Maestro README

**Files:**
- Modify: `mobile/.maestro/README.md`

- [ ] **Step 1: Update the Phase 1 status table and add a bus section**

In the table near the top, change two TODO rows:

```
| `flows/bus/passenger-book-and-board.yaml` — passenger UI, driver puppeted | done |
| `flows/bus/driver-setup-and-onboard.yaml` — driver UI, passenger puppeted | done |
| `testID`s on onboarding, post-ride, search-results, ride/[id]/*, vehicle/add, wallet, transactions | partial — post-ride + ride/[id]/* + search-results done; vehicle/add + wallet + transactions still TODO |
```

(Mark "partial" honestly — vehicle/add, wallet, and transactions testIDs are outside this plan.)

Add a new section "Running the bus flows" after "Running on Android":

```markdown
## Running the bus flows

Both bus flows assume the test backend has been migrated and seeded, and the
test build is installed on the simulator with `EXPO_PUBLIC_TEST_MODE=1`.

```sh
maestro test mobile/.maestro/flows/bus/passenger-book-and-board.yaml
maestro test mobile/.maestro/flows/bus/driver-setup-and-onboard.yaml
```

Spec: `docs/superpowers/specs/2026-05-12-bus-booking-maestro-design.md`.
Plan: `docs/superpowers/plans/2026-05-12-bus-booking-maestro.md`.
```

- [ ] **Step 2: Commit**

```sh
git add mobile/.maestro/README.md
git commit -m "docs(maestro): record bus flow status in README"
```

---

## Task 20: End-to-end suite verification

- [ ] **Step 1: Run the full Maestro suite**

```sh
maestro test mobile/.maestro/flows
```

Expected: all flows green (smoke, auth, settings, bus/*).

- [ ] **Step 2: Repeat 3x to check for flake**

```sh
for i in 1 2 3; do
  maestro test mobile/.maestro/flows/bus
done
```

Expected: green each time. If any step is flaky, increase its `extendedWaitUntil` timeout to 15000ms, or replace `swipe` refresh with `back` → tap into ride from search results / My Rides.

- [ ] **Step 3: Record sign-off**

If all three runs pass, the milestone deliverable is demoable. Mention the result in `docs/superpowers/plans/notes/` (optional) and move on.

---

## Notes

- The flows assume `reset.js` exposes the seeded fixture IDs as flat keys (`output.busRideId`, `output.busVehicleId`, `output.busDriverId`, `output.driverId`, `output.passengerId`). If the YAMLs use `${output.bus.rideId}`-style nested access and Maestro doesn't interpolate it, flatten the keys in `reset.js` (Task 17 step 3 explains).
- `Button.tsx` may need to forward the `testID` prop to its underlying `Pressable`. If not already done, this is a one-line change inside the Button component — confirm before Task 12.
- Server-side test endpoints are not unit-tested in this plan (existing repo test infra is blocked per `auth.register-referral.test.ts` header notes). The Maestro flows themselves are the integration test.
- Follow-ups out of scope: `bus/decline-booking.yaml`, `bus/cancel-ride.yaml`, `bus/complete-ride-ui.yaml`, rate-and-complete, Android coverage.
