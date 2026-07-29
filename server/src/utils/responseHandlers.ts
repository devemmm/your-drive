import {  Prisma, } from "@prisma/client";
import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import multer from "multer";
import { CustomError } from "../types/customError";
import { logger,LogLevel } from "./logger";

export const errorResponse: ErrorRequestHandler = async (
  err: CustomError | multer.MulterError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  let statusCode = 500;
  let message = "Internal server error | Erreur interne du serveur";

  if (err instanceof multer.MulterError) {
    statusCode = 422;
    message = err.message;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const field = Array.isArray(err.meta?.target) ? err.meta?.target[0] : undefined;
        statusCode = 409;
        message = field
          ? `The ${field} provided is already used. Please use a different value. | Le ${field} fourni est déjà utilisé. Veuillez utiliser une valeur différente.`
          : "This information is already in use. Please use a different value. | Cette information est déjà utilisée. Veuillez utiliser une valeur différente.";
        break;
      }
      case "P2014":
        statusCode = 400;
        message = "Operation failed due to an internal relation error. | L'opération a échoué en raison d'une erreur interne de relation.";
        break;
      case "P2025":
        statusCode = 404;
        message = "We couldn't find what you were looking for. | Nous n'avons pas pu trouver ce que vous cherchiez.";
        break;
      default:
        statusCode = 400;
        message = "An unexpected database error occurred. Please try again later. | Une erreur de base de données inattendue est survenue. Veuillez réessayer plus tard.";
        break;
    }
  } else if (err && typeof err === "object" && "status" in err) {
    statusCode = err.status || 500;
    message = err.message || message;
  }

  // Log the error
  const errorResponseLog = {
    level: LogLevel.ERROR,
    message: err?.message || "An error occurred | Une erreur s'est produite",
    action: "ErrorResponse",
    meta: {
      stack: err?.stack,
    },
  };
  logger.error(errorResponseLog);
  
  res.status(statusCode).json({
    success: false,
    message,
  });
};
