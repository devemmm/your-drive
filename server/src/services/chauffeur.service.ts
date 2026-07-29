import { CronJob } from "cron";
import { logger } from "../utils/logger";
import moment from "moment";
import { prisma } from "../config/database";
import { Prisma, ChauffeurStatus, ChauffeurServiceType } from "@prisma/client";
import { NotificationServices } from "./notification.service";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CHAUFFEUR_SETTINGS = {
  platformFeePercentage: 15,
  maxServiceDurationDays: 30,
  minServiceDurationHours: 1,
  requestExpiryHours: 24,
  overdueGracePeriodHours: 3,
};

export const getChauffeurSettings = async () => {
  const settings = await prisma.chauffeurSettings.findFirst();
  if (!settings) {
    return DEFAULT_CHAUFFEUR_SETTINGS;
  }
  return {
    platformFeePercentage: Number(settings.platformFeePercentage),
    maxServiceDurationDays: settings.maxServiceDurationDays,
    minServiceDurationHours: settings.minServiceDurationHours,
    requestExpiryHours: settings.requestExpiryHours,
    overdueGracePeriodHours: settings.overdueGracePeriodHours,
  };
};

export const calculateChauffeurCost = (
  startDate: Date,
  endDate: Date,
  serviceType: ChauffeurServiceType,
  hourlyRate: number,
  dailyRate: number
): number => {
  const start = moment(startDate);
  const end = moment(endDate);

  if (serviceType === ChauffeurServiceType.HOURLY) {
    const hours = Math.ceil(end.diff(start, "hours", true));
    return hours * hourlyRate;
  }

  // DAILY
  const days = Math.ceil(end.diff(start, "days", true));
  return days * dailyRate;
};

export async function hasChauffeurOverlap(
  startDate: Date,
  endDate: Date,
  driverId: number,
  excludeServiceId?: number
): Promise<boolean> {
  const count = await prisma.chauffeurService.count({
    where: {
      driverId,
      status: { in: [ChauffeurStatus.REQUESTED, ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE] },
      ...(excludeServiceId && { id: { not: excludeServiceId } }),
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
  });
  return count > 0;
}

// ── Shared include for chauffeur queries ────────────────────────────────────

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

export const chauffeurInclude: Prisma.ChauffeurServiceInclude = {
  vehicle: {
    include: {
      files: true,
      defaultImage: true,
    },
  },
  passenger: { select: userSelect },
  driver: {
    select: {
      ...userSelect,
      isAvailableForChauffeur: true,
      chauffeurHourlyRate: true,
      chauffeurDailyRate: true,
      chauffeurDescription: true,
    },
  },
  pickupLocation: true,
  dropoffLocation: true,
  transaction: true,
  chatThread: true,
  _count: { select: { reports: { where: { status: "OPEN" } } } },
};

// ── Cron Jobs ────────────────────────────────────────────────────────────────

const expireChauffeurRequests = async () => {
  try {
    const settings = await getChauffeurSettings();
    const expiryDate = moment()
      .subtract(settings.requestExpiryHours, "hours")
      .toDate();

    const expiredServices = await prisma.chauffeurService.findMany({
      where: {
        status: ChauffeurStatus.REQUESTED,
        createdAt: { lt: expiryDate },
      },
      include: { vehicle: true, passenger: true, driver: true },
    });

    for (const service of expiredServices) {
      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: {
          status: ChauffeurStatus.DECLINED,
          declinedAt: new Date(),
        },
      });

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Chauffeur Request Expired",
        titleFr: "Demande de chauffeur expirée",
        messageEn: `The chauffeur request${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} has expired.`,
        messageFr: `La demande de chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} a expiré.`,
        chauffeurServiceId: service.id,
      });
    }

    if (expiredServices.length) {
      logger.info(`Expired ${expiredServices.length} chauffeur request(s).`);
    }
  } catch (error) {
    logger.error("Error expiring chauffeur requests:", error);
  }
};

const remindChauffeurPickup = async () => {
  try {
    const now = moment();
    const twoHoursFromNow = now.clone().add(2, "hours").toDate();

    const upcomingServices = await prisma.chauffeurService.findMany({
      where: {
        status: ChauffeurStatus.ACCEPTED,
        pickupReminderSent: false,
        startDate: {
          gte: now.toDate(),
          lte: twoHoursFromNow,
        },
      },
      include: { vehicle: true, passenger: true, driver: true },
    });

    for (const service of upcomingServices) {
      const minutesUntilPickup = Math.round(
        moment(service.startDate).diff(moment(), "minutes")
      );

      await NotificationServices.notifyUsers({
        userIds: [service.passengerId, service.driverId],
        titleEn: "Chauffeur Pickup Reminder",
        titleFr: "Rappel de prise en charge chauffeur",
        messageEn: `The chauffeur service${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} starts in ${minutesUntilPickup} minutes.`,
        messageFr: `Le service chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} commence dans ${minutesUntilPickup} minutes.`,
        chauffeurServiceId: service.id,
      });

      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: { pickupReminderSent: true },
      });
    }
  } catch (error) {
    logger.error("Error sending chauffeur pickup reminders:", error);
  }
};

const remindChauffeurCompletion = async () => {
  try {
    const now = moment();
    const twoHoursFromNow = now.clone().add(2, "hours").toDate();

    const activeServices = await prisma.chauffeurService.findMany({
      where: {
        status: ChauffeurStatus.ACTIVE,
        completionReminderSent: false,
        endDate: {
          gte: now.toDate(),
          lte: twoHoursFromNow,
        },
      },
      include: { vehicle: true, driver: true },
    });

    for (const service of activeServices) {
      const minutesUntilEnd = Math.round(
        moment(service.endDate).diff(moment(), "minutes")
      );

      await NotificationServices.notifyUsers({
        userIds: [service.driverId],
        titleEn: "Chauffeur Service Ending Soon",
        titleFr: "Service chauffeur bientôt terminé",
        messageEn: `The chauffeur service${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} ends in ${minutesUntilEnd} minutes.`,
        messageFr: `Le service chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} se termine dans ${minutesUntilEnd} minutes.`,
        chauffeurServiceId: service.id,
      });

      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: { completionReminderSent: true },
      });
    }
  } catch (error) {
    logger.error("Error sending chauffeur completion reminders:", error);
  }
};

const checkOverdueChauffeurServices = async () => {
  try {
    const settings = await getChauffeurSettings();
    const graceCutoff = moment()
      .subtract(settings.overdueGracePeriodHours, "hours")
      .toDate();

    const overdueServices = await prisma.chauffeurService.findMany({
      where: {
        status: ChauffeurStatus.ACTIVE,
        overdueNotifiedAt: null,
        endDate: { lt: graceCutoff },
      },
      include: { vehicle: true, passenger: true, driver: true },
    });

    for (const service of overdueServices) {
      await NotificationServices.notifyUsers({
        userIds: [service.passengerId],
        titleEn: "Chauffeur Service Overdue",
        titleFr: "Service chauffeur en retard",
        messageEn: `The chauffeur service${service.vehicle ? ` for ${service.vehicle.make} ${service.vehicle.model}` : ""} by ${service.driver.firstName} ${service.driver.lastName} is overdue.`,
        messageFr: `Le service chauffeur${service.vehicle ? ` pour ${service.vehicle.make} ${service.vehicle.model}` : ""} par ${service.driver.firstName} ${service.driver.lastName} est en retard.`,
        chauffeurServiceId: service.id,
      });

      await prisma.chauffeurService.update({
        where: { id: service.id },
        data: { overdueNotifiedAt: new Date() },
      });
    }

    if (overdueServices.length) {
      logger.info(`Found ${overdueServices.length} overdue chauffeur service(s).`);
    }
  } catch (error) {
    logger.error("Error checking overdue chauffeur services:", error);
  }
};

// ── Initialize ───────────────────────────────────────────────────────────────

export const initializeChauffeurCronJobs = () => {
  // Every 30 minutes — expire stale chauffeur requests
  new CronJob("*/30 * * * *", expireChauffeurRequests, null, true);

  // Every minute — remind both parties of upcoming pickup
  new CronJob("* * * * *", remindChauffeurPickup, null, true);

  // Every minute — remind driver of upcoming service end
  new CronJob("* * * * *", remindChauffeurCompletion, null, true);

  // Every 30 minutes — check for overdue services
  new CronJob("*/30 * * * *", checkOverdueChauffeurServices, null, true);

  logger.info("Chauffeur cron jobs initialized.");
};
