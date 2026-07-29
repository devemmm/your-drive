jest.mock("../config/database", () => ({
  prisma: {
    busRoute: { findFirst: jest.fn() },
    busRouteDeparture: { findFirst: jest.fn() },
    ride: { create: jest.fn(), findUnique: jest.fn() },
  },
}));

import { Prisma } from "@prisma/client";
import { createBusRide, findOrCreateScheduledRide } from "./busRide.service";
import { prisma } from "../config/database";

describe("createBusRide", () => {
  beforeEach(() => jest.clearAllMocks());

  it("builds a PUBLISHED ride from the route + bus and connects the departure", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({
      id: 7, originCity: "Harare", destCity: "Bulawayo", basePrice: "15",
      stops: [{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }],
    });
    (prisma.ride.create as jest.Mock).mockResolvedValue({ id: 99 });

    const when = new Date("2026-07-15T06:00:00Z");
    const ride = await createBusRide({
      operatorId: 5, routeId: 7, vehicleId: 8, departureTime: when, seats: 60, routeDepartureId: 3,
    });

    expect(ride).toEqual({ id: 99 });
    const data = (prisma.ride.create as jest.Mock).mock.calls[0][0].data;
    expect(data.status).toBe("PUBLISHED");
    expect(data.totalSeats).toBe(60);
    expect(data.availableSeats).toBe(60);
    expect(data.contribution).toBe(15);
    expect(data.vehicle.connect).toEqual({ id: 8 });
    expect(data.driver.connect).toEqual({ id: 5 });
    expect(data.routeDeparture.connect).toEqual({ id: 3 });
  });

  it("throws ROUTE_NOT_FOUND when the route is not owned by the operator", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      createBusRide({ operatorId: 5, routeId: 7, vehicleId: 8, departureTime: new Date(), seats: 1 })
    ).rejects.toThrow("ROUTE_NOT_FOUND");
  });
});

describe("findOrCreateScheduledRide", () => {
  beforeEach(() => jest.clearAllMocks());

  const futureDate = "2999-01-01";
  const departure = {
    id: 3, routeId: 7, vehicleId: 8, timeOfDay: "06:00", isActive: true,
    route: { id: 7, operatorId: 5, originCity: "Harare", destCity: "Bulawayo", basePrice: "15" },
    vehicle: { id: 8, capacity: 60 },
  };

  it("returns the existing ride when one is already materialized", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(departure);
    (prisma.ride.findUnique as jest.Mock).mockResolvedValue({ id: 42 });

    const ride = await findOrCreateScheduledRide({ routeDepartureId: 3, date: futureDate });
    expect(ride).toEqual({ id: 42 });
    expect(prisma.ride.create).not.toHaveBeenCalled();
  });

  it("creates a ride owned by the route operator when none exists", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(departure);
    (prisma.ride.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({
      id: 7, originCity: "Harare", destCity: "Bulawayo", basePrice: "15", stops: [],
    });
    (prisma.ride.create as jest.Mock).mockResolvedValue({ id: 100 });

    const ride = await findOrCreateScheduledRide({ routeDepartureId: 3, date: futureDate });
    expect(ride).toEqual({ id: 100 });
    const data = (prisma.ride.create as jest.Mock).mock.calls[0][0].data;
    expect(data.driver.connect).toEqual({ id: 5 });     // route operator, not requester
    expect(data.totalSeats).toBe(60);                   // bus capacity
    expect(data.routeDeparture.connect).toEqual({ id: 3 });
  });

  it("rejects a past departure", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(departure);
    await expect(
      findOrCreateScheduledRide({ routeDepartureId: 3, date: "2000-01-01" })
    ).rejects.toThrow("PAST_DEPARTURE");
  });

  it("throws DEPARTURE_NOT_FOUND for an unknown/inactive departure", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      findOrCreateScheduledRide({ routeDepartureId: 3, date: futureDate })
    ).rejects.toThrow("DEPARTURE_NOT_FOUND");
  });

  it("recovers from a P2002 race by returning the ride created by the winning request", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(departure);
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({
      id: 7, originCity: "Harare", destCity: "Bulawayo", basePrice: "15", stops: [],
    });
    (prisma.ride.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)        // no existing ride before create
      .mockResolvedValueOnce({ id: 7 });  // re-query after the race finds the winner's ride
    (prisma.ride.create as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002", clientVersion: "5.22.0",
      })
    );

    const ride = await findOrCreateScheduledRide({ routeDepartureId: 3, date: futureDate });
    expect(ride).toEqual({ id: 7 });
    expect(prisma.ride.findUnique).toHaveBeenCalledTimes(2);
  });

  it("rethrows the P2002 error when the re-query finds no raced ride", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(departure);
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({
      id: 7, originCity: "Harare", destCity: "Bulawayo", basePrice: "15", stops: [],
    });
    (prisma.ride.findUnique as jest.Mock)
      .mockResolvedValueOnce(null)   // no existing ride before create
      .mockResolvedValueOnce(null);  // re-query still finds nothing
    (prisma.ride.create as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002", clientVersion: "5.22.0",
      })
    );

    await expect(
      findOrCreateScheduledRide({ routeDepartureId: 3, date: futureDate })
    ).rejects.toThrow("Unique constraint failed");
  });
});
