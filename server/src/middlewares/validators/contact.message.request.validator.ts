import { body } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const createContactMessageValidator = [
  body("name")
    .notEmpty()
    .withMessage(validationMsg("validation.name_required")),
  body("email")
    .isEmail()
    .withMessage(validationMsg("validation.email_required")),
  body("phoneNumber")
    .optional()
    .isString()
    .customSanitizer((value) => value.replace(/\s+/g, "")),
  body("subject")
    .notEmpty()
    .withMessage(validationMsg("validation.subject_required")),
  body("message")
    .notEmpty()
    .withMessage(validationMsg("validation.message_required"))
    .isLength({ max: 200 })
    .withMessage(validationMsg("validation.message_max")),
];
