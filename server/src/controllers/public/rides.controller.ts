import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { LuggageSize, RideType, VehicleCategory } from "@prisma/client";
import { listRides } from "../../services/search/rideSearch.service";

/**
 * Unauthenticated mirror of the posted-P2P-ride search endpoint.
 * Delegates to the shared `rideSearch.service` with
 * `viewer.isGuest = true` so the response mapper strips driver phone /
 * email before they reach the wire.
 *
 * Mounted on `routes/public.routes.ts` at `GET /public/rides/search`,
 * replacing the legacy `RideController.searchRides` mount on the same
 * route. The legacy controller method itself now delegates to the same
 * shared service, so any code path that still references it (e.g. the
 * Swagger docs route table) continues to behave identically.
 *
 * Consumes the output of `rideValidator.validateSearchRides` via
 * `matchedData(req)` — the validator chain has already coerced
 * numeric params with `.toInt()` / `.toFloat()` and normalized strings
 * with `.trim()`. Reading `req.query` directly would bypass those
 * normalizations and diverge from the legacy endpoint's behaviour.
 */
export const PublicRideController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 10,
        departureCity,
        destinationCity,
        departureTime,
        minContribution,
        maxContribution,
        userLatitude,
        userLongitude,
        radiusKm = 30,
        preferences = {},
        type,
        vehicleCategory,
        originCity,
        destCity,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        departureCity?: string;
        destinationCity?: string;
        departureTime?: number;
        minContribution?: number;
        maxContribution?: number;
        userLatitude?: number;
        userLongitude?: number;
        radiusKm?: number;
        type?: RideType;
        vehicleCategory?: VehicleCategory;
        originCity?: string;
        destCity?: string;
        preferences?: {
          smoking?: boolean;
          pets?: boolean;
          airConditioning?: boolean;
          ladiesOnly?: boolean;
          gentsOnly?: boolean;
          bicycleSupport?: boolean;
          snowTires?: boolean;
          luggageSize?: LuggageSize;
          luggageCount?: boolean;
        };
      }>(req, { locations: ["query"] });

      const result = await listRides({
        viewer: { isGuest: true },
        filters: {
          page: +page,
          pageSize: +pageSize,
          departureCity,
          destinationCity,
          departureTime,
          minContribution,
          maxContribution,
          userLatitude,
          userLongitude,
          radiusKm,
          preferences,
          type,
          vehicleCategory,
          originCity,
          destCity,
        },
      });

      // Legacy contract: suggestions are surfaced ONLY when the strict
      // result set is empty. Mirroring keeps the public endpoint
      // wire-compatible with the original `searchRides` handler.
      res.status(200).json({
        success: true,
        data: result.items,
        suggestions: result.items.length === 0 ? result.suggestions : [],
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
