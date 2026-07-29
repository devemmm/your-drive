import {
  Location,
  Ride,
  RideRequestStatus,
  VehicleCategory,
} from "@prisma/client";
import { prisma } from "../config/database";
import { NotificationServices } from "./notification.service";
import { sweepPendingBids } from "./bid.service";
import moment from "moment";
import { logger } from "../utils/logger";
import { CronJob } from "cron";

export class RideRequestService {
  static async handleRideRequestMatches(
    ride: Ride & {
      departureLocation: Location;
      destinationLocation: Location;
    }
  ) {
    // find candidate ride requests that are ACTIVE, same date (or within same day)
    // and whose proximity covers the ride departure/destination points
    const rideRequestMatches = await prisma.rideRequest.findMany({
      where: {
        status: RideRequestStatus.OPEN,
        seats: { lte: ride.availableSeats },
        rideType: ride.type,
        userId: { not: { equals: ride.driverId }},
        originCity: { contains: ride.departureLocation.city ?? undefined, mode: "insensitive"},
        destCity: { contains: ride.destinationLocation.city ?? undefined, mode: "insensitive" },
        OR: [
          {
            date: {
              lte: ride.departureTime,
              gte: new Date(new Date(ride.departureTime).setHours(0, 0, 0, 0)),
            },
          },
          {
            timeWindowStart: { lte: ride.departureTime },
            timeWindowEnd: { gte: ride.departureTime },
          },
        ],
      },
      include: {
        origin: true,
        destination: true,
      },
    });

    if (!rideRequestMatches || rideRequestMatches.length === 0)
      return { matched: 0 };

    for (const rideRequest of rideRequestMatches) {
      // Check proximity using Prisma (requires PostGIS support via raw query for distance calc)
      // For now, filtering happens in-memory after fetch
      const requestId = rideRequest.id;
      const userId = rideRequest.userId;

      // 1) skip if a match already exists (prevents duplicate notification)
      const existingMatch = await prisma.rideRequestMatch.findFirst({
        where: { requestId, rideId: ride.id },
      });
      if (existingMatch) continue;

      // 2) enforce 'max 3 notifications per active request per day' rule
      const todayStart = moment().startOf("day").toDate();
      const notificationsToday = await prisma.notification.count({
        where: {
          rideRequestId: requestId,
          createdAt: { gte: todayStart },
        },
      });
      if (notificationsToday >= 3) continue;

      // 3) create match + notification
      try {
        await prisma.rideRequestMatch.create({
          data: {
            requestId,
            rideId: ride.id,
          },
        });

        await NotificationServices.notifyUsers({
          userIds: [userId],
          titleEn: "New Ride Match",
          titleFr: "Nouveau trajet correspondant",
          messageEn: `A new ride ${ride.departureLocation.city} -> ${
            ride.destinationLocation.city
          } on ${
            new Date(ride.departureTime).toLocaleString("en-CA", {
              timeZone: "UTC",
            }) + " GMT"
          } matches your ride request — book now.`,
          messageFr: `Un nouveau trajet ${ride.departureLocation.city} -> ${
            ride.destinationLocation.city
          } le ${
            new Date(ride.departureTime).toLocaleString("en-CA", {
              timeZone: "UTC",
            }) + " GMT"
          } correspond à votre demande de trajet — réservez maintenant.`,
          rideRequestId: requestId,
          rideId: ride.id,
        });
      } catch (err: any) {
        if (err && /unique/i.test(err.message)) continue;
        console.error(
          "Error creating match/notification for request",
          requestId,
          err
        );
        continue;
      }
    }
  }
  /**
   * Notify drivers who have a matching vehicle category and are available
   * for ride requests when a new ride request is created.
   */
  static async notifyMatchingDrivers(rideRequest: {
    id: number;
    userId: number;
    originCity: string;
    destCity: string;
    vehicleCategory: VehicleCategory;
    seats: number;
  }) {
    try {
      // Find drivers who:
      // 1. Are onboarded and available for ride requests
      // 2. Own a vehicle matching the requested category
      // 3. Are not the passenger themselves
      const matchingDrivers = await prisma.user.findMany({
        where: {
          id: { not: rideRequest.userId },
          isDriverOnboarded: true,
          isAvailableForRideRequest: true,
          vehicles: {
            some: {
              category: rideRequest.vehicleCategory,
            },
          },
        },
        select: { id: true },
      });

      if (matchingDrivers.length === 0) return;

      const driverIds = matchingDrivers.map((d) => d.id);
      const vehicleLabel =
        rideRequest.vehicleCategory === "MOTORBIKE" ? "motorbike" : "car";

      await NotificationServices.notifyUsers({
        userIds: driverIds,
        titleEn: "New Ride Request",
        titleFr: "Nouvelle demande de trajet",
        messageEn: `A passenger is looking for a ${vehicleLabel} ride from ${rideRequest.originCity} to ${rideRequest.destCity} (${rideRequest.seats} seat${rideRequest.seats > 1 ? "s" : ""}).`,
        messageFr: `Un passager cherche un trajet en ${vehicleLabel === "motorbike" ? "moto" : "voiture"} de ${rideRequest.originCity} à ${rideRequest.destCity} (${rideRequest.seats} place${rideRequest.seats > 1 ? "s" : ""}).`,
        rideRequestId: rideRequest.id,
      });

      logger.debug(
        `[RideRequest] Notified ${driverIds.length} drivers for request #${rideRequest.id} (${rideRequest.vehicleCategory})`
      );
    } catch (err) {
      logger.error("Error notifying drivers for ride request", err);
    }
  }
}

export const expireRideRequestsJob = async () => {
  try {
    const now = new Date();

    // Requests with timeWindowEnd
    const result = await prisma.$transaction(async (tx) => {
      const expiringRequests = await tx.rideRequest.findMany({
        where: {
          status: RideRequestStatus.OPEN,
          OR: [
            {
              timeWindowEnd: { lt: now },
            },
            {
              date: { lt: now },
            },
          ],
        },
        select: { id: true },
      });
      const ids = expiringRequests.map((r) => r.id);
      if (ids.length === 0) return { count: 0 };
      const upd = await tx.rideRequest.updateMany({
        where: { id: { in: ids } },
        data: {
          status: "EXPIRED",
          expiredAt: now,
        },
      });
      for (const id of ids) {
        await sweepPendingBids({
          tx,
          rideRequestId: id,
          reason: "REQUEST_EXPIRED",
        });
      }
      return { count: upd.count };
    });

    logger.debug(
      `[RideRequests Cron] Expired: ${
        result.count
      } requests at ${now.toISOString()}`
    );
  } catch (error) {
    logger.debug("Expire ride request cron job failure error", error);
  }
};

export const initializeRideRequestCronJobs = () => {
  logger.debug("Initializing ride requests' cron jobs...");

  const expireRideReqJob = new CronJob(
    "0 * * * *", // Run every hour
    async () => {
      logger.debug("Running expire ride request...");
      try {
        await expireRideRequestsJob();
      } catch (error) {
        logger.error("Error in ride cron jobs:", error);
      }
    },
    null, // onComplete
    false, // start
    "UTC" // timezone
  );

  // Start the cron jobs

  expireRideReqJob.start();
  logger.debug("Ride requests cron jobs initialized and started");

  // For testing purposes, let's also run it immediately
  expireRideReqJob.fireOnTick();
};
