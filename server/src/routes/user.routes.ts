import { Router } from "express";
import onBoardingRoutes from "./onboarding.routes";
import * as userValidators from "../middlewares/validators/user.request.validator";
import { UserController } from "../controllers/user.controller";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validateRequestBody } from "../middlewares/validators";
import { uploadImage } from "../middlewares/multerUpload";
import { isAdmin } from "../middlewares/isAdmin";
import { isAccountOwnerOrAdmin } from "../middlewares/isAccountOwnerOrAdmin";
import { languagePreference } from "../middlewares/languagePreference";

const router = Router();
router.use(isAuthenticated, languagePreference);

router.route("/").get(isAdmin, UserController.getUsers);

router.use("/onboarding", onBoardingRoutes);

router
  .route("/add-phone")
  .post(
    userValidators.addPhoneNumberValidator,
    validateRequestBody,
    UserController.addPhoneNumber
  );

router
  .route("/verify-phone")
  .post(
    userValidators.verifyPhoneNumberValidator,
    validateRequestBody,
    UserController.verifyPhoneNumber
  );

router
  .route("/resend-phone-verification")
  .post(
    userValidators.resendPhoneVerificationValidator,
    validateRequestBody,
    UserController.resendPhoneVerification
  );

router.route("/update").post(
  userValidators.updateProfileValidator,
  validateRequestBody,
  UserController.updateProfile
);

router.route("/chauffeur-availability").patch(
  userValidators.updateChauffeurAvailabilityValidator,
  validateRequestBody,
  UserController.updateChauffeurAvailability
);

router.route("/ride-request-availability").patch(
  userValidators.updateRideRequestAvailabilityValidator,
  validateRequestBody,
  UserController.updateRideRequestAvailability
);

router.route("/profile").get(UserController.getProfile);
router
  .route("/:id")
  .get(isAccountOwnerOrAdmin, UserController.getUser);
router.route("/:id").get(isAdmin, UserController.getUser);
router
  .route("/invite")
  .post(
    userValidators.inviteFriendValidator,
    validateRequestBody,
    UserController.inviteFriend
  );
router
  .route("/change-password")
  .post(
    userValidators.changePasswordValidator,
    validateRequestBody,
    UserController.changePassword
  );

router
  .route("/delete-account")
  .delete(
    UserController.deleteAccount
  );

export default router;
