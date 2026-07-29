import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { AppError } from "../utils/AppError";

export const isBusOperator = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role !== UserRole.BUS_OPERATOR) {
    return next(
      AppError(
        req.isEnglishPreferred
          ? "Access denied. Bus operator privileges required"
          : "Accès refusé. Privilèges d'opérateur de bus requis",
        403
      )
    );
  }
  next();
};
