import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { DbUser } from "../types";
import { createBusRide } from "../services/busRide.service";

export class OperatorTripController {
  static list = catchAsync(async (req: Request, res: Response) => {
    const driverId = (req.user as DbUser).id;
    const trips = await prisma.ride.findMany({
      where: { driverId, routeId: { not: null }, isDeleted: false },
      include: {
        route: { select: { id: true, originCity: true, destCity: true, basePrice: true } },
        vehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
      },
      orderBy: { departureTime: "desc" },
    });
    res.json({ trips });
  });

  static create = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = (req.user as DbUser).id;
    const { routeId, vehicleId, departureTime, availableSeats } = req.body as {
      routeId: number; vehicleId: number; departureTime: string; availableSeats: number;
    };

    const vehicle = await prisma.vehicle.findFirst({ where: { id: Number(vehicleId), userId: driverId } });
    if (!vehicle) return next(AppError("Vehicle not found", 404));

    const seats = Number(availableSeats);
    if (!Number.isInteger(seats) || seats <= 0) return next(AppError("availableSeats must be a positive integer", 400));

    try {
      const ride = await createBusRide({
        operatorId: driverId, routeId: Number(routeId), vehicleId: Number(vehicleId),
        departureTime: new Date(departureTime), seats,
      });
      res.status(201).json({ trip: ride });
    } catch (e) {
      if (e instanceof Error && e.message === "ROUTE_NOT_FOUND") return next(AppError("Route not found", 404));
      throw e;
    }
  });

  static manifest = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const trip = await prisma.ride.findFirst({ where: { id, driverId }, select: { id: true } });
    if (!trip) return next(AppError("Trip not found", 404));

    const bookings = await prisma.booking.findMany({
      where: { rideId: id },
      include: {
        booker: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        bookingSeats: { select: { attendanceCode: true, attendedAt: true } },
        boardingStop: { select: { name: true, city: true } },
        alightingStop: { select: { name: true, city: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ manifest: bookings });
  });

  static swapBus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = (req.user as DbUser).id;
    const id = Number(req.params.id);
    const { vehicleId } = req.body as { vehicleId: number };
    const trip = await prisma.ride.findFirst({ where: { id, driverId }, select: { id: true } });
    if (!trip) return next(AppError("Trip not found", 404));
    const vehicle = await prisma.vehicle.findFirst({ where: { id: Number(vehicleId), userId: driverId }, select: { id: true } });
    if (!vehicle) return next(AppError("Vehicle not found", 404));
    const updated = await prisma.ride.update({
      where: { id },
      data: { vehicleId: Number(vehicleId) },
      include: {
        route: { select: { id: true, originCity: true, destCity: true } },
        vehicle: { select: { id: true, make: true, model: true, plateNumber: true } },
      },
    });
    res.json({ trip: updated });
  });
}
