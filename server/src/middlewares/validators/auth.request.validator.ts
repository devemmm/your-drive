import { UserRole } from "@prisma/client";
import { body, query } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const loginRequestBodyValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage(validationMsg("validation.email_required")),
  body("password")
    .notEmpty()
    .withMessage(validationMsg("validation.password_required")),
  body("role")
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage(
      validationMsg("validation.role_invalid", {
        roles: Object.values(UserRole).join(", "),
      })
    ),
];

export const registerRequestBodyValidator = [
  body("firstName")
    .isString()
    .withMessage(validationMsg("validation.firstName_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.firstName_required"))
    .isLength({ min: 2, max: 50 })
    .withMessage(validationMsg("validation.firstName_length"))
    .matches(/^[\p{L}][\p{L}' -]{1,49}$/u)
    .withMessage(validationMsg("validation.firstName_format")),

  body("lastName")
    .isString()
    .withMessage(validationMsg("validation.lastName_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.lastName_required"))
    .isLength({ min: 2, max: 50 })
    .withMessage(validationMsg("validation.lastName_length"))
    .matches(/^[\p{L}][\p{L}' -]{1,49}$/u)
    .withMessage(validationMsg("validation.lastName_format")),

  body("email")
    .trim()
    .isEmail()
    .withMessage(validationMsg("validation.email_required")),

  body("password")
    .notEmpty()
    .withMessage(validationMsg("validation.password_required"))
    .isLength({ min: 8 })
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[A-Z]/)
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[a-z]/)
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[0-9]/)
    .withMessage(validationMsg("validation.password_rule")),

  query("referralCode")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.referralCode_string"))
    .trim(),

  body("agreeToTerms")
  .isBoolean()
  .withMessage(validationMsg("validation.agreeToTerms_boolean"))
  .toBoolean(),

  body("subscribeToUpdates")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.subscribeToUpdates_boolean"))
    .toBoolean(),
];

export const verifyEmailValidator = [
  body()
    .custom((value, { req }) => {
      const requiredFields = ["email", "code"];
      const receivedFields = Object.keys(req.body);
      const hasExtraFields = receivedFields.some(
        (el) => !requiredFields.includes(el)
      );
      if (hasExtraFields) throw new Error();
      return true;
    })
    .withMessage(validationMsg("validation.allowed_fields_email_code")),
  body("email")
    .trim()
    .isEmail()
    .withMessage(validationMsg("validation.email_required")),
  body("code")
    .isNumeric()
    .withMessage(validationMsg("validation.verification_code_numeric"))
    .notEmpty()
    .withMessage(validationMsg("validation.verification_code_required")),
];

export const forgotPasswordValidator = [
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage(validationMsg("validation.email_required")),
  body("phone")
    .optional()
    .isString()
    .customSanitizer((value) => value.replace(/\s+/g, "")),
];

export const resetPasswordValidator = [
  body("token")
    .notEmpty()
    .withMessage(validationMsg("validation.reset_token_required")),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage(validationMsg("validation.email_required")),
  body("phone")
    .optional()
    .isString()
    .customSanitizer((value) => value.replace(/\s+/g, "")),
  body("newPassword")
    .notEmpty()
    .withMessage(validationMsg("validation.password_required"))
    .isLength({ min: 8 })
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[A-Z]/)
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[a-z]/)
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[0-9]/)
    .withMessage(validationMsg("validation.password_rule")),
];

export const resetWebPasswordValidator = [
  body("token")
    .notEmpty()
    .withMessage(validationMsg("validation.reset_token_required")),
  body("phone")
    .optional()
    .isString()
    .customSanitizer((value) => value.replace(/\s+/g, "")),
  body("newPassword")
    .notEmpty()
    .withMessage(validationMsg("validation.password_required"))
    .isLength({ min: 8 })
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[A-Z]/)
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[a-z]/)
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[0-9]/)
    .withMessage(validationMsg("validation.password_rule")),
];

export const resendVerificationValidator = [
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage(validationMsg("validation.email_required")),
  body("phone")
    .optional()
    .isString()
    .customSanitizer((value) => value.replace(/\s+/g, "")),
];

export const loginWithGoogle = [
  body("code")
    .isString()
    .withMessage(validationMsg("validation.code_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.code_required"))
    .exists()
    .withMessage(validationMsg("validation.code_required")),
  query("referralCode")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.referralCode_string"))
    .trim(),
];

export const mobileLoginWithGoogle = [
  body("idToken")
    .isString()
    .withMessage(validationMsg("validation.id_token_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.id_token_required"))
    .exists()
    .withMessage(validationMsg("validation.id_token_required")),
  query("referralCode")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.referralCode_string"))
    .trim(),
];
