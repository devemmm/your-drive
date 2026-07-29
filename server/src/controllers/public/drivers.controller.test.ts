// Unit tests for the public nearby-drivers controller.
//
// Like the sibling rentals / chauffeurs / rides / bus-routes public
// controllers, the drivers mirror is exercised by direct invocation (no
// supertest — the repo has no exported `app`). The `matchedData` shim
// returns `req.query` verbatim, mimicking the output of the validator
// chain (`nearbyValidator`) after `.toFloat()` coercion.

import { Request, Response } from "express";

jest.mock("../../services/search/driverNearbySearch.service", () => ({
  listNearbyDrivers: jest.fn(),
}));

jest.mock("express-validator", () => ({
  matchedData: (req: any) => req.query,
}));

import { PublicDriversController } from "./drivers.controller";
import * as drvSearch from "../../services/search/driverNearbySearch.service";

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

describe("PublicDriversController.nearby", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls the shared service with viewer.isGuest=true and forwards the parsed bounds", async () => {
    (drvSearch.listNearbyDrivers as jest.Mock).mockResolvedValue({
      drivers: [],
      fetchedAt: "2026-06-02T00:00:00.000Z",
    });

    // Validator-coerced values: swLat / swLng / neLat / neLng arrive as
    // numbers, not raw query strings.
    const req = mockReq({ swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 });
    const res = mockRes();
    await PublicDriversController.nearby(req, res, jest.fn());
    await flushPromises();

    expect(drvSearch.listNearbyDrivers).toHaveBeenCalledTimes(1);
    expect(drvSearch.listNearbyDrivers).toHaveBeenCalledWith({
      viewer: { isGuest: true },
      bounds: { swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 },
    });
    expect(res.json).toHaveBeenCalledWith({
      drivers: [],
      fetchedAt: "2026-06-02T00:00:00.000Z",
    });
  });

  it("forwards the service result verbatim — preserving the legacy { drivers, fetchedAt } envelope", async () => {
    const payload = {
      drivers: [
        { id: "hash-1", latitude: -1.95, longitude: 30.06, vehicleCategory: "CAR" },
        {
          id: "hash-2",
          latitude: -1.96,
          longitude: 30.07,
          vehicleCategory: "MOTORBIKE",
        },
      ],
      fetchedAt: "2026-06-02T00:00:00.000Z",
    };
    (drvSearch.listNearbyDrivers as jest.Mock).mockResolvedValue(payload);

    const req = mockReq({ swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 });
    const res = mockRes();
    await PublicDriversController.nearby(req, res, jest.fn());
    await flushPromises();

    // Wire contract pinned: the response is exactly the service result —
    // no `success`/`data` wrapper, no pagination envelope, matching the
    // legacy `DriverPresenceController.nearby` shape the mobile hook
    // (`useNearbyDrivers`) already parses.
    expect(res.json).toHaveBeenCalledWith(payload);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.drivers[0]).not.toHaveProperty("phoneNumber");
    expect(body.drivers[0]).not.toHaveProperty("email");
  });

  it("forwards errors to next() when the service throws", async () => {
    const boom = new Error("boom");
    (drvSearch.listNearbyDrivers as jest.Mock).mockRejectedValue(boom);

    const next = jest.fn();
    const req = mockReq({ swLat: -2, swLng: 30, neLat: -1.9, neLng: 30.1 });
    const res = mockRes();
    await PublicDriversController.nearby(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.json).not.toHaveBeenCalled();
  });
});
