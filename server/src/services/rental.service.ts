import { CronJob } from "cron";
import { logger } from "../utils/logger";
import moment from "moment";
import { prisma } from "../config/database";
import { Prisma, RentalStatus, RentalType } from "@prisma/client";
import { NotificationServices } from "./notification.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_RENTAL_SETTINGS = {
  platformFeePercentage: 15,
  maxRentalDurationDays: 30,
  minRentalDurationHours: 1,
  requestExpiryHours: 24,
  depositReleaseReminderHours: 24,
  overdueGracePeriodHours: 3,
};

export const getRentalSettings = async () => {
  const settings = await prisma.rentalSettings.findFirst();
  if (!settings) {
    return DEFAULT_RENTAL_SETTINGS;
  }
  return {
    platformFeePercentage: Number(settings.platformFeePercentage),
    maxRentalDurationDays: settings.maxRentalDurationDays,
    minRentalDurationHours: settings.minRentalDurationHours,
    requestExpiryHours: settings.requestExpiryHours,
    depositReleaseReminderHours: settings.depositReleaseReminderHours,
    overdueGracePeriodHours: settings.overdueGracePeriodHours,
  };
};

export const calculateRentalCost = (
  startDate: Date,
  endDate: Date,
  rentalType: RentalType,
  hourlyRate: number,
  dailyRate: number
): number => {
  const start = moment(startDate);
  const end = moment(endDate);

  if (rentalType === RentalType.HOURLY) {
    const hours = Math.ceil(end.diff(start, "hours", true));
    return hours * hourlyRate;
  }

  // DAILY
  const days = Math.ceil(end.diff(start, "days", true));
  return days * dailyRate;
};

export async function hasOverlap(
  startDate: Date,
  endDate: Date,
  vehicleId: number,
  excludeRentalId?: number
): Promise<boolean> {
  const [rentalCount, blockedCount] = await Promise.all([
    prisma.carRental.count({
      where: {
        vehicleId,
        status: { in: [RentalStatus.REQUESTED, RentalStatus.APPROVED, RentalStatus.ACTIVE] },
        ...(excludeRentalId && { id: { not: excludeRentalId } }),
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    }),
    // Owner-set blocked ranges (maintenance, owner using car, etc.)
    prisma.vehicleBlockedRange.count({
      where: {
        vehicleId,
        from: { lt: endDate },
        to: { gt: startDate },
      },
    }),
  ]);
  return rentalCount + blockedCount > 0;
}

// ── Shared include for rental queries ────────────────────────────────────────

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  averageRating: true,
  totalRatings: true,
  profileImage: true,
};

export const rentalInclude: Prisma.CarRentalInclude = {
  vehicle: {
    include: {
      files: true,
      defaultImage: true,
    },
  },
  renter: { select: userSelect },
  owner: { select: userSelect },
  pickupLocation: true,
  returnLocation: true,
  transaction: true,
  depositTransaction: true,
  chatThread: true,
  _count: { select: { reports: { where: { status: "OPEN" } } } },
};

// ── Cron Jobs ────────────────────────────────────────────────────────────────

const expireRentalRequests = async () => {
  try {
    const settings = await getRentalSettings();
    const expiryDate = moment()
      .subtract(settings.requestExpiryHours, "hours")
      .toDate();

    const expiredRentals = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.REQUESTED,
        createdAt: { lt: expiryDate },
      },
      include: { vehicle: true, renter: true, owner: true },
    });

    for (const rental of expiredRentals) {
      await prisma.carRental.update({
        where: { id: rental.id },
        data: {
          status: RentalStatus.DECLINED,
          declinedAt: new Date(),
        },
      });

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId, rental.ownerId],
        titleEn: "Rental Request Expired",
        titleFr: "Demande de location expirée",
        messageEn: `The rental request for ${rental.vehicle.make} ${rental.vehicle.model} has expired.`,
        messageFr: `La demande de location pour ${rental.vehicle.make} ${rental.vehicle.model} a expiré.`,
      });
    }

    if (expiredRentals.length) {
      logger.info(`Expired ${expiredRentals.length} rental request(s).`);
    }
  } catch (error) {
    logger.error("Error expiring rental requests:", error);
  }
};

const remindPickup = async () => {
  try {
    const now = moment();
    const twoHoursFromNow = now.clone().add(2, "hours").toDate();

    const upcomingRentals = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.APPROVED,
        pickupReminderSent: false,
        startDate: {
          gte: now.toDate(),
          lte: twoHoursFromNow,
        },
      },
      include: { vehicle: true, renter: true, owner: true },
    });

    for (const rental of upcomingRentals) {
      const minutesUntilPickup = Math.round(
        moment(rental.startDate).diff(moment(), "minutes")
      );

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId, rental.ownerId],
        titleEn: "Rental Pickup Reminder",
        titleFr: "Rappel de prise en charge de location",
        messageEn: `The rental pickup for ${rental.vehicle.make} ${rental.vehicle.model} is in ${minutesUntilPickup} minutes.`,
        messageFr: `La prise en charge de la location pour ${rental.vehicle.make} ${rental.vehicle.model} est dans ${minutesUntilPickup} minutes.`,
      });

      await prisma.carRental.update({
        where: { id: rental.id },
        data: { pickupReminderSent: true },
      });
    }
  } catch (error) {
    logger.error("Error sending pickup reminders:", error);
  }
};

const remindReturn = async () => {
  try {
    const now = moment();
    const twoHoursFromNow = now.clone().add(2, "hours").toDate();

    const activeRentals = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.ACTIVE,
        returnReminderSent: false,
        endDate: {
          gte: now.toDate(),
          lte: twoHoursFromNow,
        },
      },
      include: { vehicle: true, renter: true },
    });

    for (const rental of activeRentals) {
      const minutesUntilReturn = Math.round(
        moment(rental.endDate).diff(moment(), "minutes")
      );

      await NotificationServices.notifyUsers({
        userIds: [rental.renterId],
        titleEn: "Rental Return Reminder",
        titleFr: "Rappel de retour de location",
        messageEn: `The rental for ${rental.vehicle.make} ${rental.vehicle.model} is due for return in ${minutesUntilReturn} minutes.`,
        messageFr: `La location pour ${rental.vehicle.make} ${rental.vehicle.model} doit être retournée dans ${minutesUntilReturn} minutes.`,
      });

      await prisma.carRental.update({
        where: { id: rental.id },
        data: { returnReminderSent: true },
      });
    }
  } catch (error) {
    logger.error("Error sending return reminders:", error);
  }
};

const checkOverdueRentals = async () => {
  try {
    const settings = await getRentalSettings();
    const graceCutoff = moment()
      .subtract(settings.overdueGracePeriodHours, "hours")
      .toDate();

    const overdueRentals = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.ACTIVE,
        overdueNotifiedAt: null,
        endDate: { lt: graceCutoff },
      },
      include: { vehicle: true, renter: true, owner: true },
    });

    for (const rental of overdueRentals) {
      await NotificationServices.notifyUsers({
        userIds: [rental.ownerId],
        titleEn: "Rental Overdue",
        titleFr: "Location en retard",
        messageEn: `The rental for ${rental.vehicle.make} ${rental.vehicle.model} by ${rental.renter.firstName} ${rental.renter.lastName} is overdue.`,
        messageFr: `La location pour ${rental.vehicle.make} ${rental.vehicle.model} par ${rental.renter.firstName} ${rental.renter.lastName} est en retard.`,
      });

      await prisma.carRental.update({
        where: { id: rental.id },
        data: { overdueNotifiedAt: new Date() },
      });
    }

    if (overdueRentals.length) {
      logger.info(`Found ${overdueRentals.length} overdue rental(s).`);
    }
  } catch (error) {
    logger.error("Error checking overdue rentals:", error);
  }
};

const remindDepositRelease = async () => {
  try {
    const settings = await getRentalSettings();
    const reminderCutoff = moment()
      .subtract(settings.depositReleaseReminderHours, "hours")
      .toDate();

    const rentalsAwaitingDeposit = await prisma.carRental.findMany({
      where: {
        status: RentalStatus.COMPLETED,
        depositRefunded: false,
        depositReleaseReminderSent: false,
        completedAt: { lt: reminderCutoff },
      },
      include: { vehicle: true, renter: true, owner: true },
    });

    for (const rental of rentalsAwaitingDeposit) {
      await NotificationServices.notifyUsers({
        userIds: [rental.ownerId],
        titleEn: "Deposit Release Reminder",
        titleFr: "Rappel de libération du dépôt",
        messageEn: `Please review and release the security deposit for the rental of ${rental.vehicle.make} ${rental.vehicle.model} by ${rental.renter.firstName} ${rental.renter.lastName}.`,
        messageFr: `Veuillez examiner et libérer le dépôt de garantie pour la location de ${rental.vehicle.make} ${rental.vehicle.model} par ${rental.renter.firstName} ${rental.renter.lastName}.`,
      });

      await prisma.carRental.update({
        where: { id: rental.id },
        data: { depositReleaseReminderSent: true },
      });
    }

    if (rentalsAwaitingDeposit.length) {
      logger.info(
        `Sent deposit release reminders for ${rentalsAwaitingDeposit.length} rental(s).`
      );
    }
  } catch (error) {
    logger.error("Error sending deposit release reminders:", error);
  }
};

// ── Initialize ───────────────────────────────────────────────────────────────

export const initializeRentalCronJobs = () => {
  // Every 30 minutes — expire stale rental requests
  new CronJob("*/30 * * * *", expireRentalRequests, null, true);

  // Every minute — remind both parties of upcoming pickup
  new CronJob("* * * * *", remindPickup, null, true);

  // Every minute — remind renter of upcoming return
  new CronJob("* * * * *", remindReturn, null, true);

  // Every 30 minutes — check for overdue rentals
  new CronJob("*/30 * * * *", checkOverdueRentals, null, true);

  // Every hour — remind owner to release deposit
  new CronJob("0 * * * *", remindDepositRelease, null, true);

  logger.info("Rental cron jobs initialized.");
};
