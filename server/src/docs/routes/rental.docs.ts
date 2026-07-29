/**
 * @swagger
 * /api/v1/rentals:
 *   get:
 *     summary: Get all rentals (paginated)
 *     tags: [Car Rentals]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [owner, renter, both]
 *         description: Filter by user role in the rental
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: Language preference for the response
 *     responses:
 *       200:
 *         description: List of rentals
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
 *
 *   post:
 *     summary: Create a new rental request
 *     description: A renter requests to rent a vehicle. The vehicle must be available for rental and not belong to the requesting user.
 *     tags: [Car Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *               - vehicleId
 *               - startDate
 *               - endDate
 *               - rentalType
 *             properties:
 *               vehicleId:
 *                 type: integer
 *                 description: ID of the vehicle to rent
 *                 example: 5
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Rental start date/time
 *                 example: "2026-05-01T09:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Rental end date/time
 *                 example: "2026-05-03T09:00:00Z"
 *               rentalType:
 *                 type: string
 *                 enum: [HOURLY, DAILY]
 *                 description: Billing type for the rental
 *               pickupLocation:
 *                 type: object
 *                 description: Optional custom pickup location (defaults to vehicle's pickup location)
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   region:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               returnLocation:
 *                 type: object
 *                 description: Optional return location
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   region:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               pickupNotes:
 *                 type: string
 *               returnNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rental created successfully
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
 *         description: Validation error or vehicle not available for rental
 *       403:
 *         description: Admins cannot create rentals or user trying to rent own vehicle
 *       404:
 *         description: Vehicle not found
 *       409:
 *         description: Vehicle already booked for the selected dates
 *
 * /api/v1/rentals/{rentalId}:
 *   get:
 *     summary: Get a rental by ID
 *     tags: [Car Rentals]
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
 *         description: Not authorized to view this rental
 *       404:
 *         description: Rental not found
 *
 * /api/v1/rentals/{rentalId}/approve:
 *   patch:
 *     summary: Approve a rental request (Owner only)
 *     description: The vehicle owner approves a pending rental request. Re-checks for date conflicts.
 *     tags: [Car Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental to approve
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Rental approved
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
 *         description: Rental is not in REQUESTED status
 *       403:
 *         description: Only the vehicle owner can approve
 *       404:
 *         description: Rental not found
 *       409:
 *         description: Vehicle has a conflicting rental
 *
 * /api/v1/rentals/{rentalId}/decline:
 *   patch:
 *     summary: Decline a rental request (Owner only)
 *     tags: [Car Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental to decline
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for declining
 *                 example: "Vehicle unavailable"
 *     responses:
 *       200:
 *         description: Rental declined
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
 *         description: Rental is not in REQUESTED status
 *       403:
 *         description: Only the vehicle owner can decline
 *       404:
 *         description: Rental not found
 *
 * /api/v1/rentals/{rentalId}/initialize-payment:
 *   post:
 *     summary: Initialize payment for a rental (Renter only)
 *     description: Creates Stripe PaymentIntents for the rental amount and security deposit (if applicable). Returns client secrets for frontend payment confirmation.
 *     tags: [Car Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental to pay for
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Payment initialized
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
 *                     rentalClientSecret:
 *                       type: string
 *                       description: Stripe client secret for rental payment
 *                     depositClientSecret:
 *                       type: string
 *                       nullable: true
 *                       description: Stripe client secret for deposit hold (null if no deposit)
 *                     rentalAmount:
 *                       type: number
 *                       example: 200.00
 *                     platformFee:
 *                       type: number
 *                       example: 30.00
 *                     ownerAmount:
 *                       type: number
 *                       example: 170.00
 *                     depositAmount:
 *                       type: number
 *                       example: 500.00
 *       400:
 *         description: Rental not in APPROVED status or payment already completed
 *       403:
 *         description: Only the renter can initialize payment
 *       404:
 *         description: Rental not found
 *
 * /api/v1/rentals/{rentalId}/activate:
 *   patch:
 *     summary: Activate a rental (Owner only)
 *     description: The owner activates the rental after payment. Payment must be completed.
 *     tags: [Car Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental to activate
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Rental activated
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
 *         description: Rental not in APPROVED status or payment not completed
 *       403:
 *         description: Only the vehicle owner can activate
 *       404:
 *         description: Rental not found
 *
 * /api/v1/rentals/{rentalId}/complete:
 *   patch:
 *     summary: Complete a rental (Owner only)
 *     description: Marks an active rental as completed. Triggers owner payout via Stripe Connect.
 *     tags: [Car Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental to complete
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Rental completed
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
 *         description: Rental is not in ACTIVE status
 *       403:
 *         description: Only the vehicle owner can complete
 *       404:
 *         description: Rental not found
 *
 * /api/v1/rentals/{rentalId}/cancel:
 *   patch:
 *     summary: Cancel a rental
 *     description: Cancels a rental. Active rentals cannot be cancelled — use dispute instead. Refunds payment and releases deposit if applicable.
 *     tags: [Car Rentals]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Plans changed"
 *     responses:
 *       200:
 *         description: Rental cancelled
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
 *         description: Rental is active or already in a terminal status
 *       403:
 *         description: Not authorized to cancel this rental
 *       404:
 *         description: Rental not found
 *
 * /api/v1/rentals/{rentalId}/release-deposit:
 *   post:
 *     summary: Release the security deposit (Owner only)
 *     description: The vehicle owner releases the security deposit after a completed rental. Cancels the deposit hold on the renter's card.
 *     tags: [Car Rentals]
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
 *         description: Rental not completed or deposit already released
 *       403:
 *         description: Only the vehicle owner can release the deposit
 *       404:
 *         description: Rental not found
 *
 * /api/v1/rentals/{rentalId}/dispute:
 *   post:
 *     summary: File a dispute for a rental
 *     description: Files a dispute for an active or completed rental. Notifies the other party and all admins.
 *     tags: [Car Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the rental to dispute
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
 *                 description: Reason for the dispute
 *                 example: "Vehicle was returned with damage"
 *     responses:
 *       200:
 *         description: Dispute filed
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
 *         description: Rental is not in ACTIVE or COMPLETED status
 *       403:
 *         description: Not authorized to dispute this rental
 *       404:
 *         description: Rental not found
 *
 * /api/v1/public/rentals/vehicles/available:
 *   get:
 *     summary: Search available rental vehicles
 *     description: Public endpoint to browse vehicles available for rental. Supports filtering by location, category, rate, and date availability.
 *     tags: [Public, Car Rentals]
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
 *         description: Number of vehicles per page
 *         example: 10
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by pickup city (case-insensitive, partial match)
 *         example: "Montreal"
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by pickup region
 *         example: "Quebec"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by vehicle category
 *       - in: query
 *         name: minDailyRate
 *         schema:
 *           type: number
 *         description: Minimum daily rate filter
 *         example: 50
 *       - in: query
 *         name: maxDailyRate
 *         schema:
 *           type: number
 *         description: Maximum daily rate filter
 *         example: 200
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter vehicles available from this date
 *         example: "2026-05-01T09:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter vehicles available until this date
 *         example: "2026-05-03T09:00:00Z"
 *     responses:
 *       200:
 *         description: List of available vehicles
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
 *                     $ref: '#/components/schemas/Vehicle'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *
 * /api/v1/public/rentals/vehicles/{vehicleId}:
 *   get:
 *     summary: Get rental vehicle details
 *     description: Public endpoint to get details of a vehicle available for rental.
 *     tags: [Public, Car Rentals]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vehicle
 *         example: 5
 *     responses:
 *       200:
 *         description: Vehicle found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *       404:
 *         description: Vehicle not found or not available for rental
 */
