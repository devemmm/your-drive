import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { DbUser } from "../types";

export class OperatorRouteController {
  static list = catchAsync(async (req: Request, res: Response) => {
    const operatorId = (req.user as DbUser).id;
    const routes = await prisma.busRoute.findMany({
      where: { operatorId },
      include: { stops: { orderBy: { order: "asc" } } },
      orderBy: [{ originCity: "asc" }, { destCity: "asc" }],
    });
    res.json({ routes });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const operatorId = (req.user as DbUser).id;
    const { originCity, destCity, distanceKm, basePrice, isActive = true, stops = [] } = req.body;
    const route = await prisma.busRoute.create({
      data: {
        operatorId,
        originCity,
        destCity,
        distanceKm,
        basePrice,
        isActive,
        stops: {
          create: stops.map((s: any, i: number) => ({
            name: s.name,
            city: s.city,
            order: s.order ?? i,
            latitude: s.latitude,
            longitude: s.longitude,
          })),
        },
      },
      include: { stops: true },
    });
    res.status(201).json({ route });
  });

  static update = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const { originCity, destCity, distanceKm, basePrice, isActive } = req.body;
    const result = await prisma.busRoute.updateMany({
      where: { id, operatorId },
      data: { originCity, destCity, distanceKm, basePrice, isActive },
    });
    if (result.count === 0) return next(AppError("Route not found", 404));
    const route = await prisma.busRoute.findFirst({
      where: { id, operatorId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    res.json({ route });
  });

  static replaceStops = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const owned = await prisma.busRoute.findFirst({ where: { id, operatorId }, select: { id: true } });
    if (!owned) return next(AppError("Route not found", 404));
    const { stops } = req.body as {
      stops: { name: string; city: string; order: number; latitude?: number; longitude?: number }[];
    };
    await prisma.$transaction([
      prisma.busRouteStop.deleteMany({ where: { routeId: id } }),
      prisma.busRouteStop.createMany({ data: stops.map((s) => ({ ...s, routeId: id })) }),
    ]);
    const fresh = await prisma.busRoute.findFirst({
      where: { id, operatorId },
      include: { stops: { orderBy: { order: "asc" } } },
    });
    if (!fresh) return next(AppError("Route not found", 404));
    res.json({ route: fresh });
  });

  static delete_ = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const result = await prisma.busRoute.deleteMany({ where: { id, operatorId } });
    if (result.count === 0) return next(AppError("Route not found", 404));
    res.status(204).end();
  });
}
