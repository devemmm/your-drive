import { Router } from "express";
import { validatePagination, validateRequestBody } from "../middlewares/validators";
import { RideRequestController } from '../controllers/rideRequest.controller';
import * as validator from '../middlewares/validators/rideRequests.validator';
import { submitBidValidator, bidIdParamValidator } from "../middlewares/validators/bid.request.validator";
import { BidController } from "../controllers/bid.controller";

const router = Router();

router
  .post(
    "/",
    validator.createRideRequestValidator,
    validateRequestBody,
    RideRequestController.createRideRequest
  )
  .get(
    "/",
    validator.listRideRequestsValidator,
    validateRequestBody,
    RideRequestController.getAllRideRequests
  )
  .get(
    "/open-for-drivers",
    RideRequestController.getOpenRideRequestsForDrivers
  )
  .post(
    "/:requestId/accept",
    validator.acceptRideRequestValidator,
    validateRequestBody,
    RideRequestController.acceptRideRequest
  )
  .post(
    "/:id/bids",
    submitBidValidator,
    validateRequestBody,
    BidController.submit
  )
  .get(
    "/:id/bids",
    bidIdParamValidator,
    validateRequestBody,
    BidController.listForRequest
  )
  .patch(
    "/:requestId",
    validator.rideRequestIdValidator,
    validator.createRideRequestValidator,
    validateRequestBody,
    RideRequestController.updateRideRequest
  )
  .get(
    "/:requestId",
    validator.rideRequestIdValidator,
    validateRequestBody,
    RideRequestController.getRideRequestById
  )
  .get(
    "/:requestId/matches",
    validator.rideRequestIdValidator,
    validatePagination,
    validateRequestBody,
    RideRequestController.getRideRequestMatches
  )
  .patch(
    "/:requestId/open",
    validator.rideRequestIdValidator,
    validateRequestBody,
    RideRequestController.openRideRequest
  )
  .patch(
    "/:requestId/close",
    validator.rideRequestIdValidator,
    validateRequestBody,
    RideRequestController.closeRideRequest
  )
  .delete(
    "/:requestId",
    validator.rideRequestIdValidator,
    validateRequestBody,
    RideRequestController.deleteRideRequest
  )
;

export default router;
