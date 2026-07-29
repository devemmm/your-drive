import { Prisma, TransactionType, ContributionCollectionMethod } from "@prisma/client";
import { debitWallet } from "./wallet.service";

export function computePlatformFeeCentsForSeat(perSeatContribution: number, commissionRatePercent: number): number {
  const fee = perSeatContribution * (commissionRatePercent / 100);
  return Math.ceil(fee * 100);
}

type PrismaTx = Prisma.TransactionClient;

/**
 * Debit the platform commission from the vehicle owner's wallet for each attended
 * seat on a completed OFF_PLATFORM ride. Idempotent via caller's `isSettled` flag —
 * caller must ensure this is only invoked once per ride.
 *
 * ATOMICITY: this function calls debitWallet which performs two writes per seat.
 * The caller MUST wrap invocations in `prisma.$transaction(async tx => ...)`.
 */
export async function debitCommissionForCompletedRide(
  tx: PrismaTx,
  rideId: number,
): Promise<{ seatsDebited: number; totalCents: number }> {
  const ride = await tx.ride.findUnique({
    where: { id: rideId },
    select: {
      id: true,
      type: true,
      contribution: true,
      contributionCollectionMethod: true,
      vehicle: { select: { userId: true, category: true } },
      bookingSeats: {
        where: { attendedAt: { not: null }, isExpired: false },
        select: { id: true },
      },
    },
  });

  if (!ride) throw new Error(`debitCommissionForCompletedRide: ride ${rideId} not found`);

  if (ride.contributionCollectionMethod !== ContributionCollectionMethod.OFF_PLATFORM) {
    return { seatsDebited: 0, totalCents: 0 };
  }

  // Per-category × ride-type rate from PricingSettings if a matching active row
  // exists; fall back to the singleton CommissionSettings.rate (default 10%).
  let ratePercent: number | null = null;
  const ps = await tx.pricingSettings.findFirst({
    where: { vehicleCategory: ride.vehicle.category, rideType: ride.type, isActive: true },
    select: { commissionPercent: true },
  });
  if (ps) ratePercent = Number(ps.commissionPercent);
  if (ratePercent == null) {
    const fallback = await tx.commissionSettings.findFirst();
    ratePercent = Number(fallback?.rate ?? 10);
  }

  const feeCentsPerSeat = computePlatformFeeCentsForSeat(ride.contribution, ratePercent);

  let totalCents = 0;
  for (const seat of ride.bookingSeats) {
    if (feeCentsPerSeat <= 0) continue;
    await debitWallet(tx, {
      userId: ride.vehicle.userId,
      amountCents: feeCentsPerSeat,
      type: TransactionType.COMMISSION_DEBIT,
      rideId: ride.id,
    });
    totalCents += feeCentsPerSeat;
  }

  return { seatsDebited: ride.bookingSeats.length, totalCents };
}
