import { body, param } from "express-validator";

export const submitBidValidator = [
  param("id").isInt({ min: 1 }).toInt(),
  body("amount").isFloat({ gt: 0 }).toFloat(),
  body("vehicleId").isInt({ min: 1 }).toInt(),
];

export const bidIdParamValidator = [
  param("id").isInt({ min: 1 }).toInt(),
];
