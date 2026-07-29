/**
 * @swagger
 * /api/v1/admin/settings:
 *   post:
 *     summary: Create a new FeeSetting
 *     tags: [Admin]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [POSTING, BOOKING]
 *                 example: POSTING
 *               amount:
 *                 type: number
 *                 example: 10.5
 *               active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: FeeSetting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FeeSetting'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       422:
 *         description: Validation error (e.g., missing required fields)
 *
 *   get:
 *     summary: Get all FeeSettings
 *     tags: [Admin]
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
 *         description: List of FeeSettings retrieved successfully
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
 *                     $ref: '#/components/schemas/FeeSetting'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *
 * /api/v1/admin/settings/{feeSettingId}:
 *   put:
 *     summary: Update a FeeSetting by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feeSettingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the FeeSetting to update
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
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 12.0
 *               active:
 *                 type: boolean
 *                 example: false
 *             description: At least one field must be provided to update the FeeSetting.
 *     responses:
 *       200:
 *         description: FeeSetting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FeeSetting'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: FeeSetting not found
 *       422:
 *         description: Validation error (e.g., no fields provided or invalid update)
 *
 *   delete:
 *     summary: Delete a FeeSetting by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: feeSettingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the FeeSetting to delete
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
 *         description: FeeSetting deleted successfully
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
 *                   example: FeeSetting deleted
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: FeeSetting not found
 *       422:
 *         description: Cannot delete the only active setting of this type
 *
 * /api/v1/admin/coupon-redemption-rules:
 *   get:
 *     summary: Get all coupon redemption rules
 *     tags: [Admin]
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
 *         description: List of coupon redemption rules retrieved successfully
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
 *                     $ref: '#/components/schemas/CouponRedemptionRule'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *
 * /api/v1/admin/coupon-redemption-rules/{ruleId}:
 *   put:
 *     summary: Update a coupon redemption rule by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the coupon redemption rule to update
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
 *             properties:
 *               requiredCoupons:
 *                 type: number
 *                 example: 5
 *               description:
 *                 type: string
 *                 example: New description
 *             description: At least one field (requiredCoupons or description) must be provided to update the rule.
 *     responses:
 *       200:
 *         description: coupon redemption rule updated successfully
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
 *                   example: Coupon redemption rule updated
 *                 data:
 *                   $ref: '#/components/schemas/CouponRedemptionRule'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: coupon redemption rule not found
 *       422:
 *         description: No fields provided for update
 *
 * /api/v1/admin/logs:
 *   get:
 *     summary: Retrieve logs with filtering, searching, sorting, and statistics
 *     tags: [Admin]
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of logs per page
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: Filter logs by level (e.g., info, error)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter logs by action type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter logs by user ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for message, action, or meta fields
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: timestamp
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs created after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs created before this date
 *       - in: query
 *         name: exportType
 *         schema:
 *           type: string
 *         description: export type eg csv or json
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: type eg payment
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
 *         description: Logs retrieved successfully
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
 *                     $ref: '#/components/schemas/Log'
 *                 stats:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                   example: { info: 10, error: 2 }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *
 * /api/v1/admin/users/{userId}/suspend-account:
 *   post:
 *     summary: Suspend a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to suspend
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *           example: EN
 *         description: The language selected by the user, EN/FR
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               suspendUntil:
 *                 type: number
 *                 description: Optional date until which the user is suspended
 *                 example: 1717056000000
 *               suspensionReason:
 *                 type: string
 *                 description: Optional reason for suspension
 *                 example: "Violation of terms"
 *     responses:
 *       200:
 *         description: User suspended successfully
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
 *                   example: User suspended successfully
 *                 suspendUntil:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   example: "2024-12-31T23:59:59.000Z"
 *       400:
 *         description: Invalid suspendUntil date
 *       404:
 *         description: User not found or cannot suspend own account
 *
 * /api/v1/admin/users/{userId}/activate-account:
 *   post:
 *     summary: Reactivate (unsuspend) a user account manually
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to reactivate
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *           example: EN
 *         description: The language selected by the user, EN/FR
 *     responses:
 *       200:
 *         description: User account reactivated successfully
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
 *                   example: User account reactivated successfully
 *       400:
 *         description: User is not suspended
 *       404:
 *         description: User not found
 *
 * /api/v1/admin/settings/commission:
 *   get:
 *     summary: Retrieve the application's commission settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     responses:
 *       200:
 *         description: Commission settings retrieved successfully (may be null if none configured)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/CommissionSettings'
 *                     - type: 'null'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *
 *   put:
 *     summary: Update a CommissionSettings record
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rate
 *             properties:
 *               rate:
 *                 type: number
 *                 format: float
 *                 description: 'New commission rate (percent). Stored as Decimal(5,2) in DB. Example: 12.5 => "12.50"'
 *                 example: 12.5
 *     responses:
 *       200:
 *         description: Commission setting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CommissionSettings'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: Commission setting not found
 *       422:
 *         description: Validation error (e.g., missing id or invalid rate)
 *
 * components:
 *   schemas:
 *     CommissionSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         rate:
 *           type: string
 *           description: Commission rate stored as Decimal; returned as string by Prisma Decimal handling (e.g., "10.00")
 *           example: "10.00"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-02T00:00:00.000Z"
 */
