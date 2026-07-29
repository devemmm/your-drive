import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { ReviewRatingController } from "../controllers/reviewRating.controller";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { languagePreference } from "../middlewares/languagePreference";
import {
  createRatingValidator,
  updateRatingValidator,
} from "../middlewares/validators/rating.request.validator";
import { param, query } from "express-validator";
import { validationMsg } from '../utils/validation';

const ratingsRouter = Router();

ratingsRouter.get(
  "/drivers/my-reviews",
  isAuthenticated,
  languagePreference,
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.page_positive_int"))
    .toInt(),
  query("pageSize")
    .optional()
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.page_size_positive_int"))
    .toInt(),
  validateRequestBody,
  ReviewRatingController.getMyReviewsAsADriver
);

ratingsRouter.get(
  "/drivers/:driverId",
  param("driverId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.driverId_positive"))
    .toInt(),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.page_positive_int"))
    .toInt(),
  query("pageSize")
    .optional()
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.page_size_positive_int"))
    .toInt(),
  validateRequestBody,
  ReviewRatingController.getReviewsByDriverId
);

// Apply authentication and language preference middleware to all routes
ratingsRouter.use(isAuthenticated, languagePreference);

ratingsRouter.get(
  "/passengers/submitted-reviews",
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.page_positive_int"))
    .toInt(),
  query("pageSize")
    .optional()
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.page_size_positive_int"))
    .toInt(),
  validateRequestBody,
  ReviewRatingController.getMySubmittedReviewsAsAPassenger
);

ratingsRouter.post(
  "/",
  createRatingValidator,
  validateRequestBody,
  ReviewRatingController.createReview
);

ratingsRouter.get(
  "/:id",
  param("id")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.ratingId_positive"))
    .toInt(),
    validateRequestBody,
    ReviewRatingController.getRatingById
  );
  ratingsRouter.put(
    "/:id",
    updateRatingValidator,
    validateRequestBody,
    ReviewRatingController.updateReview
  );
  ratingsRouter.delete(
    "/:id",
    param("id")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.ratingId_positive"))
    .toInt(),
  validateRequestBody,
  ReviewRatingController.deleteReview
);

export default ratingsRouter;
