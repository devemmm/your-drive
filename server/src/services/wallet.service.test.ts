import { resolveDebtLimit, assertAboveDebtLimit, InsufficientWalletError } from "./wallet.service";

describe("resolveDebtLimit", () => {
  it("returns user override when set", () => {
    expect(resolveDebtLimit({ walletDebtLimitCents: 100000 }, 500000)).toBe(100000);
  });
  it("falls back to settings default when override is null", () => {
    expect(resolveDebtLimit({ walletDebtLimitCents: null }, 500000)).toBe(500000);
  });
});

describe("assertAboveDebtLimit", () => {
  const settings = { defaultDebtLimitCents: 500000, enforceDebtLimit: true };

  it("passes when balance is positive", () => {
    expect(() => assertAboveDebtLimit({ walletBalanceCents: 1000, walletDebtLimitCents: null }, settings)).not.toThrow();
  });
  it("passes when balance equals -limit", () => {
    expect(() => assertAboveDebtLimit({ walletBalanceCents: -500000, walletDebtLimitCents: null }, settings)).not.toThrow();
  });
  it("throws when balance is below -limit", () => {
    expect(() => assertAboveDebtLimit({ walletBalanceCents: -500001, walletDebtLimitCents: null }, settings))
      .toThrow(InsufficientWalletError);
  });
  it("does not throw when enforcement is disabled", () => {
    expect(() => assertAboveDebtLimit(
      { walletBalanceCents: -999999, walletDebtLimitCents: null },
      { ...settings, enforceDebtLimit: false },
    )).not.toThrow();
  });
  it("respects per-user override", () => {
    expect(() => assertAboveDebtLimit(
      { walletBalanceCents: -100001, walletDebtLimitCents: 100000 },
      settings,
    )).toThrow(InsufficientWalletError);
  });
  it("passes when balance is zero and limit is zero", () => {
    // balance=0, limit=0 → 0 < -0 is false → no throw
    expect(() => assertAboveDebtLimit(
      { walletBalanceCents: 0, walletDebtLimitCents: 0 },
      { defaultDebtLimitCents: 500000, enforceDebtLimit: true },
    )).not.toThrow();
  });

  it("throws when override is zero and balance is negative", () => {
    // override=0 means 'no debt allowed' — any negative balance should throw
    expect(() => assertAboveDebtLimit(
      { walletBalanceCents: -1, walletDebtLimitCents: 0 },
      { defaultDebtLimitCents: 500000, enforceDebtLimit: true },
    )).toThrow(InsufficientWalletError);
  });
});
