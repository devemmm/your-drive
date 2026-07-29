import { Prisma, TransactionType, TransactionStatus } from "@prisma/client";
import { getDefaultCurrency } from "../utils/currency";

export class InsufficientWalletError extends Error {
  code = "WALLET_DEBT_LIMIT";
  constructor() {
    super("Wallet balance is below the configured debt limit");
  }
}

type WalletUser = { walletBalanceCents: number; walletDebtLimitCents: number | null };
type Settings = { defaultDebtLimitCents: number; enforceDebtLimit: boolean };

export function resolveDebtLimit(user: { walletDebtLimitCents: number | null }, defaultLimit: number): number {
  return user.walletDebtLimitCents ?? defaultLimit;
}

export function assertAboveDebtLimit(user: WalletUser, settings: Settings): void {
  if (!settings.enforceDebtLimit) return;
  const limit = resolveDebtLimit(user, settings.defaultDebtLimitCents);
  if (user.walletBalanceCents < -limit) throw new InsufficientWalletError();
}

type PrismaTx = Prisma.TransactionClient;

/**
 * Credits a user's wallet.
 *
 * ATOMICITY: this function performs two writes (user.update + transaction.create).
 * The caller MUST wrap invocations in `prisma.$transaction(async tx => ...)`.
 * The `tx` parameter is typed as `Prisma.TransactionClient` but TypeScript does
 * not statically prevent the bare `PrismaClient` from being passed — passing
 * the root client will make the two writes non-atomic. Don't do that.
 */
export async function creditWallet(
  tx: PrismaTx,
  params: {
    userId: number;
    amountCents: number;              // positive
    type: TransactionType;            // WALLET_CREDIT
    rideId?: number | null;
  },
) {
  if (params.amountCents <= 0) throw new Error("creditWallet requires positive amount");
  await tx.user.update({
    where: { id: params.userId },
    data: { walletBalanceCents: { increment: params.amountCents } },
  });
  return tx.transaction.create({
    data: {
      type: params.type,
      status: TransactionStatus.PAID,
      amount: params.amountCents / 100,
      platformAmount: 0,
      userId: params.userId,
      rideId: params.rideId ?? null,
      currency: getDefaultCurrency(),
    },
  });
}

/**
 * Debits a user's wallet.
 *
 * ATOMICITY: this function performs two writes (user.update + transaction.create).
 * The caller MUST wrap invocations in `prisma.$transaction(async tx => ...)`.
 * The `tx` parameter is typed as `Prisma.TransactionClient` but TypeScript does
 * not statically prevent the bare `PrismaClient` from being passed — passing
 * the root client will make the two writes non-atomic. Don't do that.
 */
export async function debitWallet(
  tx: PrismaTx,
  params: {
    userId: number;
    amountCents: number;              // positive
    type: TransactionType;            // COMMISSION_DEBIT
    rideId?: number | null;
  },
) {
  if (params.amountCents <= 0) throw new Error("debitWallet requires positive amount");
  await tx.user.update({
    where: { id: params.userId },
    data: { walletBalanceCents: { decrement: params.amountCents } },
  });
  return tx.transaction.create({
    data: {
      type: params.type,
      status: TransactionStatus.PAID,
      amount: -(params.amountCents / 100),
      platformAmount: 0,
      userId: params.userId,
      rideId: params.rideId ?? null,
      currency: getDefaultCurrency(),
    },
  });
}
