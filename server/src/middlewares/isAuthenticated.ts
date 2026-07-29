import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { prisma } from "../config/database";
import { verifyToken } from "../utils/verifyToken";
import { Status } from "@prisma/client";

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const decoded = await verifyToken(req);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isDeleted: false },
      include: {
        profileImage: true,
        licenseImage: true,
        travelPreferences: true,
        licenseImages: {
          include: {
            frontImage: true,
            backImage: true,
          }
        }
      },
    });

    if (!user)
      return next(
        AppError(
          req.isEnglishPreferred ? "User not found" : "Utilisateur non trouvé",
          404
        )
      );

    if (user.status === Status.SUSPENDED) {
      return next(
        AppError(
          req.isEnglishPreferred
            ? "Your account has been suspended"
            : "Votre compte a été suspendu",
          403
        )
      );
    }

    req.user = user;
    next();
  } catch (error) {
    return next(
      AppError(
        req.isEnglishPreferred
          ? "Not authenticated. Please log in"
          : "Non authentifié. Veuillez vous connecter",
        401
      )
    );
  }
};
