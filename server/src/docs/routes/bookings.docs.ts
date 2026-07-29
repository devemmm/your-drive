/**
 * @swagger
 * /api/v1/bookings:
 *   get:
 *     summary: Get all bookings (paginated)
 *     tags: [Booking Management, Admin]
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
 *         description: Number of bookings per page
 *         example: 10
 *       - in: query
 *         name: rideId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Filter bookings by ride ID, if you need the bookings of a specific ride
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/BookingStatus'
 *         description: Filter bookings by status
 *       - in: query
 *         name: bookingRelation
 *         schema:
 *           type: string
 *           enum: [booked_by_me, booked_from_my_rides]
 *         description: Filter bookings by the relation of booking, if you need the bookings booked by the user, use 'booked_by_me', only bookings made by the user are returned, but if 'booked_from_my_rides', only bookings associated the driver account are returned. If the user is admin this does not apply.
 *           example:booked_by_me
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: List of bookings
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
 *                     bookings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 100
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 10
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 * 
 * /api/v1/bookings/{bookingId}:
 *   get:
 *     summary: Get a booking by ID
 *     tags: [Booking Management, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the booking to retrieve
 *         example: 123
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     responses:
 *       200:
 *         description: Booking found
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
 *                     booking:
 *                       $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: Booking not found
 * 
 * /api/v1/bookings/{bookingId}/status:
 *   patch:
 *     summary: Cancel or Decline a booking (Driver only)
 *     tags: [Booking Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the booking to update
 *         example: 123
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               - status
 *               - reason
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DECLINED, CANCELLED]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: Booking not found
 *       422:
 *         description: Validation error
 * 
 * /api/v1/bookings/{bookingId}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     tags: [Booking Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the booking to cancel
 *         example: 123
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: Booking not found
 * 
 * /api/v1/bookings/{bookingId}/approve:
 *   patch:
 *     summary: Approve a pending booking
 *     description: Approves a pending booking for a ride. Only the driver of the ride can approve. The ride must not have departed, and there must be enough available seats. Captures payment if on hold.
 *     tags: [Booking Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the booking to approve
 *         example: 123
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
 *         description: Booking approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Booking'
 *                 message:
 *                   type: string
 *                   example: Booking successfully approved.
 *       400:
 *         description: Booking is not pending or not enough available seats
 *       403:
 *         description: User is not the driver of the ride
 *       404:
 *         description: Booking not found
 */
