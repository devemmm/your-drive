import express from "express";
import {SubscriptionController} from "../controllers/subscription.controller";
import { isAdmin } from "../middlewares/isAdmin";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import * as subscriptionValidator from "../middlewares/validators/subscription.request.validator";
import { validateRequestBody } from "../middlewares/validators";

const router = express.Router();

// Admin routes
router
  .route("/plans")
  .post(
    isAuthenticated,
    isAdmin,
    subscriptionValidator.createPlanValidator,
    validateRequestBody,
    SubscriptionController.createSubscriptionPlan
  )
  .get(
    subscriptionValidator.getSubscribePlansValidator,
    validateRequestBody,
    SubscriptionController.getSubscriptionPlans
  );

router
  .route("/plans/:id")
  .patch(
    isAuthenticated,
    isAdmin,
    subscriptionValidator.updatePlanValidator,
    validateRequestBody,
    SubscriptionController.updateSubscriptionPlan
  );

// User routes
router
  .route("/subscribe")
  .post(
    isAuthenticated,
    subscriptionValidator.subscribeValidator,
    validateRequestBody,
    SubscriptionController.subscribeToAPlan
  );

router
  .route("/current")
  .get(
    isAuthenticated,
    SubscriptionController.getCurrentSubscription
  );

router
  .route("/history")
  .get(
    isAuthenticated,
    subscriptionValidator.getSubscriptionsValidator,
    validateRequestBody,
    SubscriptionController.getSubscriptionHistory
  );

export default router;
