import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";
import { DbUser } from "../types";
import {
  Prisma,
  RentalStatus,
  RentalType,
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
  getRentalSettings,
  calculateRentalCost,
  hasOverlap,
  rentalInclude,
} from "../services/rental.service";
import { listRentals } from "../services/search/rentalSearch.service";
import { isStartDateBeforeToday } from "../utils/bookingDates";

export class RentalController {
  // POST /rentals — create a new rental request
  static createRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = matchedData(req);
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;

      if (user.role === UserRole.ADMIN) {
        return next(
          AppError(
            isEN
              ? "Admins are not allowed to create rentals"
              : "Les administrateurs ne sont pas autorisés à créer des locations",
            403
          )
        );
      }

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: data.vehicleId },
        include: {
          user: true,
          pickupLocation: true,
        },
      });

      if (!vehicle) {
        return next(
          AppError(
            isEN ? "Vehicle not found" : "Véhicule non trouvé",
            404
          )
        );
      }

      if (!vehicle.isAvailableForRental) {
        return next(
          AppError(
            isEN
              ? "This vehicle is not available for rental"
              : "Ce véhicule n'est pas disponible à la location",
            400
          )
        );
      }

      if (vehicle.userId === user.id) {
        return next(
          AppError(
            isEN
              ? "You cannot rent your own vehicle"
              : "Vous ne pouvez pas louer votre propre véhicule",
            400
          )
        );
      }

      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      // Same-day rentals are allowed: only reject start dates whose calendar
      // day is before today (see isStartDateBeforeToday).
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

      const settings = await getRentalSettings();
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationDays = durationHours / 24;

      if (durationHours < settings.minRentalDurationHours) {
        return next(
          AppError(
            isEN
              ? `Minimum rental duration is ${settings.minRentalDurationHours} hour(s)`
              : `La durée minimale de location est de ${settings.minRentalDurationHours} heure(s)`,
            400
          )
        );
      }

      if (durationDays > settings.maxRentalDurationDays) {
        return next(
          AppError(
            isEN
              ? `Maximum rental duration is ${settings.maxRentalDurationDays} day(s)`
              : `La durée maximale de location est de ${settings.maxRentalDurationDays} jour(s)`,
            400
          )
        );
      }

      const hasConflict = await hasOverlap(startDate, endDate, data.vehicleId);
      if (hasConflict) {
        return next(
          AppError(
            isEN
              ? "This vehicle is already booked for the selected dates"
              : "Ce véhicule est déjà réservé pour les dates sélectionnées",
            409
          )
        );
      }

      const rentalType: RentalType = data.rentalType;

      if (rentalType === RentalType.HOURLY && !vehicle.hourlyRate) {
        return next(
          AppError(
            isEN
              ? "Hourly rate is not set for this vehicle"
              : "Le tarif horaire n'est pas défini pour ce véhicule",
            400
          )
        );
      }

      if (rentalType === RentalType.DAILY && !vehicle.dailyRate) {
        return next(
          AppError(
            isEN
              ? "Daily rate is not set for this vehicle"
              : "Le tarif journalier n'est pas défini pour ce véhicule",
            400
          )
        );
      }

      const totalAmount = calculateRentalCost(startDate, endDate, rentalType, Number(vehicle.hourlyRate || 0), Number(vehicle.dailyRate || 0));
      const securityDepositAmount = Number(vehicle.securityDeposit || 0);

      // Create pickup location if provided, otherwise use vehicle's pickup location
      let pickupLocationId = vehicle.pickupLocationId;
      if (data.pickupLocation) {
        const loc = await prisma.location.create({ data: data.pickupLocation });
        pickupLocationId = loc.id;
      }

      let returnLocationId: number | null = null;
      if (data.returnLocation) {
        const loc = await prisma.location.create({ data: data.returnLocation });
        returnLocationId = loc.id;
      }

      const rental = await prisma.carRental.create({
        data: {
          vehicleId: data.vehicleId,
          renterId: user.id,
          ownerId: vehicle.userId,
          startDate,
          endDate,
          rentalType,
          totalAmount,
          securityDepositAmount,
          status: RentalStatus.REQUESTED,
          ...(pickupLocationId && { pickupLocationId }),
          ...(returnLocationId && { returnLocationId }),
          ...(data.pickupNotes && { pickupNotes: data.pickupNotes }),
          ...(data.returnNotes && { returnNotes: data.returnNotes }),
          chatThread: {
            create: {
              ownerId: vehicle.userId,
              users: {
                connect: [{ id: user.id }, { id: vehicle.userId }],
              },
            },
          },
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [vehicle.userId],
        titleEn: "New Rental Request",
        titleFr: "Nouvelle demande de location",
        messageEn: `You have a new rental request for your ${vehicle.make} ${vehicle.model}.`,
        messageFr: `Vous avez une nouvelle demande de location pour votre ${vehicle.make} ${vehicle.model}.`,
      });

      return res.status(201).json({
        success: true,
        data: rental,
      });
    }
  );

  // GET /rentals — list rentals with pagination
  static getRentals = catchAsync(
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
        status?: RentalStatus;
        role?: "owner" | "renter" | "both";
      }>(req);

      const skip = (+page - 1) * +pageSize;
      const take = +pageSize;

      const where: Prisma.CarRentalWhereInput = {};

      if (user.role !== UserRole.ADMIN) {
        if (role === "owner") {
          where.ownerId = user.id;
        } else if (role === "renter") {
          where.renterId = user.id;
        } else {
          where.OR = [{ ownerId: user.id }, { renterId: user.id }];
        }
      }

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

  // GET /rentals/:rentalId — get a single rental
  static getRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
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

      if (
        user.role !== UserRole.ADMIN &&
        rental.ownerId !== user.id &&
        rental.renterId !== user.id
      ) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to view this rental"
              : "Vous n'êtes pas autorisé à voir cette location",
            403
          )
        );
      }

      return res.status(200).json({
        success: true,
        data: rental,
      });
    }
  );

  // PATCH /rentals/:rentalId/approve — owner approves a rental request
  static approveRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { rentalId } = matchedData<{ rentalId: number }>(req);

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

      if (rental.ownerId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the vehicle owner can approve this rental"
              : "Seul le propriétaire du véhicule peut approuver cette location",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.REQUESTED) {
        return next(
          AppError(
            isEN
              ? "Only requested rentals can be approved"
              : "Seules les locations demandées peuvent être approuvées",
            400
          )
        );
      }

      // Verify no overlapping rentals appeared since the request
      const hasConflict = await hasOverlap(rental.startDate, rental.endDate, rental.vehicleId, rental.id);
      if (hasConflict) {
        return next(
          AppError(
            isEN
              ? "This vehicle has a conflicting rental for the selected dates"
              : "Ce véhicule a une location en conflit pour les dates sélectionnées",
            409
          )
        );
      }

      const updatedRental = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.APPROVED,
          approvedAt: new Date(),
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Rental Approved",
        titleFr: "Location approuvée",
        messageEn: `Your rental request for ${rental.vehicle.make} ${rental.vehicle.model} has been approved.`,
        messageFr: `Votre demande de location pour ${rental.vehicle.make} ${rental.vehicle.model} a été approuvée.`,
      });

      io.to(`user-${rental.renterId}`).emit("rental_update", updatedRental);

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // PATCH /rentals/:rentalId/decline — owner declines a rental request
  static declineRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { rentalId, reason } = matchedData<{ rentalId: number; reason?: string }>(req);

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

      if (rental.ownerId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the vehicle owner can decline this rental"
              : "Seul le propriétaire du véhicule peut refuser cette location",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.REQUESTED) {
        return next(
          AppError(
            isEN
              ? "Only requested rentals can be declined"
              : "Seules les locations demandées peuvent être refusées",
            400
          )
        );
      }

      const updatedRental = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.DECLINED,
          declinedAt: new Date(),
          cancellationReason: reason || null,
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Rental Declined",
        titleFr: "Location refusée",
        messageEn: `Your rental request for ${rental.vehicle.make} ${rental.vehicle.model} has been declined.`,
        messageFr: `Votre demande de location pour ${rental.vehicle.make} ${rental.vehicle.model} a été refusée.`,
      });

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // POST /rentals/:rentalId/initialize-payment — renter initializes payment
  static initializePayment = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { rentalId } = matchedData<{ rentalId: number }>(req);

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: {
          vehicle: true,
          transaction: true,
          depositTransaction: true,
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

      if (rental.renterId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the renter can initialize payment"
              : "Seul le locataire peut initialiser le paiement",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.APPROVED) {
        return next(
          AppError(
            isEN
              ? "Payment can only be initialized for approved rentals"
              : "Le paiement ne peut être initialisé que pour les locations approuvées",
            400
          )
        );
      }

      // Don't re-initialize if already paid
      if (rental.transaction && rental.transaction.status === TransactionStatus.PAID) {
        return next(
          AppError(
            isEN
              ? "Payment has already been completed for this rental"
              : "Le paiement a déjà été effectué pour cette location",
            400
          )
        );
      }

      const settings = await getRentalSettings();
      const stripeCustomerId = await TransactionService.getOrCreateStripeCustomer(user);
      if (!stripeCustomerId) {
        return next(AppError(isEN ? "Payment system not configured" : "Système de paiement non configuré", 503));
      }

      const rentalAmount = Number(rental.totalAmount);
      const platformFee = rentalAmount * (Number(settings.platformFeePercentage) / 100);
      const ownerAmount = rentalAmount - platformFee;
      const depositAmount = Number(rental.securityDepositAmount);

      // Create rental PaymentIntent (automatic capture)
      const rentalAmountInCents = Math.round(rentalAmount * 100);
      const rentalPaymentIntent = await stripe.paymentIntents.create({
        amount: rentalAmountInCents,
        currency: "cad",
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          rentalId: rental.id.toString(),
          type: "CAR_RENTAL",
        },
      });

      // Create rental Transaction record
      const rentalTransaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: TransactionType.CAR_RENTAL,
          amount: rentalAmount,
          platformAmount: platformFee,
          driverAmount: ownerAmount,
          status: TransactionStatus.PENDING,
          paymentProvider: PaymentProvider.STRIPE,
          externalReference: rentalPaymentIntent.id,
          currency: getDefaultCurrency(),
        },
      });

      // Link rental transaction
      await prisma.carRental.update({
        where: { id: rental.id },
        data: { transactionId: rentalTransaction.id },
      });

      let depositClientSecret: string | null = null;
      let depositTransactionRecord = null;

      if (depositAmount > 0) {
        const depositAmountInCents = Math.round(depositAmount * 100);

        // Create deposit PaymentIntent (manual capture — hold only)
        const depositPaymentIntent = await stripe.paymentIntents.create({
          amount: depositAmountInCents,
          currency: "cad",
          customer: stripeCustomerId,
          capture_method: "manual",
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            rentalId: rental.id.toString(),
            type: "CAR_RENTAL_DEPOSIT",
          },
        });

        depositClientSecret = depositPaymentIntent.client_secret;

        // Create deposit Transaction record
        depositTransactionRecord = await prisma.transaction.create({
          data: {
            userId: user.id,
            type: TransactionType.CAR_RENTAL_DEPOSIT,
            amount: depositAmount,
            platformAmount: 0,
            driverAmount: 0,
            status: TransactionStatus.PENDING,
            paymentProvider: PaymentProvider.STRIPE,
            externalReference: depositPaymentIntent.id,
            currency: getDefaultCurrency(),
          },
        });

        // Link deposit transaction
        await prisma.carRental.update({
          where: { id: rental.id },
          data: { depositTransactionId: depositTransactionRecord.id },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          rentalClientSecret: rentalPaymentIntent.client_secret,
          depositClientSecret,
          rentalAmount,
          platformFee,
          ownerAmount,
          depositAmount,
        },
      });
    }
  );

  // PATCH /rentals/:rentalId/activate — owner activates rental after payment
  static activateRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { rentalId } = matchedData<{ rentalId: number }>(req);

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: { transaction: true, vehicle: true },
      });

      if (!rental) {
        return next(
          AppError(
            isEN ? "Rental not found" : "Location non trouvée",
            404
          )
        );
      }

      if (rental.ownerId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the vehicle owner can activate this rental"
              : "Seul le propriétaire du véhicule peut activer cette location",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.APPROVED) {
        return next(
          AppError(
            isEN
              ? "Only approved rentals can be activated"
              : "Seules les locations approuvées peuvent être activées",
            400
          )
        );
      }

      if (!rental.transaction || rental.transaction.status !== TransactionStatus.PAID) {
        return next(
          AppError(
            isEN
              ? "Payment must be completed before activating the rental"
              : "Le paiement doit être complété avant d'activer la location",
            400
          )
        );
      }

      const updatedRental = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.ACTIVE,
          activatedAt: new Date(),
        },
        include: rentalInclude,
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Rental Activated",
        titleFr: "Location activée",
        messageEn: `Your rental of ${rental.vehicle.make} ${rental.vehicle.model} is now active. Enjoy your ride!`,
        messageFr: `Votre location de ${rental.vehicle.make} ${rental.vehicle.model} est maintenant active. Bonne route !`,
        rentalId: rental.id,
      });

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // PATCH /rentals/:rentalId/complete — owner completes rental
  static completeRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { rentalId } = matchedData<{ rentalId: number }>(req);

      const rental = await prisma.carRental.findUnique({
        where: { id: rentalId },
        include: {
          transaction: true,
          vehicle: true,
          owner: true,
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

      if (rental.ownerId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the vehicle owner can complete this rental"
              : "Seul le propriétaire du véhicule peut terminer cette location",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.ACTIVE) {
        return next(
          AppError(
            isEN
              ? "Only active rentals can be completed"
              : "Seules les locations actives peuvent être terminées",
            400
          )
        );
      }

      // Transfer owner's portion via Stripe Connect
      if (rental.transaction && rental.owner.stripeAccountId) {
        const ownerAmountInCents = Math.round(rental.transaction.driverAmount * 100);

        if (ownerAmountInCents > 0) {
          const transfer = await stripe.transfers.create({
            amount: ownerAmountInCents,
            currency: "cad",
            destination: rental.owner.stripeAccountId,
            metadata: {
              rentalId: rental.id.toString(),
              transactionId: rental.transaction.id.toString(),
            },
          });

          await prisma.transaction.update({
            where: { id: rental.transaction.id },
            data: {
              stripeTransferId: transfer.id,
              isDriverPaid: true,
              driverPaidAt: new Date(),
            },
          });
        }
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
        titleEn: "Rental Completed",
        titleFr: "Location terminée",
        messageEn: `The rental for ${rental.vehicle.make} ${rental.vehicle.model} has been completed.`,
        messageFr: `La location du ${rental.vehicle.make} ${rental.vehicle.model} est terminée.`,
      });

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // PATCH /rentals/:rentalId/cancel — cancel a rental (owner or renter)
  static cancelRental = catchAsync(
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

      if (rental.ownerId !== user.id && rental.renterId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to cancel this rental"
              : "Vous n'êtes pas autorisé à annuler cette location",
            403
          )
        );
      }

      if (rental.status === RentalStatus.ACTIVE) {
        return next(
          AppError(
            isEN
              ? "Active rentals cannot be cancelled. Please file a dispute instead"
              : "Les locations actives ne peuvent pas être annulées. Veuillez déposer un litige",
            400
          )
        );
      }

      const terminalStatuses: RentalStatus[] = [
        RentalStatus.COMPLETED,
        RentalStatus.CANCELLED,
        RentalStatus.DECLINED,
      ];
      if (terminalStatuses.includes(rental.status)) {
        return next(
          AppError(
            isEN
              ? "This rental cannot be cancelled"
              : "Cette location ne peut pas être annulée",
            400
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

      const [updatedRental, settings] = await Promise.all([
        prisma.carRental.update({
          where: { id: rentalId },
          data: {
            status: RentalStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellerId: user.id,
            cancellationReason: reason || null,
          },
          include: rentalInclude,
        }),
        prisma.rentalSettings.findFirst(),
      ]);

      const refundInfo = logCancellationPolicy({
        action: "RENTAL_CANCEL_REFUND_POLICY",
        userId: user.id,
        scheduledStart: rental.startDate,
        settings,
        meta: { rentalId },
      });

      // Notify the other party
      const notifyUserId = user.id === rental.ownerId ? rental.renterId : rental.ownerId;
      await NotificationServices.notifyUsers({
        userIds: [notifyUserId],
        titleEn: "Rental Cancelled",
        titleFr: "Location annulée",
        messageEn: `The rental for ${rental.vehicle.make} ${rental.vehicle.model} has been cancelled.`,
        messageFr: `La location du ${rental.vehicle.make} ${rental.vehicle.model} a été annulée.`,
      });

      return res.status(200).json({
        success: true,
        data: updatedRental,
        cancellationPolicy: refundInfo,
      });
    }
  );

  // POST /rentals/:rentalId/release-deposit — owner releases security deposit
  static releaseDeposit = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
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

      if (rental.ownerId !== user.id) {
        return next(
          AppError(
            isEN
              ? "Only the vehicle owner can release the deposit"
              : "Seul le propriétaire du véhicule peut libérer le dépôt",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.COMPLETED) {
        return next(
          AppError(
            isEN
              ? "Deposit can only be released for completed rentals"
              : "Le dépôt ne peut être libéré que pour les locations terminées",
            400
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

      // Cancel deposit PaymentIntent (renter never charged)
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
        messageEn: `The security deposit for your rental of ${rental.vehicle.make} ${rental.vehicle.model} has been released.`,
        messageFr: `Le dépôt de garantie pour votre location du ${rental.vehicle.make} ${rental.vehicle.model} a été libéré.`,
      });

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // POST /rentals/:rentalId/dispute — file a dispute
  static disputeRental = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user! as DbUser;
      const isEN = req.isEnglishPreferred;
      const { rentalId, reason } = matchedData<{ rentalId: number; reason: string }>(req);

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

      if (rental.ownerId !== user.id && rental.renterId !== user.id) {
        return next(
          AppError(
            isEN
              ? "You are not authorized to dispute this rental"
              : "Vous n'êtes pas autorisé à contester cette location",
            403
          )
        );
      }

      if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.COMPLETED) {
        return next(
          AppError(
            isEN
              ? "Only active or completed rentals can be disputed"
              : "Seules les locations actives ou terminées peuvent être contestées",
            400
          )
        );
      }

      const updatedRental = await prisma.carRental.update({
        where: { id: rentalId },
        data: {
          status: RentalStatus.DISPUTED,
          cancellationReason: reason,
        },
        include: rentalInclude,
      });

      // Notify the other party
      const notifyUserId = user.id === rental.ownerId ? rental.renterId : rental.ownerId;
      await NotificationServices.notifyUsers({
        userIds: [notifyUserId],
        titleEn: "Rental Disputed",
        titleFr: "Location contestée",
        messageEn: `A dispute has been filed for the rental of ${rental.vehicle.make} ${rental.vehicle.model}.`,
        messageFr: `Un litige a été déposé pour la location du ${rental.vehicle.make} ${rental.vehicle.model}.`,
      });

      // Notify admins
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      if (admins.length > 0) {
        await NotificationServices.notifyUsers({
          userIds: admins.map(a => a.id),
          titleEn: "Rental Dispute Raised",
          titleFr: "Litige de location ouvert",
          messageEn: `A dispute has been raised for rental #${rental.id} (${rental.vehicle.make} ${rental.vehicle.model}).`,
          messageFr: `Un litige a été ouvert pour la location #${rental.id} (${rental.vehicle.make} ${rental.vehicle.model}).`,
          rentalId: rental.id,
        });
      }

      return res.status(200).json({
        success: true,
        data: updatedRental,
      });
    }
  );

  // GET /rentals/vehicles/available — public vehicle search.
  //
  // Delegates to the shared `rentalSearch` service so the new
  // `/public/rentals/search` mirror and this legacy path stay in lockstep.
  // This route is mounted under `/public/*` (no auth middleware) so the
  // viewer is treated as a guest — owner phone/email are stripped by the
  // service's response mapper.
  static searchAvailableVehicles = catchAsync(
    async (req: Request, res: Response, _next: NextFunction) => {
      const {
        page = 1,
        pageSize = 10,
        city,
        region,
        category,
        minDailyRate,
        maxDailyRate,
        startDate,
        endDate,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        city?: string;
        region?: string;
        category?: string;
        minDailyRate?: number;
        maxDailyRate?: number;
        startDate?: string;
        endDate?: string;
      }>(req);

      const result = await listRentals({
        viewer: { isGuest: true },
        filters: {
          city,
          region,
          category,
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

  // GET /rentals/vehicles/:vehicleId — public endpoint for rental vehicle details
  static getRentalVehicle = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { vehicleId } = matchedData<{ vehicleId: number }>(req);
      const isEN = req.isEnglishPreferred;

      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId, isAvailableForRental: true },
        include: {
          files: true,
          defaultImage: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              averageRating: true,
              totalRatings: true,
              profileImage: true,
            },
          },
          pickupLocation: true,
        },
      });

      if (!vehicle) {
        return next(AppError(isEN ? "Vehicle not found" : "Véhicule non trouvé", 404));
      }

      return res.status(200).json({ success: true, data: vehicle });
    }
  );
}
