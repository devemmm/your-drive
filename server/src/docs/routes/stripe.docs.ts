/**
 * @swagger
 * tags:
 *   name: Stripe
 *   description: Stripe onboarding and account management
 */

/**
 * @swagger
 * /api/v1/stripe/connect:
 *   get:
 *     summary: Initiate Stripe onboarding for the authenticated user (creates Express account if needed and returns an onboarding link)
 *     tags: [Stripe, Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: platform
 *         description: Platform initiating the flow; affects default redirect behavior. Defaults to "web".
 *         required: false
 *         schema:
 *           type: string
 *           enum: [web, mobile]
 *           default: web
 *       - in: query
 *         name: redirect_pathname
 *         description: Optional frontend pathname to return to after onboarding. For web and when omitted defaults to "/post-a-ride"; otherwise use provided pathname.
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stripe onboarding link generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: Stripe onboarding URL
 *                       example: "https://connect.stripe.com/setup/some_account_link"
 *       400:
 *         description: User is already connected to Stripe (isStripeOnboarded)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Failed to create Stripe account or onboarding link
 */

// /**
//  * @swagger
//  * /api/v1/stripe/return:
//  *   get:
//  *     summary: Handle Stripe onboarding return
//  *     tags: [Stripe, Users]
//  *     parameters:
//  *       - in: query
//  *         name: account
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Stripe account ID
//  *     responses:
//  *       200:
//  *         description: Stripe onboarding completed page
//  *         content:
//  *           text/html:
//  *             schema:
//  *               type: string
//  *               example: "<h2>🎉 Stripe Onboarding Completed</h2><p>You can now close this window or <a href='FRONTEND_URL'>return to the site</a>.</p>"
//  *       400:
//  *         description: Missing Stripe account ID
//  *       500:
//  *         description: An error occurred during onboarding return
//  */

// /**
//  * @swagger
//  * /api/v1/stripe/refresh:
//  *   get:
//  *     summary: Refresh Stripe onboarding link
//  *     tags: [Stripe]
//  *     parameters:
//  *       - in: query
//  *         name: account
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Stripe account ID
//  *     responses:
//  *       302:
//  *         description: Redirects to a new Stripe onboarding link
//  *       400:
//  *         description: Missing Stripe account ID
//  *       404:
//  *         description: No user found for this Stripe account
//  *       500:
//  *         description: Failed to refresh onboarding link
//  */
