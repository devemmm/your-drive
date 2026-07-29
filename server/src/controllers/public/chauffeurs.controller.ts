import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { listChauffeurs } from "../../services/search/chauffeurSearch.service";

/**
 * Unauthenticated mirror of the chauffeur-driver search endpoint.
 * Delegates to the shared `chauffeurSearch.service` with
 * `viewer.isGuest = true` so the response mapper strips phone / email
 * before they reach the wire.
 *
 * Mounted on `routes/public.routes.ts` at
 * `GET /public/chauffeur-services/search`.
 *
 * Consumes the output of `chauffeurValidators.searchAvailableDrivers` via
 * `matchedData(req)` — the validator chain has already coerced numeric
 * rate params with `.toFloat()` and pagination with `.toInt()`. Reading
 * `req.query` directly would bypass those normalizations and diverge
 * from the legacy `/public/chauffeur-drivers` endpoint.
 */
export const PublicChauffeurController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 10,
        minHourlyRate,
        maxHourlyRate,
        minDailyRate,
        maxDailyRate,
        startDate,
        endDate,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        minHourlyRate?: number;
        maxHourlyRate?: number;
        minDailyRate?: number;
        maxDailyRate?: number;
        startDate?: string;
        endDate?: string;
      }>(req);

      const result = await listChauffeurs({
        viewer: { isGuest: true },
        filters: {
          minHourlyRate,
          maxHourlyRate,
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
