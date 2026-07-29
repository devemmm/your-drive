import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { logger } from "../utils/logger";

/**
 * Stripe webhook handler.
 *
 * Verifies the incoming request signature against STRIPE_WEBHOOK_SECRET and
 * logs the event. Business logic for specific events (payment_intent.succeeded,
 * account.updated, etc.) is intentionally kept minimal until Stripe test keys
 * are configured and the full payment flow is activated.
 *
 * The route that uses this handler MUST use express.raw({ type: "application/json" })
 * instead of express.json() so the raw body buffer is available for signature
 * verification.
 */
export class WebhookController {
  static async stripeWebhookHandler(req: Request, res: Response): Promise<void> {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn("STRIPE_WEBHOOK_SECRET not configured, skipping verification", {
        action: "webhook_not_configured",
      });
      res.status(503).json({ error: "Webhook not configured" });
      return;
    }

    if (!sig) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    let event: Stripe.Event;

    try {
      // req.body is a Buffer here thanks to express.raw() middleware
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      logger.error("Webhook signature verification failed", {
        action: "webhook_signature_failed",
        meta: { error: err?.message },
      });
      res.status(400).send(`Webhook Error: ${err?.message}`);
      return;
    }

    logger.info(`Stripe webhook received: ${event.type}`, {
      action: "webhook_received",
      meta: { eventId: event.id, type: event.type },
    });

    // Handle minimal event routing. Full handling (booking finalization,
    // coupon redemption, email receipts, driver transfer) will be restored
    // when the payment flow is activated end-to-end.
    switch (event.type) {
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
      case "payment_intent.amount_capturable_updated":
      case "account.updated":
      case "account.application.deauthorized":
        logger.info(`[Stripe] ${event.type}`, {
          action: "webhook_event",
          meta: { eventId: event.id },
        });
        break;
      default:
        logger.debug(`[Stripe] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
}
