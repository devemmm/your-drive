jest.mock("../config/database", () => ({
  prisma: {
    busRoute: { findFirst: jest.fn() },
    busRouteDeparture: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    vehicle: { findFirst: jest.fn() },
  },
}));

import { Request, Response } from "express";
import { OperatorDepartureController } from "./operatorDeparture.controller";
import { prisma } from "../config/database";

function res() {
  const r: Partial<Response> = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  r.end = jest.fn().mockReturnValue(r);
  return r as Response;
}
const flush = () => new Promise<void>((x) => setImmediate(x));

describe("OperatorDepartureController.create", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a departure on an owned route", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue({ id: 7 });
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 8 });
    (prisma.busRouteDeparture.create as jest.Mock).mockResolvedValue({ id: 1, timeOfDay: "06:00", vehicleId: 8 });
    const req = { user: { id: 5 }, params: { routeId: "7" }, body: { timeOfDay: "06:00", vehicleId: 8 } } as unknown as Request;
    const r = res();
    await OperatorDepartureController.create(req, r, jest.fn());
    await flush();
    expect(prisma.busRouteDeparture.create).toHaveBeenCalledWith({
      data: { routeId: 7, timeOfDay: "06:00", vehicleId: 8 },
    });
    expect(r.status).toHaveBeenCalledWith(201);
  });

  it("404s when the route is not owned by the operator", async () => {
    (prisma.busRoute.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { routeId: "7" }, body: { timeOfDay: "06:00", vehicleId: 8 } } as unknown as Request;
    await OperatorDepartureController.create(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    expect(prisma.busRouteDeparture.create).not.toHaveBeenCalled();
  });
});

describe("OperatorDepartureController.update", () => {
  beforeEach(() => jest.clearAllMocks());

  it("404s when the departure is not owned by the operator", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { id: "1" }, body: { timeOfDay: "07:00" } } as unknown as Request;
    await OperatorDepartureController.update(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    expect(prisma.busRouteDeparture.update).not.toHaveBeenCalled();
  });

  it("400s on a malformed timeOfDay", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { id: "1" }, body: { timeOfDay: "9:0" } } as unknown as Request;
    await OperatorDepartureController.update(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    expect(prisma.busRouteDeparture.update).not.toHaveBeenCalled();
  });

  it("404s when the supplied vehicleId is not owned by the operator", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { id: "1" }, body: { vehicleId: 99 } } as unknown as Request;
    await OperatorDepartureController.update(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    expect(prisma.busRouteDeparture.update).not.toHaveBeenCalled();
  });

  it("updates an owned departure with a valid timeOfDay and owned vehicle", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 8 });
    (prisma.busRouteDeparture.update as jest.Mock).mockResolvedValue({ id: 1, timeOfDay: "07:00", vehicleId: 8 });
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { id: "1" }, body: { timeOfDay: "07:00", vehicleId: 8 } } as unknown as Request;
    const r = res();
    await OperatorDepartureController.update(req, r, next);
    await flush();
    expect(next).not.toHaveBeenCalled();
    expect(prisma.busRouteDeparture.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { timeOfDay: "07:00", vehicleId: 8 },
    });
    expect(r.json).toHaveBeenCalled();
  });
});

describe("OperatorDepartureController.delete_", () => {
  beforeEach(() => jest.clearAllMocks());

  it("404s when the departure is not owned by the operator", async () => {
    (prisma.busRouteDeparture.findFirst as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const req = { user: { id: 5 }, params: { id: "1" } } as unknown as Request;
    await OperatorDepartureController.delete_(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    expect(prisma.busRouteDeparture.delete).not.toHaveBeenCalled();
  });
});
