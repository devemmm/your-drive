// Unit tests for the shared driver-nearby search service.
//
// This service is the single source of truth for the "live drivers near a
// viewport" query. Both the legacy authed controller (`/drivers/nearby`
// behind `isAuthenticated`) and the new public mirror controller
// (`/public/drivers/nearby`, no auth) call into it.
//
// Nearby-driver rows carry no auth-only fields by construction (only
// rotation-hashed id, lat/lng, and vehicleCategory), so guest and authed
// responses are byte-for-byte identical. The tests pin that contract and
// also exercise the bbox-clamp + active-trip filter that the legacy
// service applied.

jest.mock("../../config/database", () => ({
  prisma: {
    driverPresence: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../utils/driverPresenceToken", () => ({
  hashDriverToken: jest.fn((userId: number) => `hash-${userId}`),
  currentRotationKey: jest.fn(() => "2026-06-02"),
}));

jest.mock("../driverPresence.service", () => ({
  DriverPresenceService: {
    hasActiveTrip: jest.fn(),
  },
}));

import { prisma } from "../../config/database";
import { DriverPresenceService } from "../driverPresence.service";
import { listNearbyDrivers } from "./driverNearbySearch.service";

const presenceRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  userId: 1,
  latitude: -1.95,
  longitude: 30.06,
  user: { id: 1 },
  currentVehicle: { category: "CAR" },
  ...overrides,
});

describe("driverNearbySearch.service.listNearbyDrivers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (DriverPresenceService.hasActiveTrip as jest.Mock).mockResolvedValue(false);
  });

  it("returns the same row shape for guests and authed viewers (no PII fields on the wire)", async () => {
    (prisma.driverPresence.findMany as jest.Mock).mockResolvedValue([
      presenceRow({ userId: 1, latitude: -1.95, longitude: 30.06 }),
      presenceRow({
        userId: 2,
        latitude: -1.96,
        longitude: 30.07,
        currentVehicle: { category: "MOTORBIKE" },
      }),
    ]);

    const bounds = { swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 };
    const guest = await listNearbyDrivers({ viewer: { isGuest: true }, bounds });
    const authed = await listNearbyDrivers({
      viewer: { isGuest: false, userId: 99 },
      bounds,
    });

    // Both responses must carry identical driver rows — nearby payloads
    // are non-PII by construction, so guest and authed see the same data.
    expect(guest.drivers).toEqual(authed.drivers);
    expect(guest.drivers).toHaveLength(2);
    expect(guest.drivers[0]).toEqual({
      id: "hash-1",
      latitude: -1.95,
      longitude: 30.06,
      vehicleCategory: "CAR",
    });
    expect(guest.drivers[1]).toEqual({
      id: "hash-2",
      latitude: -1.96,
      longitude: 30.07,
      vehicleCategory: "MOTORBIKE",
    });
    expect(typeof guest.fetchedAt).toBe("string");
  });

  it("strips phoneNumber / email defensively for guest viewers even if a future row carries them", async () => {
    // The current row shape never includes PII, but the mapper is the
    // canonical strip point. This test pins the contract: if a future
    // schema change ever broadens the row, guest responses must still
    // never leak `phoneNumber` or `email`.
    (prisma.driverPresence.findMany as jest.Mock).mockResolvedValue([
      {
        ...presenceRow(),
        // Simulate a future broadening of the projection.
        phoneNumber: "+250...",
        email: "leak@x.com",
      },
    ]);

    const guest = await listNearbyDrivers({
      viewer: { isGuest: true },
      bounds: { swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 },
    });

    expect(guest.drivers[0]).not.toHaveProperty("phoneNumber");
    expect(guest.drivers[0]).not.toHaveProperty("email");
  });

  it("filters out drivers currently on an active trip", async () => {
    (prisma.driverPresence.findMany as jest.Mock).mockResolvedValue([
      presenceRow({ userId: 1 }),
      presenceRow({ userId: 2 }),
      presenceRow({ userId: 3 }),
    ]);
    (DriverPresenceService.hasActiveTrip as jest.Mock).mockImplementation(
      async (userId: number) => userId === 2 // only #2 is on an active trip
    );

    const result = await listNearbyDrivers({
      viewer: { isGuest: true },
      bounds: { swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 },
    });

    const ids = result.drivers.map((d) => d.id);
    expect(ids).toEqual(["hash-1", "hash-3"]);
  });

  it("clamps an oversized bounding box to MAX_BBOX_DEGREES before querying", async () => {
    (prisma.driverPresence.findMany as jest.Mock).mockResolvedValue([]);

    // Caller supplies a 2-degree square — much larger than the 0.2 clamp.
    await listNearbyDrivers({
      viewer: { isGuest: true },
      bounds: { swLat: -2, swLng: 30, neLat: 0, neLng: 32 },
    });

    const findManyArg = (prisma.driverPresence.findMany as jest.Mock).mock
      .calls[0][0];
    const latSpan = findManyArg.where.latitude.lte - findManyArg.where.latitude.gte;
    const lngSpan = findManyArg.where.longitude.lte - findManyArg.where.longitude.gte;
    // Allow for floating point — but the span must be ~0.2, not ~2.
    expect(latSpan).toBeCloseTo(0.2, 6);
    expect(lngSpan).toBeCloseTo(0.2, 6);
  });

  it("returns an empty drivers array (with fetchedAt) when no presence rows match", async () => {
    (prisma.driverPresence.findMany as jest.Mock).mockResolvedValue([]);

    const result = await listNearbyDrivers({
      viewer: { isGuest: true },
      bounds: { swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 },
    });

    expect(result.drivers).toEqual([]);
    expect(typeof result.fetchedAt).toBe("string");
    // hasActiveTrip should not be invoked when there are no rows.
    expect(DriverPresenceService.hasActiveTrip).not.toHaveBeenCalled();
  });

  it("applies the freshness TTL and presence filters on the where clause", async () => {
    (prisma.driverPresence.findMany as jest.Mock).mockResolvedValue([]);

    await listNearbyDrivers({
      viewer: { isGuest: true },
      bounds: { swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 },
    });

    const findManyArg = (prisma.driverPresence.findMany as jest.Mock).mock
      .calls[0][0];
    expect(findManyArg.where.updatedAt.gt).toBeInstanceOf(Date);
    expect(findManyArg.where.user).toEqual({ isAvailableForRideRequest: true });
    expect(findManyArg.where.currentVehicleId).toEqual({ not: null });
  });
});
