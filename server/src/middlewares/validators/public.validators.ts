import { body, query } from "express-validator";
import { validationMsg } from '../../utils/validation';

export const getDirectionsValidator = [
  body("origin")
    .exists({ checkFalsy: true })
    .withMessage(validationMsg("validation.origin_required"))
    .isString()
    .withMessage(validationMsg("validation.origin_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.origin_not_empty")),
    
    body("destination")
    .exists({ checkFalsy: true })
    .withMessage(validationMsg("validation.destination_required"))
    .isString()
    .withMessage(validationMsg("validation.destination_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.destination_not_empty")),

  body("waypoints")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.waypoints_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.waypoints_not_empty")),
];

export const getGooglePlacesValidator = [
    query('input').exists().withMessage(validationMsg("validation.input_required")).isString().withMessage(validationMsg("validation.input_string")).trim().notEmpty().withMessage(validationMsg("validation.input_not_empty")),
    query('sessiontoken').exists().withMessage(validationMsg("validation.sessiontoken_required")).isString().withMessage(validationMsg("validation.sessiontoken_string")).trim().notEmpty().withMessage(validationMsg("validation.sessiontoken_not_empty")),
  ]


  export const getGoogleAddressesValidator = [
    query('input').notEmpty().withMessage(validationMsg("validation.input_required")),
    query('sessiontoken').notEmpty().withMessage(validationMsg("validation.sessiontoken_required")),
    query('location').optional().isString().withMessage(validationMsg("validation.location_string")),
    query('radius').optional().isNumeric().withMessage(validationMsg("validation.radius_numeric")),
    query("types").optional().isIn(["default"]),
  ];

  export const getGooglePlaceDetailsValidator = [
    query('place_id').notEmpty().isString().withMessage(validationMsg("validation.place_id_required")),
    query('sessiontoken').notEmpty().isString().withMessage(validationMsg("validation.sessiontoken_required")),
    query('fields').optional().isString().withMessage(validationMsg("validation.fields_string")),
  ];

// Validator for the guest-browse `/public/bus-routes/search` mirror.
//
// Marked `.optional()` rather than `.notEmpty()` so the legacy
// 400 `{ error: "ORIGIN_DEST_REQUIRED" }` contract — emitted by both
// `BusRouteController.publicSearch` and `PublicBusRouteController.search`
// when either parameter is missing — stays the source of truth for that
// failure mode. The validator's only job here is to populate
// `matchedData(req)` so the controller can read sanitised values.
export const searchBusRoutesValidator = [
  query("originCity")
    .optional({ checkFalsy: true })
    .isString()
    .trim(),
  query("destCity")
    .optional({ checkFalsy: true })
    .isString()
    .trim(),
];
