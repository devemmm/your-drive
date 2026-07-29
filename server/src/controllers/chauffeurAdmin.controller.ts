import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser } from "../types";
import {
  ChauffeurStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { NotificationServices } from "../services/notification.service";
import { TransactionService } from "../services/transaction.service";
import { chauffeurInclude } from "../services/chauffeur.service";

export class ChauffeurAdminController {
  // GET /admin/chauffeur-services — paginated list of all services
  static getAllServices = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        status,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: ChauffeurStatus;
      }>(req);

      const skip = (+page - 1) * +pageSize;
      const take = +pageSize;

      const where: Prisma.ChauffeurServiceWhereInput = {};
      if (status) {
        where.status = status;
      }

      const [services, total] = await prisma.$transaction([
        prisma.chauffeurService.findMany({
          skip,
          take,
          where,
          include: chauffeurInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.chauffeurService.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: services,
        pagination: {
          page: +page,
          pageSize: +pageSize,
          total,
          totalPages: Math.ceil(total / +pageSize),
        },
      });
    }
  );

  // GET /admin/chauffeur-services/:serviceId — get a single service
  static getService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: chauffeurInclude,
      });

      if (!service) {
        return next(
          AppError(
            isEN
              ? "Chauffeur service not found"
              : "Service chauffeur non trouvé",
            404
          )
        );
      }

      return res.status(200).json({
        success: true,
        data: service,
      });
    }
  );

  // PATCH /admin/chauffeur-services/:serviceId/cancel — force cancel a service
  static forceCancel = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId, reason } = matchedData<{
        serviceId: number;
        reason?: string;
      }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: {
          transaction: true,
          vehicle: true,
        },
      });

      if (!service) {
        return next(
          AppError(
            isEN
              ? "Chauffeur service not found"
              : "Service chauffeur non trouvé",
            404
          )
        );
      }

      // Refund transaction if exists
      if (service.transaction) {
        await TransactionService.cancelOrRefundTransaction(
          service.transaction,
          service.transaction.status === TransactionStatus.PAID
            ? "REFUND"
            : "CANCEL"
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellerId: user.id,
          cancellationReason: reason || "Cancelled by admin",
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Chauffeur Service Cancelled by Admin",
        titleFr: "Service chauffeur annulé par l'administrateur",
        messageEn: `The chauffeur service${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} has been cancelled by an administrator.`,
        messageFr: `Le service chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} a été annulé par un administrateur.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // PATCH /admin/chauffeur-services/:serviceId/resolve-dispute — resolve a disputed service
  static resolveDispute = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{
        serviceId: number;
      }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN
              ? "Chauffeur service not found"
              : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.status !== ChauffeurStatus.DISPUTED) {
        return next(
          AppError(
            isEN
              ? "Only disputed services can be resolved"
              : "Seuls les services contestés peuvent être résolus",
            400
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Dispute Resolved",
        titleFr: "Litige résolu",
        messageEn: `The dispute for the chauffeur service${service.vehicle ? ` of ${service.vehicle.make} ${service.vehicle.model}` : ""} has been resolved.`,
        messageFr: `Le litige pour le service chauffeur${service.vehicle ? ` du ${service.vehicle.make} ${service.vehicle.model}` : ""} a été résolu.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // GET /admin/chauffeur-services/settings — get chauffeur settings
  static getSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      let settings = await prisma.chauffeurSettings.findFirst();

      if (!settings) {
        settings = await prisma.chauffeurSettings.create({
          data: {
            platformFeePercentage: 15,
            maxServiceDurationDays: 30,
            minServiceDurationHours: 1,
            requestExpiryHours: 24,
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

  // PUT /admin/chauffeur-services/settings — update chauffeur settings
  static updateSettings = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);

      const existing = await prisma.chauffeurSettings.findFirst();

      let settings;
      if (existing) {
        settings = await prisma.chauffeurSettings.update({
          where: { id: existing.id },
          data,
        });
      } else {
        settings = await prisma.chauffeurSettings.create({
          data: {
            platformFeePercentage: data.platformFeePercentage ?? 15,
            maxServiceDurationDays: data.maxServiceDurationDays ?? 30,
            minServiceDurationHours: data.minServiceDurationHours ?? 1,
            requestExpiryHours: data.requestExpiryHours ?? 24,
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

  // GET /admin/chauffeur-services/stats — chauffeur service statistics
  static getStats = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const [
        totalServices,
        requestedCount,
        acceptedCount,
        activeCount,
        completedCount,
        cancelledCount,
        declinedCount,
        disputedCount,
        revenueStats,
      ] = await prisma.$transaction([
        prisma.chauffeurService.count(),
        prisma.chauffeurService.count({
          where: { status: ChauffeurStatus.REQUESTED },
        }),
        prisma.chauffeurService.count({
          where: { status: ChauffeurStatus.ACCEPTED },
        }),
        prisma.chauffeurService.count({
          where: { status: ChauffeurStatus.ACTIVE },
        }),
        prisma.chauffeurService.count({
          where: { status: ChauffeurStatus.COMPLETED },
        }),
        prisma.chauffeurService.count({
          where: { status: ChauffeurStatus.CANCELLED },
        }),
        prisma.chauffeurService.count({
          where: { status: ChauffeurStatus.DECLINED },
        }),
        prisma.chauffeurService.count({
          where: { status: ChauffeurStatus.DISPUTED },
        }),
        prisma.transaction.aggregate({
          where: {
            type: TransactionType.CHAUFFEUR_SERVICE,
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
          totalServices,
          byStatus: {
            requested: requestedCount,
            accepted: acceptedCount,
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
            totalDriverAmount: revenueStats._sum.driverAmount || 0,
          },
        },
      });
    }
  );
}
