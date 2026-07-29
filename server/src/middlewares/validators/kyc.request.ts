import { body, param, query } from "express-validator";

export const listKycValidator = [
  query("page").optional().isInt({ gt: 0 }).toInt(),
  query("pageSize").optional().isInt({ gt: 0, max: 100 }).toInt(),
  query("status").optional().isIn(["PENDING", "APPROVED", "REJECTED"]),
];

export const reviewKycValidator = [
  param("id").isInt({ gt: 0 }).toInt(),
  body("status").isIn(["APPROVED", "REJECTED"]),
  body("reviewNotes").optional().isString().isLength({ max: 1000 }),
];
