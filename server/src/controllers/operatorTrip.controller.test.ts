jest.mock("../config/database", () => ({
  prisma: {
    busRoute: { findFirst: jest.fn() },
    vehicle: { findFirst: jest.fn() },
    ride: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    booking: { findMany: jest.fn() },
  },
}));

import { Request, Response } from "express";
import { OperatorTripController } from "./operatorTrip.controller";
import { prisma } from "../config/database";

function mockReq(over: Partial<Request> = {}): Request {
  return { user: { id: 7 }, query: {}, params: {}, body: {}, ...over } as any;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}
const flush = () => new Promise<void>((r) => setImmediate(r));
beforeEach(() => jest.clearAllMocks());

describe("OperatorTripController.create", () => {
  it("404s when the route is not owned by the caller", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    await OperatorTripController.create(
      mockReq({ body: { routeId: 5, vehicleId: 2, departureTime: "2099-01-01T08:00:00Z", availableSeats: 40 } } as any),
      mockRes(),
      next
    );
    await flush();
    expect((prisma.busRoute.findFirst as jest.Mock).mock.calls[0][0].where).toEqual({ id: 5, operatorId: 7 });
    expect(next.mock.calls[0][0].statusCode).toBe(404);
    expect(prisma.ride.create).not.toHaveBeenCalled();
  });

  it("creates a PUBLISHED ride linked to the route with the caller as driver", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({
      id: 5, operatorId: 7, originCity: "Kigali", destCity: "Huye", basePrice: "3000",
      stops: [{ city: "Kigali", latitude: -1.95, longitude: 30.06, order: 0 }, { city: "Huye", latitude: -2.6, longitude: 29.74, order: 1 }],
    });
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 2, userId: 7 });
    (prisma.ride.create as jest.Mock).mockResolvedValue({ id: 99 });
    await OperatorTripController.create(
      mockReq({ body: { routeId: 5, vehicleId: 2, departureTime: "2099-01-01T08:00:00Z", availableSeats: 40 } } as any),
      mockRes(),
      jest.fn()
    );
    await flush();
    const arg = (prisma.ride.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.status).toBe("PUBLISHED");
    expect(arg.data.driver.connect.id).toBe(7);
    expect(arg.data.vehicle.connect.id).toBe(2);
    expect(arg.data.route.connect.id).toBe(5);
    expect(arg.data.contribution).toBe(3000);
    expect(arg.data.availableSeats).toBe(40);
  });
});

describe("OperatorTripController.manifest", () => {
  it("404s when the trip is not the caller's", async () => {
    (prisma.ride.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    await OperatorTripController.manifest(mockReq({ params: { id: "99" } } as any), mockRes(), next);
    await flush();
    expect((prisma.ride.findFirst as jest.Mock).mock.calls[0][0].where).toEqual({ id: 99, driverId: 7 });
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
