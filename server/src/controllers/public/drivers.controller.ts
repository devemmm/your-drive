import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { listNearbyDrivers } from "../../services/search/driverNearbySearch.service";

/**
 * Unauthenticated mirror of the live "drivers near a viewport" endpoint.
 * Delegates to the shared `driverNearbySearch.service` with
 * `viewer.isGuest = true`.
 *
 * Mounted on `routes/public.routes.ts` at
 * `GET /public/drivers/nearby`, alongside the legacy
 * `DriverPresenceController.nearby` mount at `GET /drivers/nearby`
 * (behind `isAuthenticated`). Both paths now delegate to the same shared
 * service, so the response shape is identical:
 *
 *   { drivers: [{ id, latitude, longitude, vehicleCategory }], fetchedAt }
 *
 * Driver rows are non-PII by construction — `id` is a rotation-hashed
 * token (not the raw user id), so the guest and authed responses are
 * byte-for-byte identical.
 *
 * Consumes the output of `nearbyValidator` via `matchedData(req)`. The
 * validator already coerces `swLat` / `swLng` / `neLat` / `neLng` with
 * `.toFloat()`, so the values arrive here as numbers. The validator
 * chain runs ahead of this handler on the route, so any malformed query
 * is rejected with a 400 before this code ever runs.
 */
export const PublicDriversController = {
  async nearby(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { swLat, swLng, neLat, neLng } = matchedData<{
        swLat: number;
        swLng: number;
        neLat: number;
        neLng: number;
      }>(req, { locations: ["query"] });

      const result = await listNearbyDrivers({
        viewer: { isGuest: true },
        bounds: { swLat, swLng, neLat, neLng },
      });

      // Wire shape preserved verbatim from the legacy
      // `DriverPresenceController.nearby`: top-level `drivers` + `fetchedAt`.
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
