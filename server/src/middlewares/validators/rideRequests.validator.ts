import { body, param } from "express-validator";
import { validationMsg } from "../../utils/validation";
import { RideType, VehicleCategory } from "@prisma/client";
import { query } from "express-validator";
import { RideRequestStatus } from "@prisma/client";

export const createRideRequestValidator = [
  body("origin.city")
    .notEmpty()
    .withMessage(validationMsg("validation.origin_city_required")),
  body("origin.province")
    .notEmpty()
    .withMessage(validationMsg("validation.origin_province_required")),
  body("origin.locationName")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.origin_locationName_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.origin_locationName_required")),
  body("rideType")
    .isString()
    .withMessage(validationMsg("validation.rideType_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.rideType_required"))
    .toUpperCase()
    .isIn(Object.values(RideType))
    .withMessage(
      validationMsg("validation.invalid_ride_type", {
        rideTypes: Object.values(RideType).join(", "),
      })
    ),
  body("origin.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage(validationMsg("validation.origin_latitude_invalid")),
  body("origin.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage(validationMsg("validation.origin_longitude_invalid")),
  body("origin.description")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.origin_description_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.origin_description_required")),
  body("origin.address")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.origin_address_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.origin_address_required")),

  body("destination.description")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.destination_description_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.destination_description_required")),
  body("destination.address")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.destination_address_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.destination_address_required")),
  body("destination.city")
    .notEmpty()
    .withMessage(validationMsg("validation.destination_city_required")),
  body("destination.province")
    .notEmpty()
    .withMessage(validationMsg("validation.destination_province_required")),
  body("destination.locationName")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.destination_locationName_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.destination_locationName_required")),
  body("destination.latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage(validationMsg("validation.destination_latitude_invalid")),
  body("destination.longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage(validationMsg("validation.destination_longitude_invalid")),
  body("date")
    .optional()
    .notEmpty()
    .withMessage(validationMsg("validation.date_required"))
    .isInt()
    .withMessage(validationMsg("validation.date_number"))
    .toInt(),
  body("timeWindowStart")
    .optional()
    .isInt()
    .withMessage(validationMsg("validation.timeWindowStart_number"))
    .toInt(),
  body("timeWindowEnd")
    .optional()
    .isInt()
    .withMessage(validationMsg("validation.timeWindowEnd_number"))
    .toInt(),

  body("seats")
    .optional()
    .isInt({ min: 1, max: 9 })
    .withMessage(validationMsg("validation.ride_request_seats_range"))
    .toInt(),
  // body("proximityMeters")
  //   .optional()
  //   .isInt({ min: 100 })
  //   .withMessage(validationMsg("validation.proximityMeters_min"))
  //   .toInt(),
  body("description")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.description_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.description_not_empty")),
  body("proposedFare")
    .optional({ nullable: true })
    .isFloat({ gt: 0 })
    .withMessage("proposedFare must be a positive number")
    .toFloat(),
  body("vehicleCategory")
    .optional()
    .isIn(Object.values(VehicleCategory))
    .withMessage(`vehicleCategory must be one of: ${Object.values(VehicleCategory).join(", ")}`),
];

export const rideRequestIdValidator = [
  param("requestId")
    .exists()
    .withMessage(validationMsg("validation.rideRequestId_required"))
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideRequestId_positive"))
    .toInt(),
];

export const acceptRideRequestValidator = [
  param("requestId")
    .exists()
    .isInt({ gt: 0 })
    .withMessage("requestId must be a positive integer")
    .toInt(),
  body("vehicleId")
    .exists()
    .isInt({ gt: 0 })
    .withMessage("vehicleId must be a positive integer")
    .toInt(),
];

export const listRideRequestsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.page_positive_int"))
    .toInt(),

  query("pageSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.page_size_positive_int"))
    .toInt(),

  query("status")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.rideRequest_status_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.rideRequest_status_required"))
    .toUpperCase()
    .isIn(Object.values(RideRequestStatus))
    .withMessage(
      validationMsg("validation.invalid_rideRequest_status", {
        statuses: Object.values(RideRequestStatus).join(", "),
      })
    ),

  query("date")
    .optional()
    .isInt()
    .withMessage(validationMsg("validation.date_number"))
    .toInt(),

  query("originCity")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.origin_city_required"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.origin_city_required")),

  query("originProvince")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.origin_province_required"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.origin_province_required")),

  query("destinationCity")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.destination_city_required"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.destination_city_required")),

  query("destinationProvince")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.destination_province_required"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.destination_province_required")),

  query("search")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.search_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.search_required")),
  query("mineOnly")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.mine_only"))
    .toBoolean(),
];
