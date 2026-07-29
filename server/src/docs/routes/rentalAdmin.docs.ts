/**
 * @swagger
 * /api/v1/admin/rentals:
 *   get:
 *     summary: Get all rentals (Admin only, paginated)
 *     tags: [Car Rentals, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of rentals per page
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/RentalStatus'
 *         description: Filter by rental status
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: List of all rentals
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
 *                     $ref: '#/components/schemas/CarRental'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *
 * /api/v1/admin/rentals/settings:
 *   get:
 *     summary: Get rental settings (Admin only)
 *     tags: [Car Rentals, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rental settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RentalSettings'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *
 *   put:
 *     summary: Update rental settings (Admin only)
 *     tags: [Car Rentals, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platformFeePercentage:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Platform fee percentage
 *                 example: 15
 *               maxRentalDurationDays:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum rental duration in days
 *                 example: 30
 *               minRentalDurationHours:
 *                 type: integer
 *                 minimum: 1
 *                 description: Minimum rental duration in hours
 *                 example: 1
 *               requestExpiryHours:
 *                 type: integer
 *                 minimum: 1
 *                 description: Hours before a request expires
 *                 example: 24
 *               depositReleaseReminderHours:
 *                 type: integer
 *                 minimum: 1
 *                 description: Hours before sending deposit release reminder
 *                 example: 24
 *               overdueGracePeriodHours:
 *                 type: integer
 *                 minimum: 1
 *                 description: Grace period in hours for overdue rentals
 *                 example: 3
 *     responses:
 *       200:
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RentalSettings'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *
 * /api/v1/admin/rentals/stats:
 *   get:
 *     summary: Get rental statistics (Admin only)
 *     tags: [Car Rentals, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rental statistics retrieved
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
 *                     totalRentals:
 *                       type: integer
 *                       example: 250
 *                     byStatus:
 *                       type: object
 *                       properties:
 *                         requested:
 *                           type: integer
 *                         approved:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         cancelled:
 *                           type: integer
 *                         declined:
 *                           type: integer
 *                         disputed:
 *                           type: integer
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         totalTransactions:
 *                           type: integer
 *                         totalAmount:
 *                           type: number
 *                         totalPlatformAmount:
 *                           type: number
 *                         totalOwnerAmount:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *
 * /api/v1/admin/rentals/{rentalId}:
 *   get:
 *     summary: Get a rental by ID (Admin only)
 *     tags: [Car Rentals, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Rental found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CarRental'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Rental not found
 *
 * /api/v1/admin/rentals/{rentalId}/cancel:
 *   patch:
 *     summary: Force cancel a rental (Admin only)
 *     description: Admin force-cancels a rental. Refunds payment and releases deposit if applicable.
 *     tags: [Car Rentals, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental to cancel
 *         example: 1
 *       - in: query
 *         name: lang
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Policy violation"
 *     responses:
 *       200:
 *         description: Rental cancelled by admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CarRental'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Rental not found
 *
 * /api/v1/admin/rentals/{rentalId}/resolve-dispute:
 *   patch:
 *     summary: Resolve a rental dispute (Admin only)
 *     description: Resolves a disputed rental by marking it as completed.
 *     tags: [Car Rentals, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the disputed rental
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Dispute resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CarRental'
 *       400:
 *         description: Rental is not in DISPUTED status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Rental not found
 *
 * /api/v1/admin/rentals/{rentalId}/refund-deposit:
 *   post:
 *     summary: Refund/release deposit for a rental (Admin only)
 *     description: Admin releases the security deposit for a rental, cancelling the hold on the renter's card.
 *     tags: [Car Rentals, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Deposit released
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CarRental'
 *       400:
 *         description: Deposit has already been released
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Rental not found
 */
