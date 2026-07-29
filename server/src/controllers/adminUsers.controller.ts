import { NextFunction, Request, Response } from "express";
import { matchedData } from "express-validator";
import bcrypt from "bcryptjs";
import { KycStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/database";
import { catchAsync } from "../utils/CatchAsync";
import { AppError } from "../utils/AppError";
import { profileSelects } from "../types";
import { generateReferralCode } from "../utils/generateReferralCode";
import { logger } from "../utils/logger";

export class AdminUsersController {
  // POST /admin/users  { email, phoneNumber?, firstName, lastName?, password?, role? }
  static createUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const isEN = req.isEnglishPreferred;
    const { email, phoneNumber, firstName, lastName, password, role } = matchedData<{
      email: string;
      phoneNumber?: string;
      firstName: string;
      lastName?: string;
      password?: string;
      role?: UserRole;
    }>(req, { locations: ["body"] });

    const conflicts = await prisma.user.findMany({
      where: {
        OR: [{ email }, ...(phoneNumber ? [{ phoneNumber }] : [])],
        isDeleted: false,
      },
      select: { email: true, phoneNumber: true },
    });
    if (conflicts.some((c) => c.email === email)) {
      return next(AppError(isEN ? "Email already registered." : "Email déjà enregistré.", 409));
    }
    if (phoneNumber && conflicts.some((c) => c.phoneNumber === phoneNumber)) {
      return next(AppError(isEN ? "Phone number already in use." : "Téléphone déjà utilisé.", 409));
    }

    const tempPassword = password ?? `YD-${Math.random().toString(36).slice(2, 10)}!`;
    const [hashed, referralCode] = await Promise.all([
      bcrypt.hash(tempPassword, 10),
      generateReferralCode(),
    ]);

    try {
      const created = await prisma.user.create({
        data: {
          email,
          phoneNumber,
          firstName,
          lastName,
          password: hashed,
          role: role ?? UserRole.USER,
          isEmailVerified: true,
          isPhoneVerified: !!phoneNumber,
          isVerified: true,
          referralCode,
          kycStatus: KycStatus.APPROVED,
        },
        select: profileSelects,
      });

      logger.info("Admin created user", {
        action: "ADMIN_CREATE_USER",
        userId: req.user?.id,
        meta: { newUserId: created.id, role: role ?? "USER", email },
      });

      return res.status(201).json({
        status: true,
        data: { user: created, tempPassword: password ? undefined : tempPassword },
        message: isEN ? "User created." : "Utilisateur créé.",
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return next(AppError(isEN ? "User already exists." : "Utilisateur existe déjà.", 409));
      }
      throw err;
    }
  });
}
