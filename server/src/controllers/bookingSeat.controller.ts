import { Request, Response } from "express";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";

export class BookingSeatController {
  static attendByCode = catchAsync(async (req: Request, res: Response) => {
    const { attendanceCode, rideId } = req.body as { attendanceCode: string; rideId: number };
    if (!attendanceCode) return res.status(400).json({ error: "ATTENDANCE_CODE_REQUIRED" });
    const driverId = (req.user as any).id;
    const ride = await prisma.ride.findUniqueOrThrow({
      where: { id: rideId },
      select: { id: true, driverId: true, status: true },
    });
    if (ride.driverId !== driverId) return res.status(403).json({ error: "NOT_RIDE_DRIVER" });

    const seat = await prisma.bookingSeat.findUnique({
      where: { attendanceCode },
      include: { booking: true },
    });
    if (!seat || seat.rideId !== rideId) return res.status(404).json({ error: "SEAT_NOT_FOUND" });
    if (seat.attendedAt) return res.status(409).json({ error: "ALREADY_ATTENDED", attendedAt: seat.attendedAt });
    if (seat.isExpired) return res.status(410).json({ error: "SEAT_EXPIRED" });

    const updated = await prisma.bookingSeat.update({
      where: { id: seat.id },
      data: { attendedAt: new Date() },
    });
    res.json({ seat: updated });
  });
}
