import { checkSchema, param, ParamSchema, query, Schema } from "express-validator";
import {
  BookingType,
  LuggageSize,
  MusicPreference,
  RideType,
  VehicleCategory,
} from "@prisma/client";
import { RideStatus } from "@prisma/client";
import { validationMsg } from "../../utils/validation";

const vehicleCategoryQueryField: ParamSchema = {
  in: ["query"],
  optional: true,
  isString: true,
  trim: true,
  toUpperCase: true,
  isIn: {
    options: [Object.values(VehicleCategory)],
    errorMessage: validationMsg("validation.invalid_vehicle_category", {
      categories: Object.values(VehicleCategory).join(", "),
    }),
  },
  errorMessage: validationMsg("validation.invalid_vehicle_category", {
    categories: Object.values(VehicleCategory).join(", "),
  }),
};

export const CreateRideSchema: Schema = {
  // Departure location
  departure: {
    in: ["body"],
    isObject: {
      errorMessage: validationMsg("validation.departure_object"),
      options: {
        strict: true,
      },
    },
  },
  "departure.region": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.departure_region_required"),
  },
  "departure.city": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.departure_city_required"),
  },
  "departure.locationName": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg(
      "validation.departure_locationName_required"
    ),
  },
  "departure.latitude": {
    in: ["body"],
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.latitude_range"),
  },
  "departure.longitude": {
    in: ["body"],
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.longitude_range"),
  },
  "departure.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.departure_address_string"),
  },
  "departure.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.departure_description_string"),
  },

  // Destination location
  destination: {
    in: ["body"],
    isObject: {
      errorMessage: validationMsg("validation.destination_object"),
      options: {
        strict: true,
      },
    },
  },
  "destination.region": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.destination_region_required"),
  },
  "destination.city": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.destination_city_required"),
  },
  "destination.locationName": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg(
      "validation.destination_locationName_required"
    ),
  },
  "destination.latitude": {
    in: ["body"],
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.destination_latitude_valid"),
  },
  "destination.longitude": {
    in: ["body"],
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.destination_longitude_valid"),
  },
  "destination.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.destination_address_string"),
  },
  "destination.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.destination_description_string"),
  },

  // Timing & core info
  departureTime: {
    in: ["body"],
    isInt:{
      errorMessage: validationMsg("validation.departureTime_number")
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
    isInt:{
      errorMessage: validationMsg("validation.estimatedArrivalTime_number")
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
  contribution: {
    in: ["body"],
    isFloat: { options: { min: 0 } },
    toFloat: true,
    errorMessage: validationMsg("validation.contribution_non_negative"),
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

  bookingType: {
    in: ["body"],
    isIn: {
      options: [Object.values(BookingType)],
      errorMessage: validationMsg("validation.bookingType_invalid", {
        types: Object.values(BookingType).join(", "),
      }),
    },
  },

  // TODO(payments): Re-enable validation once a Rwanda-supported payment
  // provider is integrated (e.g. MTN MoMo, Airtel Money, Flutterwave).
  // For now all rides default to OFF_PLATFORM (cash collected directly by driver).
  contributionCollectionMethod: {
    in: ["body"],
    optional: true,
    customSanitizer: {
      options: (value: string) => (value === "DIRECT" ? "OFF_PLATFORM" : value || "OFF_PLATFORM"),
    },
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

  // Stopovers array check
  stopovers: {
    in: ["body"],
    optional: true,
    isArray: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.stopovers_array"),
    },
    default: {
      options: [],
    },
  },

  // Stopovers fields validation
  "stopovers.*.region": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.stopover_region_required"),
  },
  "stopovers.*.city": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.stopover_city_required"),
  },
  "stopovers.*.locationName": {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.stopover_location_required"),
  },
  "stopovers.*.latitude": {
    in: ["body"],
    isFloat: { options: { min: -90, max: 90 } },
    toFloat: true,
    errorMessage: validationMsg("validation.stopover_latitude_valid"),
  },
  "stopovers.*.longitude": {
    in: ["body"],
    isFloat: { options: { min: -180, max: 180 } },
    toFloat: true,
    errorMessage: validationMsg("validation.stopover_longitude_valid"),
  },
  "stopovers.*.address": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.stopover_address_string"),
  },
  "stopovers.*.description": {
    in: ["body"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.stopover_description_string"),
  },
};

export const validateCreateRide = checkSchema(CreateRideSchema);

export interface RidePayload {
  departure: {
    region: string;
    city: string;
    address?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    description?: string;
  };
  destination: {
    region: string;
    city: string;
    address?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    description?: string;
  };
  departureTime: number;
  availableSeats: number;
  contribution: number;
  vehicleId: number;
  bookingType: BookingType;
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
    music?: MusicPreference
  };
  stopovers?: {
    region: string;
    city: string;
    address?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    description?: string;
  }[];
  estimatedArrivalTime: number;
  rideRequestId?: number;
  // contributionCollectionMethod: ContributionCollectionMethod;
}

export const BookRideSchema: Schema = {
  seatsBooked: {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.seats_booked_positive"),
    },
    toInt: true,
  },
  rideId: {
    in: ["params"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideId_positive"),
    },
    toInt: true,
  },
  useCoupons: {
    in: ["query"],
    optional: true,
    isBoolean: true,
    errorMessage: validationMsg("validation.useCoupons_boolean"),
    toBoolean: true,
  },
  boardingStopId: {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.boardingStopId_positive_int"),
    },
    toInt: true,
  },
  alightingStopId: {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.alightingStopId_positive_int"),
    },
    toInt: true,
  },
};

export const validateBookRide = checkSchema(BookRideSchema);

export interface BookRidePayload {
  seatsBooked?: number;
  rideId: number;
  useCoupons?: boolean;
  boardingStopId?: number;
  alightingStopId?: number;
}

const getAllRidesSchema: Schema = {
  page: {
    in: ["query"],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.page_positive_int"),
    },
    toInt: true,
  },
  pageSize: {
    in: ["query"],
    optional: true,
    isInt: {
      options: { min: 1, max: 100 },
      errorMessage: validationMsg("validation.page_size_positive_int"),
    },
    toInt: true,
  },
  kind: {
    in: ["query"],
    optional: true,
    isIn: {
      options: [["posted", "booked"]],
      errorMessage: validationMsg("validation.kind_invalid"),
    },
  },
  orderBy: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.orderBy_string"),
  },
  sort: {
    in: ["query"],
    optional: true,
    isIn: {
      options: [["asc", "desc"]],
      errorMessage: validationMsg("validation.sort_invalid"),
    },
  },
  departureCity: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.departure_city_required"),
  },
  destinationCity: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.destination_city_required"),
  },
  status: {
    in: ["query"],
    optional: true,
    isIn: {
      options: [Object.values(RideStatus)],
      errorMessage: validationMsg("validation.status_invalid", {
        statuses: Object.values(RideStatus).join(", "),
      }),
    },
  },
  minContribution: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.minContribution_non_negative"),
    },
    toFloat: true,
  },
  maxContribution: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.maxContribution_non_negative"),
    },
    toFloat: true,
  },
  departureTime: {
    in: ["query"],
    optional: true,
    isInt:{
      errorMessage: validationMsg("validation.departureTime_number")
    },
    toInt: true,
  },
  userLatitude: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: -90, max: 90 },
      errorMessage: validationMsg("validation.invalid_latitude"),
    },
    toFloat: true,
  },
  userLongitude: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: -180, max: 180 },
      errorMessage: validationMsg("validation.invalid_longitude"),
    },
    toFloat: true,
  },
  radiusKm: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.radius_min"),
    },
    toFloat: true,
  },
  type: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: {
      errorMessage: validationMsg("validation.rideType_required")
    },
    toUpperCase: true,
    isIn: {
      options: [Object.values(RideType)],
    },
  errorMessage: validationMsg("validation.invalid_ride_type", {
          rideTypes: Object.values(RideType).join(", "),
        }),
  },
  vehicleCategory: vehicleCategoryQueryField,
};

export const validateGetAllRides = checkSchema(getAllRidesSchema);

const getRideSchema: Schema = {
  rideId: {
    in: ["params"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.rideId_positive"),
  },
};

export const validateGetRide = checkSchema(getRideSchema);

const makeRideAttendanceSchema: Schema = {
  code: {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.booking_attendance_code_required"),
  },

  rideId: {
    in: ["params"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.rideId_positive"),
  },
};

export const validateMakeRideAttendance = checkSchema(makeRideAttendanceSchema);

const searchRidesSchema: Schema = {
  page: {
    in: ["query"],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.page_positive_int"),
    },
    toInt: true,
    default: { options: 1 },
  },
  pageSize: {
    in: ["query"],
    optional: true,
    isInt: {
      options: { min: 1, max: 100 },
      errorMessage: validationMsg("validation.page_size_positive_int"),
    },
    toInt: true,
    default: { options: 10 },
  },
  departureCity: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.departure_city_required"),
  },
  destinationCity: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
    errorMessage: validationMsg("validation.destination_city_required"),
  },
  departureTime: {
    in: ["query"],
    optional: true,
    isInt: { errorMessage: validationMsg("validation.departureTime_number") },
    toInt: true,
  },
  minContribution: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.minContribution_non_negative"),
    },
    toFloat: true,
  },
  maxContribution: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.maxContribution_non_negative"),
    },
    toFloat: true,
  },
  userLatitude: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: -90, max: 90 },
      errorMessage: validationMsg("validation.invalid_latitude"),
    },
    toFloat: true,
  },
  userLongitude: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: -180, max: 180 },
      errorMessage: validationMsg("validation.invalid_longitude"),
    },
    toFloat: true,
  },
  radiusKm: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.radius_min"),
    },
    toFloat: true,
    default: { options: 30 },
  },

  "preferences.smoking": {
    in: ["query"],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.pets": {
    in: ["query"],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.airConditioning": {
    in: ["query"],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.ladiesOnly": {
    in: ["query"],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.gentsOnly": {
    in: ["query"],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.bicycleSupport": {
    in: ["query"],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.snowTires": {
    in: ["query"],
    optional: true,
    isBoolean: true,
    toBoolean: true,
    errorMessage: validationMsg("validation.preference_boolean"),
  },
  "preferences.luggageSize": {
    in: ["query"],
    optional: true,
    isIn: {
      options: [["NONE", "SMALL", "MEDIUM", "LARGE"]],
      errorMessage: validationMsg("validation.luggage_size_invalid"),
    },
  },
  "preferences.luggageCount": {
    in: ["query"],
    optional: true,
    isInt: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.luggage_count_non_negative"),
    },
    toInt: true,
  },
   type: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
    notEmpty: {
      errorMessage: validationMsg("validation.rideType_required")
    },
    toUpperCase: true,
    isIn: {
      options: [Object.values(RideType)],
    },
    errorMessage: validationMsg("validation.invalid_ride_type", {
      rideTypes: Object.values(RideType).join(", "),
    }),
  },
  vehicleCategory: vehicleCategoryQueryField,
  originCity: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
  },
  destCity: {
    in: ["query"],
    optional: true,
    isString: true,
    trim: true,
  },
};

export const validateSearchRides = checkSchema(searchRidesSchema);

const cancelRideSchema: Schema = {
  rideId: {
    in: ["params"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.rideId_positive"),
  },
  reason: {
    in: ["body"],
    isString: true,
    trim: true,
    notEmpty: true,
    errorMessage: validationMsg("validation.cancel_reason_required"),
  },
};

export const validateCancelRide = checkSchema(cancelRideSchema);

const reviewRideCancellationSchema: Schema = {
  rideId: {
    in: ["params"],
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.rideId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.rideId_positive"),
  },
  cancellationCountsAgainstAllowance: {
    in: ["body"],
    isIn: {
      options: [["YES", "NO"]],
      errorMessage: validationMsg("validation.invalid_request"),
    },
  },
};

export const validateReviewRideCancellation = checkSchema(
  reviewRideCancellationSchema
);

export const validatePublishRide = [
  param("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
  query("useCoupons")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.useCoupons_boolean"))
    .toBoolean(),
];
