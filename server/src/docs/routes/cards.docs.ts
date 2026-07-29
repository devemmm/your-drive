/**
 * @swagger
 * 
 * /api/v1/cards:
 *   get:
 *     summary: Get all cards for the user
 *     tags: [Card Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     responses:
 *       200:
 *         description: List of cards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Card'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *
 *   post:
 *     summary: Initiate adding a new card for the user
 *     tags: [Card Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     responses:
 *       200:
 *         description: Card addition initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 clientSecret:
 *                   type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *
 * /api/v1/cards/default:
 *   get:
 *     summary: Get the default card for the user
 *     tags: [Card Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     responses:
 *       200:
 *         description: Default card found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Card'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: No default card set
 *
 * /api/v1/cards/{paymentMethodId}:
 *   delete:
 *     summary: Delete a card by payment method ID
 *     tags: [Card Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentMethodId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Stripe payment method ID of the card to delete
 *         example: pm_1N...
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     responses:
 *       200:
 *         description: Card deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Card does not belong to you
 *       404:
 *         description: Card not found
 *
 * /api/v1/cards/{paymentMethodId}/default:
 *   patch:
 *     summary: Set a card as the default card
 *     tags: [Card Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentMethodId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Stripe payment method ID of the card to set as default
 *         example: pm_1N...
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     responses:
 *       200:
 *         description: Default card set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Card does not belong to you
 *       404:
 *         description: Card not found
 *
 * components:
 *   schemas:
 *     Card:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: pm_1N...
 *           description: This is the Stripe payment method ID for the card
 *         brand:
 *           type: string
 *           example: visa
 *         last4:
 *           type: string
 *           example: "4242"
 *         expMonth:
 *           type: integer
 *           example: 12
 *         expYear:
 *           type: integer
 *           example: 2026
 *         isExpired:
 *           type: boolean
 *           example: false
 *         isDefault:
 *           type: boolean
 *           example: false
 */
