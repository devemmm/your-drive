import { computePlatformFeeCentsForSeat } from "./commission.service";

describe("computePlatformFeeCentsForSeat", () => {
  it("applies the commission rate to the seat contribution", () => {
    // contribution per seat = 5000, rate = 10% → fee = 500
    expect(computePlatformFeeCentsForSeat(5000, 10)).toBe(50000); // stored as cents
  });
  it("rounds up fractional cents", () => {
    // 33.33 * 10% = 3.333 → 3.333 * 100 = 333.3 → Math.ceil = 334
    expect(computePlatformFeeCentsForSeat(33.33, 10)).toBe(334);
  });
  it("returns 0 when contribution is 0", () => {
    expect(computePlatformFeeCentsForSeat(0, 10)).toBe(0);
  });
});
