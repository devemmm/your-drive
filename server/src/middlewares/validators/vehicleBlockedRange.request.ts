import { body, param } from "express-validator";

export const blockedRangeIdParams = [
  param("vehicleId").isInt({ gt: 0 }).toInt(),
  param("rangeId").optional().isInt({ gt: 0 }).toInt(),
];

export const createBlockedRangeValidator = [
  param("vehicleId").isInt({ gt: 0 }).toInt(),
  body("from").isISO8601().toDate(),
  body("to").isISO8601().toDate(),
  body("reason").optional().isString().isLength({ max: 500 }),
];
