import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/CatchAsync";

export const isAccountOwnerOrAdmin = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const isAdmin = req.user?.role === UserRole.ADMIN;
    const isOwner = req.user?.id === +id;

    if (!isAdmin && !isOwner) {
      return next(AppError("You are not allowed to access this resource", 401));
    }

    next();
  }
);
