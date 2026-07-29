jest.mock("../services/busRide.service", () => ({ findOrCreateScheduledRide: jest.fn() }));
jest.mock("uuid", () => ({ v4: jest.fn(() => "test-uuid") }));
jest.mock("../config/database", () => ({ prisma: {} }));
jest.mock("../services/transaction.service", () => ({}));
jest.mock("../services/notification.service", () => ({}));
jest.mock("../services/coupon.service", () => ({}));
jest.mock("../services/ratingReview.service", () => ({}));
jest.mock("../services/rideRequest.service", () => ({}));
jest.mock("../services/search/rideSearch.service", () => ({}));

import { Request, Response } from "express";
import { RideController } from "./ride.controller";
import { findOrCreateScheduledRide } from "../services/busRide.service";

function res() {
  const r: Partial<Response> = {};
  r.json = jest.fn().mockReturnValue(r);
  r.status = jest.fn().mockReturnValue(r);
  return r as Response;
}
const flush = () => new Promise<void>((x) => setImmediate(x));

describe("RideController.createFromSchedule", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the materialized ride", async () => {
    (findOrCreateScheduledRide as jest.Mock).mockResolvedValue({ id: 100 });
    const req = { body: { routeDepartureId: 3, date: "2999-01-01" } } as unknown as Request;
    const r = res();
    await RideController.createFromSchedule(req, r, jest.fn());
    await flush();
    expect(findOrCreateScheduledRide).toHaveBeenCalledWith({ routeDepartureId: 3, date: "2999-01-01" });
    expect(r.json).toHaveBeenCalledWith({ ride: { id: 100 } });
  });

  it("maps PAST_DEPARTURE to 400", async () => {
    (findOrCreateScheduledRide as jest.Mock).mockRejectedValue(new Error("PAST_DEPARTURE"));
    const next = jest.fn();
    const req = { body: { routeDepartureId: 3, date: "2000-01-01" } } as unknown as Request;
    await RideController.createFromSchedule(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(400);
  });

  it("maps DEPARTURE_NOT_FOUND to 404", async () => {
    (findOrCreateScheduledRide as jest.Mock).mockRejectedValue(new Error("DEPARTURE_NOT_FOUND"));
    const next = jest.fn();
    const req = { body: { routeDepartureId: 3, date: "2999-01-01" } } as unknown as Request;
    await RideController.createFromSchedule(req, res(), next);
    await flush();
    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err.statusCode).toBe(404);
  });
});
