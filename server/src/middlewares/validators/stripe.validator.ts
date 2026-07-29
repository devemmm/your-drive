import { query } from "express-validator";
import { validationMsg } from "../../utils/validation";// adjust path as needed
import { Platforms } from '../../types/index';

export const connectStripeValidator = [
  query("platform")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.platform_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.platform_not_empty"))
    .isIn(Object.values(Platforms))
    .withMessage(validationMsg("validation.platform_invalid", {
      values: Object.values(Platforms).join(", ")
    })),
  query("redirect_pathname")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.redirect_pathname_string")),
];
