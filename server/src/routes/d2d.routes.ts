import { Router } from "express";
import { validatePagination, validateRequestBody } from "../middlewares/validators";
import * as d2dValidator from "../middlewares/validators/d2d.request.validator";
import { D2DController } from "../controllers/d2d.controller";
import { param } from "express-validator";
import { validationMsg } from '../utils/validation';

const router = Router();

router.get(
  "/requests",
  validatePagination,
  d2dValidator.validateGetAllD2DRequests,
  validateRequestBody,
  D2DController.getAllD2DBookingRequests
);
router.get(
  "/:requestId",
  param("requestId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.requestId_positive"))
    .toInt(),
  validateRequestBody,
  D2DController.getD2DBookingRequestById
);

router.get(
  "/ride/:rideId/requests",
  param("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
    validatePagination,
  validateRequestBody,
  D2DController.getD2DRideBookingRequests
);

router.post(
  "/",
  d2dValidator.validateCreateD2DRide,
  validateRequestBody,
  D2DController.createD2DRide
);
router.patch(
  "/:rideId",
  param("rideId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.rideId_positive"))
    .escape()
    .toInt(),
  d2dValidator.validateCreateD2DRide,
  validateRequestBody,
  D2DController.updateD2DRide
);
router.patch(
  "/:requestId/accept",
  param("requestId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.requestId_positive"))
    .toInt(),
  validateRequestBody,
  D2DController.acceptD2DRequest
);
router.post(
  "/:requestId/initialize-payment",
  d2dValidator.validateInitializePayment,
  validateRequestBody,
  D2DController.initializePayment
);
router.post(
  "/:rideId/request",
 
    d2dValidator.validateSubmitD2dBookingReq,
  validateRequestBody,
  D2DController.requestToBookAD2DRide
);
router.post(
  "/:rideId/book",
    d2dValidator.validateBookD2DRide,
  validateRequestBody,
  D2DController.bookAD2DRide
);

router.patch(
  "/:requestId/cancel",
  param("requestId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.requestId_positive"))
    .escape()
    .toInt(),
  d2dValidator.validateCancelD2DRequest,
  validateRequestBody,
  D2DController.cancelD2DRequest
);

router.patch(
  "/:requestId/decline",
  param("requestId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.requestId_positive"))
    .escape()
    .toInt(),
  d2dValidator.validateCancelD2DRequest,
  validateRequestBody,
  D2DController.declineD2DBookingRequest
);

export default router;