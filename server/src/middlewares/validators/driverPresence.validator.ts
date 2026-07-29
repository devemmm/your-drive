import { body, query } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const upsertPresenceValidator = [
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage(validationMsg("validation.latitude_invalid")),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage(validationMsg("validation.longitude_invalid")),
  body("accuracy")
    .optional()
    .isFloat({ min: 0, max: 100000 })
    .withMessage(validationMsg("validation.accuracy_invalid")),
  body("currentVehicleId")
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.currentVehicleId_required_and_invalid")),
];

export const nearbyValidator = [
  query("swLat")
    .isFloat({ min: -90, max: 90 })
    .withMessage(validationMsg("validation.swLat_invalid"))
    .toFloat(),
  query("swLng")
    .isFloat({ min: -180, max: 180 })
    .withMessage(validationMsg("validation.swLng_invalid"))
    .toFloat(),
  query("neLat")
    .isFloat({ min: -90, max: 90 })
    .withMessage(validationMsg("validation.neLat_invalid"))
    .toFloat(),
  query("neLng")
    .isFloat({ min: -180, max: 180 })
    .withMessage(validationMsg("validation.neLng_invalid"))
    .toFloat(),
];
