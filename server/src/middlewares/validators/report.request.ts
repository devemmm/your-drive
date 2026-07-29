import { body, param, query } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const createReportValidator = [
  body("rideId").optional({ nullable: true }).isInt({ gt: 0 }).toInt(),
  body("chauffeurServiceId").optional({ nullable: true }).isInt({ gt: 0 }).toInt(),
  body("rentalId").optional({ nullable: true }).isInt({ gt: 0 }).toInt(),
  body("subjectUserId")
    .exists()
    .withMessage(validationMsg("validation.userId_required"))
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.userId_positive"))
    .toInt(),
  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage(validationMsg("validation.report_reason_length")),
];

export const listReportsValidator = [
  query("page").optional().isInt({ gt: 0 }).toInt(),
  query("pageSize").optional().isInt({ gt: 0, max: 100 }).toInt(),
  query("status").optional().isIn(["OPEN", "REVIEWED", "DISMISSED"]),
  query("target").optional().isIn(["RIDE", "CHAUFFEUR", "RENTAL"]),
];

export const updateReportValidator = [
  param("id").isInt({ gt: 0 }).toInt(),
  body("status").isIn(["REVIEWED", "DISMISSED"]),
  body("reviewNotes").optional().isString().isLength({ max: 1000 }),
];
