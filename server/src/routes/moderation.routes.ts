import { Router } from "express";
import { ModerationController } from "../controllers/moderation.controller";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { validateRequestBody } from "../middlewares/validators";
import {
  moderateContentValidator,
  moderateMultipleValidator,
} from "../middlewares/validators/moderation.request.validator";

// Import documentation (this will be picked up by swagger)
import "../docs/routes/moderation.docs";

const router = Router();

router.post(
  "/content",
  isAuthenticated,
  moderateContentValidator,
  validateRequestBody,
  ModerationController.moderateContent
);

router.post(
  "/multiple",
  isAuthenticated,
  moderateMultipleValidator,
  validateRequestBody,
  ModerationController.moderateMultiple
);

export default router;
