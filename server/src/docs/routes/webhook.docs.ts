/**
 * @swagger
 * /api/v1/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook event handler
 *     description: |
 *       Receives and processes webhook events from Stripe, such as payment_intent.succeeded and payment_intent.payment_failed.
 *       Verifies the Stripe signature and completes the transaction.
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe webhook event payload
 *     responses:
 *       200:
 *         description: Webhook event processed successfully
 *       400:
 *         description: Invalid Stripe signature or malformed payload
 */
