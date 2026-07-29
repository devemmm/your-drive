/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Manage user transactions
 */

/**
 * @swagger
 * /api/v1/transactions:
 *   get:
 *     summary: Get all transactions (paginated and filtered)
 *     tags: [Transactions, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of transactions per page
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/TransactionStatus'
 *         description: Filter by transaction status
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/TransactionType'
 *         description: Filter by transaction type
 *       - in: query
 *         name: paymentProvider
 *         schema:
 *           $ref: '#/components/schemas/PaymentProvider'
 *         description: Filter by payment provider
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum transaction amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum transaction amount
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
 *         description: List of transactions retrieved successfully
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
 *                     $ref: '#/components/schemas/Transaction'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *
 * /api/v1/transactions/confirm:
 *   post:
 *     summary: Confirm payment for a PaymentSession (authorize PaymentIntent)
 *     tags: [Subscriptions, Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - paymentMethodId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "ps_1234-abcd"
 *                 description: The PaymentSession ID
 *               paymentMethodId:
 *                 type: string
 *                 example: "pm_1GqIC8Lz..."
 *               saveCard:
 *                 type: boolean
 *                 description: Whether to save the payment method to the customer
 *     responses:
 *       200:
 *         description: Payment authorized or 3DS required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Payment authorized and booking created
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Payment authorized. Funds will be captured after ride completion.
 *                     data:
 *                       type: object
 *                       properties:
 *                         booking:
 *                           $ref: "#/components/schemas/Booking"
 *                         transaction:
 *                           $ref: "#/components/schemas/Transaction"
 *                 - type: object
 *                   description: 3D Secure required
 *                   properties:
 *                     requiresAction:
 *                       type: boolean
 *                       example: true
 *                     clientSecret:
 *                       type: string
 *       400:
 *         description: Invalid request, payment failed, or insufficient coupons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 paymentIntentStatus:
 *                   type: string
 *                   example: requires_payment_method
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       403:
 *         description: Forbidden - Payment session does not belong to user
 *       404:
 *         description: Payment session not found
 *       409:
 *         description: Payment session already processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *
 * /api/v1/transactions/finalize-3ds:
 *   post:
 *     summary: Finalize a payment after successful 3D Secure
 *     tags: [Subscriptions, Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *               - sessionId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 example: "pi_1GqIC8Lz..."
 *               sessionId:
 *                 type: string
 *                 example: "ps_1234-abcd"
 *     responses:
 *       200:
 *         description: 3D Secure completed and booking created
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
 *                   example: Payment authorized successfully after 3D Secure. Funds will be captured after ride completion.
 *                 data:
 *                   type: object
 *                   properties:
 *                     booking:
 *                       $ref: "#/components/schemas/Booking"
 *                     transaction:
 *                       $ref: "#/components/schemas/Transaction"
 *       400:
 *         description: Payment not completed, invalid session, or insufficient coupons
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       409:
 *         description: Payment session already processed
 */

/**
 * @swagger
 * /api/v1/transactions/{transactionId}:
 *   get:
 *     summary: Get a transaction by ID
 *     tags: [Transactions, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the transaction to retrieve
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
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Transaction not found
 */
