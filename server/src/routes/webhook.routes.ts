import express from "express";
import { WebhookController } from "../controllers/webhook.controller";

const router = express.Router();

// IMPORTANT: Stripe webhook requires the raw body for signature verification.
// express.raw() must run before express.json() for this path only.
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  WebhookController.stripeWebhookHandler
);

export default router;
