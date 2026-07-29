import {
  hashDriverToken,
  currentRotationKey,
} from "./driverPresenceToken";

describe("driverPresenceToken", () => {
  const SECRET = "test-secret";

  it("produces a stable token for the same user + rotation key", () => {
    const a = hashDriverToken(42, "2026-04-16", SECRET);
    const b = hashDriverToken(42, "2026-04-16", SECRET);
    expect(a).toBe(b);
  });

  it("produces different tokens for different users on the same day", () => {
    const a = hashDriverToken(42, "2026-04-16", SECRET);
    const b = hashDriverToken(43, "2026-04-16", SECRET);
    expect(a).not.toBe(b);
  });

  it("produces different tokens for the same user on different days", () => {
    const a = hashDriverToken(42, "2026-04-16", SECRET);
    const b = hashDriverToken(42, "2026-04-17", SECRET);
    expect(a).not.toBe(b);
  });

  it("does not reveal the raw user id", () => {
    const token = hashDriverToken(42, "2026-04-16", SECRET);
    expect(token).not.toContain("42");
    expect(token.length).toBeGreaterThan(20);
  });

  it("currentRotationKey returns YYYY-MM-DD in UTC", () => {
    const key = currentRotationKey(new Date("2026-04-16T23:30:00Z"));
    expect(key).toBe("2026-04-16");
    const nextDay = currentRotationKey(new Date("2026-04-17T00:01:00Z"));
    expect(nextDay).toBe("2026-04-17");
  });
});
