jest.mock("../../config/database", () => ({
  prisma: { user: { findMany: jest.fn() }, busRoute: { findMany: jest.fn() } },
}));

import { Request, Response } from "express";
import { PublicOperatorController } from "./operators.controller";
import { prisma } from "../../config/database";

function mockReq(over: Partial<Request> = {}): Request {
  return { query: {}, params: {}, ...over } as any;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}
const flush = () => new Promise<void>((r) => setImmediate(r));
beforeEach(() => jest.clearAllMocks());

describe("PublicOperatorController.list", () => {
  it("queries only BUS_OPERATOR users that have an active route", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    await PublicOperatorController.list(mockReq(), mockRes(), jest.fn());
    await flush();
    const arg = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.role).toBe("BUS_OPERATOR");
    expect(arg.where.operatorRoutes).toEqual({ some: { isActive: true } });
  });

  it("maps rows to the public operator shape with routeCount", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 5, firstName: "City", lastName: "Link",
        averageRating: 4.8, totalRatings: 320,
        profileImage: { url: "http://img/5.png" },
        operatorRoutes: [{ id: 1 }, { id: 2 }],
      },
    ]);
    const res = mockRes();
    await PublicOperatorController.list(mockReq(), res, jest.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({
      operators: [
        { id: 5, name: "City Link", photoUrl: "http://img/5.png", rating: 4.8, totalRatings: 320, routeCount: 2 },
      ],
    });
  });
});

describe("PublicOperatorController.routes", () => {
  it("returns the operator's active routes with ordered stops", async () => {
    (prisma as any).busRoute = { findMany: jest.fn().mockResolvedValue([{ id: 1, stops: [] }]) };
    const res = mockRes();
    await PublicOperatorController.routes(mockReq({ params: { operatorId: "5" } } as any), res, jest.fn());
    await flush();
    const arg = (prisma.busRoute.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ operatorId: 5, isActive: true });
    expect(arg.include.stops.orderBy).toEqual({ order: "asc" });
    expect(res.json).toHaveBeenCalledWith({ routes: [{ id: 1, stops: [] }] });
  });
});
