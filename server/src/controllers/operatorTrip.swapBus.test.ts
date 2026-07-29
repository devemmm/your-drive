jest.mock("../config/database", () => ({
  prisma: { ride: { findFirst: jest.fn(), update: jest.fn() }, vehicle: { findFirst: jest.fn() } },
}));

import { Request, Response } from "express";
import { OperatorTripController } from "./operatorTrip.controller";
import { prisma } from "../config/database";

function res() {
  const r: Partial<Response> = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r as Response;
}
const flush = () => new Promise<void>((x) => setImmediate(x));

describe("OperatorTripController.swapBus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates the ride's vehicle when the operator owns both", async () => {
    (prisma.ride.findFirst as jest.Mock).mockResolvedValue({ id: 10 });
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 8 });
    (prisma.ride.update as jest.Mock).mockResolvedValue({ id: 10, vehicleId: 8 });
    const req = { user: { id: 5 }, params: { id: "10" }, body: { vehicleId: 8 } } as unknown as Request;
    const r = res();
    await OperatorTripController.swapBus(req, r, jest.fn());
    await flush();
    expect(prisma.ride.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { vehicleId: 8 }, include: expect.any(Object) });
    expect(r.json).toHaveBeenCalledWith({ trip: { id: 10, vehicleId: 8 } });
  });

  it("404s when the trip is not the operator's", async () => {
    (prisma.ride.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { id: "10" }, body: { vehicleId: 8 } } as unknown as Request;
    await OperatorTripController.swapBus(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(prisma.ride.update).not.toHaveBeenCalled();
  });

  it("404s when the vehicle is not the operator's", async () => {
    (prisma.ride.findFirst as jest.Mock).mockResolvedValue({ id: 10 });
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { id: "10" }, body: { vehicleId: 8 } } as unknown as Request;
    await OperatorTripController.swapBus(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(prisma.ride.update).not.toHaveBeenCalled();
  });
});
