const NO_SUBUNIT = new Set(["RWF", "JPY", "KRW", "VND", "UGX"]);

export const formatCurrency = (amountCents: number, currency: string = "RWF"): string => {
  const noSubunit = NO_SUBUNIT.has(currency);
  const amount = noSubunit ? Math.round(amountCents / 100) : amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: noSubunit ? 0 : 2,
    maximumFractionDigits: noSubunit ? 0 : 2,
  }).format(amount);
};
