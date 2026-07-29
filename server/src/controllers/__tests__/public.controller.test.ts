import axios from "axios";
import { Request, Response } from "express";
import { PublicController } from "../public.controller";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

function mockReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}
function mockRes() {
  const res: Partial<Response> = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res as Response;
}

// matchedData() is normally populated by express-validator middleware. The
// controller calls matchedData() from req — so we shim by passing a req whose
// .query already matches. The express-validator helper in test mode reads
// directly from req[location] when no validation has run.
jest.mock("express-validator", () => ({
  matchedData: (req: any) => req.query,
}));

// catchAsync wraps the handler in a synchronous function, so awaiting the
// handler returns immediately (before the inner async resolves). We flush the
// microtask/macrotask queue to let those promises settle.
const flushPromises = () => new Promise<void>((r) => setImmediate(r));

describe("PublicController.getPlacesAutocompleteAddresses", () => {
  beforeEach(() => jest.clearAllMocks());

  it("merges establishment + geocode results and dedups by place_id", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { predictions: [
          { place_id: "est1", description: "Kigali Heights" },
          { place_id: "shared", description: "Some Shared Place" },
        ], status: "OK" },
      })
      .mockResolvedValueOnce({
        data: { predictions: [
          { place_id: "geo1", description: "Avondale, Harare" },
          { place_id: "shared", description: "Some Shared Place" },
        ], status: "OK" },
      });

    const req = mockReq({ input: "test", sessiontoken: "tok", types: "default" });
    const res = mockRes();
    await PublicController.getPlacesAutocompleteAddresses(req, res, jest.fn());
    await flushPromises();

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = mockedAxios.get.mock.calls;
    expect(firstCall![1]!.params.types).toBe("establishment");
    expect(secondCall![1]!.params.types).toBe("geocode");
    // Both calls must enforce country restriction
    expect(firstCall![1]!.params.components).toBe("country:rw|country:zw");
    expect(secondCall![1]!.params.components).toBe("country:rw|country:zw");

    const sent = (res.json as jest.Mock).mock.calls[0][0];
    expect(sent.success).toBe(true);
    const ids = sent.data.predictions.map((p: any) => p.place_id);
    expect(ids).toEqual(["est1", "shared", "geo1"]);
    expect(ids.length).toBe(3); // shared appeared once, deduped
  });

  it("caps results at 5", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { predictions: Array.from({ length: 4 }, (_, i) => ({ place_id: `est${i}`, description: `e${i}` })), status: "OK" },
      })
      .mockResolvedValueOnce({
        data: { predictions: Array.from({ length: 4 }, (_, i) => ({ place_id: `geo${i}`, description: `g${i}` })), status: "OK" },
      });
    const req = mockReq({ input: "x", sessiontoken: "t", types: "default" });
    const res = mockRes();
    await PublicController.getPlacesAutocompleteAddresses(req, res, jest.fn());
    await flushPromises();
    const sent = (res.json as jest.Mock).mock.calls[0][0];
    expect(sent.data.predictions.length).toBe(5);
  });

  it("ignores Google ZERO_RESULTS status on one call but still returns the other", async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { predictions: [], status: "ZERO_RESULTS" } })
      .mockResolvedValueOnce({ data: { predictions: [{ place_id: "geo1", description: "A" }], status: "OK" } });
    const req = mockReq({ input: "x", sessiontoken: "t", types: "default" });
    const res = mockRes();
    await PublicController.getPlacesAutocompleteAddresses(req, res, jest.fn());
    await flushPromises();
    const sent = (res.json as jest.Mock).mock.calls[0][0];
    expect(sent.data.predictions.map((p: any) => p.place_id)).toEqual(["geo1"]);
  });

  it("when types is omitted, makes a single call with no type filter (backwards compat)", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { predictions: [{ place_id: "x", description: "y" }], status: "OK" },
    });
    const req = mockReq({ input: "x", sessiontoken: "t" });
    const res = mockRes();
    await PublicController.getPlacesAutocompleteAddresses(req, res, jest.fn());
    await flushPromises();
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get.mock.calls[0]![1]!.params.types).toBeUndefined();
  });
});
