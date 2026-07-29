import { body, checkSchema, param, query, Schema } from "express-validator";
import { validationMsg } from "../../utils/validation";
import { ChauffeurStatus, ChauffeurServiceType } from "@prisma/client";

export const CreateChauffeurServiceSchema: Schema = {
  vehicleId: {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.vehicleId_positive"),
    },
    toInt: true,
  },
  driverId: {
    in: ["body"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.driverId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.driverId_positive"),
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
  serviceType: {
    in: ["body"],
    isString: true,
    trim: true,
    toUpperCase: true,
    isIn: {
      options: [Object.values(ChauffeurServiceType)],
      errorMessage: validationMsg("validation.serviceType_invalid", {
        types: Object.values(ChauffeurServiceType).join(", "),
      }),
    },
    errorMessage: validationMsg("validation.serviceType_required"),
  },
  pickupNotes: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.pickupNotes_string"),
  },
  dropoffNotes: {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.dropoffNotes_string"),
  },
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
    errorMessage: validationMsg("validation.pickupLocation_locationName_required"),
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
    errorMessage: validationMsg("validation.pickupLocation_description_string"),
  },
  dropoffLocation: {
    in: ["body"],
    optional: true,
    isObject: {
      errorMessage: validationMsg("validation.dropoffLocation_object"),
      options: { strict: true },
    },
  },
  "dropoffLocation.region": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoffLocation_region_required"),
  },
  "dropoffLocation.city": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoffLocation_city_required"),
  },
  "dropoffLocation.locationName": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoffLocation_locationName_required"),
  },
  "dropoffLocation.latitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.latitude_range"),
  },
  "dropoffLocation.longitude": {
    in: ["body"],
    optional: true,
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.longitude_range"),
  },
  "dropoffLocation.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.dropoffLocation_address_string"),
  },
  "dropoffLocation.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.dropoffLocation_description_string"),
  },
};

export const validateCreateChauffeurService = checkSchema(CreateChauffeurServiceSchema);

export const chauffeurValidators = {
  getServices: [
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
      .withMessage(validationMsg("validation.chauffeurStatus_string"))
      .trim()
      .toUpperCase()
      .isIn(Object.values(ChauffeurStatus))
      .withMessage(
        validationMsg("validation.chauffeurStatus_invalid", {
          statuses: Object.values(ChauffeurStatus).join(", "),
        })
      ),
    query("role")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.role_string"))
      .trim()
      .toLowerCase()
      .isIn(["passenger", "driver"])
      .withMessage(validationMsg("validation.role_invalid")),
  ],
  getService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],
  acceptService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],
  declineService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.decline_reason_required")),
  ],
  cancelService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.cancel_reason_required")),
  ],
  initializePayment: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],
  activateService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],
  completeService: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
  ],
  dispute: [
    param("serviceId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.serviceId_positive"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.dispute_reason_required")),
  ],
  searchAvailableDrivers: [
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
    query("minHourlyRate")
      .optional()
      .isFloat({ min: 0 })
      .withMessage(validationMsg("validation.minHourlyRate_non_negative"))
      .toFloat(),
    query("maxHourlyRate")
      .optional()
      .isFloat({ min: 0 })
      .withMessage(validationMsg("validation.maxHourlyRate_non_negative"))
      .toFloat(),
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
