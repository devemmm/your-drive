import { Prisma } from "@prisma/client";
import { computeCancellationRefund } from "./cancellation.service";

const defaults = {
  cancelRefundPctOver24h: 100,
  cancelRefundPct12To24h: 80,
  cancelRefundPctUnder12h: 50,
  noShowRefundPct: 0,
};

const HOUR = 60 * 60 * 1000;

describe("computeCancellationRefund", () => {
  const now = new Date("2026-05-17T10:00:00.000Z");

  it("returns OVER_24H + 100% when cancel is 48h before start", () => {
    const start = new Date(now.getTime() + 48 * HOUR);
    const result = computeCancellationRefund(start, now, defaults);
    expect(result.tier).toBe("OVER_24H");
    expect(result.refundPercent).toBe(100);
  });

  it("returns OVER_24H at exactly 24h boundary", () => {
    const start = new Date(now.getTime() + 24 * HOUR);
    const result = computeCancellationRefund(start, now, defaults);
    expect(result.tier).toBe("OVER_24H");
  });

  it("returns T12_TO_24H + 80% when cancel is 18h before start", () => {
    const start = new Date(now.getTime() + 18 * HOUR);
    const result = computeCancellationRefund(start, now, defaults);
    expect(result.tier).toBe("T12_TO_24H");
    expect(result.refundPercent).toBe(80);
  });

  it("returns T12_TO_24H at exactly 12h boundary", () => {
    const start = new Date(now.getTime() + 12 * HOUR);
    const result = computeCancellationRefund(start, now, defaults);
    expect(result.tier).toBe("T12_TO_24H");
  });

  it("returns UNDER_12H + 50% when cancel is 6h before start", () => {
    const start = new Date(now.getTime() + 6 * HOUR);
    const result = computeCancellationRefund(start, now, defaults);
    expect(result.tier).toBe("UNDER_12H");
    expect(result.refundPercent).toBe(50);
  });

  it("returns NO_SHOW + 0% when start is in the past", () => {
    const start = new Date(now.getTime() - 30 * 60 * 1000);
    const result = computeCancellationRefund(start, now, defaults);
    expect(result.tier).toBe("NO_SHOW");
    expect(result.refundPercent).toBe(0);
  });

  it("uses configured percentages from settings", () => {
    const custom = {
      cancelRefundPctOver24h: 90,
      cancelRefundPct12To24h: 60,
      cancelRefundPctUnder12h: 25,
      noShowRefundPct: 10,
    };
    const start = new Date(now.getTime() + 6 * HOUR);
    const result = computeCancellationRefund(start, now, custom);
    expect(result.refundPercent).toBe(25);
  });

  it("accepts Prisma.Decimal inputs (Decimal coerces via Number())", () => {
    const decimalSettings = {
      cancelRefundPctOver24h: new Prisma.Decimal("75"),
      cancelRefundPct12To24h: new Prisma.Decimal("55"),
      cancelRefundPctUnder12h: new Prisma.Decimal("30"),
      noShowRefundPct: new Prisma.Decimal("5"),
    };
    const start = new Date(now.getTime() + 48 * HOUR);
    const result = computeCancellationRefund(start, now, decimalSettings);
    expect(result.refundPercent).toBe(75);
  });
});
