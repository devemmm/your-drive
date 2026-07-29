/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management for users and admins
 */

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   post:
 *     summary: Create a new subscription plan (Admin only)
 *     tags: [Subscriptions, Admin]
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
 *             # Either duration (MONTHLY/QUARTERLY/YEARLY) OR subscriptionEndDate (exact date) must be provided.
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - name
 *                   - type
 *                   - duration
 *                   - price
 *                   - category
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Name of the plan. *(required)*
 *                     example: "Monthly Driver Plan"
 *                   description:
 *                     type: string
 *                     example: "A monthly plan for drivers."
 *                   type:
 *                     type: string
 *                     enum: [PASSENGER, DRIVER, BOTH]
 *                     example: "DRIVER"
 *                   duration:
 *                     type: string
 *                     enum: [MONTHLY, QUARTERLY, YEARLY]
 *                     example: "MONTHLY"
 *                   price:
 *                     type: number
 *                     example: 19.99
 *                   availableUntil:
 *                     type: number
 *                     format: int32
 *                     description: Date until users can subscribe to this plan (optional), expect a getTime() value from the date.
 *                     example: 1760911200000
 *                   category:
 *                     type: string
 *                     enum: [COMMERCIAL, PROMO]
 *                     description: "Plan category. Default: COMMERCIAL"
 *               - type: object
 *                 required:
 *                   - name
 *                   - type
 *                   - subscriptionEndDate
 *                   - price
 *                   - category
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Name of the plan. *(required)*
 *                     example: "Promo — 14 Days Free"
 *                   description:
 *                     type: string
 *                     example: "Promo plan valid until a specific date."
 *                   type:
 *                     type: string
 *                     enum: [PASSENGER, DRIVER, BOTH]
 *                     example: "PASSENGER"
 *                   subscriptionEndDate:
 *                     type: number
 *                     format: int32
 *                     description: Default subscription end date applied to any user who subscribes to this plan. *(required for promo-style plans)*, expect a getTime() value from the date.
 *                     example: 1760911200000
 *                   price:
 *                     type: number
 *                     example: 0
 *                   availableUntil:
 *                     type: number
 *                     format: int32
 *                     description: Date until users can subscribe to this plan (optional), expect a getTime() value from the date.
 *                     example: 1760911200000
 *                   category:
 *                     type: string
 *                     enum: [COMMERCIAL, PROMO]
 *                     description: "Plan category. Default: PROMO"
 *     responses:
 *       201:
 *         description: Subscription plan created successfully
 *       400:
 *         description: Validation error (e.g., missing required fields, both/none of duration and subscriptionEndDate)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *   get:
 *     summary: Get active subscription plans (non-admins only receive subscribable plans)
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PASSENGER, DRIVER, BOTH]
 *         description: Filter plans by type
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *         description: If true, include expired plans (Admin only). Non-admins are unaffected by this param and will still only receive active & subscribable plans.
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
 *         description: List of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 * /api/v1/admin/plans:
 *   get:
 *     summary: Get active subscription plans (admin)
 *     tags: [Subscriptions, Admin]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PASSENGER, DRIVER, BOTH]
 *         description: Filter plans by type
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *         description: If true, include expired plans (Admin only). Non-admins are unaffected by this param and will still only receive active & subscribable plans.
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 *
 * /api/v1/subscriptions/plans/{id}:
 *   patch:
 *     summary: Update a subscription plan (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the subscription plan
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             # Partial update: any of the fields can be provided.
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PASSENGER, DRIVER, BOTH]
 *               duration:
 *                 type: string
 *                 enum: [MONTHLY, QUARTERLY, YEARLY]
 *               subscriptionEndDate:
 *                 type: number
 *                 format: int32
 *                 description: If provided, this will be used as the default subscription end date for new user subscriptions (takes precedence over duration if both supplied), expect a getTime() value from the date.
 *               availableUntil:
 *                 type: number
 *                 format: int32
 *                 description: Date until users can subscribe to this plan, expect a getTime() value from the date
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: [COMMERCIAL, PROMO]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Subscription plan updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Plan not found
 *
 * /api/v1/subscriptions/subscribe:
 *   post:
 *     summary: Initialize subscription (creates a temporary PaymentSession) or activate immediately for free/promo/coupon flows
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
 *               - planId
 *               - billingAddress
 *             properties:
 *               planId:
 *                 type: integer
 *                 example: 1
 *                 description: The ID of the subscription plan
 *               useCoupons:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to use coupons for subscription. Coupons are only applicable to paid plans that use `duration`.
 *               billingAddress:
 *                 $ref: '#/components/schemas/BillingAddress'
 *     responses:
 *       201:
 *         description: Subscription activated immediately (promo/free plan)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 subscription:
 *                   $ref: '#/components/schemas/UserSubscription'
 *       200:
 *         description: PaymentSession created (paid plan) OR coupon activation result
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     data:
 *                       type: object
 *                       properties:
 *                         sessionId:
 *                           type: string
 *                           description: Temporary PaymentSession id to be used for confirming payment
 *                         baseAmount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         subscriptionFee:
 *                           type: number
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                     subscription:
 *                       $ref: '#/components/schemas/UserSubscription'
 *                     remainingCoupons:
 *                       type: integer
 *       400:
 *         description: Validation error or not eligible (e.g., coupons not allowed for this plan, invalid province)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin cannot subscribe)
 *       404:
 *         description: Plan not found or inactive
 *
 * /api/v1/subscriptions/current:
 *   get:
 *     summary: Get current active subscription (User)
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSubscription'
 *       401:
 *         description: Unauthorized
 *
 * /api/v1/subscriptions/history:
 *   get:
 *     summary: Get subscription history (User)
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's subscription history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSubscription'
 *       401:
 *         description: Unauthorized
 *
 * /api/v1/admin/user-subscriptions:
 *   get:
 *     summary: View user subscriptions with pagination and filters (Admin only)
 *     tags: [Subscriptions, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: planId
 *         schema:
 *           type: integer
 *         description: Filter by subscription plan ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active/inactive subscriptions
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter subscriptions starting on this date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter subscriptions ending on this date (YYYY-MM-DD)
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
 *         description: Paginated list of user subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserSubscription'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BillingAddress:
 *       type: object
 *       required:
 *         - street
 *         - city
 *         - province
 *         - postalCode
 *       properties:
 *         street:
 *           type: string
 *           example: "123 Main St"
 *         city:
 *           type: string
 *           example: "Toronto"
 *         province:
 *           type: string
 *           example: "ON"
 *         postalCode:
 *           type: string
 *           example: "M1A 2B3"
 *     PlanSnapshot:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         type:
 *           type: string
 *           enum: [PASSENGER, DRIVER, BOTH]
 *         duration:
 *           type: string
 *           enum: [MONTHLY, QUARTERLY, YEARLY]
 *           nullable: true
 *         subscriptionEndDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         availableUntil:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         category:
 *           type: string
 *           enum: [COMMERCIAL, PROMO]
 *         price:
 *           type: number
 *     PaymentSessionResponse:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *         baseAmount:
 *           type: number
 *         currency:
 *           type: string
 *         subscriptionFee:
 *           type: number
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [PASSENGER, DRIVER, BOTH]
 *         duration:
 *           type: string
 *           enum: [MONTHLY, QUARTERLY, YEARLY]
 *           description: Duration used to compute subscription end date when `subscriptionEndDate` is not set.
 *         subscriptionEndDate:
 *           type: string
 *           format: date-time
 *           description: Default subscription end date applied to new user subscriptions (takes precedence over duration if present).
 *         availableUntil:
 *           type: string
 *           format: date-time
 *           description: Date until users can subscribe to this plan.
 *         category:
 *           type: string
 *           enum: [COMMERCIAL, PROMO]
 *         price:
 *           type: number
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     UserSubscription:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         planId:
 *           type: integer
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *         planData:
 *           type: object
 *           description: Snapshot of the plan at the time of subscription (immutable record).
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         plan:
 *           $ref: '#/components/schemas/SubscriptionPlan'
 */