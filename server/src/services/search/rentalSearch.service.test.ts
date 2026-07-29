// Unit tests for the shared rental search service.
//
// This service is the single source of truth for the rental list/search
// query. Both the authenticated controller and the new public mirror
// controller call into it. The viewer parameter drives the owner-field
// strip via the response mapper: guests must never see `phoneNumber` or
// `email` on the embedded `user` (vehicle owner).

jest.mock("../../config/database", () => ({
  prisma: {
    vehicle: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "../../config/database";
import { listRentals } from "./rentalSearch.service";

describe("rentalSearch.service.listRentals", () => {
  beforeEach(() => jest.clearAllMocks());

  it("strips owner phone and email when viewer.isGuest is true", async () => {
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        make: "Toyota",
        model: "Vitz",
        year: 2020,
        dailyRate: 30000,
        user: {
          id: 10,
          firstName: "Jane",
          lastName: "Doe",
          phoneNumber: "+250...",
          email: "jane@x.com",
          averageRating: 4.7,
          totalRatings: 12,
          profileImage: { url: "https://example.com/a.png" },
        },
        files: [],
        defaultImage: null,
        pickupLocation: null,
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: true }, filters: {} });
    const user = (result.items[0] as any).user;
    expect(user).not.toHaveProperty("phoneNumber");
    expect(user).not.toHaveProperty("email");
    expect(user).toEqual({
      id: 10,
      firstName: "Jane",
      lastName: "Doe",
      averageRating: 4.7,
      totalRatings: 12,
      profileImage: { url: "https://example.com/a.png" },
    });
    expect(result.total).toBe(1);
  });

  it("keeps owner phone and email when viewer is authenticated", async () => {
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        make: "Toyota",
        model: "Vitz",
        user: {
          id: 10,
          firstName: "Jane",
          lastName: "Doe",
          phoneNumber: "+250...",
          email: "jane@x.com",
        },
        files: [],
        defaultImage: null,
        pickupLocation: null,
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({
      viewer: { isGuest: false, userId: 99 },
      filters: {},
    });
    const user = (result.items[0] as any).user;
    expect(user.phoneNumber).toBe("+250...");
    expect(user.email).toBe("jane@x.com");
  });

  it("applies city / category / price / date filters and pagination", async () => {
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(0);

    const start = new Date("2026-07-01T00:00:00Z");
    const end = new Date("2026-07-05T00:00:00Z");

    await listRentals({
      viewer: { isGuest: true },
      filters: {
        city: "Kigali",
        category: "CAR",
        minDailyRate: 1000,
        maxDailyRate: 5000,
        startDate: start,
        endDate: end,
        page: 2,
        pageSize: 5,
      },
    });

    const findManyArg = (prisma.vehicle.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyArg.where.isAvailableForRental).toBe(true);
    expect(findManyArg.where.category).toBe("CAR");
    expect(findManyArg.where.pickupLocation.city).toEqual({
      contains: "Kigali",
      mode: "insensitive",
    });
    expect(findManyArg.where.dailyRate).toMatchObject({ gte: 1000, lte: 5000 });
    expect(findManyArg.where.rentals.none.startDate.lt).toEqual(end);
    expect(findManyArg.where.rentals.none.endDate.gt).toEqual(start);
    expect(findManyArg.skip).toBe(5); // (page 2 - 1) * pageSize 5
    expect(findManyArg.take).toBe(5);

    // The guest select must NOT include phoneNumber / email on user.
    expect(findManyArg.include.user.select.phoneNumber).toBeUndefined();
    expect(findManyArg.include.user.select.email).toBeUndefined();
  });

  it("emits an APPROVED rental in bookedRanges with kind RENTAL", async () => {
    const start = new Date("2026-06-10T09:00:00Z");
    const end = new Date("2026-06-12T17:00:00Z");
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1, make: "Toyota", model: "Vitz",
        user: null, files: [], defaultImage: null, pickupLocation: null,
        rentals: [{ startDate: start, endDate: end }],
        chauffeurServices: [],
        blockedRanges: [],
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([
      { start: start.toISOString(), end: end.toISOString(), kind: "RENTAL" },
    ]);
  });

  it("emits an ACCEPTED chauffeur service in bookedRanges with kind CHAUFFEUR", async () => {
    const start = new Date("2026-06-15T10:00:00Z");
    const end = new Date("2026-06-15T14:00:00Z");
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: 2, make: "Honda", model: "Fit",
        user: null, files: [], defaultImage: null, pickupLocation: null,
        rentals: [],
        chauffeurServices: [{ startDate: start, endDate: end }],
        blockedRanges: [],
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([
      { start: start.toISOString(), end: end.toISOString(), kind: "CHAUFFEUR" },
    ]);
  });

  it("emits an owner blockedRange in bookedRanges with kind BLOCK", async () => {
    const from = new Date("2026-06-20T00:00:00Z");
    const to = new Date("2026-06-22T00:00:00Z");
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([
      {
        id: 3, make: "Nissan", model: "March",
        user: null, files: [], defaultImage: null, pickupLocation: null,
        rentals: [],
        chauffeurServices: [],
        blockedRanges: [{ from, to }],
      },
    ]);
    (prisma.vehicle.count as jest.Mock).mockResolvedValue(1);

    const result = await listRentals({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([
      { start: from.toISOString(), end: to.toISOString(), kind: "BLOCK" },
    ]);
  });

  it("scopes booking includes to status + 30-day window in the Prisma query", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-04T00:00:00Z"));
    try {
      (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.vehicle.count as jest.Mock).mockResolvedValue(0);

      await listRentals({ viewer: { isGuest: true }, filters: {} });
      const findManyArg = (prisma.vehicle.findMany as jest.Mock).mock.calls[0][0];

      const expectedNow = new Date("2026-06-04T00:00:00Z");
      const expectedEnd = new Date("2026-07-04T00:00:00Z");

      expect(findManyArg.include.rentals.where.status.in).toEqual(["APPROVED", "ACTIVE"]);
      expect(findManyArg.include.chauffeurServices.where.status.in).toEqual(["ACCEPTED", "ACTIVE"]);
      expect(findManyArg.include.rentals.where.endDate.gte).toEqual(expectedNow);
      expect(findManyArg.include.rentals.where.startDate.lte).toEqual(expectedEnd);
      expect(findManyArg.include.chauffeurServices.where.endDate.gte).toEqual(expectedNow);
      expect(findManyArg.include.chauffeurServices.where.startDate.lte).toEqual(expectedEnd);
      expect(findManyArg.include.blockedRanges.where.to.gte).toEqual(expectedNow);
      expect(findManyArg.include.blockedRanges.where.from.lte).toEqual(expectedEnd);
    } finally {
      jest.useRealTimers();
    }
  });
});
