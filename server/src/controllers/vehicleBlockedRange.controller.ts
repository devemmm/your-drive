import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";

export class VehicleBlockedRangeController {
  // GET /admin/vehicles/:vehicleId/blocked-ranges
  static list = catchAsync(async (req: Request, res: Response) => {
    const { vehicleId } = matchedData<{ vehicleId: number }>(req, { locations: ["params"] });
    const ranges = await prisma.vehicleBlockedRange.findMany({
      where: { vehicleId },
      orderBy: { from: "asc" },
    });
    return res.json({ status: true, data: ranges });
  });

  // POST /admin/vehicles/:vehicleId/blocked-ranges  { from, to, reason? }
  static create = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { vehicleId, from, to, reason } = matchedData<{
      vehicleId: number;
      from: string;
      to: string;
      reason?: string;
    }>(req);

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (fromDate >= toDate) {
      return next(AppError("`to` must be after `from`.", 400));
    }

    try {
      const created = await prisma.vehicleBlockedRange.create({
        data: { vehicleId, from: fromDate, to: toDate, reason },
      });
      return res.status(201).json({ status: true, data: created });
    } catch (err) {
      // FK constraint failure → vehicle doesn't exist.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        return next(AppError("Vehicle not found.", 404));
      }
      throw err;
    }
  });

  // DELETE /admin/vehicles/:vehicleId/blocked-ranges/:rangeId
  static remove = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { vehicleId, rangeId } = matchedData<{ vehicleId: number; rangeId: number }>(req, {
      locations: ["params"],
    });
    const { count } = await prisma.vehicleBlockedRange.deleteMany({
      where: { id: rangeId, vehicleId },
    });
    if (count === 0) return next(AppError("Blocked range not found for this vehicle.", 404));
    return res.status(204).send();
  });
}
