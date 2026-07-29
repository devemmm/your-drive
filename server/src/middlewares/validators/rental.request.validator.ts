import { body, checkSchema, param, query, Schema } from "express-validator";
import { validationMsg } from "../../utils/validation";
import {
  FuelPolicy,
  RentalStatus,
  RentalType,
  VehicleCategory,
} from "@prisma/client";

export const CreateRentalSchema: Schema = {
  vehicleId: {
    in: ["body"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.vehicleId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.vehicleId_positive"),
  },
  startDate: {
    in: ["body"],
    isISO8601: {
      errorMessage: validationMsg("validation.startDate_iso8601"),
    },
    errorMessage: validationMsg("validation.startDate_required"),
  },
  endDate: {
    in: ["body"],
    isISO8601: {
      errorMessage: validationMsg("validation.endDate_iso8601"),
    },
    custom: {
      options: (value, { req }) => {
        const end = new Date(value);
        const start = new Date(req.body.startDate);
        return end > start;
      },
      errorMessage: validationMsg("validation.endDate_after_startDate"),
    },
    errorMessage: validationMsg("validation.endDate_required"),
  },
  rentalType: {
    in: ["body"],
    isString: true,
    trim: true,
    toUpperCase: true,
    isIn: {
      options: [Object.values(RentalType)],
      errorMessage: validationMsg("validation.rentalType_invalid", {
        types: Object.values(RentalType).join(", "),
      }),
    },
    errorMessage: validationMsg("validation.rentalType_required"),
  },
  pickupNotes: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.pickupNotes_string"),
  },
  returnNotes: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.returnNotes_string"),
  },

  // Pickup location
  pickupLocation: {
    in: ["body"],
    optional: true,
    isObject: {
      errorMessage: validationMsg("validation.pickupLocation_object"),
      options: { strict: true },
    },
  },
  "pickupLocation.region": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.pickupLocation_region_required"),
  },
  "pickupLocation.city": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.pickupLocation_city_required"),
  },
  "pickupLocation.locationName": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg(
      "validation.pickupLocation_locationName_required"
    ),
  },
  "pickupLocation.latitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.latitude_range"),
  },
  "pickupLocation.longitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.longitude_range"),
  },
  "pickupLocation.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.pickupLocation_address_string"),
  },
  "pickupLocation.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg(
      "validation.pickupLocation_description_string"
    ),
  },

  // Return location
  returnLocation: {
    in: ["body"],
    optional: true,
    isObject: {
      errorMessage: validationMsg("validation.returnLocation_object"),
      options: { strict: true },
    },
  },
  "returnLocation.region": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.returnLocation_region_required"),
  },
  "returnLocation.city": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.returnLocation_city_required"),
  },
  "returnLocation.locationName": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg(
      "validation.returnLocation_locationName_required"
    ),
  },
  "returnLocation.latitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.latitude_range"),
  },
  "returnLocation.longitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.longitude_range"),
  },
  "returnLocation.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.returnLocation_address_string"),
  },
  "returnLocation.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg(
      "validation.returnLocation_description_string"
    ),
  },
};

export const validateCreateRental = checkSchema(CreateRentalSchema);

export const rentalValidators = {
  getRentals: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.page_positive_int"))
      .toInt(),
    query("pageSize")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage(validationMsg("validation.pageSize_range"))
      .toInt(),
    query("status")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.rentalStatus_string"))
      .trim()
      .toUpperCase()
      .isIn(Object.values(RentalStatus))
      .withMessage(
        validationMsg("validation.rentalStatus_invalid", {
          statuses: Object.values(RentalStatus).join(", "),
        })
      ),
    query("role")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.role_string"))
      .trim()
      .toLowerCase()
      .isIn(["renter", "owner"])
      .withMessage(validationMsg("validation.role_invalid")),
  ],

  getRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  approveRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  declineRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.decline_reason_required")),
  ],

  cancelRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.cancel_reason_required")),
  ],

  initializePayment: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  activateRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  completeRental: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  releaseDeposit: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
  ],

  dispute: [
    param("rentalId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rentalId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.dispute_reason_required")),
  ],

  searchAvailableVehicles: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.page_positive_int"))
      .toInt(),
    query("pageSize")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage(validationMsg("validation.pageSize_range"))
      .toInt(),
    query("city")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.city_string"))
      .trim(),
    query("region")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.region_string"))
      .trim(),
    query("category")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.category_string"))
      .trim()
      .toUpperCase()
      .isIn(Object.values(VehicleCategory))
      .withMessage(
        validationMsg("validation.category_invalid", {
          categories: Object.values(VehicleCategory).join(", "),
        })
      ),
    query("minDailyRate")
      .optional()
      .isFloat({ min: 0 })
      .withMessage(validationMsg("validation.minDailyRate_non_negative"))
      .toFloat(),
    query("maxDailyRate")
      .optional()
      .isFloat({ min: 0 })
      .withMessage(validationMsg("validation.maxDailyRate_non_negative"))
      .toFloat(),
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage(validationMsg("validation.startDate_iso8601")),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage(validationMsg("validation.endDate_iso8601")),
  ],
};

export const validateVehicleRentalSettings = [
  param("vehicleId")
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.vehicleId_positive"))
    .toInt(),
  body("isAvailableForRental")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.isAvailableForRental_boolean"))
    .toBoolean(),
  body("hourlyRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.hourlyRate_non_negative"))
    .toFloat(),
  body("dailyRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.dailyRate_non_negative"))
    .toFloat(),
  body("securityDeposit")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.securityDeposit_non_negative"))
    .toFloat(),
  body("rentalDescription")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.rentalDescription_string"))
    .trim(),
  body("mileageLimit")
    .optional()
    .isInt({ min: 0 })
    .withMessage(validationMsg("validation.mileageLimit_non_negative"))
    .toInt(),
  body("fuelPolicy")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.fuelPolicy_string"))
    .trim()
    .toUpperCase()
    .isIn(Object.values(FuelPolicy))
    .withMessage(
      validationMsg("validation.fuelPolicy_invalid", {
        policies: Object.values(FuelPolicy).join(", "),
      })
    ),
];
