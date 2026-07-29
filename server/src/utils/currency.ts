export const getDefaultCurrency = (): string =>
  process.env.DEFAULT_CURRENCY?.trim() || "RWF";
