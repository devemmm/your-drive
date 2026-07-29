import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { Prisma, VehicleCategory, RideType } from "@prisma/client";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { estimateFare } from "../services/pricing.service";

export class PricingController {
  static list = catchAsync(async (_req: Request, res: Response) => {
    const rows = await prisma.pricingSettings.findMany({
      orderBy: [{ vehicleCategory: "asc" }, { rideType: "asc" }, { isActive: "desc" }],
    });
    return res.json({ status: true, data: rows });
  });

  static create = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const data = matchedData<{
      vehicleCategory: VehicleCategory;
      rideType: RideType;
      baseFare: number;
      perKm: number;
      perMinute: number;
      minimumFare: number;
      commissionPercent?: number;
      currency?: string;
    }>(req, { locations: ["body"] });

    try {
      const created = await prisma.pricingSettings.create({
        data: {
          vehicleCategory: data.vehicleCategory,
          rideType: data.rideType,
          baseFare: new Prisma.Decimal(data.baseFare),
          perKm: new Prisma.Decimal(data.perKm),
          perMinute: new Prisma.Decimal(data.perMinute),
          minimumFare: new Prisma.Decimal(data.minimumFare),
          commissionPercent: new Prisma.Decimal(data.commissionPercent ?? 10),
          currency: data.currency ?? "RWF",
        },
      });
      return res.status(201).json({ status: true, data: created });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return next(
          AppError(
            "An active pricing rule already exists for this category and ride type. Edit it or deactivate it first.",
            409,
          ),
        );
      }
      throw err;
    }
  });

  static update = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id, ...data } = matchedData<{
      id: number;
      baseFare?: number;
      perKm?: number;
      perMinute?: number;
      minimumFare?: number;
      commissionPercent?: number;
      currency?: string;
      isActive?: boolean;
    }>(req);

    const existing = await prisma.pricingSettings.findUnique({ where: { id } });
    if (!existing) return next(AppError("Pricing rule not found.", 404));

    const updated = await prisma.pricingSettings.update({
      where: { id },
      data: {
        baseFare: data.baseFare != null ? new Prisma.Decimal(data.baseFare) : undefined,
        perKm: data.perKm != null ? new Prisma.Decimal(data.perKm) : undefined,
        perMinute: data.perMinute != null ? new Prisma.Decimal(data.perMinute) : undefined,
        minimumFare: data.minimumFare != null ? new Prisma.Decimal(data.minimumFare) : undefined,
        commissionPercent: data.commissionPercent != null ? new Prisma.Decimal(data.commissionPercent) : undefined,
        currency: data.currency,
        isActive: data.isActive,
      },
    });
    return res.json({ status: true, data: updated });
  });

  static remove = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = matchedData<{ id: number }>(req, { locations: ["params"] });
    const existing = await prisma.pricingSettings.findUnique({ where: { id } });
    if (!existing) return next(AppError("Pricing rule not found.", 404));
    await prisma.pricingSettings.delete({ where: { id } });
    return res.status(204).send();
  });

  // GET /api/v1/public/fare-estimate?vehicleCategory=CAR&rideType=D2D&distanceKm=10&durationMin=20
  static estimate = catchAsync(async (req: Request, res: Response) => {
    const { vehicleCategory, rideType, distanceKm, durationMin } = matchedData<{
      vehicleCategory: VehicleCategory;
      rideType: RideType;
      distanceKm: number;
      durationMin: number;
    }>(req, { locations: ["query"] });

    const breakdown = await estimateFare({ vehicleCategory, rideType, distanceKm, durationMin });
    return res.json({ status: true, data: breakdown });
  });
}
