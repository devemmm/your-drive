import { getDefaultCurrency } from "../currency";

describe("getDefaultCurrency", () => {
  const originalEnv = process.env.DEFAULT_CURRENCY;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DEFAULT_CURRENCY;
    else process.env.DEFAULT_CURRENCY = originalEnv;
  });

  it("returns RWF when DEFAULT_CURRENCY is unset", () => {
    delete process.env.DEFAULT_CURRENCY;
    expect(getDefaultCurrency()).toBe("RWF");
  });

  it("returns RWF when DEFAULT_CURRENCY is empty string", () => {
    process.env.DEFAULT_CURRENCY = "";
    expect(getDefaultCurrency()).toBe("RWF");
  });

  it("returns the env value when DEFAULT_CURRENCY is set", () => {
    process.env.DEFAULT_CURRENCY = "USD";
    expect(getDefaultCurrency()).toBe("USD");
  });

  it("trims whitespace from DEFAULT_CURRENCY", () => {
    process.env.DEFAULT_CURRENCY = "  CAD  ";
    expect(getDefaultCurrency()).toBe("CAD");
  });
});
