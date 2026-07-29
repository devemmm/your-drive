import { Request, Response } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";

export class WalletSettingsController {
  static get = catchAsync(async (_req: Request, res: Response) => {
    const settings = await prisma.walletSettings.findFirstOrThrow();
    res.json({ settings });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const { defaultDebtLimitCents, enforceDebtLimit } = req.body as {
      defaultDebtLimitCents?: number;
      enforceDebtLimit?: boolean;
    };
    const current = await prisma.walletSettings.findFirstOrThrow();
    const updated = await prisma.walletSettings.update({
      where: { id: current.id },
      data: {
        ...(defaultDebtLimitCents !== undefined && { defaultDebtLimitCents }),
        ...(enforceDebtLimit !== undefined && { enforceDebtLimit }),
      },
    });
    res.json({ settings: updated });
  });
}
