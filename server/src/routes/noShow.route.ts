import { Router } from "express";
import { noShowRequestBodyValidation } from "../middlewares/validators/noShow.request";
import { validateRequestBody } from "../middlewares/validators";
import { param } from "express-validator";
import { NoShowController } from "../controllers/noShow.controller";
import { isAdmin } from '../middlewares/isAdmin';
import { validationMsg } from '../utils/validation';

const router = Router();

router
  .post(
    "/",
    noShowRequestBodyValidation,
    validateRequestBody,
    NoShowController.reportNoShow
  )
  .get(
    "/:userId",
    isAdmin,
    param("userId")
      .exists()
      .withMessage(validationMsg("validation.suspend_userId_required"))
      .isInt({ gt: 0 })
      .withMessage(validationMsg("validation.userId_positive"))
      .toInt(),
    validateRequestBody,
    NoShowController.getNoShows
  )
  .get(
    "/rides/:rideId",
    isAdmin,
    param("rideId")
      .exists()
      .withMessage(validationMsg("validation.rideId_required"))
      .isInt({ gt: 0 })
      .withMessage(validationMsg("validation.rideId_positive"))
      .toInt(),
    validateRequestBody,
    NoShowController.getNoShowsByRides
  );

export default router;
