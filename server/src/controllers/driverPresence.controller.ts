import { Request, Response, NextFunction } from "express";
import { matchedData } from "express-validator";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/database";
import { DriverPresenceService } from "../services/driverPresence.service";
import { listNearbyDrivers } from "../services/search/driverNearbySearch.service";

export class DriverPresenceController {
  /** POST /api/v1/driver-presence */
  static upsert = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { latitude, longitude, accuracy, currentVehicleId } =
        matchedData<{
          latitude: number;
          longitude: number;
          accuracy?: number;
          currentVehicleId?: number;
        }>(req);

      const user = req.user!;

      if (!user.isAvailableForRideRequest) {
        return next(AppError("You are not currently available for rides", 403));
      }

      if (currentVehicleId !== undefined) {
        const owned = await prisma.vehicle.findFirst({
          where: { id: currentVehicleId, userId: user.id },
          select: { id: true },
        });
        if (!owned) {
          return next(AppError("Vehicle not found or not yours", 400));
        }
      }

      const onTrip = await DriverPresenceService.hasActiveTrip(user.id);
      if (onTrip) {
        return next(AppError("You are on an active trip", 403));
      }

      await DriverPresenceService.upsertPresence({
        userId: user.id,
        latitude,
        longitude,
        accuracy,
        currentVehicleId,
      });

      res.json({ ok: true, expiresInSec: 30 });
    }
  );

  /** POST /api/v1/driver-presence/offline */
  static offline = catchAsync(async (req: Request, res: Response) => {
    await DriverPresenceService.markOffline(req.user!.id);
    res.json({ ok: true });
  });

  /**
   * GET /api/v1/drivers/nearby?swLat=&swLng=&neLat=&neLng=
   *
   * Delegates to the shared `driverNearbySearch.service` so this legacy
   * authed mount and the new `/public/drivers/nearby` mirror stay in
   * lockstep. Driver-nearby rows are non-PII by construction (the
   * exposed `id` is a rotation-hashed token, not the raw user id), so
   * the response shape is identical for guest and authed viewers — the
   * `viewer` parameter is reserved for future personalization.
   */
  static nearby = catchAsync(async (req: Request, res: Response) => {
    const { swLat, swLng, neLat, neLng } = matchedData<{
      swLat: number;
      swLng: number;
      neLat: number;
      neLng: number;
    }>(req);

    const result = await listNearbyDrivers({
      viewer: { isGuest: false, userId: req.user!.id },
      bounds: { swLat, swLng, neLat, neLng },
    });
    res.json(result);
  });
}
