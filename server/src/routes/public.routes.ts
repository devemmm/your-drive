import { Router } from "express";
import {
  validateRequestBody,
} from "../middlewares/validators";
import * as rideValidator from "../middlewares/validators/ride.request.validator";
import { RideController } from "../controllers/ride.controller";
import { param } from "express-validator";
import { AdminController } from "../controllers/admin.controller";
import { ContactMessageController } from '../controllers/contact.messages.controller';
import { createContactMessageValidator } from '../middlewares/validators/contact.message.request.validator';
import { validationMsg } from '../utils/validation';
import * as publicValidators from '../middlewares/validators/public.validators';
import { PublicController } from '../controllers/public.controller';
import { RentalController } from "../controllers/rental.controller";
import { rentalValidators } from "../middlewares/validators/rental.request.validator";
import { ChauffeurController } from "../controllers/chauffeur.controller";
import { chauffeurValidators } from "../middlewares/validators/chauffeur.request.validator";
import { PublicRentalController } from "../controllers/public/rentals.controller";
import { PublicChauffeurController } from "../controllers/public/chauffeurs.controller";
import { PublicRideController } from "../controllers/public/rides.controller";
import { PublicBusRouteController } from "../controllers/public/busRoutes.controller";
import { PublicOperatorController } from "../controllers/public/operators.controller";
import { PublicDriversController } from "../controllers/public/drivers.controller";
import { nearbyValidator } from "../middlewares/validators/driverPresence.validator";

const router = Router();

router.get(
  "/rides",
  rideValidator.validateGetAllRides,
  validateRequestBody,
  RideController.getAllRides
);
// Guest-browse mirror: same payload as the legacy `RideController.searchRides`
// mount, now backed by the shared `rideSearch` service so driver phone /
// email are stripped via the response mapper for guest viewers.
router.get(
  "/rides/search",
  rideValidator.validateSearchRides,
  validateRequestBody,
  PublicRideController.list
);
router.get(
  "/rides/:rideId",
  param("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
  validateRequestBody,
  RideController.getRideById
);

router.get("/coupons/redemption-rules", AdminController.getCouponRedemptionRules);
router.post("/contact-messages", createContactMessageValidator, validateRequestBody, ContactMessageController.createMessage);

router.post("/directions", publicValidators.getDirectionsValidator, validateRequestBody, PublicController.getDirectionsData);

router.get(
  '/places/autocomplete/cities',
  publicValidators.getGooglePlacesValidator,
  validateRequestBody,
  PublicController.getPlacesAutocompleteCities
);

router.get(
  '/places/autocomplete/addresses',
  publicValidators.getGoogleAddressesValidator,
  validateRequestBody,
  PublicController.getPlacesAutocompleteAddresses
);

router.get(
  '/places/details',
  publicValidators.getGooglePlaceDetailsValidator,
  validateRequestBody,
  PublicController.getPlaceDetails
);

router.get("/rentals/vehicles/available", ...rentalValidators.searchAvailableVehicles, validateRequestBody, RentalController.searchAvailableVehicles);

// New guest-browse mirror: same payload as /rentals/vehicles/available, but
// owner phone/email stripped via the shared rentalSearch service mapper.
router.get(
  "/rentals/search",
  ...rentalValidators.searchAvailableVehicles,
  validateRequestBody,
  PublicRentalController.list
);

router.get(
  "/rentals/vehicles/:vehicleId",
  param("vehicleId").isInt({ min: 1 }).toInt(),
  validateRequestBody,
  RentalController.getRentalVehicle
);

router.get("/chauffeur-drivers", ...chauffeurValidators.searchAvailableDrivers, validateRequestBody, ChauffeurController.searchAvailableDrivers);

// New guest-browse mirror: same payload as /chauffeur-drivers, but phone
// and email stripped via the shared chauffeurSearch service mapper.
router.get(
  "/chauffeur-services/search",
  ...chauffeurValidators.searchAvailableDrivers,
  validateRequestBody,
  PublicChauffeurController.list
);

// Guest-browse mirror of the legacy authed `/bus-routes/search` endpoint
// (mounted on `routes/index.ts` under `/bus-routes` behind
// `isAuthenticated`). Backed by the same shared `busRouteSearch` service
// so both paths stay in lockstep. Bus routes have no auth-only fields,
// so the guest and authed responses are identical; the response mapper
// still defensively strips operator phone/email if a future schema
// change surfaces them.
router.get(
  "/bus-routes/search",
  ...publicValidators.searchBusRoutesValidator,
  validateRequestBody,
  PublicBusRouteController.search
);

// Guest-browse mirror of the legacy authed `/drivers/nearby` endpoint
// (mounted on `routes/index.ts` under `/drivers` behind
// `isAuthenticated`). Backed by the same shared `driverNearbySearch`
// service so both paths stay in lockstep. Driver-nearby rows are
// non-PII by construction — `id` is a rotation-hashed token (not the
// raw user id) — so guest and authed responses are byte-for-byte
// identical. The `nearbyValidator` chain enforces the same bbox bounds
// the authed endpoint already validates; no per-user rate limiter is
// attached here because the existing `createUserRateLimiter` is a no-op
// for unauthenticated callers anyway.
router.get(
  "/drivers/nearby",
  nearbyValidator,
  validateRequestBody,
  PublicDriversController.nearby
);

router.get("/operators", PublicOperatorController.list);

router.get(
  "/operators/:operatorId/routes",
  param("operatorId").isInt({ gt: 0 }).toInt(),
  validateRequestBody,
  PublicOperatorController.routes
);

router.get(
  "/bus-routes/:routeId/trips",
  param("routeId").isInt({ gt: 0 }).toInt(),
  validateRequestBody,
  PublicBusRouteController.trips
);

export default router;
