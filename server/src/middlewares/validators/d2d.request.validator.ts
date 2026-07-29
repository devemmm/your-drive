import { body, checkSchema, param, query, Schema } from "express-validator";
import { validationMsg } from "../../utils/validation";
import {
  D2DBookingRequestStatus,
  LuggageSize,
  MusicPreference,
} from "@prisma/client";

export const CreateD2DRideSchema: Schema = {
  // Departure location
  driverStartLocation: {
    in: ["body"],
    isObject: {
      errorMessage: validationMsg("validation.driverStartLocation_object"),
      options: {
        strict: true,
      },
    },
  },
  "driverStartLocation.region": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg(
      "validation.driverStartLocation_region_required"
    ),
  },
  "driverStartLocation.city": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.driverStartLocation_city_required"),
  },
  "driverStartLocation.locationName": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg(
      "validation.driverStartLocation_locationName_required"
    ),
  },
  "driverStartLocation.latitude": {
    in: ["body"],
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.latitude_range"),
  },
  "driverStartLocation.longitude": {
    in: ["body"],
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.longitude_range"),
  },
  "driverStartLocation.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg(
      "validation.driverStartLocation_address_string"
    ),
  },
  "driverStartLocation.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg(
      "validation.driverStartLocation_description_string"
    ),
  },

  // Driver location
  driverStopLocation: {
    in: ["body"],
    isObject: {
      errorMessage: validationMsg("validation.driverStopLocation_object"),
      options: {
        strict: true,
      },
    },
  },
  "driverStopLocation.region": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg(
      "validation.driverStopLocation_region_required"
    ),
  },
  "driverStopLocation.city": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.driverStopLocation_city_required"),
  },
  "driverStopLocation.locationName": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg(
      "validation.driverStopLocation_locationName_required"
    ),
  },
  "driverStopLocation.latitude": {
    in: ["body"],
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.driverStopLocation_latitude_valid"),
  },
  "driverStopLocation.longitude": {
    in: ["body"],
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg(
      "validation.driverStopLocation_longitude_valid"
    ),
  },
  "driverStopLocation.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.driverStopLocation_address_string"),
  },
  "driverStopLocation.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg(
      "validation.driverStopLocation_description_string"
    ),
  },

  // Timing & core info
  departureTime: {
    in: ["body"],
    isInt: {
      errorMessage: validationMsg("validation.departureTime_number"),
    },
    custom: {
      options: (value) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        return date > new Date();
      },
      errorMessage: validationMsg("validation.departure_time_future"),
    },
    errorMessage: validationMsg("validation.departure_time_required"),
    toInt: true,
  },
  estimatedArrivalTime: {
    in: ["body"],
    isInt: {
      errorMessage: validationMsg("validation.estimatedArrivalTime_number"),
    },
    custom: {
      options: (value, { req }) => {
        const arrival = new Date(value);
        const departure = new Date(req.body.departureTime);
        return arrival > departure;
      },
      errorMessage: validationMsg(
        "validation.estimatedArrival_after_departure"
      ),
    },
    errorMessage: validationMsg("validation.estimatedArrival_required"),
    toInt: true,
  },
  availableSeats: {
    in: ["body"],
    isInt: { options: { min: 1 } },
    toInt: true,
    errorMessage: validationMsg("validation.availableSeats_min"),
  },
  vehicleId: {
    in: ["body"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.vehicleId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.vehicleId_positive"),
  },

  // D2D specific fields
  detourRadius: {
    in: ["body"],
    optional: true,
    isFloat: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.detourRadius_non_negative"),
    },
    toFloat: true,
  },
  extraKmPrice: {
    in: ["body"],
    isFloat: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.extraKmPrice_non_negative"),
    },
    toFloat: true,
    errorMessage: validationMsg("validation.extraKmPrice_required"),
  },
  contribution: {
    in: ["body"],
    isFloat: { options: { min: 0 } },
    toFloat: true,
    errorMessage: validationMsg("validation.contribution_non_negative"),
  },
  // Ride preferences
  preferences: {
    in: ["body"],
    isObject: {
      errorMessage: validationMsg("validation.preferences_object"),
      options: {
        strict: true,
      },
    },
  },
  "preferences.smoking": {
    in: ["body"],
    isBoolean: true,
    toBoolean: true,
    optional: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.pets": {
    in: ["body"],
    isBoolean: true,
    toBoolean: true,
    optional: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.airConditioning": {
    in: ["body"],
    isBoolean: true,
    toBoolean: true,
    optional: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.ladiesOnly": {
    in: ["body"],
    isBoolean: true,
    toBoolean: true,
    optional: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.bicycleSupport": {
    in: ["body"],
    isBoolean: true,
    toBoolean: true,
    optional: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.snowTires": {
    in: ["body"],
    isBoolean: true,
    toBoolean: true,
    optional: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.gentsOnly": {
    in: ["body"],
    isBoolean: true,
    toBoolean: true,
    optional: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.luggageSize": {
    in: ["body"],
    optional: true,
    isIn: {
      options: [["NONE", "SMALL", "MEDIUM", "LARGE"]],
      errorMessage: validationMsg("validation.luggage_size_invalid"),
    },
  },
  "preferences.luggageCount": {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.luggage_count_non_negative"),
    },
    toInt: true,
  },
  "preferences.additionalNotes": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg(
      "validation.preferences_additionalNotes_string"
    ),
  },
  rideRequestId: {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideRequestId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.rideRequestId_positive"),
  },
  "preferences.music": {
    in: ["body"],
    optional: { options: { checkFalsy: true, nullable: true } },
    isString: true,
    trim: true,
    isIn: {
      options: [Object.values(MusicPreference)],
      errorMessage: validationMsg("validation.music_pref_invalid", {
        prefs: Object.values(MusicPreference).join(", "),
      }),
    },
    errorMessage: validationMsg("validation.music_pref_invalid", {
      prefs: Object.values(MusicPreference).join(", "),
    }),
  },
};

export interface D2DRidePayload {
  driverStartLocation: {
    region: string;
    city: string;
    address?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    description?: string;
  };
  driverStopLocation: {
    region: string;
    city: string;
    address?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    description?: string;
  };
  rideRequestId?: number,
  departureTime: number;
  availableSeats: number;
  contribution: number;
  vehicleId: number;
  preferences: {
    smoking?: boolean;
    pets?: boolean;
    airConditioning?: boolean;
    ladiesOnly?: boolean;
    bicycleSupport?: boolean;
    snowTires?: boolean;
    luggageSize?: LuggageSize;
    luggageCount?: number;
    additionalNotes?: string;
    gentsOnly?: boolean;
    music?: MusicPreference;
  };
  estimatedArrivalTime: number;
  detourRadius: number;
  extraKmPrice: number;
}

export const validateCreateD2DRide = checkSchema(CreateD2DRideSchema);

const RequestD2DRideSchema: Schema = {
  rideId: {
    in: ["params"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideId_positive"),
    },
    toInt: true,
  },
  pickup: {
    in: ["body"],
    isObject: {
      errorMessage: validationMsg("validation.pickup_object"),
      options: {
        strict: true,
      },
    },
  },
  "pickup.region": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.pickup_region_required"),
  },
  "pickup.city": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.pickup_city_required"),
  },
  "pickup.locationName": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.pickup_locationName_required"),
  },
  "pickup.latitude": {
    in: ["body"],
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.pickup_latitude_valid"),
  },
  "pickup.longitude": {
    in: ["body"],
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.pickup_longitude_valid"),
  },
  "pickup.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.pickup_address_string"),
  },
  "pickup.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.pickup_description_string"),
  },

  // Dropoff location
  dropoff: {
    in: ["body"],
    isObject: {
      errorMessage: validationMsg("validation.dropoff_object"),
      options: {
        strict: true,
      },
    },
  },
  "dropoff.region": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoff_region_required"),
  },
  "dropoff.city": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoff_city_required"),
  },
  "dropoff.locationName": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.dropoff_locationName_required"),
  },
  "dropoff.latitude": {
    in: ["body"],
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.dropoff_latitude_valid"),
  },
  "dropoff.longitude": {
    in: ["body"],
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.dropoff_longitude_valid"),
  },
  "dropoff.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.dropoff_address_string"),
  },
  "dropoff.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.dropoff_description_string"),
  },
   pickupExtraKms: {
    in: ["body"],
    isFloat: {
      options: { min: 0 },
    },
    toFloat: true,
    errorMessage: validationMsg("validation.pickupExtraKms_positive"),
  },
  dropoffExtraKms: {
    in: ["body"],
    isFloat: {
      options: { min: 0 },
    },
    toFloat: true,
    errorMessage: validationMsg("validation.dropoffExtraKms_positive"),
  },
};
const BookD2DRideSchema: Schema = {
  rideId: {
    in: ["params"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideId_positive"),
    },
    toInt: true,
  },
 
  pickupExtraKms: {
    in: ["body"],
    isFloat: {
      options: { min: 0 },
    },
    toFloat: true,
    errorMessage: validationMsg("validation.pickupExtraKms_positive"),
  },
  dropoffExtraKms: {
    in: ["body"],
    isFloat: {
      options: { min: 0 },
    },
    toFloat: true,
    errorMessage: validationMsg("validation.dropoffExtraKms_positive"),
  },
};

export const validateSubmitD2dBookingReq = checkSchema(RequestD2DRideSchema);
export const validateBookD2DRide = checkSchema(BookD2DRideSchema);

export interface D2DBookingReqPayload {
  rideId: number;
  pickup: {
    region: string;
    city: string;
    address?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    description?: string;
  };
  dropoff: {
    region: string;
    city: string;
    address?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    description?: string;
  };
  pickupExtraKms: number;
  dropoffExtraKms: number;
}

export const validateCancelD2DRequest = [
  body("reason")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.d2d_decline_cancel_reason")),
];

export const PublishD2DRideSchema: Schema = {
  rideId: {
    in: ["params"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideId_positive"),
    },
    toInt: true,
  },
};

export const validateGetAllD2DRequests = [
  query("passengerId")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.passengerId_positive"))
    .toInt(),
  query("status")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.d2dBookingRequest_status_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.d2dBookingRequest_status_required"))
    .toUpperCase()
    .isIn(Object.values(D2DBookingRequestStatus))
    .withMessage(
      validationMsg("validation.invalid_d2dBookingRequest_status", {
        statuses: Object.values(D2DBookingRequestStatus).join(", "),
      })
    ),
  query("pickupCity")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.pickup_city_required"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.pickup_city_required")),
  query("dropoffCity")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.dropoff_city_required"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.dropoff_city_required")),

  query("date")
    .optional()
    .isInt()
    .withMessage(validationMsg("validation.date_number"))
    .toInt(),
  query("rideId")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.rideId_positive_int"))
    .toInt(),
  query("search")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.search_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.search_required")),
];

export const validateInitializePayment = [
  param("requestId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.requestId_positive"))
    .toInt(),
  query("useCoupons")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.useCoupons_boolean"))
    .toBoolean(),
  body("useCoupons")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.useCoupons_boolean"))
    .toBoolean(),
];
