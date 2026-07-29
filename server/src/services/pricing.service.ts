import { VehicleCategory, RideType } from "@prisma/client";
import { prisma } from "../config/database";

export interface FareBreakdown {
  baseFare: number;
  perKm: number;
  perMinute: number;
  distanceKm: number;
  durationMin: number;
  raw: number;
  minimumFare: number;
  suggestedFare: number;
  currency: string;
  commissionPercent: number;
}

/**
 * Compute a suggested fare for a (category, rideType) given distance + duration.
 * Falls back to a sensible default if no active PricingSettings row matches.
 * Pure-ish: the only side-effect is the prisma read. The math itself is unit-tested.
 */
export async function estimateFare(input: {
  vehicleCategory: VehicleCategory;
  rideType: RideType;
  distanceKm: number;
  durationMin: number;
}): Promise<FareBreakdown> {
  const settings = await prisma.pricingSettings.findFirst({
    where: {
      vehicleCategory: input.vehicleCategory,
      rideType: input.rideType,
      isActive: true,
    },
  });

  const baseFare = Number(settings?.baseFare ?? 0);
  const perKm = Number(settings?.perKm ?? 0);
  const perMinute = Number(settings?.perMinute ?? 0);
  const minimumFare = Number(settings?.minimumFare ?? 0);
  const commissionPercent = Number(settings?.commissionPercent ?? 10);
  const currency = settings?.currency ?? "RWF";

  return computeFare({
    baseFare,
    perKm,
    perMinute,
    minimumFare,
    distanceKm: input.distanceKm,
    durationMin: input.durationMin,
    currency,
    commissionPercent,
  });
}

export function computeFare(input: {
  baseFare: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  distanceKm: number;
  durationMin: number;
  currency: string;
  commissionPercent: number;
}): FareBreakdown {
  const distanceKm = Math.max(0, input.distanceKm);
  const durationMin = Math.max(0, input.durationMin);
  const raw = input.baseFare + input.perKm * distanceKm + input.perMinute * durationMin;
  const suggestedFare = Math.max(raw, input.minimumFare);
  return {
    baseFare: input.baseFare,
    perKm: input.perKm,
    perMinute: input.perMinute,
    distanceKm,
    durationMin,
    raw: roundCurrency(raw),
    minimumFare: input.minimumFare,
    suggestedFare: roundCurrency(suggestedFare),
    currency: input.currency,
    commissionPercent: input.commissionPercent,
  };
}

function roundCurrency(value: number): number {
  // Round to nearest whole unit. RWF doesn't have fractional subunits; for
  // currencies that do (USD, CAD), the caller can re-scale if needed.
  return Math.round(value);
}

/**
 * Resolve commission percent for a (category, rideType) pair. Falls back to
 * the singleton CommissionSettings.rate if no active PricingSettings row exists.
 */
export async function resolveCommissionPercent(
  vehicleCategory: VehicleCategory | null | undefined,
  rideType: RideType | null | undefined,
): Promise<number> {
  if (vehicleCategory && rideType) {
    const ps = await prisma.pricingSettings.findFirst({
      where: { vehicleCategory, rideType, isActive: true },
      select: { commissionPercent: true },
    });
    if (ps) return Number(ps.commissionPercent);
  }
  const fallback = await prisma.commissionSettings.findFirst();
  return Number(fallback?.rate ?? 10);
}
