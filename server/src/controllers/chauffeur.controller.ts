import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser, profileSelects } from "../types";
import {
  Prisma,
  ChauffeurStatus,
  ChauffeurServiceType,
  TransactionType,
  TransactionStatus,
  PaymentProvider,
  UserRole,
} from "@prisma/client";
import { stripe } from "../config/stripe";
import { getDefaultCurrency } from "../utils/currency";
import { io } from "../server";
import { NotificationServices } from "../services/notification.service";
import { TransactionService } from "../services/transaction.service";
import { logCancellationPolicy } from "../services/cancellation.service";
import {
  getChauffeurSettings,
  calculateChauffeurCost,
  hasChauffeurOverlap,
  chauffeurInclude,
} from "../services/chauffeur.service";
import { listChauffeurs } from "../services/search/chauffeurSearch.service";
import { isStartDateBeforeToday } from "../utils/bookingDates";

export class ChauffeurController {
  // POST /chauffeur-services — create a new chauffeur request
  static createService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed to create chauffeur requests"
              : "Les administrateurs ne sont pas autorisés à créer des demandes de chauffeur",
            403
          )
        );
      }

      // Verify vehicle belongs to the passenger (optional — driver may bring their own)
      let vehicle = null;
      if (data.vehicleId) {
        vehicle = await prisma.vehicle.findUnique({
          where: { id: data.vehicleId },
        });

        if (!vehicle) {
          return next(
            AppError(
              isEN ? "Vehicle not found" : "Véhicule non trouvé",
              404
            )
          );
        }

        if (vehicle.userId !== user.id) {
          return next(
            AppError(
              isEN
                ? "You can only request a chauffeur for your own vehicle"
                : "Vous ne pouvez demander un chauffeur que pour votre propre véhicule",
              403
            )
          );
        }
      }

      // Verify driver exists and is available
      const driver = await prisma.user.findUnique({
        where: { id: data.driverId },
      });

      if (!driver) {
        return next(
          AppError(
            isEN ? "Driver not found" : "Chauffeur non trouvé",
            404
          )
        );
      }

      if (!driver.isAvailableForChauffeur) {
        return next(
          AppError(
            isEN
              ? "This driver is not available for chauffeur services"
              : "Ce chauffeur n'est pas disponible pour les services de chauffeur",
            400
          )
        );
      }

      if (driver.id === user.id) {
        return next(
          AppError(
            isEN
              ? "You cannot request yourself as a chauffeur"
              : "Vous ne pouvez pas vous demander comme chauffeur",
            400
          )
        );
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      // Same-day hires are allowed: only reject start dates whose calendar day
      // is before today (see isStartDateBeforeToday).
      if (isStartDateBeforeToday(startDate)) {
        return next(
          AppError(
            isEN
              ? "Start date cannot be in the past"
              : "La date de début ne peut pas être dans le passé",
            400
          )
        );
      }

      if (endDate <= startDate) {
        return next(
          AppError(
            isEN
              ? "End date must be after start date"
              : "La date de fin doit être après la date de début",
            400
          )
        );
      }

      const settings = await getChauffeurSettings();
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = durationHours / 24;

      if (durationHours < settings.minServiceDurationHours) {
        return next(
          AppError(
            isEN
              ? `Minimum service duration is ${settings.minServiceDurationHours} hour(s)`
              : `La durée minimale du service est de ${settings.minServiceDurationHours} heure(s)`,
            400
          )
        );
      }

      if (durationDays > settings.maxServiceDurationDays) {
        return next(
          AppError(
            isEN
              ? `Maximum service duration is ${settings.maxServiceDurationDays} day(s)`
              : `La durée maximale du service est de ${settings.maxServiceDurationDays} jour(s)`,
            400
          )
        );
      }

      // Check driver schedule conflicts
      const hasConflict = await hasChauffeurOverlap(startDate, endDate, data.driverId);
      if (hasConflict) {
        return next(
          AppError(
            isEN
              ? "This driver is already booked for the selected dates"
              : "Ce chauffeur est déjà réservé pour les dates sélectionnées",
            409
          )
        );
      }

      const serviceType: ChauffeurServiceType = data.serviceType;

      if (serviceType === ChauffeurServiceType.HOURLY && !driver.chauffeurHourlyRate) {
        return next(
          AppError(
            isEN
              ? "Hourly rate is not set for this driver"
              : "Le tarif horaire n'est pas défini pour ce chauffeur",
            400
          )
        );
      }

      if (serviceType === ChauffeurServiceType.DAILY && !driver.chauffeurDailyRate) {
        return next(
          AppError(
            isEN
              ? "Daily rate is not set for this driver"
              : "Le tarif journalier n'est pas défini pour ce chauffeur",
            400
          )
        );
      }

      const totalAmount = calculateChauffeurCost(
        startDate,
        endDate,
        serviceType,
        Number(driver.chauffeurHourlyRate || 0),
        Number(driver.chauffeurDailyRate || 0)
      );

      // Create pickup location if provided
      let pickupLocationId: number | null = null;
      if (data.pickupLocation) {
        const loc = await prisma.location.create({ data: data.pickupLocation });
        pickupLocationId = loc.id;
      }

      let dropoffLocationId: number | null = null;
      if (data.dropoffLocation) {
        const loc = await prisma.location.create({ data: data.dropoffLocation });
        dropoffLocationId = loc.id;
      }

      const service = await prisma.chauffeurService.create({
        data: {
          vehicleId: data.vehicleId || null,
          passengerId: user.id,
          driverId: data.driverId,
          startDate,
          endDate,
          serviceType,
          totalAmount,
          status: ChauffeurStatus.REQUESTED,
          ...(pickupLocationId && { pickupLocationId }),
          ...(dropoffLocationId && { dropoffLocationId }),
          ...(data.pickupNotes && { pickupNotes: data.pickupNotes }),
          ...(data.dropoffNotes && { dropoffNotes: data.dropoffNotes }),
          chatThread: {
            create: {
              ownerId: user.id,
              users: {
                connect: [{ id: user.id }, { id: data.driverId }],
              },
            },
          },
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [data.driverId],
        titleEn: "New Chauffeur Request",
        titleFr: "Nouvelle demande de chauffeur",
        messageEn: `You have a new chauffeur request${vehicle ? ` for a ${vehicle.make} ${vehicle.model}` : ""}.`,
        messageFr: `Vous avez une nouvelle demande de chauffeur${vehicle ? ` pour une ${vehicle.make} ${vehicle.model}` : ""}.`,
        chauffeurServiceId: service.id,
      });

      return res.status(201).json({
        success: true,
        data: service,
      });
    }
  );

  // GET /chauffeur-services — list services with pagination
  static getServices = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const {
        page = 1,
        pageSize = 10,
        status,
        role,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: ChauffeurStatus;
        role?: "passenger" | "driver";
      }>(req);

      const skip = (+page - 1) * +pageSize;
      const take = +pageSize;

      const where: Prisma.ChauffeurServiceWhereInput = {};

      if (user.role !== UserRole.ADMIN) {
        if (role === "passenger") {
          where.passengerId = user.id;
        } else if (role === "driver") {
          where.driverId = user.id;
        } else {
          where.OR = [{ passengerId: user.id }, { driverId: user.id }];
        }
      }

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

  // GET /chauffeur-services/:serviceId — get a single service
  static getService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: chauffeurInclude,
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (
        user.role !== UserRole.ADMIN &&
        service.passengerId !== user.id &&
        service.driverId !== user.id
      ) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to view this service"
              : "Vous n'êtes pas autorisé à voir ce service",
            403
          )
        );
      }

      return res.status(200).json({
        success: true,
        data: service,
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/accept — driver accepts
  static acceptService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the assigned driver can accept this request"
              : "Seul le chauffeur assigné peut accepter cette demande",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.REQUESTED) {
        return next(
          AppError(
            isEN
              ? "Only requested services can be accepted"
              : "Seuls les services demandés peuvent être acceptés",
            400
          )
        );
      }

      // Re-check schedule conflicts
      const hasConflict = await hasChauffeurOverlap(service.startDate, service.endDate, service.driverId, service.id);
      if (hasConflict) {
        return next(
          AppError(
            isEN
              ? "You have a conflicting booking for the selected dates"
              : "Vous avez une réservation en conflit pour les dates sélectionnées",
            409
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId],
        titleEn: "Chauffeur Request Accepted",
        titleFr: "Demande de chauffeur acceptée",
        messageEn: `Your chauffeur request${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} has been accepted.`,
        messageFr: `Votre demande de chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} a été acceptée.`,
        chauffeurServiceId: service.id,
      });

      io.to(`user-${service.passengerId}`).emit("chauffeur_update", updatedService);

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/decline — driver declines
  static declineService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId, reason } = matchedData<{ serviceId: number; reason?: string }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the assigned driver can decline this request"
              : "Seul le chauffeur assigné peut refuser cette demande",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.REQUESTED) {
        return next(
          AppError(
            isEN
              ? "Only requested services can be declined"
              : "Seuls les services demandés peuvent être refusés",
            400
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.DECLINED,
          declinedAt: new Date(),
          cancellationReason: reason || null,
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId],
        titleEn: "Chauffeur Request Declined",
        titleFr: "Demande de chauffeur refusée",
        messageEn: `Your chauffeur request${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} has been declined.`,
        messageFr: `Votre demande de chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} a été refusée.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // POST /chauffeur-services/:serviceId/initialize-payment — passenger pays
  static initializePayment = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: {
          vehicle: true,
          transaction: true,
        },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.passengerId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the passenger can initialize payment"
              : "Seul le passager peut initialiser le paiement",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.ACCEPTED) {
        return next(
          AppError(
            isEN
              ? "Payment can only be initialized for accepted services"
              : "Le paiement ne peut être initialisé que pour les services acceptés",
            400
          )
        );
      }

      if (service.transaction && service.transaction.status === TransactionStatus.PAID) {
        return next(
          AppError(
            isEN
              ? "Payment has already been completed for this service"
              : "Le paiement a déjà été effectué pour ce service",
            400
          )
        );
      }

      const settings = await getChauffeurSettings();
      const stripeCustomerId = await TransactionService.getOrCreateStripeCustomer(user);
      if (!stripeCustomerId) {
        return next(AppError(isEN ? "Payment system not configured" : "Système de paiement non configuré", 503));
      }

      const serviceAmount = Number(service.totalAmount);
      const platformFee = serviceAmount * (Number(settings.platformFeePercentage) / 100);
      const driverAmount = serviceAmount - platformFee;

      const amountInCents = Math.round(serviceAmount * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "cad",
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          chauffeurServiceId: service.id.toString(),
          type: "CHAUFFEUR_SERVICE",
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.CHAUFFEUR_SERVICE,
          amount: serviceAmount,
          platformAmount: platformFee,
          driverAmount,
          status: TransactionStatus.PENDING,
          paymentProvider: PaymentProvider.STRIPE,
          externalReference: paymentIntent.id,
          currency: getDefaultCurrency(),
        },
      });

      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: { transactionId: transaction.id },
      });

      return res.status(200).json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          serviceAmount,
          platformFee,
          driverAmount,
        },
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/activate — driver starts the service
  static activateService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { transaction: true, vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the assigned driver can activate this service"
              : "Seul le chauffeur assigné peut activer ce service",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.ACCEPTED) {
        return next(
          AppError(
            isEN
              ? "Only accepted services can be activated"
              : "Seuls les services acceptés peuvent être activés",
            400
          )
        );
      }

      if (!service.transaction || service.transaction.status !== TransactionStatus.PAID) {
        return next(
          AppError(
            isEN
              ? "Payment must be completed before activating the service"
              : "Le paiement doit être complété avant d'activer le service",
            400
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.ACTIVE,
          activatedAt: new Date(),
        },
        include: chauffeurInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId],
        titleEn: "Chauffeur Service Started",
        titleFr: "Service chauffeur démarré",
        messageEn: `Your chauffeur service${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} has started.`,
        messageFr: `Votre service chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} a démarré.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/complete — mark service as completed
  static completeService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId } = matchedData<{ serviceId: number }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: {
          transaction: true,
          vehicle: true,
          driver: true,
        },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.passengerId !== user.id && service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the passenger or driver can complete this service"
              : "Seul le passager ou le chauffeur peut terminer ce service",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.ACTIVE) {
        return next(
          AppError(
            isEN
              ? "Only active services can be completed"
              : "Seuls les services actifs peuvent être terminés",
            400
          )
        );
      }

      // Transfer driver's portion via Stripe Connect
      if (service.transaction && service.driver.stripeAccountId) {
        const driverAmountInCents = Math.round(Number(service.transaction.driverAmount) * 100);

        if (driverAmountInCents > 0) {
          const transfer = await stripe.transfers.create({
            amount: driverAmountInCents,
            currency: "cad",
            destination: service.driver.stripeAccountId,
            metadata: {
              chauffeurServiceId: service.id.toString(),
              transactionId: service.transaction.id.toString(),
            },
          });

          await prisma.transaction.update({
            where: { id: service.transaction.id },
            data: {
              stripeTransferId: transfer.id,
              isDriverPaid: true,
              driverPaidAt: new Date(),
            },
          });
        }
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
        titleEn: "Chauffeur Service Completed",
        titleFr: "Service chauffeur terminé",
        messageEn: `The chauffeur service${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} has been completed.`,
        messageFr: `Le service chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} est terminé.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // PATCH /chauffeur-services/:serviceId/cancel — cancel a service
  static cancelService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId, reason } = matchedData<{ serviceId: number; reason?: string }>(req);

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
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.passengerId !== user.id && service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to cancel this service"
              : "Vous n'êtes pas autorisé à annuler ce service",
            403
          )
        );
      }

      if (service.status === ChauffeurStatus.ACTIVE) {
        return next(
          AppError(
            isEN
              ? "Active services cannot be cancelled. Please file a dispute instead"
              : "Les services actifs ne peuvent pas être annulés. Veuillez déposer un litige",
            400
          )
        );
      }

      const terminalStatuses: ChauffeurStatus[] = [
        ChauffeurStatus.COMPLETED,
        ChauffeurStatus.CANCELLED,
        ChauffeurStatus.DECLINED,
      ];
      if (terminalStatuses.includes(service.status)) {
        return next(
          AppError(
            isEN
              ? "This service cannot be cancelled"
              : "Ce service ne peut pas être annulé",
            400
          )
        );
      }

      // Refund payment if exists
      if (service.transaction) {
        await TransactionService.cancelOrRefundTransaction(
          service.transaction,
          service.transaction.status === TransactionStatus.PAID ? "REFUND" : "CANCEL"
        );
      }

      const [updatedService, settings] = await Promise.all([
        prisma.chauffeurService.update({
          where: { id: serviceId },
          data: {
            status: ChauffeurStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellerId: user.id,
            cancellationReason: reason || null,
          },
          include: chauffeurInclude,
        }),
        prisma.chauffeurSettings.findFirst(),
      ]);

      const refundInfo = logCancellationPolicy({
        action: "CHAUFFEUR_CANCEL_REFUND_POLICY",
        userId: user.id,
        scheduledStart: service.startDate,
        settings,
        meta: { serviceId },
      });

      // Notify the other party
      const notifyUserId = user.id === service.passengerId ? service.driverId : service.passengerId;
      await NotificationServices.notifyUsers({
        userIds: [notifyUserId],
        titleEn: "Chauffeur Service Cancelled",
        titleFr: "Service chauffeur annulé",
        messageEn: `The chauffeur service${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} has been cancelled.`,
        messageFr: `Le service chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} a été annulé.`,
        chauffeurServiceId: service.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedService,
        cancellationPolicy: refundInfo,
      });
    }
  );

  // POST /chauffeur-services/:serviceId/dispute — file a dispute
  static disputeService = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { serviceId, reason } = matchedData<{ serviceId: number; reason: string }>(req);

      const service = await prisma.chauffeurService.findUnique({
        where: { id: serviceId },
        include: { vehicle: true },
      });

      if (!service) {
        return next(
          AppError(
            isEN ? "Chauffeur service not found" : "Service chauffeur non trouvé",
            404
          )
        );
      }

      if (service.passengerId !== user.id && service.driverId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to dispute this service"
              : "Vous n'êtes pas autorisé à contester ce service",
            403
          )
        );
      }

      if (service.status !== ChauffeurStatus.ACTIVE && service.status !== ChauffeurStatus.COMPLETED) {
        return next(
          AppError(
            isEN
              ? "Only active or completed services can be disputed"
              : "Seuls les services actifs ou terminés peuvent être contestés",
            400
          )
        );
      }

      const updatedService = await prisma.chauffeurService.update({
        where: { id: serviceId },
        data: {
          status: ChauffeurStatus.DISPUTED,
          cancellationReason: reason,
        },
        include: chauffeurInclude,
      });

      // Notify the other party
      const notifyUserId = user.id === service.passengerId ? service.driverId : service.passengerId;
      await NotificationServices.notifyUsers({
        userIds: [notifyUserId],
        titleEn: "Chauffeur Service Disputed",
        titleFr: "Service chauffeur contesté",
        messageEn: `A dispute has been filed for the chauffeur service${service.vehicle ? ` of ${service.vehicle.make} ${service.vehicle.model}` : ""}.`,
        messageFr: `Un litige a été déposé pour le service chauffeur${service.vehicle ? ` du ${service.vehicle.make} ${service.vehicle.model}` : ""}.`,
        chauffeurServiceId: service.id,
      });

      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      if (admins.length > 0) {
        await NotificationServices.notifyUsers({
          userIds: admins.map((a) => a.id),
          titleEn: "Chauffeur Service Dispute Raised",
          titleFr: "Litige de service chauffeur ouvert",
          messageEn: `A dispute has been raised for chauffeur service #${service.id}${service.vehicle ? ` (${service.vehicle.make} ${service.vehicle.model})` : ""}.`,
          messageFr: `Un litige a été ouvert pour le service chauffeur #${service.id}${service.vehicle ? ` (${service.vehicle.make} ${service.vehicle.model})` : ""}.`,
          chauffeurServiceId: service.id,
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedService,
      });
    }
  );

  // GET /public/chauffeur-drivers — search available drivers.
  //
  // Delegates to the shared `chauffeurSearch` service so the legacy path
  // and the new `/public/chauffeur-services/search` mirror stay in
  // lockstep. This route is mounted under `/public/*` (no auth middleware)
  // so the viewer is treated as a guest — phone / email are stripped by
  // the service's response mapper.
  static searchAvailableDrivers = catchAsync(
    async (req: Request, res: Response, _next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        minHourlyRate,
        maxHourlyRate,
        minDailyRate,
        maxDailyRate,
        startDate,
        endDate,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        minHourlyRate?: number;
        maxHourlyRate?: number;
        minDailyRate?: number;
        maxDailyRate?: number;
        startDate?: string;
        endDate?: string;
      }>(req);

      const result = await listChauffeurs({
        viewer: { isGuest: true },
        filters: {
          minHourlyRate,
          maxHourlyRate,
          minDailyRate,
          maxDailyRate,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          page: +page,
          pageSize: +pageSize,
        },
      });

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    }
  );
}
