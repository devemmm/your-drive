import { prisma } from "../config/database";
import { CronJob } from "cron";
import {
  hashDriverToken,
  currentRotationKey,
} from "../utils/driverPresenceToken";
import { logger } from "../utils/logger";
import {
  RideStatus,
  D2DBookingRequestStatus,
  ChauffeurStatus,
  VehicleCategory,
} from "@prisma/client";

const FRESHNESS_SECONDS = 30;
const MAX_NEARBY_RESULTS = 50;
const MAX_BBOX_DEGREES = 0.2;

export type NearbyDriver = {
  id: string;
  latitude: number;
  longitude: number;
  vehicleCategory: VehicleCategory;
};

export class DriverPresenceService {
  static roundCoord(n: number): number {
    return Math.round(n * 10000) / 10000;
  }

  static async hasActiveTrip(userId: number): Promise<boolean> {
    const [ride, d2d, chauffeur] = await Promise.all([
      prisma.ride.findFirst({
        where: { driverId: userId, status: RideStatus.ONGOING },
        select: { id: true },
      }),
      prisma.d2DBookingRequest.findFirst({
        where: {
          ride: { driverId: userId },
          status: {
            in: [
              D2DBookingRequestStatus.ACCEPTED,
              D2DBookingRequestStatus.CONFIRMED,
            ],
          },
        },
        select: { id: true },
      }),
      prisma.chauffeurService.findFirst({
        where: {
          driverId: userId,
          status: {
            in: [ChauffeurStatus.ACCEPTED, ChauffeurStatus.ACTIVE],
          },
        },
        select: { id: true },
      }),
    ]);
    return !!(ride || d2d || chauffeur);
  }

  static async upsertPresence(params: {
    userId: number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    currentVehicleId?: number;
  }) {
    const lat = DriverPresenceService.roundCoord(params.latitude);
    const lng = DriverPresenceService.roundCoord(params.longitude);
    return prisma.driverPresence.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        latitude: lat,
        longitude: lng,
        accuracy: params.accuracy,
        currentVehicleId: params.currentVehicleId,
      },
      update: {
        latitude: lat,
        longitude: lng,
        accuracy: params.accuracy,
        currentVehicleId: params.currentVehicleId,
      },
    });
  }

  static async markOffline(userId: number) {
    await prisma.driverPresence.deleteMany({ where: { userId } });
  }

  static async nearby(params: {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
  }): Promise<NearbyDriver[]> {
    let { swLat, swLng, neLat, neLng } = params;
    if (neLat - swLat > MAX_BBOX_DEGREES) {
      const mid = (neLat + swLat) / 2;
      swLat = mid - MAX_BBOX_DEGREES / 2;
      neLat = mid + MAX_BBOX_DEGREES / 2;
    }
    if (neLng - swLng > MAX_BBOX_DEGREES) {
      const mid = (neLng + swLng) / 2;
      swLng = mid - MAX_BBOX_DEGREES / 2;
      neLng = mid + MAX_BBOX_DEGREES / 2;
    }

    const freshAfter = new Date(Date.now() - FRESHNESS_SECONDS * 1000);

    const rows = await prisma.driverPresence.findMany({
      where: {
        updatedAt: { gt: freshAfter },
        latitude: { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
        user: { isAvailableForRideRequest: true },
        currentVehicleId: { not: null },
      },
      include: {
        user: { select: { id: true } },
        currentVehicle: { select: { category: true } },
      },
      take: MAX_NEARBY_RESULTS * 2,
    });

    if (rows.length === 0) return [];

    const activeTripFlags = await Promise.all(
      rows.map((r) => DriverPresenceService.hasActiveTrip(r.userId))
    );
    const available = rows.filter((_, i) => !activeTripFlags[i]);

    const rotation = currentRotationKey();
    return available.slice(0, MAX_NEARBY_RESULTS).map<NearbyDriver>((r) => ({
      id: hashDriverToken(r.userId, rotation),
      latitude: r.latitude,
      longitude: r.longitude,
      vehicleCategory: r.currentVehicle?.category ?? VehicleCategory.CAR,
    }));
  }

  static async cleanupStaleRows(): Promise<number> {
    const cutoff = new Date(Date.now() - FRESHNESS_SECONDS * 1000);
    const res = await prisma.driverPresence.deleteMany({
      where: { updatedAt: { lt: cutoff } },
    });
    return res.count;
  }
}

export function initializeDriverPresenceCronJobs() {
  const job = new CronJob("* * * * *", async () => {
    try {
      const n = await DriverPresenceService.cleanupStaleRows();
      if (n > 0) logger.debug(`[driver-presence] cleaned up ${n} stale rows`);
    } catch (err) {
      logger.error("[driver-presence] cleanup failed", err);
    }
  });
  job.start();
  return job;
}
