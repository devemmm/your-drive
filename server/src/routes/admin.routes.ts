import {
  getSubscribePlansValidator,
  getUserSubscriptionsValidator,
  updateCommissionValidator,
} from "./../middlewares/validators/subscription.request.validator";
import { Router } from "express";
import {
  validatePagination,
  validateRequestBody,
} from "../middlewares/validators";
import * as settingsValidator from "../middlewares/validators/setting.request.validator";
import { AdminController } from "../controllers/admin.controller";
import { body, param } from "express-validator";
import { ContactMessageController } from "../controllers/contact.messages.controller";
import { NoShowController } from "../controllers/noShow.controller";
import {
  confirmNoShowValidator,
  rejectNoShowValidator,
} from "../middlewares/validators/noShow.request";
import { SubscriptionController } from "../controllers/subscription.controller";
import { validationMsg } from "../utils/validation";
import { AdminUsersController } from "../controllers/adminUsers.controller";
import { createAdminUserValidator } from "../middlewares/validators/adminUsers.request";

const router = Router();

// Admin-only user creation (sets role + bypasses regular self-register flow)
router.post(
  "/users",
  createAdminUserValidator,
  validateRequestBody,
  AdminUsersController.createUser,
);

// Regular auth routes
router.post(
  "/settings",
  settingsValidator.validateCreateFeeSetting,
  validateRequestBody,
  AdminController.createFeeSetting
);
router.get("/settings/commission", AdminController.getCommissionSettings);
router.put(
  "/settings/commission",
  updateCommissionValidator,
  validateRequestBody,
  AdminController.updateCommissionSetting
);
router.get("/settings", AdminController.getFeeSettings);

router.get("/settings/d2d", AdminController.getD2DSettings);
router.put(
  "/settings/d2d",
  body("maxRadiusKm")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.maxRadius_positive"))
    .toFloat(),
  body("maxPricePerExtraKm")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.maxPricePerExtraKm_positive"))
    .toFloat(),
  validateRequestBody,
  AdminController.updateD2DSettings
);

router.put(
  "/settings/:feeSettingId",
  settingsValidator.validateUpdateFeeSetting,
  validateRequestBody,
  AdminController.updateFeeSetting
);
router.delete(
  "/settings/:feeSettingId",
  param("feeSettingId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.feeSettingId_positive"))
    .escape()
    .toInt(),
  validateRequestBody,
  AdminController.deleteFeeSetting
);
router.get(
  "/coupon-redemption-rules",
  AdminController.getCouponRedemptionRules
);
router.get(
  "/logs",
  settingsValidator.validateGetLogs,
  validateRequestBody,
  AdminController.getLogs
);
router.put(
  "/coupon-redemption-rules/:ruleId",
  settingsValidator.validateUpdateCouponRedeemRuleSetting,
  validateRequestBody,
  AdminController.updateCouponRedemptionRule
);
router.delete(
  "/users/:userId/delete-user",
  param("userId")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.userId_positive"))
    .escape()
    .toInt(),
  validateRequestBody,
  AdminController.deleteUser
);
// No-show routes
router.get(
  "/no-shows/all",
  validatePagination,
  validateRequestBody,
  NoShowController.getAllNoShows
);
router.get("/no-shows/stats", NoShowController.getNoShowStatistics);
router.patch(
  "/no-shows/:id/confirm",
  confirmNoShowValidator,
  validateRequestBody,
  NoShowController.confirmNoShow
);
router.patch(
  "/no-shows/:id/reject",
  rejectNoShowValidator,
  validateRequestBody,
  NoShowController.rejectNoShow
);

router.post(
  "/users/:userId/suspend-account",
  settingsValidator.validateSuspendUser,
  validateRequestBody,
  AdminController.suspendUserAccount
);
router.post(
  "/users/:userId/activate-account",
  param("userId")
    .exists()
    .withMessage(validationMsg("validation.suspend_userId_required"))
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.userId_positive"))
    .toInt(),
  validateRequestBody,
  AdminController.activateUserAccount
);

// contact message routes
router.get(
  "/contact-messages",
  validatePagination,
  validateRequestBody,
  ContactMessageController.getMessages
);
router.get(
  "/contact-messages/:id",
  param("id")
    .exists()
    .withMessage(validationMsg("validation.message_id_required"))
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.message_id_postive"))
    .toInt(),
  validateRequestBody,
  ContactMessageController.getMessageById
);
router.patch(
  "/contact-messages/:id/read",
  param("id")
    .exists()
    .withMessage(validationMsg("validation.message_id_required"))
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.message_id_postive"))
    .toInt(),
  validateRequestBody,
  ContactMessageController.markAsRead
);
router.delete(
  "/contact-messages/:id",
  param("id")
    .exists()
    .withMessage(validationMsg("validation.message_id_required"))
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.message_id_postive"))
    .toInt(),
  validateRequestBody,
  ContactMessageController.deleteMessage
);

router.get(
  "/plans",
  getSubscribePlansValidator,
  validateRequestBody,
  SubscriptionController.getSubscriptionPlans
);
router.get(
  "/user-subscriptions",
  getUserSubscriptionsValidator,
  validateRequestBody,
  SubscriptionController.adminListUserSubscriptions
);

export default router;
