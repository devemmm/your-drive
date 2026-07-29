import { body, param, query } from "express-validator";

const VEHICLE_CATEGORIES = ["CAR", "MOTORBIKE", "BUS"] as const;
const RIDE_TYPES = ["P2P", "D2D"] as const;

export const createPricingValidator = [
  body("vehicleCategory").isIn(VEHICLE_CATEGORIES),
  body("rideType").isIn(RIDE_TYPES),
  body("baseFare").isFloat({ min: 0 }).toFloat(),
  body("perKm").isFloat({ min: 0 }).toFloat(),
  body("perMinute").isFloat({ min: 0 }).toFloat(),
  body("minimumFare").isFloat({ min: 0 }).toFloat(),
  body("commissionPercent").optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body("currency").optional().isString().isLength({ min: 3, max: 3 }),
];

export const updatePricingValidator = [
  param("id").isInt({ gt: 0 }).toInt(),
  body("baseFare").optional().isFloat({ min: 0 }).toFloat(),
  body("perKm").optional().isFloat({ min: 0 }).toFloat(),
  body("perMinute").optional().isFloat({ min: 0 }).toFloat(),
  body("minimumFare").optional().isFloat({ min: 0 }).toFloat(),
  body("commissionPercent").optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body("currency").optional().isString().isLength({ min: 3, max: 3 }),
  body("isActive").optional().isBoolean().toBoolean(),
];

export const deletePricingValidator = [
  param("id").isInt({ gt: 0 }).toInt(),
];

export const fareEstimateValidator = [
  query("vehicleCategory").isIn(VEHICLE_CATEGORIES),
  query("rideType").isIn(RIDE_TYPES),
  query("distanceKm").isFloat({ min: 0, max: 10000 }).toFloat(),
  query("durationMin").isFloat({ min: 0, max: 1440 }).toFloat(),
];
