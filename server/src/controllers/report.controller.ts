import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { ReportStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { logger, LogLevel } from "../utils/logger";
import { NotificationServices } from "../services/notification.service";
import { profileSelects } from "../types/index";
import {
  assertNotSelfReport,
  ReportTargetType,
  ReportValidationError,
  selectReportTarget,
} from "../services/report.service";

const reportInclude = {
  reporter: { select: profileSelects },
  subject: { select: profileSelects },
  reviewedBy: { select: profileSelects },
  ride: { include: { departureLocation: true, destinationLocation: true } },
  chauffeurService: { include: { pickupLocation: true, dropoffLocation: true } },
  rental: { include: { pickupLocation: true, returnLocation: true } },
} as const;

async function fetchTripParticipants(
  target: ReportTargetType,
  ids: { rideId: number | null; chauffeurServiceId: number | null; rentalId: number | null },
): Promise<{ participants: Set<number>; exists: boolean } | null> {
  if (target === "RIDE" && ids.rideId) {
    const ride = await prisma.ride.findUnique({
      where: { id: ids.rideId, isDeleted: false },
      select: {
        driverId: true,
        bookings: { select: { userId: true } },
        d2dBookingRequests: { select: { passengerId: true } },
      },
    });
    if (!ride) return null;
    const participants = new Set<number>([ride.driverId]);
    ride.bookings.forEach((b) => participants.add(b.userId));
    ride.d2dBookingRequests.forEach((d) => participants.add(d.passengerId));
    return { participants, exists: true };
  }
  if (target === "CHAUFFEUR" && ids.chauffeurServiceId) {
    const svc = await prisma.chauffeurService.findUnique({
      where: { id: ids.chauffeurServiceId },
      select: { driverId: true, passengerId: true },
    });
    if (!svc) return null;
    return { participants: new Set([svc.driverId, svc.passengerId]), exists: true };
  }
  if (target === "RENTAL" && ids.rentalId) {
    const rental = await prisma.carRental.findUnique({
      where: { id: ids.rentalId },
      select: { ownerId: true, renterId: true },
    });
    if (!rental) return null;
    return { participants: new Set([rental.ownerId, rental.renterId]), exists: true };
  }
  return null;
}

export class ReportController {
  static createReport = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const reporter = req.user!;
      if (reporter.role === "ADMIN") {
        return next(
          AppError(
            isEN ? "Admins cannot file reports." : "Les administrateurs ne peuvent pas déposer de signalements.",
            403,
          ),
        );
      }

      const data = matchedData<{
        rideId?: number | null;
        chauffeurServiceId?: number | null;
        rentalId?: number | null;
        subjectUserId: number;
        reason: string;
      }>(req, { locations: ["body"] });

      const ids = {
        rideId: data.rideId ?? null,
        chauffeurServiceId: data.chauffeurServiceId ?? null,
        rentalId: data.rentalId ?? null,
      };

      let target: ReportTargetType;
      try {
        target = selectReportTarget(ids);
        assertNotSelfReport(reporter.id, data.subjectUserId);
      } catch (err) {
        if (err instanceof ReportValidationError) {
          return next(AppError(err.message, 400));
        }
        throw err;
      }

      const trip = await fetchTripParticipants(target, ids);
      if (!trip) {
        return next(AppError(isEN ? "Trip not found." : "Trajet introuvable.", 404));
      }
      if (!trip.participants.has(reporter.id)) {
        return next(
          AppError(
            isEN
              ? "You are not a participant in this trip."
              : "Vous n'êtes pas un participant de ce trajet.",
            403,
          ),
        );
      }
      if (!trip.participants.has(data.subjectUserId)) {
        return next(
          AppError(
            isEN
              ? "The reported user is not part of this trip."
              : "L'utilisateur signalé ne fait pas partie de ce trajet.",
            400,
          ),
        );
      }

      const report = await prisma.rideReport.create({
        data: {
          rideId: ids.rideId,
          chauffeurServiceId: ids.chauffeurServiceId,
          rentalId: ids.rentalId,
          reporterId: reporter.id,
          subjectUserId: data.subjectUserId,
          reason: data.reason,
        },
        include: reportInclude,
      });

      // Notify admins in-app (email is currently disabled in this codebase)
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isDeleted: false },
        select: { id: true },
      });
      if (admins.length > 0) {
        await NotificationServices.notifyUsers({
          userIds: admins.map((a) => a.id),
          titleEn: "New trip report",
          titleFr: "Nouveau signalement de trajet",
          messageEn: `${reporter.firstName ?? "A user"} reported a ${target.toLowerCase()} trip. Please review.`,
          messageFr: `${reporter.firstName ?? "Un utilisateur"} a signalé un trajet (${target.toLowerCase()}). Veuillez examiner.`,
          rideId: ids.rideId ?? undefined,
        });
      }

      logger.warn("Trip report filed", {
        action: "REPORT_TRIP",
        userId: reporter.id,
        meta: {
          reportId: report.id,
          target,
          rideId: ids.rideId,
          chauffeurServiceId: ids.chauffeurServiceId,
          rentalId: ids.rentalId,
          subjectUserId: data.subjectUserId,
          date: new Date().toISOString(),
        },
      });

      return res.status(201).json({
        status: true,
        message: isEN ? "Report submitted." : "Signalement envoyé.",
        data: report,
      });
    },
  );

  static listReports = catchAsync(
    async (req: Request, res: Response) => {
      const isEN = req.isEnglishPreferred;
      const {
        page = 1,
        pageSize = 20,
        status,
        target,
      } = matchedData<{
        page?: number;
        pageSize?: number;
        status?: ReportStatus;
        target?: ReportTargetType;
      }>(req, { locations: ["query"] });

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (target === "RIDE") where.rideId = { not: null };
      else if (target === "CHAUFFEUR") where.chauffeurServiceId = { not: null };
      else if (target === "RENTAL") where.rentalId = { not: null };

      const [reports, total] = await prisma.$transaction([
        prisma.rideReport.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: "desc" }],
          include: reportInclude,
        }),
        prisma.rideReport.count({ where }),
      ]);

      return res.status(200).json({
        status: true,
        message: isEN ? "Reports retrieved." : "Signalements récupérés.",
        data: reports,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    },
  );

  static updateReport = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const isEN = req.isEnglishPreferred;
      const { id, status, reviewNotes } = matchedData<{
        id: number;
        status: "REVIEWED" | "DISMISSED";
        reviewNotes?: string;
      }>(req);

      const existing = await prisma.rideReport.findUnique({ where: { id } });
      if (!existing) {
        return next(AppError(isEN ? "Report not found." : "Signalement introuvable.", 404));
      }
      if (existing.status !== "OPEN") {
        return next(
          AppError(
            isEN
              ? "This report has already been actioned."
              : "Ce signalement a déjà été traité.",
            400,
          ),
        );
      }

      const updated = await prisma.rideReport.update({
        where: { id },
        data: {
          status,
          reviewNotes,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
        include: reportInclude,
      });

      logger.info("Trip report actioned", {
        action: "REPORT_TRIP_ACTIONED",
        userId: req.user?.id,
        meta: { reportId: id, newStatus: status, date: new Date().toISOString() },
      });

      return res.status(200).json({
        status: true,
        message: isEN ? "Report updated." : "Signalement mis à jour.",
        data: updated,
      });
    },
  );
}
