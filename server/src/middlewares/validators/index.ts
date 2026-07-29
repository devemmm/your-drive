import { checkSchema, Schema, validationResult } from "express-validator";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { validationMsg } from "../../utils/validation";

const validateRequestBody = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(AppError(errors.array().map((err) => err.msg).join(", "), 400));
  }
  next();
};

export { validateRequestBody };

const paginationSchema: Schema = {
  page: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.page_positive_int"),
    },
    toInt: true,
  },
  pageSize: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.page_size_positive_int"),
    },
    toInt: true,
  },
};

export const validatePagination = checkSchema(paginationSchema);
