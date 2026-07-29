import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import * as rideValidator from "../middlewares/validators/ride.request.validator";
import { RideController } from "../controllers/ride.controller";
import { param } from "express-validator";
import { isAdmin } from '../middlewares/isAdmin';
import { validationMsg } from '../utils/validation';

const router = Router();

// Ride routes
router.post("/from-schedule", RideController.createFromSchedule);

router.post(
  "/",
  rideValidator.validateCreateRide,
  validateRequestBody,
  RideController.createRide
);
router.put(
  "/:rideId",
  rideValidator.validateCreateRide,
  param("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
  validateRequestBody,
  RideController.updateRide
);
router.get(
  "/",
  rideValidator.validateGetAllRides,
  validateRequestBody,
  RideController.getAllRides
);
router.get(
  "/:rideId",
  rideValidator.validateGetRide,
  validateRequestBody,
  RideController.getRideById
);
router.post(
  "/:rideId/book",
  rideValidator.validateBookRide,
  validateRequestBody,
  RideController.bookARide
);
router.put(
  "/:rideId/complete",
  param("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
  validateRequestBody,
  RideController.completeRide
);
router.patch(
  "/:rideId/start-ride",
  param("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
  validateRequestBody,
  RideController.startRide
);
router.patch(
  "/:rideId/make-attendance",
  rideValidator.validateMakeRideAttendance,
  validateRequestBody,
  RideController.makeRideAttendance
);

router.patch(
  "/:rideId/publish",
  rideValidator.validatePublishRide,
  validateRequestBody,
  RideController.publishRide
);

router.patch(
  "/:rideId/cancel",
  rideValidator.validateCancelRide,
  validateRequestBody,
  RideController.cancelRide
);

router.patch(
  "/:rideId/block",
  isAdmin,
  rideValidator.validateCancelRide,
  validateRequestBody,
  RideController.blockRide
);
router.patch(
  "/:rideId/unblock",
  isAdmin,
  param("rideId")
  .isInt({ gt: 0 })
  .withMessage(validationMsg("validation.rideId_positive"))
  .escape()
  .toInt(),
  validateRequestBody,
  RideController.ubblockRide
);

router.patch(
  "/:rideId/review-ride-cancellation",
  isAdmin,
  rideValidator.validateReviewRideCancellation,
  validateRequestBody,
  RideController.reviewRideCancellation
);

router.delete(
  "/:rideId",
  param("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
  validateRequestBody,
  RideController.deleteRide
)

router.get("/:id/manifest", RideController.getManifest);

export default router;
