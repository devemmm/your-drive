import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { DbUser } from "../types";

async function ownedRoute(operatorId: number, routeId: number) {
  return prisma.busRoute.findFirst({ where: { id: routeId, operatorId }, select: { id: true } });
}

export class OperatorDepartureController {
  static list = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const routeId = Number(req.params.routeId);
    if (!(await ownedRoute(operatorId, routeId))) return next(AppError("Route not found", 404));
    const departures = await prisma.busRouteDeparture.findMany({
      where: { routeId },
      include: { vehicle: { select: { id: true, make: true, model: true, plateNumber: true, capacity: true } } },
      orderBy: { timeOfDay: "asc" },
    });
    res.json({ departures });
  });

  static create = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const routeId = Number(req.params.routeId);
    if (!(await ownedRoute(operatorId, routeId))) return next(AppError("Route not found", 404));
    const { timeOfDay, vehicleId } = req.body as { timeOfDay: string; vehicleId: number };
    if (!/^\d{2}:\d{2}$/.test(timeOfDay || "")) return next(AppError("timeOfDay must be HH:mm", 400));
    const vehicle = await prisma.vehicle.findFirst({ where: { id: Number(vehicleId), userId: operatorId }, select: { id: true } });
    if (!vehicle) return next(AppError("Vehicle not found", 404));
    const departure = await prisma.busRouteDeparture.create({
      data: { routeId, timeOfDay, vehicleId: Number(vehicleId) },
    });
    res.status(201).json({ departure });
  });

  static update = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const dep = await prisma.busRouteDeparture.findFirst({
      where: { id, route: { operatorId } }, select: { id: true },
    });
    if (!dep) return next(AppError("Departure not found", 404));
    const { timeOfDay, vehicleId, isActive } = req.body as { timeOfDay?: string; vehicleId?: number; isActive?: boolean };
    if (timeOfDay !== undefined && !/^\d{2}:\d{2}$/.test(timeOfDay)) return next(AppError("timeOfDay must be HH:mm", 400));
    if (vehicleId !== undefined) {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: Number(vehicleId), userId: operatorId }, select: { id: true } });
      if (!vehicle) return next(AppError("Vehicle not found", 404));
    }
    const departure = await prisma.busRouteDeparture.update({
      where: { id },
      data: {
        ...(timeOfDay !== undefined ? { timeOfDay } : {}),
        ...(vehicleId !== undefined ? { vehicleId: Number(vehicleId) } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    res.json({ departure });
  });

  static delete_ = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const operatorId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const dep = await prisma.busRouteDeparture.findFirst({
      where: { id, route: { operatorId } }, select: { id: true },
    });
    if (!dep) return next(AppError("Departure not found", 404));
    await prisma.busRouteDeparture.delete({ where: { id } });
    res.status(204).end();
  });
}
