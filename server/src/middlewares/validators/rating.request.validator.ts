import { checkSchema } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const createRatingValidator = checkSchema({
  driverId: {
    in: ["body"],
    isInt: { options: { min: 1 } },
    toInt: true,
    errorMessage: validationMsg("validation.driverId_positive"),
  },
  rating: {
    in: ["body"],
    isInt: { options: { min: 1, max: 5 } },
    toInt: true,
    errorMessage: validationMsg("validation.rating_range"),
  },
  review: {
    in: ["body"],
    isString: true,
    trim: true,
    optional: true,
    isLength: {
      options: { max: 200 },
      errorMessage: validationMsg("validation.review_max_200"),
    },
    errorMessage: validationMsg("validation.review_string"),
  },
  rideId: {
    in: ["body"],
    isInt: { options: { min: 1 } },
    toInt: true,
    errorMessage: validationMsg("validation.rideId_positive"),
  },
});

export const updateRatingValidator = checkSchema({
  rating: {
    in: ["body"],
    isInt: { options: { min: 1, max: 5 } },
    toInt: true,
    optional: true,
    errorMessage: validationMsg("validation.rating_range"),
  },
  review: {
    in: ["body"],
    isString: true,
    trim: true,
    optional: true,
    isLength: {
      options: { max: 500 },
      errorMessage: validationMsg("validation.review_max_200"), // keep message style
    },
    errorMessage: validationMsg("validation.review_string"),
  },
  id: {
    in: ["params"],
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.ratingId_positive"),
    },
    toInt: true,
    errorMessage: validationMsg("validation.ratingId_positive"),
  }
});
