import express from "express";
import {
  updateProfileImage,
  updatePreferences,
  getOnboardingStatus,
  updateDriverOnboarding,
  uploadDriverLicense,
  updatePassengerOnboarding,
  getOnboardingProgress,
} from "../controllers/onboarding.controller";
import { uploadImage } from "../middlewares/multerUpload";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { languagePreference } from "../middlewares/languagePreference";
import {
  validateDriverOnboarding,
  validatePassengerOnboarding,
  validateUpdatePreferences,
} from "../middlewares/validators/user.request.validator";
import { validateRequestBody } from "../middlewares/validators";
import { query } from "express-validator";
import { validationMsg } from "../utils/validation";

const router = express.Router();
// The userId will be extracted from the JWT token in the middleware
router.use(isAuthenticated, languagePreference);

router.get("/status", getOnboardingStatus);
router.post("/profile-image", uploadImage.single("image"), updateProfileImage);
router.post(
  "/preferences",
  validateUpdatePreferences,
  validateRequestBody,
  updatePreferences
);

// New comprehensive onboarding routes
router.get("/progress", getOnboardingProgress);
router.post(
  "/driver",
  validateDriverOnboarding,
  validateRequestBody,
  updateDriverOnboarding
);
router.post(
  "/driver/license",
  uploadImage.single("license"),
  query("side")
    .isString()
    .withMessage(validationMsg("validation.licence_image_invalid"))
    .toLowerCase()
    .isIn(["front", "back"])
    .withMessage(validationMsg("validation.licence_image_invalid")),
  validateRequestBody,
  uploadDriverLicense
);
router.post(
  "/passenger",
  validatePassengerOnboarding,
  validateRequestBody,
  updatePassengerOnboarding
);

export default router;
