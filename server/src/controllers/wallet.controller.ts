import { Request, Response } from "express";
import { catchAsync } from "../utils/CatchAsync";
import { prisma } from "../config/database";
import { creditWallet } from "../services/wallet.service";
import { TransactionType } from "@prisma/client";

export class WalletController {
  static getMyWallet = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { walletBalanceCents: true, walletDebtLimitCents: true },
    });
    const settings = await prisma.walletSettings.findFirstOrThrow();
    const ledger = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: [TransactionType.COMMISSION_DEBIT, TransactionType.WALLET_CREDIT] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({
      balanceCents: user.walletBalanceCents,
      debtLimitCents: user.walletDebtLimitCents ?? settings.defaultDebtLimitCents,
      enforceDebtLimit: settings.enforceDebtLimit,
      ledger,
    });
  });

  static listWalletsAdmin = catchAsync(async (req: Request, res: Response) => {
    const { negative } = req.query;
    const where: any = {};
    if (negative === "true") where.walletBalanceCents = { lt: 0 };
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        walletBalanceCents: true,
        walletDebtLimitCents: true,
      },
      orderBy: { walletBalanceCents: "asc" },
      take: 200,
    });
    res.json({ users });
  });

  static creditWalletAdmin = catchAsync(async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    const { amountCents, reason } = req.body as { amountCents: number; reason: string };
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return res.status(400).json({ error: "INVALID_AMOUNT" });
    }
    if (!reason || reason.length < 2) {
      return res.status(400).json({ error: "REASON_REQUIRED" });
    }
    const txResult = await prisma.$transaction(async (tx) =>
      creditWallet(tx, {
        userId,
        amountCents,
        type: TransactionType.WALLET_CREDIT,
      }),
    );
    res.status(201).json({ transaction: txResult });
  });
}
