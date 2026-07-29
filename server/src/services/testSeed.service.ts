import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import { generateReferralCode } from "../utils/generateReferralCode";

export const TEST_PASSWORD = "E2eTest!2026";
export const TEST_EMAIL_DOMAIN = "yourdrive.test";

// Deterministic referral code for the seeded inviter fixture. E2E flows
// (e.g. register-with-referral) rely on this being stable across resets.
export const TEST_INVITER_REFERRAL_CODE = "INVITE2026";

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

type Fixture = {
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  driver: boolean;
  referralCode?: string;
};

const FIXTURES: Fixture[] = [
  { email: `e2e+passenger.alice@${TEST_EMAIL_DOMAIN}`, phoneNumber: "+250788000001", firstName: "Alice", lastName: "Passenger", driver: false },
  { email: `e2e+passenger.bob@${TEST_EMAIL_DOMAIN}`,   phoneNumber: "+250788000002", firstName: "Bob",   lastName: "Passenger", driver: false },
  { email: `e2e+driver.dan@${TEST_EMAIL_DOMAIN}`,      phoneNumber: "+250788000003", firstName: "Dan",   lastName: "Driver",    driver: true  },
  { email: `e2e+driver.dora@${TEST_EMAIL_DOMAIN}`,     phoneNumber: "+250788000004", firstName: "Dora",  lastName: "Driver",    driver: true  },
  { email: `e2e+inviter@${TEST_EMAIL_DOMAIN}`,         phoneNumber: "+250788000005", firstName: "Iris",  lastName: "Inviter",   driver: false, referralCode: TEST_INVITER_REFERRAL_CODE },
];

const REGISTER_TARGET = {
  email: `e2e+register.target@${TEST_EMAIL_DOMAIN}`,
  phoneNumber: "+250788000099",
};

type SeededUser = {
  id: number;
  email: string;
  phoneNumber: string | null;
  role: "passenger" | "driver";
  referralCode: string | null;
};

export type SeedResult = {
  password: string;
  users: SeededUser[];
  registerTarget: typeof REGISTER_TARGET;
  operator: {
    id: number;
    email: string;
    phoneNumber: string | null;
    busVehicleId: number;
    routeId: number;
    routeDepartureId: number;
  };
  inviter: {
    id: number;
    email: string;
    referralCode: string;
  };
  bus: {
    rideId: number;
    vehicleId: number;
    departureLocationId: number;
    destinationLocationId: number;
    driverId: number;
  };
};

export async function seedTestFixtures(): Promise<SeedResult> {
  // Pre-user-delete teardown: kill any old bus fixture rides BEFORE deleting
  // the test users. Ride.driver has no onDelete: Cascade, so user.deleteMany
  // would FK-fail if a previously-seeded ride still points at one of them.
  // Vehicle is User-onDelete cascaded, so we don't need to delete it here.
  const staleRides = await prisma.ride.findMany({
    where: {
      driver: { email: { contains: `@${TEST_EMAIL_DOMAIN}` } },
    },
    select: { id: true, departureLocationId: true, destinationLocationId: true },
  });
  const staleRideIds = staleRides.map((r) => r.id);
  const staleLocationIds = staleRides.flatMap((r) => [r.departureLocationId, r.destinationLocationId]);

  if (staleRideIds.length > 0) {
    await prisma.bookingSeat.deleteMany({ where: { rideId: { in: staleRideIds } } });
    await prisma.booking.deleteMany({ where: { rideId: { in: staleRideIds } } });
    await prisma.ride.deleteMany({ where: { id: { in: staleRideIds } } });
  }
  if (staleLocationIds.length > 0) {
    await prisma.location.deleteMany({ where: { id: { in: staleLocationIds } } });
  }

  // BusRoute.operator has no onDelete: Cascade, so a route owned by a test
  // operator FK-blocks the user.deleteMany below. Delete the operator's routes
  // first — their BusRouteDeparture rows cascade off the route delete (the
  // departure.route relation IS onDelete: Cascade). The materialized rides that
  // point at those departures via routeDepartureId were already removed by the
  // stale-ride teardown above (their driver is the operator, a @yourdrive.test
  // user), so no FK references the departures by the time they cascade away.
  const staleRoutes = await prisma.busRoute.findMany({
    where: { operator: { email: { contains: `@${TEST_EMAIL_DOMAIN}` } } },
    select: { id: true },
  });
  if (staleRoutes.length > 0) {
    await prisma.busRoute.deleteMany({ where: { id: { in: staleRoutes.map((r) => r.id) } } });
  }

  // RideRequest.user has no onDelete: Cascade, so any ride request created by a
  // test user (e.g. a passenger requesting a ride in a prior run) FK-blocks the
  // user.deleteMany below. Tear those down first — their dependents
  // (RideRequestMatch, RideBid) cascade off the RideRequest delete.
  const staleRequests = await prisma.rideRequest.findMany({
    where: { user: { email: { contains: `@${TEST_EMAIL_DOMAIN}` } } },
    select: { id: true, originId: true, destinationId: true },
  });
  const staleRequestIds = staleRequests.map((r) => r.id);
  const staleRequestLocationIds = staleRequests
    .flatMap((r) => [r.originId, r.destinationId])
    .filter((id): id is number => id != null);
  if (staleRequestIds.length > 0) {
    await prisma.rideRequest.deleteMany({ where: { id: { in: staleRequestIds } } });
  }
  if (staleRequestLocationIds.length > 0) {
    await prisma.location.deleteMany({ where: { id: { in: staleRequestLocationIds } } });
  }

  await prisma.user.deleteMany({
    where: { email: { contains: `@${TEST_EMAIL_DOMAIN}` } },
  });

  // Test-DB singleton settings rows. `walletSettings` and `commissionSettings`
  // are app-wide singletons read via `findFirst()`/`findFirstOrThrow()`. `feeSetting`
  // is NOT a singleton in production (admin can create multiple rows per FeeType),
  // but a fresh test DB has none — keying on `id: 1` ensures one active
  // DEFAULT_PLATFORM_FEE row exists for the commission lookup at
  // ride.controller.ts:1528 (`findFirst({ where: { type: "DEFAULT_PLATFORM_FEE",
  // active: true } })`).
  await prisma.walletSettings.upsert({
    where: { id: 1 },
    update: { defaultDebtLimitCents: 500_000, enforceDebtLimit: false },
    create: { id: 1, defaultDebtLimitCents: 500_000, enforceDebtLimit: false },
  });
  await prisma.commissionSettings.upsert({
    where: { id: 1 },
    update: { rate: 10 }, // 10%
    create: { id: 1, rate: 10 }, // 10%
  });
  await prisma.feeSetting.upsert({
    where: { id: 1 },
    update: { active: true, type: "DEFAULT_PLATFORM_FEE", amount: 1 }, // 1 RWF (default platform fee per booking)
    create: { id: 1, active: true, type: "DEFAULT_PLATFORM_FEE", amount: 1 }, // 1 RWF (default platform fee per booking)
  });

  const password = await bcrypt.hash(TEST_PASSWORD, 10);
  const users: SeededUser[] = [];

  for (const f of FIXTURES) {
    const referralCode = f.referralCode ?? (await generateReferralCode());
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
    users.push({ ...u, role: f.driver ? "driver" : "passenger" });
  }

  const inviterFixture = users.find((u) => u.email === `e2e+inviter@${TEST_EMAIL_DOMAIN}`);
  if (!inviterFixture || !inviterFixture.referralCode) {
    throw new Error("testSeed: inviter fixture not created");
  }

  const driverDan = users.find((u) => u.email === `e2e+driver.dan@${TEST_EMAIL_DOMAIN}`);
  if (!driverDan) throw new Error("testSeed: driver Dan fixture not created");

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
      country: "Rwanda",
      region: KIGALI.region,
      city: KIGALI.city,
      locationName: "Nyabugogo Bus Park",
      address: "Nyabugogo, Kigali",
      latitude: KIGALI.latitude,
      longitude: KIGALI.longitude,
    },
  });
  const destination = await prisma.location.create({
    data: {
      country: "Rwanda",
      region: HUYE.region,
      city: HUYE.city,
      locationName: "Huye Bus Station",
      address: "Huye, Southern Province",
      latitude: HUYE.latitude,
      longitude: HUYE.longitude,
    },
  });

  // Schedule the seeded bus ride for tomorrow so it doesn't overlap with
  // any ride the driver-setup flow creates today (the post-ride wizard
  // rejects overlapping windows for the same driver).
  const now = new Date();
  const departureTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const arrivalTime = new Date(now.getTime() + 27 * 60 * 60 * 1000);

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
      // Spec said "DIRECT" but the Prisma `ContributionCollectionMethod` enum is
      // `VIA_PLATFORM | OFF_PLATFORM`. OFF_PLATFORM matches bus operators
      // collecting fares directly (cash on trip).
      contributionCollectionMethod: "OFF_PLATFORM",
      type: "P2P",
    },
  });

  // ---- Bus operator + recurring schedule fixture ----
  // The operator portal (web) and the passenger recurring-booking flow (mobile)
  // both need a BUS_OPERATOR who owns a route with at least one active
  // BusRouteDeparture. The public operator list only surfaces operators with
  // `operatorRoutes: { some: { isActive: true } }`, and the route's schedule is
  // the set of active departures — so all three (operator, active route, active
  // departure) must exist for the chain to be browsable + bookable.
  const operator = await prisma.user.create({
    data: {
      email: `e2e+operator.olivia@${TEST_EMAIL_DOMAIN}`,
      password,
      firstName: "Olivia",
      lastName: "Operator",
      phoneNumber: "+250788000006",
      referralCode: await generateReferralCode(),
      role: "BUS_OPERATOR",
      isVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      isOnboarded: true,
      termsAccepted: true,
      walletBalanceCents: 0,
    },
    select: { id: true, email: true, phoneNumber: true },
  });

  // A second bus, owned by the operator (the seeded BUS_VEHICLE above belongs to
  // driver Dan and powers the P2P bus flow). useOperatorBuses lists the logged-in
  // operator's own vehicles, and the schedule departure must reference one.
  const operatorBus = await prisma.vehicle.create({
    data: {
      userId: operator.id,
      make: "Yutong",
      model: "ZK6122",
      year: 2023,
      color: "Blue",
      plateNumber: "RAD 100 OPS",
      category: "BUS",
      capacity: 40,
      verified: true,
    },
  });

  const route = await prisma.busRoute.create({
    data: {
      operatorId: operator.id,
      originCity: KIGALI.city,
      destCity: HUYE.city,
      distanceKm: 135,
      basePrice: 5000,
      isActive: true,
    },
  });

  // Boarding/drop-off stops — the mobile confirm-booking screen requires a
  // valid stop pair (alighting after boarding), so a stopless route is
  // unbookable there. Mirror a real operator route: origin + destination.
  await prisma.busRouteStop.createMany({
    data: [
      { routeId: route.id, name: "Nyabugogo Terminal", city: KIGALI.city, order: 0, latitude: KIGALI.latitude, longitude: KIGALI.longitude },
      { routeId: route.id, name: "Huye Bus Park", city: HUYE.city, order: 1, latitude: HUYE.latitude, longitude: HUYE.longitude },
    ],
  });

  const routeDeparture = await prisma.busRouteDeparture.create({
    data: {
      routeId: route.id,
      timeOfDay: "08:00",
      vehicleId: operatorBus.id,
      isActive: true,
    },
  });

  return {
    password: TEST_PASSWORD,
    users,
    registerTarget: REGISTER_TARGET,
    operator: {
      id: operator.id,
      email: operator.email,
      phoneNumber: operator.phoneNumber,
      busVehicleId: operatorBus.id,
      routeId: route.id,
      routeDepartureId: routeDeparture.id,
    },
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
}
