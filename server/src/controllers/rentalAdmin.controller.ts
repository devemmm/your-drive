import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser } from "../types";
import {
  RentalStatus,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { stripe } from "../config/stripe";
import { NotificationServices } from "../services/notification.service";
import { TransactionService } from "../services/transaction.service";
import { rentalInclude } from "../services/rental.service";

export class RentalAdminController {
  // GET /admin/rentals — paginated list of all rentals
  static getAllRentals = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        status,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: RentalStatus;
      }>(req);

      const skip = (+page - 1) * +pageSize;
      const take = +pageSize;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [rentals, total] = await prisma.$transaction([
        prisma.carRental.findMany({
          skip,
          take,
          where,
          include: rentalInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.carRental.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: rentals,
        pagination: {
          page: +page,
          pageSize: +pageSize,
          total,
          totalPages: Math.ceil(total / +pageSize),
        },
      });
    }
  );

  // GET /admin/rentals/:rentalId — get a single rental
  static getRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { rentalId } = matchedData<{ rentalId: number }>(req);

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: rentalInclude,
      });

      if (!rental) {
        return next(
          AppError(
            isEN ? "Rental not found" : "Location non trouvée",
            404
          )
        );
      }

      return res.status(200).json({
        success: true,
        data: rental,
      });
    }
  );

  // PATCH /admin/rentals/:rentalId/cancel — force cancel a rental
  static forceCancel = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { rentalId, reason } = matchedData<{ rentalId: number; reason?: string }>(req);

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: {
          transaction: true,
          depositTransaction: true,
          vehicle: true,
        },
      });

      if (!rental) {
        return next(
          AppError(
            isEN ? "Rental not found" : "Location non trouvée",
            404
          )
        );
      }

      // Refund rental payment if exists
      if (rental.transaction) {
        await TransactionService.cancelOrRefundTransaction(
          rental.transaction,
          rental.transaction.status === TransactionStatus.PAID ? "REFUND" : "CANCEL"
        );
      }

      // Release deposit if exists
      if (rental.depositTransaction && rental.depositTransaction.externalReference) {
        try {
          await stripe.paymentIntents.cancel(rental.depositTransaction.externalReference);
          await prisma.transaction.update({
            where: { id: rental.depositTransaction.id },
            data: { status: TransactionStatus.CANCELLED },
          });
        } catch (_error) {
          // Deposit may already be cancelled
        }
      }

      const updatedRental = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellerId: user.id,
          cancellationReason: reason || "Cancelled by admin",
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId, rental.ownerId],
        titleEn: "Rental Cancelled by Admin",
        titleFr: "Location annulée par l'administrateur",
        messageEn: `The rental for ${rental.vehicle.make} ${rental.vehicle.model} has been cancelled by an administrator.`,
        messageFr: `La location du ${rental.vehicle.make} ${rental.vehicle.model} a été annulée par un administrateur.`,
      });

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // PATCH /admin/rentals/:rentalId/resolve-dispute — resolve a disputed rental
  static resolveDispute = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { rentalId, resolution } = matchedData<{ rentalId: number; resolution?: string }>(req);

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { vehicle: true },
      });

      if (!rental) {
        return next(
          AppError(
            isEN ? "Rental not found" : "Location non trouvée",
            404
          )
        );
      }

      if (rental.status !== RentalStatus.DISPUTED) {
        return next(
          AppError(
            isEN
              ? "Only disputed rentals can be resolved"
              : "Seules les locations contestées peuvent être résolues",
            400
          )
        );
      }

      const updatedRental = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId, rental.ownerId],
        titleEn: "Dispute Resolved",
        titleFr: "Litige résolu",
        messageEn: `The dispute for the rental of ${rental.vehicle.make} ${rental.vehicle.model} has been resolved.`,
        messageFr: `Le litige pour la location du ${rental.vehicle.make} ${rental.vehicle.model} a été résolu.`,
      });

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // POST /admin/rentals/:rentalId/refund-deposit — release deposit
  static refundDeposit = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { rentalId } = matchedData<{ rentalId: number }>(req);

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: {
          depositTransaction: true,
          vehicle: true,
        },
      });

      if (!rental) {
        return next(
          AppError(
            isEN ? "Rental not found" : "Location non trouvée",
            404
          )
        );
      }

      if (rental.depositRefunded) {
        return next(
          AppError(
            isEN
              ? "Deposit has already been released"
              : "Le dépôt a déjà été libéré",
            400
          )
        );
      }

      // Release deposit PaymentIntent
      if (rental.depositTransaction && rental.depositTransaction.externalReference) {
        await stripe.paymentIntents.cancel(rental.depositTransaction.externalReference);
        await prisma.transaction.update({
          where: { id: rental.depositTransaction.id },
          data: { status: TransactionStatus.CANCELLED },
        });
      }

      const updatedRental = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          depositRefunded: true,
          depositRefundedAt: new Date(),
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Deposit Released",
        titleFr: "Dépôt libéré",
        messageEn: `The security deposit for your rental of ${rental.vehicle.make} ${rental.vehicle.model} has been released by an administrator.`,
        messageFr: `Le dépôt de garantie pour votre location du ${rental.vehicle.make} ${rental.vehicle.model} a été libéré par un administrateur.`,
      });

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // GET /admin/rentals/settings — get rental settings
  static getSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      let settings = await prisma.rentalSettings.findFirst();

      if (!settings) {
        settings = await prisma.rentalSettings.create({
          data: {
            platformFeePercentage: 15,
            maxRentalDurationDays: 30,
            minRentalDurationHours: 1,
            requestExpiryHours: 24,
            depositReleaseReminderHours: 24,
            overdueGracePeriodHours: 3,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: settings,
      });
    }
  );

  // PUT /admin/rentals/settings — update rental settings
  static updateSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);

      const existing = await prisma.rentalSettings.findFirst();

      let settings;
      if (existing) {
        settings = await prisma.rentalSettings.update({
          where: { id: existing.id },
          data,
        });
      } else {
        settings = await prisma.rentalSettings.create({
          data: {
            platformFeePercentage: data.platformFeePercentage ?? 15,
            maxRentalDurationDays: data.maxRentalDurationDays ?? 30,
            minRentalDurationHours: data.minRentalDurationHours ?? 1,
            requestExpiryHours: data.requestExpiryHours ?? 24,
            depositReleaseReminderHours: data.depositReleaseReminderHours ?? 24,
            overdueGracePeriodHours: data.overdueGracePeriodHours ?? 3,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: settings,
      });
    }
  );

  // GET /admin/rentals/stats — rental statistics
  static getStats = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const [
        totalRentals,
        requestedCount,
        approvedCount,
        activeCount,
        completedCount,
        cancelledCount,
        declinedCount,
        disputedCount,
        revenueStats,
      ] = await prisma.$transaction([
        prisma.carRental.count(),
        prisma.carRental.count({ where: { status: RentalStatus.REQUESTED } }),
        prisma.carRental.count({ where: { status: RentalStatus.APPROVED } }),
        prisma.carRental.count({ where: { status: RentalStatus.ACTIVE } }),
        prisma.carRental.count({ where: { status: RentalStatus.COMPLETED } }),
        prisma.carRental.count({ where: { status: RentalStatus.CANCELLED } }),
        prisma.carRental.count({ where: { status: RentalStatus.DECLINED } }),
        prisma.carRental.count({ where: { status: RentalStatus.DISPUTED } }),
        prisma.transaction.aggregate({
          where: {
            type: TransactionType.CAR_RENTAL,
            status: TransactionStatus.PAID,
          },
          _sum: {
            amount: true,
            platformAmount: true,
            driverAmount: true,
          },
          _count: true,
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalRentals,
          byStatus: {
            requested: requestedCount,
            approved: approvedCount,
            active: activeCount,
            completed: completedCount,
            cancelled: cancelledCount,
            declined: declinedCount,
            disputed: disputedCount,
          },
          revenue: {
            totalTransactions: revenueStats._count,
            totalAmount: revenueStats._sum.amount || 0,
            totalPlatformAmount: revenueStats._sum.platformAmount || 0,
            totalOwnerAmount: revenueStats._sum.driverAmount || 0,
          },
        },
      });
    }
  );
}
