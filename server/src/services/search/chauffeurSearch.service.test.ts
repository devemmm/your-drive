// Unit tests for the shared chauffeur search service.
//
// This service is the single source of truth for the "available chauffeur
// drivers" search query. Both the existing `searchAvailableDrivers`
// endpoint (currently mounted under `/public/chauffeur-drivers`) and the
// new `/public/chauffeur-services/search` mirror call into it. The viewer
// parameter drives the owner-field strip via the response mapper: guests
// must never see `phoneNumber` or `email` on a driver row.

jest.mock("../../config/database", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from "../../config/database";
import { listChauffeurs } from "./chauffeurSearch.service";

describe("chauffeurSearch.service.listChauffeurs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("strips phone and email when viewer.isGuest is true", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+250...",
        email: "j@x.com",
        averageRating: 4.5,
        totalRatings: 8,
        profileImage: {
          id: 7,
          url: "https://example.com/p.png",
          type: "IMAGE",
          category: "PROFILE",
          publicId: "p-7",
          userId: 1,
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
        chauffeurHourlyRate: 25,
        chauffeurDailyRate: 180,
        chauffeurDescription: "Experienced",
        drivingExperience: "10 years",
        languagesSpoken: ["en", "fr"],
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await listChauffeurs({
      viewer: { isGuest: true },
      filters: {},
    });
    const driver = result.items[0] as any;
    expect(driver).not.toHaveProperty("phoneNumber");
    expect(driver).not.toHaveProperty("email");
    expect(driver).toMatchObject({
      id: 1,
      firstName: "John",
      lastName: "Doe",
      averageRating: 4.5,
      languagesSpoken: ["en", "fr"],
      drivingExperience: "10 years",
    });
    expect(result.total).toBe(1);
  });

  it("keeps phone and email when viewer is authenticated", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "+250...",
        email: "j@x.com",
        averageRating: 4.5,
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await listChauffeurs({
      viewer: { isGuest: false, userId: 99 },
      filters: {},
    });
    const driver = result.items[0] as any;
    expect(driver.phoneNumber).toBe("+250...");
    expect(driver.email).toBe("j@x.com");
  });

  it("applies rate / date / pagination filters", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    const start = new Date("2026-07-01T00:00:00Z");
    const end = new Date("2026-07-05T00:00:00Z");

    await listChauffeurs({
      viewer: { isGuest: true },
      filters: {
        minHourlyRate: 10,
        maxHourlyRate: 50,
        minDailyRate: 100,
        maxDailyRate: 500,
        startDate: start,
        endDate: end,
        page: 2,
        pageSize: 5,
      },
    });

    const findManyArg = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyArg.where.isAvailableForChauffeur).toBe(true);
    expect(findManyArg.where.isDeleted).toBe(false);
    expect(findManyArg.where.chauffeurHourlyRate).toMatchObject({
      gte: 10,
      lte: 50,
    });
    expect(findManyArg.where.chauffeurDailyRate).toMatchObject({
      gte: 100,
      lte: 500,
    });
    expect(
      findManyArg.where.driverChauffeurServices.none.startDate.lt
    ).toEqual(end);
    expect(findManyArg.where.driverChauffeurServices.none.endDate.gt).toEqual(
      start
    );
    expect(findManyArg.skip).toBe(5); // (page 2 - 1) * 5
    expect(findManyArg.take).toBe(5);

    // The guest select must NOT include phoneNumber / email.
    expect(findManyArg.select.phoneNumber).toBeUndefined();
    expect(findManyArg.select.email).toBeUndefined();
  });

  it("includes phone and email on the Prisma select when authed", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);

    await listChauffeurs({
      viewer: { isGuest: false, userId: 1 },
      filters: {},
    });

    const findManyArg = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyArg.select.phoneNumber).toBe(true);
    expect(findManyArg.select.email).toBe(true);
  });

  it("emits an ACCEPTED chauffeur service in bookedRanges with kind CHAUFFEUR", async () => {
    const start = new Date("2026-06-15T10:00:00Z");
    const end = new Date("2026-06-15T14:00:00Z");
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 1, firstName: "John", lastName: "Doe",
        profileImage: null, averageRating: 4.5, totalRatings: 8,
        chauffeurHourlyRate: 25, chauffeurDailyRate: 180,
        chauffeurDescription: null, drivingExperience: null, languagesSpoken: [],
        driverChauffeurServices: [{ startDate: start, endDate: end }],
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await listChauffeurs({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([
      { start: start.toISOString(), end: end.toISOString(), kind: "CHAUFFEUR" },
    ]);
  });

  it("emits empty bookedRanges when the driver has no upcoming services", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 2, firstName: "Mary", lastName: "Smith",
        profileImage: null, averageRating: 5, totalRatings: 2,
        chauffeurHourlyRate: 30, chauffeurDailyRate: 200,
        chauffeurDescription: null, drivingExperience: null, languagesSpoken: [],
        driverChauffeurServices: [],
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);

    const result = await listChauffeurs({ viewer: { isGuest: true }, filters: {} });
    expect((result.items[0] as any).bookedRanges).toEqual([]);
  });

  it("scopes driverChauffeurServices select to ACCEPTED/ACTIVE in next 30 days", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-04T00:00:00Z"));
    try {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      await listChauffeurs({ viewer: { isGuest: true }, filters: {} });
      const findManyArg = (prisma.user.findMany as jest.Mock).mock.calls[0][0];

      const expectedNow = new Date("2026-06-04T00:00:00Z");
      const expectedEnd = new Date("2026-07-04T00:00:00Z");

      expect(findManyArg.select.driverChauffeurServices.where.status.in).toEqual(["ACCEPTED", "ACTIVE"]);
      expect(findManyArg.select.driverChauffeurServices.where.endDate.gte).toEqual(expectedNow);
      expect(findManyArg.select.driverChauffeurServices.where.startDate.lte).toEqual(expectedEnd);
    } finally {
      jest.useRealTimers();
    }
  });
});
