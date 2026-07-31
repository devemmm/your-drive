import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { appleAuthController } from "../controllers/appleAuth.controller";
import * as authValidator from "../middlewares/validators/auth.request.validator";


import { logger } from "../utils/logger";
import { validateRequestBody } from "../middlewares/validators";
import { body } from "express-validator";

const router = Router();

// Regular auth routes
router
  .route("/login")
  .post(authValidator.loginRequestBodyValidator, validateRequestBody, AuthController.login);
router
  .route("/register")
  .post(authValidator.registerRequestBodyValidator, validateRequestBody, AuthController.register);
router
  .route("/forgot-password")
  .post(authValidator.forgotPasswordValidator, validateRequestBody, AuthController.forgotPassword);
router
  .route("/forgot-password/web")
  .post(authValidator.forgotPasswordValidator, validateRequestBody, AuthController.forgotPasswordWeb);
router
  .route("/reset-password/web")
  .post(authValidator.resetWebPasswordValidator, validateRequestBody, AuthController.resetPasswordWeb);
router
  .route("/reset-password")
  .post(authValidator.resetPasswordValidator, validateRequestBody, AuthController.resetPassword);
router
  .route("/verify-email")
  .post(authValidator.verifyEmailValidator, validateRequestBody, AuthController.verifyEmail);
router
  .route("/resend-verification")
  .post(authValidator.resendVerificationValidator, validateRequestBody, AuthController.resendVerification);

// OAuth routes - only add if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.post(
    "/google",
    authValidator.loginWithGoogle,
    validateRequestBody,
    AuthController.googleAuth
  );
  
  logger.debug("Google OAuth routes configured");
};

router.post(
  "/google/mobile",
  authValidator.mobileLoginWithGoogle,
  validateRequestBody,
  AuthController.mobileGoogleAuth
);

// if (
//   process.env.APPLE_CLIENT_ID &&
//   process.env.APPLE_TEAM_ID &&
//   process.env.APPLE_KEY_ID &&
//   process.env.APPLE_PRIVATE_KEY_LOCATION
// ) {
//   router.get("/apple", passport.authenticate("apple"));
//   router.get(
//     "/apple/callback",
//     passport.authenticate("apple", { session: false }),
//     AuthController.appleCallback
//   );
//   logger.debug("Apple OAuth routes configured");
// }

// Apple Sign-In (mobile)
router.post("/apple", appleAuthController);

export default router;
