import { catchAsync } from "../utils/CatchAsync";
import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { AppError } from "../utils/AppError";
import {
  BookingStatus,
  Prisma,
  RideStatus,
  Status,
} from "@prisma/client";
import { prisma } from "../config/database";
import { FeeSettingInput } from "../middlewares/validators/setting.request.validator";
import { getLogsByAction, getPaymentLogs, logger } from "../utils/logger";
import { CronJob } from "cron";
import moment from "moment";

export class AdminController {
  // Create a new FeeSetting
  static createFeeSetting = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { type, amount, active } = matchedData<FeeSettingInput>(req);

      if (active && active === true) {
        await prisma.feeSetting.updateMany({
          where: { active: true, type },
          data: { active: false },
        });
      }

      const feeSetting = await prisma.feeSetting.create({
        data: {
          type,
          amount,
          active,
        },
      });

      return res.status(201).json({
        success: true,
        data: feeSetting,
      });
    }
  );

  // Get all FeeSettings
  static getFeeSettings = catchAsync(
    async (_req: Request, res: Response, _next: NextFunction) => {
      const feeSettings = await prisma.feeSetting.findMany({
        orderBy: { active: "desc" },
      });
      return res.json({
        success: true,
        data: feeSettings,
      });
    }
  );

  // Update a FeeSetting by id
  static updateFeeSetting = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { feeSettingId, amount, active } = matchedData<
        Omit<Partial<FeeSettingInput>, "type"> & { feeSettingId: number }
      >(req);

      const isEN = req.isEnglishPreferred;
      if (amount == undefined && active == undefined) {
        return next(
          AppError(
            isEN
              ? "At least on field should be provided"
              : "Au moins un champ doit être fourni.",
            422
          )
        );
      }
      const feeSetting = await prisma.feeSetting.findUnique({
        where: { id: feeSettingId },
      });

      if (!feeSetting) {
        return next(
          AppError(
            isEN ? "FeeSetting not found" : "Paramètre de frais non trouvé",
            404
          )
        );
      }

      if (
        feeSetting.active === true &&
        active !== undefined &&
        active === false
      ) {
        return next(
          AppError(
            isEN
              ? `Cannot deactivate the only active setting of ${feeSetting.type.toLowerCase()}, there should be at least one active setting of this type, first activate another setting of this type`
              : `Impossible de désactiver le seul paramètre actif de ${feeSetting.type.toLowerCase()}, il doit y avoir au moins un paramètre actif de ce type, activez d'abord un autre paramètre de ce type`
          )
        );
      }

      if (active && active === true) {
        await prisma.feeSetting.updateMany({
          where: { active: true, type: feeSetting.type },
          data: { active: false },
        });
      }

      const updatedFeeSetting = await prisma.feeSetting.update({
        where: { id: feeSetting.id },
        data: {
          ...(amount !== undefined && { amount }),
          ...(active !== undefined && { active }),
        },
      });

      return res.json({
        success: true,
        data: updatedFeeSetting,
      });
    }
  );

  // Delete a FeeSetting by id
  static deleteFeeSetting = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { feeSettingId } = matchedData<{ feeSettingId: number }>(req);

      const isEN = req.isEnglishPreferred;

      const feeSetting = await prisma.feeSetting.findUnique({
        where: { id: feeSettingId },
      });

      if (!feeSetting) {
        return next(
          AppError(
            isEN ? "FeeSetting not found" : "Paramètre de frais non trouvé",
            404
          )
        );
      }

      if (feeSetting.active) {
        return next(
          AppError(
            isEN
              ? `Cannot delete the only active setting of ${feeSetting.type.toLowerCase()}, there should be at least one active setting of this type, first activate another setting of this type`
              : `Impossible de supprimer le seul paramètre actif de ${feeSetting.type.toLowerCase()}, il doit y avoir au moins un paramètre actif de ce type, activez d'abord un autre paramètre de ce type`,
            422
          )
        );
      }

      await prisma.feeSetting.delete({
        where: { id: feeSettingId },
      });

      return res.json({
        success: true,
        message: isEN ? "FeeSetting deleted" : "Paramètre de frais supprimé",
      });
    }
  );

  // Get all CouponRedemptionRules
  static getCouponRedemptionRules = catchAsync(
    async (_req: Request, res: Response, _next: NextFunction) => {
      const rules = await prisma.couponRedemptionRule.findMany();
      return res.json({
        success: true,
        data: rules,
      });
    }
  );

  // Update a CouponRedemptionRule by id
  static updateCouponRedemptionRule = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { ruleId, requiredCoupons, description } = matchedData<{
        ruleId: number;
        requiredCoupons?: number;
        description?: string;
      }>(req);
      const isEN = req.isEnglishPreferred;

      if (requiredCoupons === undefined && description === undefined) {
        return next(
          AppError(
            isEN
              ? "At least one field must be provided"
              : "Au moins un champ doit être fourni.",
            422
          )
        );
      }

      const rule = await prisma.couponRedemptionRule.findUnique({
        where: { id: ruleId },
      });
      if (!rule) {
        return next(
          AppError(
            isEN
              ? "Coupon redemption rule not found"
              : "Règle d'échange de coupon non trouvée",
            404
          )
        );
      }

      const updatedRule = await prisma.couponRedemptionRule.update({
        where: { id: rule.id },
        data: {
          ...(requiredCoupons !== undefined && { requiredCoupons }),
          ...(description !== undefined && { description }),
        },
      });

      return res.json({
        success: true,
        message: isEN
          ? "Coupon redemption rule updated"
          : "Règle d'échange de coupon mise à jour",
        data: updatedRule,
      });
    }
  );

  // delete a user but it temporarily
  static deleteUser = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = matchedData<{ userId: number }>(req, {
        locations: ["params"],
      });
      const isEN = req.isEnglishPreferred;

      const userToDel = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          _count: {
            select: {
              driverReviews: true,
              userReviews: true,
              blockedRides: true,
              reviewedCancellationRides: true,
              coupons: true,
              chatThreads: true,
              cancelledBookings: true,
              bookings: true,
              transactions: true,
              subscriptions: true,
              postedRides: true,
            },
          },
          postedRides: {
            where: {
              status: { in: [RideStatus.ONGOING, RideStatus.PUBLISHED] },
            },
          },
        },
      });

      if (!userToDel) {
        return next(
          AppError(isEN ? "User not found" : "Utilisateur non trouvé", 404)
        );
      }

      if (userToDel.id === req.user!.id) {
        return next(
          AppError(
            isEN
              ? "You can not delete your account from here, use delete account option instead."
              : "Vous ne pouvez pas supprimer votre compte d'ici, utilisez plutôt l'option de suppression de compte.",
            404
          )
        );
      }

      const canBeDeleted = Object.values(userToDel._count).every(
        (count) => count === 0
      );

      // if the use can be deleted, delete the account otherwise mark as deleted
      if (canBeDeleted) {
        await prisma.user.delete({ where: { id: userToDel.id } });
        return res.json({
          success: true,
          message: isEN
            ? "User deleted successfully"
            : "Utilisateur supprimé avec succès",
        });
      }

      if (userToDel.postedRides.length > 0) {
        return next(
          AppError(
            isEN
              ? "User cannot be deleted has ride that is either in ongoing state or published state"
              : "L'utilisateur ne peut pas être supprimé parce qu'il a un trajet qui est en cours ou publié.",
            400
          )
        );
      }

      await prisma.user.update({
        where: {
          id: userToDel.id,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          phoneNumber: null,
          postedRides: {
            updateMany: {
              where: { isDeleted: false },
              data: {
                isDeleted: true,
              },
            },
          },
          subscriptions: {
            updateMany: {
              where: { isActive: true },
              data: {
                isActive: false,
              },
            },
          },
          bookings: {
            updateMany: {
              where: {
                status: { in: [BookingStatus.APPROVED, BookingStatus.PENDING] },
              },
              data: {
                status: BookingStatus.CANCELLED,
                reason: "Account deleted by the admin",
              },
            },
          },
          coupons: {
            updateMany: {
              where: { redeemed: false },
              data: {
                redeemed: true,
                redeemedAt: new Date(),
                redeemReason: "admin deleted the account",
              },
            },
          },
        },
      });

      return res.json({
        success: true,
        message: isEN
          ? "User deleted successfully"
          : "Utilisateur supprimé avec succès",
      });
    }
  );

  // Suspend a user
  static suspendUserAccount = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId, suspendUntil } = matchedData<{
        userId: number;
        suspendUntil?: number;
        suspensionReason?: string;
      }>(req, {
        locations: ["params", "body"],
      });
      const isEN = req.isEnglishPreferred;

      const userToSuspend = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToSuspend) {
        return next(
          AppError(isEN ? "User not found" : "Utilisateur non trouvé", 404)
        );
      }

      if (userToSuspend.id === req.user!.id) {
        return next(
          AppError(
            isEN
              ? "You cannot suspend your own account."
              : "Vous ne pouvez pas suspendre votre propre compte.",
            404
          )
        );
      }

      let suspendUntilDate: Date | null = null;
      if (suspendUntil) {
        const date = new Date(suspendUntil);
        if (isNaN(date.getTime())) {
          return next(
            AppError(
              isEN
                ? "Invalid suspendUntil date."
                : "Date de suspension invalide.",
              400
            )
          );
        }
        suspendUntilDate = date;
      }

      await prisma.user.update({
        where: {
          id: userToSuspend.id,
        },
        data: {
          status: Status.SUSPENDED,
          suspendUntil: suspendUntilDate,
          suspendedAt: new Date(),
        },
      });

     

      return res.json({
        success: true,
        message: isEN
          ? "User suspended successfully"
          : "Utilisateur suspendu avec succès",
        suspendUntil: suspendUntilDate,
      });
    }
  );

  // Reactivate (unsuspend) a user account manually
  static activateUserAccount = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = matchedData<{ userId: number }>(req, {
        locations: ["params", "body"],
      });
      const isEN = req.isEnglishPreferred;

      const userToUnsuspend = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToUnsuspend) {
        return next(
          AppError(isEN ? "User not found" : "Utilisateur non trouvé", 404)
        );
      }

      if (userToUnsuspend.status !== Status.SUSPENDED) {
        return next(
          AppError(
            isEN ? "User is not suspended" : "L'utilisateur n'est pas suspendu",
            400
          )
        );
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          status: Status.ACTIVE,
          suspendUntil: null,
          suspendedAt: null,
        },
      });

      
      return res.json({
        success: true,
        message: isEN
          ? "User account reactivated successfully"
          : "Compte utilisateur réactivé avec succès",
      });
    }
  );

  static getLogs = catchAsync(
    async (req: Request, res: Response, _next: NextFunction) => {
      const {
        page = 1,
        limit = 10,
        search,
        level,
        action,
        type,
        startDate: fromDate,
        endDate: toDate,
        userId,
        exportType,
        sortBy,
        sortOrder = "desc",
      } = matchedData<{
        page?: number;
        limit?: number;
        userId?: number;
        //! this might change to 'error'|'info'|'warn'
        level?: string;
        action?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
        exportType?: string;
        type?: string;
      }>(req);

      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const userIdNum = userId ? Number(userId) : undefined;

      let logsResult;

      if (type === "payment") {
        logsResult = getPaymentLogs({
          search: typeof search === "string" ? search : undefined,
          level: typeof level === "string" ? level : undefined,
          fromDate: typeof fromDate === "string" ? fromDate : undefined,
          toDate: typeof toDate === "string" ? toDate : undefined,
          userId: userIdNum,
          page: pageNum,
          limit: limitNum,
          orderBy: {
            field: sortBy || "timestamp",
            direction: sortOrder,
          },
        });
      } else {
        logsResult = getLogsByAction({
          action: typeof action === "string" ? action : undefined,
          search: typeof search === "string" ? search : undefined,
          level: typeof level === "string" ? level : undefined,
          fromDate: typeof fromDate === "string" ? fromDate : undefined,
          toDate: typeof toDate === "string" ? toDate : undefined,
          userId: userIdNum,
          page: pageNum,
          limit: limitNum,
          orderBy: {
            field: sortBy || "timestamp",
            direction: sortOrder,
          },
        });
      }

      if (!logsResult.success) {
        return res.status(500).json({
          success: false,
          message: logsResult.message,
          data: [],
        });
      }

      if (exportType === "json") {
        return res
          .setHeader("Content-Type", "application/json")
          .json(logsResult.data);
      }

      if (exportType === "csv") {
        try {
          const { parse } = await import("json2csv");
          const fields = [
            "level",
            "timestamp",
            "message",
            "action",
            "userId",
            "meta",
          ];
          const csv = parse(logsResult.data, { fields });

          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", "attachment; filename=logs.csv");
          return res.send(csv);
        } catch (err) {
          return res.status(500).json({
            success: false,
            message: "Failed to export logs as CSV",
          });
        }
      }

      return res.json({
        success: true,
        data: logsResult.data,
        meta: logsResult.meta,
      });
    }
  );

  // Get commission settings
  static getCommissionSettings = catchAsync(
    async (_req: Request, res: Response, _next: NextFunction) => {
      const commission = await prisma.commissionSettings.findFirst();
      return res.json({
        success: true,
        data: commission,
      });
    }
  );

  // Update aCommission Setting by id
  static updateCommissionSetting = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { rate } = matchedData<{ rate: number }>(req);

      const isEN = req.isEnglishPreferred;

      const setting = await prisma.commissionSettings.findFirst();

      if (!setting) {
        return next(
          AppError(
            isEN
              ? "Commission setting not found"
              : "Paramètre de commission introuvable",
            404
          )
        );
      }

      const updatedSetting = await prisma.commissionSettings.update({
        where: { id: setting.id },
        data: {
          rate,
        },
      });

      return res.json({
        success: true,
        data: updatedSetting,
      });
    }
  );

  // Get current D2D settings (admin)
  static getD2DSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const settings = await prisma.d2DSetting.findFirst();
      const isEn = req.isEnglishPreferred;

      if (!settings) {
        return next(
          AppError(
            isEn
              ? "D2D settings not found"
              : "Paramètres porte à porte introuvables",
            404
          )
        );
      }

      res.json({
        success: true,
        data: settings,
      });
    }
  );

  // Update D2D settings (admin)
  static updateD2DSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const payload = matchedData(req) as {
        maxRadiusKm?: number;
        maxPricePerExtraKm?: number;
        // cancellationFeeAfterAccepted?: number;
      };
      const isEN = req.isEnglishPreferred;

      if (Object.keys(payload).length === 0) {
        return next(
          AppError(
            isEN
              ? "No valid fields to update."
              : "Aucun champ valide à mettre à jour.",
            400
          )
        );
      }

      const settings = await prisma.d2DSetting.findFirst();

      const updateData: Prisma.D2DSettingUpdateInput = {};
      if (payload.maxRadiusKm !== undefined)
        updateData.maxRadiusKm = payload.maxRadiusKm;
      if (payload.maxPricePerExtraKm !== undefined)
        updateData.maxPricePerExtraKm = payload.maxPricePerExtraKm;
      // if (payload.cancellationFeeAfterAccepted !== undefined) updateData.cancellationFeeAfterAccepted = payload.cancellationFeeAfterAccepted;

      const updatedSettings = await prisma.d2DSetting.upsert({
        where: { id: settings?.id },
        create: {
          maxRadiusKm: payload.maxRadiusKm ?? 25,
          // cancellationFeeAfterAccepted: payload.cancellationFeeAfterAccepted ?? 0,
          maxPricePerExtraKm: payload.maxPricePerExtraKm ?? 2,
        },
        update: updateData,
      });

      res.json({
        success: true,
        message: isEN
          ? "D2D settings updated successfully."
          : "Paramètres D2D mis à jour avec succès.",
        data: updatedSettings,
      });
    }
  );
}

// check for suspended accounts that need to be automatically recovered, and unsuspend them
const unsuspendDueAccounts = async () => {
  const now = moment();
  try {
    const suspendedDueAccounts = await prisma.user.findMany({
      where: {
        status: Status.SUSPENDED,
        suspendUntil: {
          lte: now.toDate(), // Check if suspendedUntil is less than or equal to now
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        language: true,
      },
    });

    await Promise.allSettled(
      suspendedDueAccounts.map(async (acc) => {
        await prisma.user.update({
          where: { id: acc.id },
          data: {
            status: Status.ACTIVE,
            suspendUntil: null,
            suspendedAt: null,
          },
        });

      
      })
    );
  } catch (error) {
    console.error("Error running unsuspend due accounts cron:", error);
  }
};

export const initializeUserCronJobs = () => {
  logger.debug("Initializing users' cron jobs...");

  const unsuspendDueAccountsJob = new CronJob(
    "0 0 * * *", // Run every day at midnight
    async () => {
      logger.debug("Running midnight recover suspended due accounts...");
      try {
        await unsuspendDueAccounts();
        logger.debug(
          "Cron job for midnight recover suspended due accounts completed successfully"
        );
      } catch (error) {
        logger.error(
          "Error in midnight recover suspended due accounts cron jobs:",
          error
        );
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  // Start the cron jobs
  unsuspendDueAccountsJob.start();
  logger.debug("Users' cron jobs initialized and started");

  // For testing purposes, let's also run it immediately
  unsuspendDueAccountsJob.fireOnTick();
};
