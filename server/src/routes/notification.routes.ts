import express from "express";
import { param, body } from "express-validator";
import { validatePagination, validateRequestBody } from "../middlewares/validators";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { languagePreference } from "../middlewares/languagePreference";
import { NotificationsController } from "../controllers/notification.controller";
import { validationMsg } from '../utils/validation';

const router = express.Router();

router.use(isAuthenticated, languagePreference);

router.get(
    "/",
    validatePagination,
    validateRequestBody,
    NotificationsController.getUserNotifications
);

router.patch(
    "/:notificationId/read",
    param("notificationId").isInt({ gt: 0 }).withMessage(validationMsg("validation.notification_id_positive")).toInt(),
    validateRequestBody,
    NotificationsController.markSingleAsRead
);

router.patch(
    "/read-all",
    NotificationsController.markAllAsRead
);

// Register FCM token
router.post(
    "/register-fcm-token",
    body("token").isString().notEmpty().withMessage(validationMsg("validation.fcm_token_required")),
    validateRequestBody,
    NotificationsController.registerFCMToken
);

export default router;
