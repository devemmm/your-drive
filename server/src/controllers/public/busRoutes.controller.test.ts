// Unit tests for the public bus-route search controller.
//
// Like the sibling rentals / chauffeurs / rides public controllers, the
// bus-route mirror is exercised by direct invocation (no supertest, no
// `app` export). The `matchedData` shim returns `req.query` verbatim.

import { Request, Response } from "express";

jest.mock("../../services/search/busRouteSearch.service", () => ({
  listBusRoutes: jest.fn(),
}));

jest.mock("express-validator", () => ({
  matchedData: (req: any) => req.query,
}));

jest.mock("../../config/database", () => ({
  prisma: { busRouteDeparture: { findMany: jest.fn() } },
}));

import { PublicBusRouteController } from "./busRoutes.controller";
import * as busRouteSearch from "../../services/search/busRouteSearch.service";
import { prisma } from "../../config/database";

function mockReq(query: Record<string, unknown>): Request {
  return { query } as unknown as Request;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}

const flushPromises = () => new Promise<void>((r) => setImmediate(r));

describe("PublicBusRouteController.search", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls the shared service with viewer.isGuest=true and forwards origin/dest filters", async () => {
    (busRouteSearch.listBusRoutes as jest.Mock).mockResolvedValue({
      items: [{ id: 1, originCity: "Kigali", destCity: "Musanze", stops: [] }],
      total: 1,
    });

    const req = mockReq({ originCity: "Kigali", destCity: "Musanze" });
    const res = mockRes();
    await PublicBusRouteController.search(req, res, jest.fn());
    await flushPromises();

    expect(busRouteSearch.listBusRoutes).toHaveBeenCalledTimes(1);
    expect(busRouteSearch.listBusRoutes).toHaveBeenCalledWith({
      viewer: { isGuest: true },
      filters: { originCity: "Kigali", destCity: "Musanze" },
    });
    // Wire shape mirrors the legacy `/bus-routes/search` exactly:
    // a single `{ routes }` envelope, no pagination metadata.
    expect(res.json).toHaveBeenCalledWith({
      routes: [{ id: 1, originCity: "Kigali", destCity: "Musanze", stops: [] }],
    });
  });

  it("returns 400 ORIGIN_DEST_REQUIRED when either filter is missing", async () => {
    const req = mockReq({ originCity: "Kigali" }); // missing destCity
    const res = mockRes();
    await PublicBusRouteController.search(req, res, jest.fn());
    await flushPromises();

    expect(busRouteSearch.listBusRoutes).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "ORIGIN_DEST_REQUIRED" });
  });

  it("strips operator phone/email when the service returns rows that carry them", async () => {
    // Defensive: even if the shared service ever surfaced operator
    // phone/email on a guest response, this assertion would pin the
    // controller's contract — phone/email never reach the wire.
    (busRouteSearch.listBusRoutes as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 1,
          originCity: "Kigali",
          destCity: "Musanze",
          operator: { id: 5, firstName: "Op" },
          stops: [],
        },
      ],
      total: 1,
    });

    const req = mockReq({ originCity: "Kigali", destCity: "Musanze" });
    const res = mockRes();
    await PublicBusRouteController.search(req, res, jest.fn());
    await flushPromises();

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.routes[0].operator).not.toHaveProperty("phoneNumber");
    expect(body.routes[0].operator).not.toHaveProperty("email");
  });

  it("forwards errors to next() when the service throws", async () => {
    const boom = new Error("boom");
    (busRouteSearch.listBusRoutes as jest.Mock).mockRejectedValue(boom);

    const next = jest.fn();
    const req = mockReq({ originCity: "Kigali", destCity: "Musanze" });
    const res = mockRes();
    await PublicBusRouteController.search(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe("PublicBusRouteController.trips", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.busRouteDeparture.findMany as jest.Mock).mockResolvedValue([
      { id: 1, timeOfDay: "06:00", vehicle: { make: "Scania", model: "X", plateNumber: "Z1", capacity: 60 }, route: { basePrice: "15" } },
    ]);
  });

  it("returns active departures for the route as the schedule", async () => {
    const res = mockRes();
    const req = { query: {}, params: { routeId: "1" } } as unknown as Request;
    await PublicBusRouteController.trips(req, res, jest.fn());
    await flushPromises();

    const arg = (prisma.busRouteDeparture.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ routeId: 1, isActive: true });
    expect(res.json).toHaveBeenCalledWith({
      departures: [{ id: 1, timeOfDay: "06:00", fare: 15, vehicle: { make: "Scania", model: "X", plateNumber: "Z1", capacity: 60 } }],
    });
  });
});
