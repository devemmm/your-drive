import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { listBusRoutes } from "../../services/search/busRouteSearch.service";
import { prisma } from "../../config/database";

/**
 * Unauthenticated mirror of the bus-route passenger search endpoint.
 * Delegates to the shared `busRouteSearch.service` with
 * `viewer.isGuest = true`. Bus routes carry no auth-only fields on the
 * public shape, so the guest and authed responses are identical — the
 * mapper still defensively strips operator phone / email if a future
 * change surfaces them.
 *
 * Mounted on `routes/public.routes.ts` at
 * `GET /public/bus-routes/search`.
 *
 * Wire contract preserved verbatim from the legacy
 * `BusRouteController.publicSearch`:
 *   - Both `originCity` and `destCity` are required; missing either
 *     returns `400 { error: "ORIGIN_DEST_REQUIRED" }`.
 *   - Response shape is `{ routes }` — no `success`, no `data`, no
 *     pagination envelope (the legacy endpoint did not paginate).
 *
 * `matchedData(req)` is used in place of raw `req.query` to stay
 * consistent with the sibling public controllers; no validator chain is
 * currently wired on this route, so `matchedData` simply mirrors
 * `req.query`. When a validator is added later, the controller will
 * automatically pick up the coerced / sanitised values without further
 * changes.
 */
export const PublicBusRouteController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { originCity, destCity } = matchedData<{
        originCity?: string;
        destCity?: string;
      }>(req);

      if (!originCity || !destCity) {
        res.status(400).json({ error: "ORIGIN_DEST_REQUIRED" });
        return;
      }

      const result = await listBusRoutes({
        viewer: { isGuest: true },
        filters: { originCity, destCity },
      });

      res.json({ routes: result.items });
    } catch (err) {
      next(err);
    }
  },

  async trips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const routeId = Number(req.params.routeId);
      const departures = await prisma.busRouteDeparture.findMany({
        where: { routeId, isActive: true },
        include: {
          vehicle: { select: { make: true, model: true, plateNumber: true, capacity: true } },
          route: { select: { basePrice: true } },
        },
        orderBy: { timeOfDay: "asc" },
      });
      res.json({
        departures: departures.map((d) => ({
          id: d.id,
          timeOfDay: d.timeOfDay,
          fare: Number(d.route.basePrice),
          vehicle: d.vehicle,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
};
