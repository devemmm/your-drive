import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { listRentals } from "../../services/search/rentalSearch.service";

/**
 * Unauthenticated mirror of the rental list endpoint. Delegates to the
 * shared `rentalSearch.service` with `viewer.isGuest = true` so the
 * response mapper strips owner phone / email before it reaches the wire.
 *
 * Mounted on `routes/public.routes.ts` at `GET /public/rentals/search`.
 *
 * Consumes the output of `rentalValidators.searchAvailableVehicles` via
 * `matchedData(req)` — the validator chain has already coerced numeric
 * params with `.toInt()` / `.toFloat()` and normalized strings with
 * `.trim()` / `.toUpperCase()`, so reading `req.query` directly would
 * bypass those normalizations and diverge from the sibling
 * `RentalController.searchAvailableVehicles` endpoint.
 */
export const PublicRentalController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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

      res.status(200).json({
        success: true,
        data: result.items,
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
