// Unit tests for the public rental search controller.
//
// `supertest` is not installed in this repo and `server.ts` has no
// exported `app` (see the comment in
// `server/src/controllers/__tests__/auth.register-referral.test.ts`),
// so the controller is exercised by direct invocation, mirroring
// `server/src/controllers/__tests__/public.controller.test.ts`.

import { Request, Response } from "express";

jest.mock("../../services/search/rentalSearch.service", () => ({
  listRentals: jest.fn(),
}));

// matchedData() is normally populated by express-validator middleware. The
// controller calls matchedData() from req — so we shim by passing a req whose
// .query already matches the validator-coerced shape. This mirrors the same
// pattern used in `__tests__/public.controller.test.ts`.
jest.mock("express-validator", () => ({
  matchedData: (req: any) => req.query,
}));

import { PublicRentalController } from "./rentals.controller";
import * as rentalSearch from "../../services/search/rentalSearch.service";

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

describe("PublicRentalController.list", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls the shared service with viewer.isGuest=true and forwards filters", async () => {
    (rentalSearch.listRentals as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    // Values mirror the validator-normalized output: page/pageSize have been
    // coerced via `.toInt()` and category via `.toUpperCase()`.
    const req = mockReq({
      city: "Kigali",
      category: "CAR",
      page: 2,
      pageSize: 5,
    });
    const res = mockRes();
    await PublicRentalController.list(req, res, jest.fn());
    await flushPromises();

    expect(rentalSearch.listRentals).toHaveBeenCalledTimes(1);
    expect(rentalSearch.listRentals).toHaveBeenCalledWith({
      viewer: { isGuest: true },
      filters: expect.objectContaining({
        city: "Kigali",
        category: "CAR",
        page: 2,
        pageSize: 5,
      }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [] })
    );
  });

  it("parses ISO date strings into Date instances for start/end filters", async () => {
    (rentalSearch.listRentals as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const req = mockReq({
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-07-05T00:00:00.000Z",
    });
    const res = mockRes();
    await PublicRentalController.list(req, res, jest.fn());
    await flushPromises();

    const call = (rentalSearch.listRentals as jest.Mock).mock.calls[0][0];
    expect(call.filters.startDate).toBeInstanceOf(Date);
    expect(call.filters.endDate).toBeInstanceOf(Date);
    expect((call.filters.startDate as Date).toISOString()).toBe(
      "2026-07-01T00:00:00.000Z"
    );
  });

  it("forwards errors to next() when the service throws", async () => {
    const boom = new Error("boom");
    (rentalSearch.listRentals as jest.Mock).mockRejectedValue(boom);

    const next = jest.fn();
    const req = mockReq({});
    const res = mockRes();
    await PublicRentalController.list(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.status).not.toHaveBeenCalled();
  });
});
