import { body, param } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const noShowRequestBodyValidation = [
  body("userId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.userId_positive"))
    .escape()
    .toInt(),
  body("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
  body("reason")
    .isString()
    .isLength({ min: 5, max: 500 })
    .withMessage(validationMsg("validation.noshow_reason_length"))
    .escape(),
  body("reporterType")
    .isString()
    .withMessage(validationMsg("validation.reporter_type_string"))
    .trim()
    .toUpperCase()
    .notEmpty()
    .withMessage(validationMsg("validation.reporter_type_required"))
    .isIn(["DRIVER", "PASSENGER"])
    .withMessage(validationMsg("validation.reporter_type_invalid"))
    .escape(),
];

export const confirmNoShowValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.noShowId_positive"))
    .toInt(),
  body("reviewNotes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage(validationMsg("validation.review_notes_max")),
];

export const rejectNoShowValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.noShowId_positive"))
    .toInt(),
  body("reviewNotes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage(validationMsg("validation.review_notes_max")),
];
