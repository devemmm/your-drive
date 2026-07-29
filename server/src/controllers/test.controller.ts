import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { RideStatus } from "@prisma/client";

export class TestController {
  static getOtp = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const phone = (req.query.phone as string | undefined)?.trim();
    const email = (req.query.email as string | undefined)?.trim();

    if (!phone && !email) {
      return next(AppError("phone or email query param is required", 400));
    }

    const where = phone
      ? { phoneNumber: phone, isDeleted: false }
      : { email: email!, isDeleted: false };

    const user = await prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        verificationCode: true,
        verificationCodeExpiresAt: true,
        phoneVerificationCode: true,
        phoneVerificationCodeExpiresAt: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

    if (!user) {
      return next(AppError("User not found", 404));
    }

    return res.json({ success: true, data: user });
  });

  static verifyUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return next(AppError("Invalid user id", 400));

    const user = await prisma.user.update({
      where: { id },
      data: {
        isVerified: true,
        isPhoneVerified: true,
        isOnboarded: true,
        isPassengerOnboarded: true,
        isDriverOnboarded: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
        phoneVerificationCode: null,
        phoneVerificationCodeExpiresAt: null,
      },
      select: { id: true, email: true, isVerified: true, isOnboarded: true },
    });

    return res.json({ success: true, data: user });
  });

  static setRideStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: RideStatus };

    if (!Number.isFinite(id)) return next(AppError("Invalid ride id", 400));
    if (!status || !(status in RideStatus)) {
      return next(AppError(`status must be one of ${Object.keys(RideStatus).join(", ")}`, 400));
    }

    // Mirror production transition side-effects:
    // - COMPLETED: cascade booking status, set completedAt (ride.controller.ts:1907)
    // - ONGOING:   set startedAt
    const ride = await prisma.ride.update({
      where: { id },
      data: {
        status,
        ...(status === RideStatus.COMPLETED && {
          completedAt: new Date(),
          bookings: {
            updateMany: {
              where: { status: "APPROVED", rideId: id },
              data: { status: "COMPLETED" },
            },
          },
        }),
        ...(status === RideStatus.ONGOING && { startedAt: new Date() }),
      },
      select: { id: true, status: true },
    });

    return res.json({ success: true, data: ride });
  });

  static reset = catchAsync(async (_req: Request, res: Response) => {
    const { seedTestFixtures } = await import("../services/testSeed.service");
    const fixtures = await seedTestFixtures();
    return res.json({ success: true, data: fixtures });
  });

  static getUserByEmail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const email = req.params.email?.trim();
    if (!email) return next(AppError("email param is required", 400));

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        receivedReferral: {
          select: { inviterId: true },
        },
        createdAt: true,
      },
    });

    if (!user) return next(AppError("User not found", 404));

    return res.json({ success: true, data: user });
  });

  static approveBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return next(AppError("Invalid booking id", 400));
    // Mirror booking.controller.ts:420 — production approveBooking creates
    // one BookingSeat per booked seat on approval. The board puppet looks up
    // a seat by bookingId, so without this the boarding step would 404.
    const existing = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, seats: true, rideId: true, bookingSeats: { select: { id: true } } },
    });
    if (!existing) return next(AppError("Booking not found", 404));
    const needSeats = existing.bookingSeats.length === 0;
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: "APPROVED",
        ...(needSeats && {
          bookingSeats: {
            create: Array.from({ length: existing.seats }).map(() => ({
              attendanceCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
              rideId: existing.rideId,
            })),
          },
        }),
      },
      select: { id: true, status: true, rideId: true, userId: true },
    });
    return res.json({ success: true, data: booking });
  });

  static boardBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return next(AppError("Invalid booking id", 400));
    const seat = await prisma.bookingSeat.findFirst({
      where: { bookingId: id, isExpired: false, attendedAt: null },
      select: { id: true },
    });
    if (!seat) return next(AppError("No bookable seat found for booking", 404));
    const updated = await prisma.bookingSeat.update({
      where: { id: seat.id },
      data: { attendedAt: new Date() },
      select: { id: true, bookingId: true, attendanceCode: true, attendedAt: true },
    });
    return res.json({ success: true, data: updated });
  });

  static bookRideAsPassenger = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId = Number(req.params.id);
    const { passengerId, seats } = req.body as { passengerId?: number; seats?: number };
    const seatsToBook = Number.isFinite(seats) && (seats as number) > 0 ? Number(seats) : 1;
    if (!Number.isFinite(rideId)) return next(AppError("Invalid ride id", 400));
    if (!Number.isFinite(Number(passengerId))) return next(AppError("passengerId required", 400));

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { id: true, vehicleId: true, availableSeats: true },
    });
    if (!ride) return next(AppError("Ride not found", 404));

    const attendanceCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    // Don't decrement availableSeats here — production approveBooking
    // (booking.controller.ts) decrements on approval. Pre-decrementing
    // would double-debit and fail the "Not enough seats" check.
    // Don't create BookingSeat here either — production approveBooking
    // creates the seats. The test approveBooking endpoint also creates
    // them if missing, matching the production path.
    const booking = await prisma.booking.create({
      data: {
        rideId,
        vehicleId: ride.vehicleId,
        userId: Number(passengerId),
        seats: seatsToBook,
        status: "PENDING",
      },
      select: { id: true, rideId: true, userId: true, status: true },
    });
    return res.json({ success: true, data: { ...booking, attendanceCode } });
  });

  static getLatestRideForDriver = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const driverId = Number(req.params.id);
    if (!Number.isFinite(driverId)) return next(AppError("Invalid user id", 400));
    const ride = await prisma.ride.findFirst({
      where: { driverId, status: "PUBLISHED", isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, departureTime: true, status: true },
    });
    if (!ride) return next(AppError("No published ride found for driver", 404));
    return res.json({ success: true, data: { rideId: ride.id, departureTime: ride.departureTime, status: ride.status } });
  });

  static getBookingForPassenger = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const rideId = Number(req.params.rideId);
    const passengerId = Number(req.params.passengerId);
    if (!Number.isFinite(rideId) || !Number.isFinite(passengerId)) {
      return next(AppError("Invalid ride or passenger id", 400));
    }
    const booking = await prisma.booking.findFirst({
      where: { rideId, userId: passengerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        seats: true,
        bookingSeats: { select: { attendanceCode: true } },
      },
    });
    if (!booking) return next(AppError("No booking found for ride+passenger", 404));
    return res.json({
      success: true,
      data: {
        bookingId: booking.id,
        status: booking.status,
        seats: booking.seats,
        attendanceCode: booking.bookingSeats[0]?.attendanceCode ?? null,
        attendanceCodes: booking.bookingSeats.map((s) => s.attendanceCode),
      },
    });
  });
}
