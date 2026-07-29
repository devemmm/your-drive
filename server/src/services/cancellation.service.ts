import { Prisma } from "@prisma/client";
import { logger } from "../utils/logger";

/**
 * Compute the refund percentage owed to the renter / passenger when they
 * cancel ahead of the scheduled start. The 24h / 12h / no-show tiers come
 * from RentalSettings or ChauffeurSettings.
 */
export interface CancellationSettingsLike {
  cancelRefundPctOver24h: Prisma.Decimal | number;
  cancelRefundPct12To24h: Prisma.Decimal | number;
  cancelRefundPctUnder12h: Prisma.Decimal | number;
  noShowRefundPct: Prisma.Decimal | number;
}

export type CancellationTier = "OVER_24H" | "T12_TO_24H" | "UNDER_12H" | "NO_SHOW";

export interface CancellationRefund {
  tier: CancellationTier;
  refundPercent: number;
  hoursBeforeStart: number;
}

const HOUR_MS = 60 * 60 * 1000;

export function computeCancellationRefund(
  scheduledStart: Date,
  now: Date,
  settings: CancellationSettingsLike,
): CancellationRefund {
  const ms = scheduledStart.getTime() - now.getTime();
  const hours = ms / HOUR_MS;

  let tier: CancellationTier;
  let refundPercent: number;

  if (hours <= 0) {
    tier = "NO_SHOW";
    refundPercent = Number(settings.noShowRefundPct);
  } else if (hours >= 24) {
    tier = "OVER_24H";
    refundPercent = Number(settings.cancelRefundPctOver24h);
  } else if (hours >= 12) {
    tier = "T12_TO_24H";
    refundPercent = Number(settings.cancelRefundPct12To24h);
  } else {
    tier = "UNDER_12H";
    refundPercent = Number(settings.cancelRefundPctUnder12h);
  }

  return { tier, refundPercent, hoursBeforeStart: hours };
}

/**
 * Common audit-log emit for both rental and chauffeur cancel flows. Returns
 * the computed refund so the caller can attach it to the response payload.
 */
export function logCancellationPolicy(params: {
  action: string;
  userId: number;
  scheduledStart: Date;
  settings: CancellationSettingsLike | null;
  meta: Record<string, unknown>;
}): CancellationRefund | null {
  if (!params.settings) return null;
  const refund = computeCancellationRefund(params.scheduledStart, new Date(), params.settings);
  logger.info("Cancellation refund computed", {
    action: params.action,
    userId: params.userId,
    meta: {
      ...params.meta,
      tier: refund.tier,
      refundPercent: refund.refundPercent,
      hoursBeforeStart: Math.round(refund.hoursBeforeStart * 10) / 10,
    },
  });
  return refund;
}
