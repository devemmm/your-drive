import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import { KycStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { profileSelects, fileSelects } from "../types";
import { logger, LogLevel } from "../utils/logger";

const userKycInclude = {
  licenseImage: { select: fileSelects },
  licenseImages: {
    include: {
      frontImage: { select: fileSelects },
      backImage: { select: fileSelects },
    },
  },
  profileImage: { select: fileSelects },
};

const vehicleKycInclude = {
  user: { select: profileSelects },
  files: { select: fileSelects },
  defaultImage: { select: fileSelects },
  kycReviewedBy: { select: profileSelects },
};

export class KycController {
  // GET /admin/kyc/users?status=PENDING&page=&pageSize=
  static listUserKyc = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 20, status } = matchedData<{
      page?: number;
      pageSize?: number;
      status?: KycStatus;
    }>(req, { locations: ["query"] });

    const where: Record<string, unknown> = { isDeleted: false };
    if (status) where.kycStatus = status;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ kycReviewedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
        select: {
          ...profileSelects,
          kycStatus: true,
          kycReviewedAt: true,
          kycReviewNotes: true,
          isDriverOnboarded: true,
          licenseNumber: true,
          drivingExperience: true,
          createdAt: true,
          licenseImage: userKycInclude.licenseImage,
          licenseImages: userKycInclude.licenseImages,
          profileImage: userKycInclude.profileImage,
          kycReviewedBy: { select: profileSelects },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      status: true,
      data: users,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  });

  // GET /admin/kyc/vehicles?status=PENDING
  static listVehicleKyc = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 20, status } = matchedData<{
      page?: number;
      pageSize?: number;
      status?: KycStatus;
    }>(req, { locations: ["query"] });

    const where: Record<string, unknown> = {};
    if (status) where.kycStatus = status;

    const [vehicles, total] = await prisma.$transaction([
      prisma.vehicle.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ kycReviewedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
        include: vehicleKycInclude,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return res.json({
      status: true,
      data: vehicles,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  });

  // PATCH /admin/kyc/users/:id   { status: "APPROVED" | "REJECTED", reviewNotes? }
  static reviewUserKyc = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const isEN = req.isEnglishPreferred;
    const { id, status, reviewNotes } = matchedData<{
      id: number;
      status: "APPROVED" | "REJECTED";
      reviewNotes?: string;
    }>(req);

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, kycStatus: true } });
    if (!existing) return next(AppError(isEN ? "User not found." : "Utilisateur introuvable.", 404));

    const updated = await prisma.user.update({
      where: { id },
      data: {
        kycStatus: status,
        kycReviewNotes: reviewNotes,
        kycReviewedById: req.user!.id,
        kycReviewedAt: new Date(),
      },
      select: { ...profileSelects, kycStatus: true, kycReviewedAt: true, kycReviewNotes: true },
    });

    logger.info("Driver KYC reviewed", {
      action: "KYC_USER_REVIEW",
      userId: req.user?.id,
      meta: { subjectUserId: id, newStatus: status, prev: existing.kycStatus },
    });

    return res.json({ status: true, message: isEN ? "Driver KYC updated." : "KYC du conducteur mis à jour.", data: updated });
  });

  // PATCH /admin/kyc/vehicles/:id   { status, reviewNotes? }
  static reviewVehicleKyc = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const isEN = req.isEnglishPreferred;
    const { id, status, reviewNotes } = matchedData<{
      id: number;
      status: "APPROVED" | "REJECTED";
      reviewNotes?: string;
    }>(req);

    const existing = await prisma.vehicle.findUnique({ where: { id }, select: { id: true, kycStatus: true } });
    if (!existing) return next(AppError(isEN ? "Vehicle not found." : "Véhicule introuvable.", 404));

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        kycStatus: status,
        kycReviewNotes: reviewNotes,
        kycReviewedById: req.user!.id,
        kycReviewedAt: new Date(),
      },
      include: vehicleKycInclude,
    });

    logger.info("Vehicle KYC reviewed", {
      action: "KYC_VEHICLE_REVIEW",
      userId: req.user?.id,
      meta: { vehicleId: id, newStatus: status, prev: existing.kycStatus },
    });

    return res.json({ status: true, message: isEN ? "Vehicle KYC updated." : "KYC du véhicule mis à jour.", data: updated });
  });
}
