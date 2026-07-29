/**
 * @swagger
 * /api/v1/chauffeur-services:
 *   get:
 *     summary: Get all chauffeur services (paginated)
 *     tags: [Chauffeur Services]
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
 *         description: Number of services per page
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/ChauffeurStatus'
 *         description: Filter by service status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [passenger, driver]
 *         description: Filter by user role in the service
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: Language preference for the response
 *     responses:
 *       200:
 *         description: List of chauffeur services
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
 *                     $ref: '#/components/schemas/ChauffeurService'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *
 *   post:
 *     summary: Create a new chauffeur service request
 *     description: A passenger requests a chauffeur driver for their vehicle. The driver must be available for chauffeur services and not have conflicting bookings.
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: Language preference for the response
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicleId
 *               - driverId
 *               - startDate
 *               - endDate
 *               - serviceType
 *             properties:
 *               vehicleId:
 *                 type: integer
 *                 description: ID of the passenger's vehicle
 *                 example: 5
 *               driverId:
 *                 type: integer
 *                 description: ID of the driver to request
 *                 example: 12
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Service start date/time
 *                 example: "2026-05-01T09:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Service end date/time
 *                 example: "2026-05-01T17:00:00Z"
 *               serviceType:
 *                 type: string
 *                 enum: [HOURLY, DAILY]
 *                 description: Billing type for the service
 *               pickupLocation:
 *                 type: object
 *                 description: Optional pickup location
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
 *               dropoffLocation:
 *                 type: object
 *                 description: Optional dropoff location
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
 *                 description: Notes for pickup
 *               dropoffNotes:
 *                 type: string
 *                 description: Notes for dropoff
 *     responses:
 *       201:
 *         description: Chauffeur service created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       400:
 *         description: Validation error or driver not available
 *       403:
 *         description: Forbidden - admins cannot create requests or vehicle does not belong to user
 *       404:
 *         description: Vehicle or driver not found
 *       409:
 *         description: Driver has a conflicting booking for the selected dates
 *
 * /api/v1/chauffeur-services/{serviceId}:
 *   get:
 *     summary: Get a chauffeur service by ID
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the chauffeur service
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: Language preference for the response
 *     responses:
 *       200:
 *         description: Chauffeur service found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to view this service
 *       404:
 *         description: Service not found
 *
 * /api/v1/chauffeur-services/{serviceId}/accept:
 *   patch:
 *     summary: Accept a chauffeur service request (Driver only)
 *     description: The assigned driver accepts a pending chauffeur request. Re-checks for schedule conflicts before accepting.
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the service to accept
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Service accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       400:
 *         description: Service is not in REQUESTED status
 *       403:
 *         description: Only the assigned driver can accept
 *       404:
 *         description: Service not found
 *       409:
 *         description: Driver has a conflicting booking
 *
 * /api/v1/chauffeur-services/{serviceId}/decline:
 *   patch:
 *     summary: Decline a chauffeur service request (Driver only)
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the service to decline
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
 *                 example: "Schedule conflict"
 *     responses:
 *       200:
 *         description: Service declined successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       400:
 *         description: Service is not in REQUESTED status
 *       403:
 *         description: Only the assigned driver can decline
 *       404:
 *         description: Service not found
 *
 * /api/v1/chauffeur-services/{serviceId}/initialize-payment:
 *   post:
 *     summary: Initialize payment for a chauffeur service (Passenger only)
 *     description: Creates a Stripe PaymentIntent for the accepted chauffeur service. Returns the client secret for frontend payment confirmation.
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the service to pay for
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Payment initialized successfully
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
 *                     clientSecret:
 *                       type: string
 *                       description: Stripe PaymentIntent client secret
 *                     serviceAmount:
 *                       type: number
 *                       example: 150.00
 *                     platformFee:
 *                       type: number
 *                       example: 22.50
 *                     driverAmount:
 *                       type: number
 *                       example: 127.50
 *       400:
 *         description: Service not in ACCEPTED status or payment already completed
 *       403:
 *         description: Only the passenger can initialize payment
 *       404:
 *         description: Service not found
 *
 * /api/v1/chauffeur-services/{serviceId}/activate:
 *   patch:
 *     summary: Activate a chauffeur service (Driver only)
 *     description: The driver starts the chauffeur service. Payment must be completed before activation.
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the service to activate
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Service activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       400:
 *         description: Service not in ACCEPTED status or payment not completed
 *       403:
 *         description: Only the assigned driver can activate
 *       404:
 *         description: Service not found
 *
 * /api/v1/chauffeur-services/{serviceId}/complete:
 *   patch:
 *     summary: Complete a chauffeur service
 *     description: Marks an active chauffeur service as completed. Triggers driver payout via Stripe Connect.
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the service to complete
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Service completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       400:
 *         description: Service is not in ACTIVE status
 *       403:
 *         description: Only the passenger or driver can complete
 *       404:
 *         description: Service not found
 *
 * /api/v1/chauffeur-services/{serviceId}/cancel:
 *   patch:
 *     summary: Cancel a chauffeur service
 *     description: Cancels a chauffeur service. Active services cannot be cancelled — use dispute instead. Refunds payment if applicable.
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the service to cancel
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
 *         description: Service cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       400:
 *         description: Service is active or already in a terminal status
 *       403:
 *         description: Not authorized to cancel this service
 *       404:
 *         description: Service not found
 *
 * /api/v1/chauffeur-services/{serviceId}/dispute:
 *   post:
 *     summary: File a dispute for a chauffeur service
 *     description: Files a dispute for an active or completed service. Notifies the other party and all admins.
 *     tags: [Chauffeur Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the service to dispute
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
 *                 example: "Driver did not show up on time"
 *     responses:
 *       200:
 *         description: Dispute filed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       400:
 *         description: Service is not in ACTIVE or COMPLETED status
 *       403:
 *         description: Not authorized to dispute this service
 *       404:
 *         description: Service not found
 *
 * /api/v1/public/chauffeur-drivers:
 *   get:
 *     summary: Search available chauffeur drivers
 *     description: Public endpoint to browse drivers available for chauffeur services. Supports filtering by rate and date availability.
 *     tags: [Public, Chauffeur Services]
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
 *         description: Number of drivers per page
 *         example: 10
 *       - in: query
 *         name: minHourlyRate
 *         schema:
 *           type: number
 *         description: Minimum hourly rate filter
 *         example: 20
 *       - in: query
 *         name: maxHourlyRate
 *         schema:
 *           type: number
 *         description: Maximum hourly rate filter
 *         example: 50
 *       - in: query
 *         name: minDailyRate
 *         schema:
 *           type: number
 *         description: Minimum daily rate filter
 *         example: 100
 *       - in: query
 *         name: maxDailyRate
 *         schema:
 *           type: number
 *         description: Maximum daily rate filter
 *         example: 300
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter drivers available from this date
 *         example: "2026-05-01T09:00:00Z"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter drivers available until this date
 *         example: "2026-05-01T17:00:00Z"
 *     responses:
 *       200:
 *         description: List of available chauffeur drivers
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       averageRating:
 *                         type: number
 *                       totalRatings:
 *                         type: integer
 *                       profileImage:
 *                         type: string
 *                         nullable: true
 *                       chauffeurHourlyRate:
 *                         type: number
 *                         nullable: true
 *                       chauffeurDailyRate:
 *                         type: number
 *                         nullable: true
 *                       chauffeurDescription:
 *                         type: string
 *                         nullable: true
 *                       drivingExperience:
 *                         type: integer
 *                         nullable: true
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
