// Pure unit tests for bid.service.
//
// **Integration test debt:** the meaningful business logic of this module
// (submitBid / acceptBid / cancelBidByDriver / sweepPendingBids) lives
// inside prisma.$transaction bodies and is best validated end-to-end
// against a real DB. The repo currently has no DB-integration test
// scaffold (every existing services test is a pure unit test), so the
// integration coverage for this slice is being validated by the manual
// smoke run noted in the plan. Bringing up a DB-integration scaffold
// is tracked as a separate follow-up slice. Until then, this file
// covers only the pure parts: BidConflictError construction.
//
// Note on mocks: bid.service transitively imports ../server (via
// notification.service), which pulls the Express app graph and an ESM
// `uuid` module that Jest's CJS transform can't parse. We mock the
// problematic edges so the pure BidConflictError export can be imported
// in isolation. These mocks are not exercised by the assertions below.

jest.mock("../config/database", () => ({ prisma: {} }));
jest.mock("../config/firebase", () => ({ handleMessaging: null }));
jest.mock("../server", () => ({ io: { to: () => ({ emit: () => undefined }) } }));
jest.mock("./notification.service", () => ({ NotificationServices: {} }));

import { BidConflictError } from "./bid.service";

describe("BidConflictError", () => {
  it("is an Error subclass with the expected name", () => {
    const err = new BidConflictError("REQUEST_CLOSED", "Ride request is not open");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("BidConflictError");
    expect(err.message).toBe("Ride request is not open");
  });

  it("preserves every defined code on the instance", () => {
    const codes = [
      "REQUEST_CLOSED",
      "BID_EXISTS",
      "BID_NOT_PENDING",
      "KYC_REQUIRED",
      "NOT_OWNER",
      "VEHICLE_NOT_OWNED",
    ] as const;
    for (const code of codes) {
      const err = new BidConflictError(code, `msg for ${code}`);
      expect(err.code).toBe(code);
    }
  });

  it("can be caught and discriminated by code via instanceof", () => {
    function throwsConflict() {
      throw new BidConflictError("BID_EXISTS", "duplicate");
    }
    try {
      throwsConflict();
      fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(BidConflictError);
      if (e instanceof BidConflictError) {
        expect(e.code).toBe("BID_EXISTS");
      }
    }
  });
});
