import { computeFare } from "./pricing.service";

describe("computeFare", () => {
  const base = {
    baseFare: 1000,
    perKm: 300,
    perMinute: 50,
    minimumFare: 1500,
    currency: "RWF",
    commissionPercent: 10,
  };

  it("returns base + perKm*km + perMin*min when above minimum", () => {
    const result = computeFare({ ...base, distanceKm: 10, durationMin: 20 });
    // 1000 + 300*10 + 50*20 = 5000
    expect(result.suggestedFare).toBe(5000);
    expect(result.raw).toBe(5000);
  });

  it("clamps to minimumFare when raw is below", () => {
    const result = computeFare({ ...base, distanceKm: 0, durationMin: 0 });
    // raw = 1000, min = 1500
    expect(result.raw).toBe(1000);
    expect(result.suggestedFare).toBe(1500);
  });

  it("treats negative distance/duration as zero", () => {
    const result = computeFare({ ...base, distanceKm: -5, durationMin: -10 });
    expect(result.distanceKm).toBe(0);
    expect(result.durationMin).toBe(0);
    expect(result.suggestedFare).toBe(1500); // clamped to minimum
  });

  it("rounds to whole currency units", () => {
    const result = computeFare({ ...base, perKm: 333.33, distanceKm: 3, durationMin: 0 });
    // 1000 + 333.33*3 = 1999.99 → 2000
    expect(result.suggestedFare).toBe(2000);
  });

  it("preserves currency and commissionPercent in the breakdown", () => {
    const result = computeFare({ ...base, distanceKm: 1, durationMin: 1 });
    expect(result.currency).toBe("RWF");
    expect(result.commissionPercent).toBe(10);
  });
});
