jest.mock("../config/database", () => ({
  prisma: {
    busRoute: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { Request, Response } from "express";
import { OperatorRouteController } from "./operatorRoute.controller";
import { prisma } from "../config/database";

function mockReq(over: Partial<Request> = {}): Request {
  return { user: { id: 7 }, query: {}, params: {}, body: {}, ...over } as any;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res as Response;
}
const flush = () => new Promise<void>((r) => setImmediate(r));

beforeEach(() => jest.clearAllMocks());

describe("OperatorRouteController.list", () => {
  it("filters by the caller's id as operatorId", async () => {
    (prisma.busRoute.findMany as jest.Mock).mockResolvedValue([]);
    await OperatorRouteController.list(mockReq(), mockRes(), jest.fn());
    await flush();
    const arg = (prisma.busRoute.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.operatorId).toBe(7);
  });
});

describe("OperatorRouteController.create", () => {
  it("forces operatorId to the caller's id, ignoring any body operatorId", async () => {
    (prisma.busRoute.create as jest.Mock).mockResolvedValue({ id: 1 });
    const req = mockReq({ body: { operatorId: 999, originCity: "A", destCity: "B", distanceKm: 10, basePrice: 5 } } as any);
    await OperatorRouteController.create(req, mockRes(), jest.fn());
    await flush();
    const arg = (prisma.busRoute.create as jest.Mock).mock.calls[0][0];
    expect(arg.data.operatorId).toBe(7);
  });
});

describe("OperatorRouteController.update", () => {
  it("scopes the update to the caller's routes and 404s when nothing matched", async () => {
    (prisma.busRoute.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const next = jest.fn();
    await OperatorRouteController.update(mockReq({ params: { id: "3" } } as any), mockRes(), next);
    await flush();
    const arg = (prisma.busRoute.updateMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ id: 3, operatorId: 7 });
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });
});
