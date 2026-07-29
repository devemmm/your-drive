// Unit tests for the shared ride search service.
//
// This service is the single source of truth for the posted-P2P-ride
// search query. Both the existing `RideController.searchRides` endpoint
// (currently mounted under `/public/rides/search`) and the new
// `/public/rides/search` mirror call into it. The viewer parameter
// drives the driver-field strip via the response mapper: guests must
// never see `phoneNumber` or `email` on the embedded `driver` of any
// returned ride.
//
// The underlying query is raw SQL (PostGIS distance + suggestions), so
// we mock `prisma.$transaction` and `prisma.$queryRaw` rather than a
// model delegate — the service composes those primitives directly.

jest.mock("../../config/database", () => ({
  prisma: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

import { prisma } from "../../config/database";
import { listRides } from "./rideSearch.service";

function mockTransactionResult(args: {
  rides: any[];
  total: number;
  suggestions: any[];
}) {
  (prisma.$transaction as jest.Mock).mockResolvedValue([
    args.rides,
    [{ count: args.total }],
    args.suggestions,
  ]);
}

describe("rideSearch.service.listRides", () => {
  beforeEach(() => jest.clearAllMocks());

  it("strips driver phone and email when viewer.isGuest is true", async () => {
    mockTransactionResult({
      rides: [
        {
          id: 1,
          status: "PUBLISHED",
          contribution: 5000,
          departureTime: new Date("2026-07-01T08:00:00Z"),
          type: "RIDE",
          driver: {
            id: 7,
            firstName: "Sam",
            lastName: "Driver",
            email: "sam@x.com",
            phoneNumber: "+250...",
            language: "en",
            averageRating: 4.7,
            totalRatings: 21,
            profileImage: { url: "https://example.com/sam.png" },
          },
          vehicle: {
            id: 11,
            make: "Toyota",
            model: "Vitz",
            category: "CAR",
          },
          departureLocation: { id: 1, city: "Kigali" },
          destinationLocation: { id: 2, city: "Musanze" },
        },
      ],
      total: 1,
      suggestions: [],
    });

    const result = await listRides({
      viewer: { isGuest: true },
      filters: {},
    });

    const ride = result.items[0] as any;
    expect(ride.driver).not.toHaveProperty("phoneNumber");
    expect(ride.driver).not.toHaveProperty("email");
    expect(ride.driver).toMatchObject({
      id: 7,
      firstName: "Sam",
      lastName: "Driver",
      averageRating: 4.7,
    });
    // Vehicle / location / fare data is preserved verbatim.
    expect(ride.vehicle).toMatchObject({ make: "Toyota", category: "CAR" });
    expect(ride.departureLocation).toMatchObject({ city: "Kigali" });
    expect(result.total).toBe(1);
  });

  it("keeps driver phone and email when viewer is authenticated", async () => {
    mockTransactionResult({
      rides: [
        {
          id: 1,
          status: "PUBLISHED",
          driver: {
            id: 7,
            firstName: "Sam",
            email: "sam@x.com",
            phoneNumber: "+250...",
          },
          vehicle: { id: 11, category: "CAR" },
          departureLocation: { id: 1, city: "Kigali" },
          destinationLocation: { id: 2, city: "Musanze" },
        },
      ],
      total: 1,
      suggestions: [],
    });

    const result = await listRides({
      viewer: { isGuest: false, userId: 99 },
      filters: {},
    });

    const ride = result.items[0] as any;
    expect(ride.driver.phoneNumber).toBe("+250...");
    expect(ride.driver.email).toBe("sam@x.com");
  });

  it("strips phone/email from suggestion rows for guest viewers", async () => {
    // When the main query returns nothing the controller surfaces the
    // relaxed `suggestions` rows instead. The PII strip must apply to
    // those rows too — the mapper runs over both arrays.
    mockTransactionResult({
      rides: [],
      total: 0,
      suggestions: [
        {
          id: 2,
          status: "PUBLISHED",
          driver: {
            id: 8,
            firstName: "Suggested",
            email: "sug@x.com",
            phoneNumber: "+250...",
          },
          vehicle: { id: 12, category: "CAR" },
          departureLocation: { id: 1, city: "Kigali" },
          destinationLocation: { id: 2, city: "Musanze" },
        },
      ],
    });

    const result = await listRides({
      viewer: { isGuest: true },
      filters: {},
    });

    expect(result.items).toHaveLength(0);
    const suggestion = result.suggestions[0] as any;
    expect(suggestion.driver).not.toHaveProperty("phoneNumber");
    expect(suggestion.driver).not.toHaveProperty("email");
    expect(suggestion.driver.firstName).toBe("Suggested");
  });

  it("formats D2D rides with driverStartLocation / driverStopLocation aliases", async () => {
    // Behaviour preservation: the legacy controller renames departure /
    // destination locations for D2D rides. The service must keep that
    // shape so consumers depending on it are not broken.
    mockTransactionResult({
      rides: [
        {
          id: 3,
          status: "PUBLISHED",
          type: "D2D",
          driver: { id: 7 },
          vehicle: { id: 11, category: "CAR" },
          departureLocation: { id: 1, city: "Kigali" },
          destinationLocation: { id: 2, city: "Musanze" },
        },
      ],
      total: 1,
      suggestions: [],
    });

    const result = await listRides({
      viewer: { isGuest: true },
      filters: {},
    });

    const ride = result.items[0] as any;
    expect(ride.driverStartLocation).toMatchObject({ city: "Kigali" });
    expect(ride.driverStopLocation).toMatchObject({ city: "Musanze" });
    // For D2D rides the un-aliased keys must be removed.
    expect(ride).not.toHaveProperty("departureLocation");
    expect(ride).not.toHaveProperty("destinationLocation");
  });

  it("applies originCity/destCity as Location.city filters (alias of departureCity/destinationCity)", async () => {
    // Regression: passenger BUS searches used to require a BusRoute join,
    // which silently excluded every wizard-posted ride (none have one).
    // The fix treats originCity/destCity as aliases for the Location
    // filter, so the SQL must reference dl.city / dest.city LIKE,
    // and the BusRoute clauses must be gone.
    mockTransactionResult({ rides: [], total: 0, suggestions: [] });

    await listRides({
      viewer: { isGuest: true },
      filters: {
        vehicleCategory: "BUS",
        originCity: "Kigali",
        destCity: "Musanze",
      },
    });

    const queryRawCalls = (prisma.$queryRaw as jest.Mock).mock.calls;
    // First call is the main search query.
    const mainSqlText = queryRawCalls[0][0].text;
    expect(mainSqlText).toMatch(/LOWER\(dl\.city\) LIKE/);
    expect(mainSqlText).toMatch(/LOWER\(dest\.city\) LIKE/);
    // BusRoute filter is no longer applied as a strict requirement.
    expect(mainSqlText).not.toMatch(/br\."originCity" ILIKE/);
    expect(mainSqlText).not.toMatch(/br\."destCity" ILIKE/);
  });

  it("returns standard pagination metadata", async () => {
    mockTransactionResult({ rides: [], total: 42, suggestions: [] });

    const result = await listRides({
      viewer: { isGuest: true },
      filters: { page: 3, pageSize: 5 },
    });

    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(5);
    expect(result.total).toBe(42);
  });
});
