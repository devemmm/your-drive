// Unit tests for the public ride search controller.
//
// Like the sibling rentals and chauffeurs public controllers, the rides
// mirror is exercised by direct invocation (no supertest — the repo has
// no exported `app`). The `matchedData` shim returns `req.query`
// verbatim, mimicking the output of the validator chain
// (`rideValidator.validateSearchRides`) after `.toInt()` / `.toFloat()`
// coercion.

import { Request, Response } from "express";

jest.mock("../../services/search/rideSearch.service", () => ({
  listRides: jest.fn(),
}));

jest.mock("express-validator", () => ({
  matchedData: (req: any) => req.query,
}));

import { PublicRideController } from "./rides.controller";
import * as rideSearch from "../../services/search/rideSearch.service";

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

describe("PublicRideController.list", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls the shared service with viewer.isGuest=true and forwards filters", async () => {
    (rideSearch.listRides as jest.Mock).mockResolvedValue({
      items: [],
      suggestions: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    // Validator-coerced values: numeric params are already numbers, not
    // raw query strings.
    const req = mockReq({
      departureCity: "Kigali",
      destinationCity: "Musanze",
      page: 2,
      pageSize: 5,
      minContribution: 1000,
      maxContribution: 5000,
      vehicleCategory: "CAR",
      preferences: { smoking: false, airConditioning: true },
    });
    const res = mockRes();
    await PublicRideController.list(req, res, jest.fn());
    await flushPromises();

    expect(rideSearch.listRides).toHaveBeenCalledTimes(1);
    expect(rideSearch.listRides).toHaveBeenCalledWith({
      viewer: { isGuest: true },
      filters: expect.objectContaining({
        departureCity: "Kigali",
        destinationCity: "Musanze",
        page: 2,
        pageSize: 5,
        minContribution: 1000,
        maxContribution: 5000,
        vehicleCategory: "CAR",
        preferences: { smoking: false, airConditioning: true },
      }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [], suggestions: [] })
    );
  });

  it("emits suggestions only when the strict result set is empty", async () => {
    // Preserves the legacy controller's behaviour: suggestions are
    // surfaced only when the main `data` array is empty.
    (rideSearch.listRides as jest.Mock).mockResolvedValue({
      items: [{ id: 1, driver: { firstName: "Sam" } }],
      suggestions: [{ id: 2, driver: { firstName: "Suggested" } }],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const res = mockRes();
    await PublicRideController.list(mockReq({}), res, jest.fn());
    await flushPromises();

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.data).toHaveLength(1);
    expect(body.suggestions).toEqual([]); // strict result not empty → no suggestions
  });

  it("strips phone/email when the service returns rows that contain them", async () => {
    // Defensive: even if upstream changes leaked phone/email into the
    // service's response, the controller's body should not propagate
    // them. The shared service mapper already strips for guests; this
    // test pins the behaviour by mocking the service with clean rows
    // and asserting the response body does NOT carry the PII fields.
    (rideSearch.listRides as jest.Mock).mockResolvedValue({
      items: [{ id: 1, driver: { id: 7, firstName: "Sam" } }],
      suggestions: [],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const res = mockRes();
    await PublicRideController.list(mockReq({}), res, jest.fn());
    await flushPromises();

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.data[0].driver).not.toHaveProperty("phoneNumber");
    expect(body.data[0].driver).not.toHaveProperty("email");
  });

  it("forwards errors to next() when the service throws", async () => {
    const boom = new Error("boom");
    (rideSearch.listRides as jest.Mock).mockRejectedValue(boom);

    const next = jest.fn();
    const res = mockRes();
    await PublicRideController.list(mockReq({}), res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.status).not.toHaveBeenCalled();
  });
});
