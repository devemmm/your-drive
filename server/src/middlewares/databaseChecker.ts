import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

export const checkDatabaseConnection = async (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    next();
  } catch (error) {
    logger.error("Database connection error:", error);
    next(AppError("Database connection error", 503));
  }
};
