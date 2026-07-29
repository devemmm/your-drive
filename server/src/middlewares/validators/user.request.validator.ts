import { body } from "express-validator";
import {
  Language,
  LuggageSize,
  MusicPreference,
  NotificationPreference,
} from "@prisma/client";
import { validationMsg } from "../../utils/validation";

export const updateProfileValidator = [
  body("firstName")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.firstName_string"))
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(validationMsg("validation.firstName_length"))
    .matches(/^[\p{L}][\p{L}' -]{1,49}$/u)
    .withMessage(validationMsg("validation.firstName_format")),

  body("lastName")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.lastName_string"))
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(validationMsg("validation.lastName_length"))
    .matches(/^[\p{L}][\p{L}' -]{1,49}$/u)
    .withMessage(validationMsg("validation.lastName_format")),

  body("email").optional().trim().isEmail().withMessage(validationMsg("validation.email_required")),

  body("language")
    .optional()
    .isIn(Object.values(Language))
    .withMessage(validationMsg("validation.invalid_language")),

  body("theme")
    .optional()
    .isIn(["light", "dark"])
    .withMessage(validationMsg("validation.invalid_theme")),

  body("phoneNumber")
    .optional()
    .isString()
    .customSanitizer((value) => value.replace(/\s+/g, "")),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage(validationMsg("validation.invalid_date_of_birth"))
    .toDate(),

  body("notificationPref")
    .optional()
    .isString()
    .trim()
    .toUpperCase()
    .isIn(Object.values(NotificationPreference))
    .withMessage(validationMsg("validation.notification_pref_invalid", {
      prefs: Object.values(NotificationPreference).join(", "),
    })),

  body("twoFactorEnabled")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.twoFactor_boolean"))
    .toBoolean(),

  body("travelPreferences").optional().isObject().withMessage(validationMsg("validation.preferences_object")),

  body("travelPreferences.smoking").optional().isBoolean().withMessage(validationMsg("validation.preference_boolean")),
  body("travelPreferences.pets").optional().isBoolean().withMessage(validationMsg("validation.preference_boolean")),
  body("travelPreferences.airConditioning").optional().isBoolean().withMessage(validationMsg("validation.preference_boolean")),
  body("travelPreferences.ladiesOnly").optional().isBoolean().withMessage(validationMsg("validation.preference_boolean")),
  body("travelPreferences.bicycleSupport").optional().isBoolean().withMessage(validationMsg("validation.preference_boolean")),
  body("travelPreferences.snowTires").optional().isBoolean().withMessage(validationMsg("validation.preference_boolean")),
  body("travelPreferences.gentsOnly").optional().isBoolean().withMessage(validationMsg("validation.preference_boolean")),
  body("travelPreferences.skydiving").optional().isBoolean().withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.luggageSize")
    .optional()
    .isIn(Object.values(LuggageSize))
    .withMessage(validationMsg("validation.luggage_size_invalid")),

  body("travelPreferences.music")
    .optional()
    .isIn(Object.values(MusicPreference))
    .withMessage(validationMsg("validation.music_pref_invalid", {
      prefs: Object.values(MusicPreference).join(", "),
    })),

  body("travelPreferences.additionalNotes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage(validationMsg("validation.additionalNotes_too_long")),

  body("frequentRoutes")
    .optional()
    .isArray({ max: 10 })
    .withMessage(validationMsg("validation.frequentRoutes_invalid")),

  body("frequentRoutes.*.from")
    .if(body("frequentRoutes").exists())
    .notEmpty()
    .withMessage(validationMsg("validation.route_from_required"))
    .isString(),

  body("frequentRoutes.*.to")
    .if(body("frequentRoutes").exists())
    .notEmpty()
    .withMessage(validationMsg("validation.route_to_required"))
    .isString(),

  body("emergencyContactName")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(validationMsg("validation.emergencyContactName_length"))
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(validationMsg("validation.emergencyContactName_format")),

  body("emergencyContactPhone")
    .optional()
    .isString()
    .customSanitizer((value) => (typeof value === "string" ? value.replace(/\s+/g, "") : value))
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage(validationMsg("validation.emergencyContactPhone_invalid"))
    .isMobilePhone("any")
    .withMessage(validationMsg("validation.emergencyContactPhone_invalid")),

  body("licenseNumber")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage(validationMsg("validation.licenseNumber_length")),

  body("drivingExperience")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage(validationMsg("validation.drivingExperience_invalid")),

  body("phoneNumber")
    .optional()
    .isString()
    .customSanitizer((value) => value.replace(/\s+/g, "")),
];

export const addPhoneNumberValidator = [
  body()
    .custom((value, { req }) => {
      const requiredFields = ["phoneNumber"];
      const receivedFields = Object.keys(req.body);
      const hasExtraFields = receivedFields.some((el) => !requiredFields.includes(el));
      if (hasExtraFields) throw new Error();
      return true;
    })
    .withMessage(validationMsg("validation.only_contents_allowed")),
  body("phoneNumber")
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .customSanitizer((value) => value.replace(/\s+/g, "")),
];

export const verifyPhoneNumberValidator = [
  body()
    .custom((value, { req }) => {
      const requiredFields = ["phoneNumber", "code"];
      const receivedFields = Object.keys(req.body);
      const hasExtraFields = receivedFields.some((el) => !requiredFields.includes(el));
      if (hasExtraFields) throw new Error();
      return true;
    })
    .withMessage(validationMsg("validation.allowed_fields_email_code")),
  body("phoneNumber")
    .notEmpty()
    .withMessage(validationMsg("validation.phone_required"))
    .customSanitizer((value) => value.replace(/\s+/g, "")),
  body("code")
    .isNumeric()
    .withMessage(validationMsg("validation.verification_code_numeric"))
    .notEmpty()
    .withMessage(validationMsg("validation.verification_code_required")),
];

export const resendPhoneVerificationValidator = [
  body()
    .custom((value, { req }) => {
      const requiredFields = ["phoneNumber"];
      const receivedFields = Object.keys(req.body);
      const hasExtraFields = receivedFields.some((el) => !requiredFields.includes(el));
      if (hasExtraFields) throw new Error();
      return true;
    })
    .withMessage(validationMsg("validation.only_contents_allowed")),
  body("phoneNumber")
    .notEmpty()
    .withMessage(validationMsg("validation.phone_required"))
    .customSanitizer((value) => value.replace(/\s+/g, "")),
];

export const inviteFriendValidator = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage(validationMsg("validation.email_required"))
    .isEmail()
    .withMessage(validationMsg("validation.email_required")),
];

export const validateDriverOnboarding = [
  body("licenseNumber")
    .isString()
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.licenseNumber_required"))
    .isLength({ min: 3, max: 50 })
    .withMessage(validationMsg("validation.licenseNumber_length")),
  body("drivingExperience")
    .isString()
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.drivingExperience_required"))
    .isIn(["1", "2", "3", "4", "5", "more"])
    .withMessage(validationMsg("validation.drivingExperience_invalid")),
];

export const validatePassengerOnboarding = [
  body("travelPreferences")
    .optional({ checkFalsy: true, nullable: true })
    .isObject()
    .withMessage(validationMsg("validation.preferences_object")),

  body("travelPreferences.smoking")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean()
    .withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.pets")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean()
    .withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.airConditioning")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean()
    .withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.ladiesOnly")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean()
    .withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.gentsOnly")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean()
    .withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.bicycleSupport")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean()
    .withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.snowTires")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean()
    .withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.skydiving")
    .optional({ checkFalsy: true, nullable: true })
    .toBoolean()
    .isBoolean()
    .withMessage(validationMsg("validation.preference_boolean")),

  body("travelPreferences.luggageSize")
    .optional({ checkFalsy: true, nullable: true })
    .isIn(Object.values(LuggageSize))
    .withMessage(validationMsg("validation.luggage_size_invalid")),

  body("travelPreferences.music")
    .optional({ checkFalsy: true, nullable: true })
    .isIn(Object.values(MusicPreference))
    .withMessage(validationMsg("validation.music_pref_invalid", {
      prefs: Object.values(MusicPreference).join(", "),
    })),

  body("travelPreferences.additionalNotes")
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage(validationMsg("validation.additionalNotes_string"))
    .isLength({ max: 500 })
    .withMessage(validationMsg("validation.additionalNotes_too_long")),

  body("frequentRoutes")
    .optional({ checkFalsy: true, nullable: true })
    .isArray({ max: 10 })
    .withMessage(validationMsg("validation.frequentRoutes_invalid")),

  body("frequentRoutes.*.from")
    .if(body("frequentRoutes").exists())
    .notEmpty()
    .withMessage(validationMsg("validation.route_from_required"))
    .isString()
    .withMessage(validationMsg("validation.route_from_string")),

  body("frequentRoutes.*.to")
    .if(body("frequentRoutes").exists())
    .notEmpty()
    .withMessage(validationMsg("validation.route_to_required"))
    .isString()
    .withMessage(validationMsg("validation.route_to_string")),

  body("emergencyContactName")
    .optional()
     .isString()
    .notEmpty()
    .withMessage(validationMsg("validation.emergencyContactName_not_empty"))
    .isLength({ min: 2, max: 100 })
    .withMessage(validationMsg("validation.emergencyContactName_length"))
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(validationMsg("validation.emergencyContactName_format")),

  body("emergencyContactPhone")
    .optional({ checkFalsy: true, nullable: true })
    .isString()
    .withMessage(validationMsg("validation.emergencyContactPhone_string"))
    .customSanitizer((value) => (typeof value === "string" ? value.replace(/\s+/g, "") : value))
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage(validationMsg("validation.emergencyContactPhone_invalid"))
    .isMobilePhone("any")
    .withMessage(validationMsg("validation.emergencyContactPhone_invalid")),

  body("phoneNumber")
    .optional()
    .isString()
    .customSanitizer((value) => value ? value.replace(/\s+/g, "") : value),

  body("referralCode")
    .optional({ checkFalsy: true, nullable: true })
    .isLength({ min: 3, max: 20 })
    .withMessage(validationMsg("validation.referralCode_invalid"))
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage(validationMsg("validation.referralCode_invalid")),

  body("termsAccepted")
  .isBoolean()
  .withMessage(validationMsg("validation.agreeToTerms_boolean"))
  .toBoolean()
];

export const changePasswordValidator = [
  body("oldPassword")
    .exists({ checkFalsy: true })
    .withMessage(validationMsg("validation.old_password_required"))
    .isString()
    .withMessage(validationMsg("validation.old_password_string"))
    .notEmpty()
    .withMessage(validationMsg("validation.old_password_not_empty")),

  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage(validationMsg("validation.new_password_required"))
    .isString()
    .withMessage(validationMsg("validation.new_password_string"))
    .isLength({ min: 8 })
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[A-Z]/)
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[a-z]/)
    .withMessage(validationMsg("validation.password_rule"))
    .matches(/[0-9]/)
    .withMessage(validationMsg("validation.password_rule")),
];

export const validateUpdatePreferences = [
  body("language")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.language_string"))
    .trim()
    .toUpperCase()
    .isIn(Object.values(Language))
    .withMessage(validationMsg("validation.language_invalid")),

  body("theme")
    .optional()
    .isIn(["light", "dark"])
    .withMessage(validationMsg("validation.theme_invalid")),

  body("notificationPref")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.notification_pref_string"))
    .trim()
    .toUpperCase()
    .isIn(Object.values(NotificationPreference))
    .withMessage(
      validationMsg("validation.notification_pref_invalid", {
        prefs: Object.values(NotificationPreference).join(", "),
      })
    ),

  body("twoFactorEnabled")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.two_factor_boolean"))
    .toBoolean(),
];

export const updateChauffeurAvailabilityValidator = [
  body("isAvailableForChauffeur")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.isAvailableForChauffeur_boolean"))
    .toBoolean(),

  body("chauffeurHourlyRate")
    .optional({ values: "undefined" })
    .custom((value) => {
      if (value === null) return true;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error("chauffeurHourlyRate must be a positive number or null");
      }
      return true;
    }),

  body("chauffeurDailyRate")
    .optional({ values: "undefined" })
    .custom((value) => {
      if (value === null) return true;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error("chauffeurDailyRate must be a positive number or null");
      }
      return true;
    }),

  body("chauffeurDescription")
    .optional({ values: "undefined" })
    .custom((value) => {
      if (value === null) return true;
      if (typeof value !== "string") {
        throw new Error("chauffeurDescription must be a string or null");
      }
      if (value.length > 500) {
        throw new Error("chauffeurDescription must be 500 characters or fewer");
      }
      return true;
    }),

  body("languagesSpoken")
    .optional({ values: "undefined" })
    .custom((value) => {
      if (value === null) return true;
      if (!Array.isArray(value)) {
        throw new Error("languagesSpoken must be an array of language codes or null");
      }
      if (value.length > 12) {
        throw new Error("languagesSpoken cannot exceed 12 entries");
      }
      for (const code of value) {
        if (typeof code !== "string" || code.length < 2 || code.length > 8) {
          throw new Error("each language code must be a 2-8 character string (e.g. 'en', 'rw')");
        }
      }
      return true;
    }),
];

export const updateRideRequestAvailabilityValidator = [
  body("isAvailableForRideRequest")
    .exists()
    .withMessage("isAvailableForRideRequest is required")
    .isBoolean()
    .withMessage("isAvailableForRideRequest must be a boolean")
    .toBoolean(),
];
