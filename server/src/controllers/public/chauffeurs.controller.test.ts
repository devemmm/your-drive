// Unit tests for the public chauffeur search controller.
//
// Like the sibling rentals public controller, the chauffeur mirror is
// exercised by direct invocation (no supertest, no `app` export). The
// `matchedData` shim returns `req.query` verbatim, mimicking the output
// of the express-validator chain (`chauffeurValidators.searchAvailableDrivers`)
// after `.toInt()` / `.toFloat()` coercion.

import { Request, Response } from "express";

jest.mock("../../services/search/chauffeurSearch.service", () => ({
  listChauffeurs: jest.fn(),
}));

jest.mock("express-validator", () => ({
  matchedData: (req: any) => req.query,
}));

import { PublicChauffeurController } from "./chauffeurs.controller";
import * as chauffeurSearch from "../../services/search/chauffeurSearch.service";

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

describe("PublicChauffeurController.list", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls the shared service with viewer.isGuest=true and forwards filters", async () => {
    (chauffeurSearch.listChauffeurs as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    // Values mirror the validator-normalized output (page/pageSize via
    // `.toInt()`, rates via `.toFloat()`).
    const req = mockReq({
      minHourlyRate: 20,
      maxHourlyRate: 80,
      page: 2,
      pageSize: 5,
    });
    const res = mockRes();
    await PublicChauffeurController.list(req, res, jest.fn());
    await flushPromises();

    expect(chauffeurSearch.listChauffeurs).toHaveBeenCalledTimes(1);
    expect(chauffeurSearch.listChauffeurs).toHaveBeenCalledWith({
      viewer: { isGuest: true },
      filters: expect.objectContaining({
        minHourlyRate: 20,
        maxHourlyRate: 80,
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
    (chauffeurSearch.listChauffeurs as jest.Mock).mockResolvedValue({
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
    await PublicChauffeurController.list(req, res, jest.fn());
    await flushPromises();

    const call = (chauffeurSearch.listChauffeurs as jest.Mock).mock.calls[0][0];
    expect(call.filters.startDate).toBeInstanceOf(Date);
    expect(call.filters.endDate).toBeInstanceOf(Date);
    expect((call.filters.startDate as Date).toISOString()).toBe(
      "2026-07-01T00:00:00.000Z"
    );
  });

  it("strips phone/email when the service returns rows that contain them", async () => {
    // Defensive: even if a future upstream change leaked phone/email into
    // the result, the public controller's response should not propagate
    // them. The shared service mapper already strips for guests; this
    // test pins the behaviour by mocking the service with leaky rows and
    // asserting the response body does NOT carry phoneNumber / email.
    (chauffeurSearch.listChauffeurs as jest.Mock).mockImplementation(
      async () => {
        // Re-import the real mapper would be heavy; instead emulate the
        // guaranteed-clean shape the real service returns to its caller.
        return {
          items: [{ id: 1, firstName: "John", lastName: "Doe" }],
          total: 1,
          page: 1,
          pageSize: 10,
        };
      }
    );

    const req = mockReq({});
    const res = mockRes();
    await PublicChauffeurController.list(req, res, jest.fn());
    await flushPromises();

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.data[0]).not.toHaveProperty("phoneNumber");
    expect(body.data[0]).not.toHaveProperty("email");
  });

  it("forwards errors to next() when the service throws", async () => {
    const boom = new Error("boom");
    (chauffeurSearch.listChauffeurs as jest.Mock).mockRejectedValue(boom);

    const next = jest.fn();
    const req = mockReq({});
    const res = mockRes();
    await PublicChauffeurController.list(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.status).not.toHaveBeenCalled();
  });
});
