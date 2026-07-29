/**
 * @swagger
 * /api/v1/rides:
 *   post:
 *     summary: Create a new ride (Driver only)
 *     tags: [Ride Management]
 *     security:
 *       - bearerAuth: []
 *     description: Only users with driver role can create rides
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
 *               - departure
 *               - destination
 *               - departureTime
 *               - availableSeats
 *               - contribution
 *               - vehicleId
 *               - bookingType
 *               - preferences
 *               - estimatedArrivalTime
 *               - contributionCollectionMethod
 *             properties:
 *               departure:
 *                 type: object
 *                 required: [region, city, locationName, latitude, longitude]
 *                 properties:
 *                   region:
 *                     type: string
 *                     example: "QC"
 *                   city:
 *                     type: string
 *                     example: "Montreal"
 *                   locationName:
 *                     type: string
 *                     example: "Central Station"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 45.5017
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -73.5673
 *                   address:
 *                     type: string
 *                     example: "123 Queen Street W, Suite 200"
 *               destination:
 *                 type: object
 *                 required: [region, city, locationName, latitude, longitude]
 *                 properties:
 *                   region:
 *                     type: string
 *                     example: "QC"
 *                   city:
 *                     type: string
 *                     example: "Quebec City"
 *                   locationName:
 *                     type: string
 *                     example: "Gare du Palais"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 46.8139
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -71.2082
 *                   address:
 *                     type: string
 *                     example: "123 Queen Street W, Suite 200"
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-01T10:00:00.000Z"
 *               estimatedArrivalTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-01T10:00:00.000Z"
 *               availableSeats:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *               contribution:
 *                 type: number
 *                 minimum: 0
 *                 example: 20.5
 *               vehicleId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 12
 *               rideRequestId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 12
 *               bookingType:
 *                 $ref: '#/components/schemas/BookingType'
 *               contributionCollectionMethod:
 *                 $ref: '#/components/schemas/ContributionCollectionMethod'
 *               preferences:
 *                 type: object
 *                 required: [smoking, pets, airConditioning, ladiesOnly, bicycleSupport, snowTires, luggageSize]
 *                 properties:
 *                   smoking:
 *                     type: boolean
 *                     example: false
 *                   pets:
 *                     type: boolean
 *                     example: true
 *                   airConditioning:
 *                     type: boolean
 *                     example: true
 *                   ladiesOnly:
 *                     type: boolean
 *                     example: false
 *                   gentsOnly:
 *                     type: boolean
 *                     example: false
 *                   bicycleSupport:
 *                     type: boolean
 *                     example: false
 *                   snowTires:
 *                     type: boolean
 *                     example: true
 *                   luggageSize:
 *                     type: string
 *                     enum: [NONE, SMALL, MEDIUM, LARGE]
 *                     example: "MEDIUM"
 *                   luggageCount:
 *                     type: integer
 *                     format: int32
 *                     example: 1
 *                   music:
 *                     type: string
 *                     enum: [LOW,MEDIUM,HIGH,NOT_AT_ALL]
 *                     example: "LOW"
 *               stopovers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [region, city, locationName, latitude, longitude]
 *                   properties:
 *                     region:
 *                       type: string
 *                       example: "QC"
 *                     city:
 *                       type: string
 *                       example: "Drummondville"
 *                     locationName:
 *                       type: string
 *                       example: "Main Bus Terminal"
 *                     latitude:
 *                       type: number
 *                       format: float
 *                       minimum: -90
 *                       maximum: 90
 *                       example: 45.8833
 *                     longitude:
 *                       type: number
 *                       format: float
 *                       minimum: -180
 *                       maximum: 180
 *                       example: -72.4833
 *                     address:
 *                       type: string
 *                       example: "123 Queen Street W, Suite 200"
 *     responses:
 *       201:
 *         description: Ride created successfully
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
 *                   nullable: true
 *                   description: "Success message"
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Bad request - missing some required information on a user profile ( e.g., onboarding not completed)
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
 *                   description: "Error message"
 *                 errorCode:
 *                   $ref: '#/components/schemas/ERROR_CODES'
 *
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a driver
 *       404:
 *         description: Not found - vehicle not found
 *       422:
 *         description: Validation error
 *
 *   get:
 *     summary: Get all rides (paginated, filterable, orderable)(dasboards)
 *     tags: [Ride Management, Admin, D2D Rides]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of rides per page
 *       - in: query
 *         name: kind
 *         schema:
 *           type: string
 *           enum: [posted, booked]
 *         description: when a user with role 'USER' can filter the rides by 'posted' or 'booked', if the user is admin, this does not apply
 *         example: posted
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *         description: Field to order by (e.g., departureTime, contribution)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: departureCity
 *         schema:
 *           type: string
 *         description: Filter by departure city (case-insensitive, partial match)
 *       - in: query
 *         name: destinationCity
 *         schema:
 *           type: string
 *         description: Filter by destination city (case-insensitive, partial match)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PUBLISHED, DRAFT, ONGOING, COMPLETED, CANCELLED]
 *         description: Filter by ride status
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/RideType'
 *         description: Filter by ride type
 *       - in: query
 *         name: minContribution
 *         schema:
 *           type: number
 *         description: Minimum contribution amount
 *       - in: query
 *         name: maxContribution
 *         schema:
 *           type: number
 *         description: Maximum contribution amount
 *       - in: query
 *         name: departureTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter rides departing after this time
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
 *         description: List of rides
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
 *                     $ref: '#/components/schemas/Ride'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *
 * /api/v1/rides/{rideId}:
 *   get:
 *     summary: Get a ride by ID
 *     tags: [Ride Management, Admin, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to retrieve
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
 *         description: Ride found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: Ride not found
*
 *   put:
 *     summary: Update/Edit ride (Driver only)
 *     tags: [Ride Management]
 *     security:
 *       - bearerAuth: []
 *     description: Only users with driver role can create rides
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - departure
 *               - destination
 *               - departureTime
 *               - availableSeats
 *               - contribution
 *               - vehicleId
 *               - bookingType
 *               - preferences
 *               - estimatedArrivalTime
 *               - contributionCollectionMethod
 *             properties:
 *               departure:
 *                 type: object
 *                 required: [region, city, locationName, latitude, longitude]
 *                 properties:
 *                   region:
 *                     type: string
 *                     example: "QC"
 *                   city:
 *                     type: string
 *                     example: "Montreal"
 *                   locationName:
 *                     type: string
 *                     example: "Central Station"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 45.5017
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -73.5673
 *                   address:
 *                     type: string
 *                     example: "123 Queen Street W, Suite 200"
 *               destination:
 *                 type: object
 *                 required: [region, city, locationName, latitude, longitude]
 *                 properties:
 *                   region:
 *                     type: string
 *                     example: "QC"
 *                   city:
 *                     type: string
 *                     example: "Quebec City"
 *                   locationName:
 *                     type: string
 *                     example: "Gare du Palais"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 46.8139
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -71.2082
 *                   address:
 *                     type: string
 *                     example: "123 Queen Street W, Suite 200"
 *               departureTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-01T10:00:00.000Z"
 *               estimatedArrivalTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-07-01T10:00:00.000Z"
 *               availableSeats:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *               contribution:
 *                 type: number
 *                 minimum: 0
 *                 example: 20.5
 *               vehicleId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 12
 *               bookingType:
 *                 $ref: '#/components/schemas/BookingType'
 *               contributionCollectionMethod:
 *                 $ref: '#/components/schemas/ContributionCollectionMethod'
 *               preferences:
 *                 type: object
 *                 required: [smoking, pets, airConditioning, ladiesOnly, bicycleSupport, snowTires, luggageSize]
 *                 properties:
 *                   smoking:
 *                     type: boolean
 *                     example: false
 *                   pets:
 *                     type: boolean
 *                     example: true
 *                   airConditioning:
 *                     type: boolean
 *                     example: true
 *                   ladiesOnly:
 *                     type: boolean
 *                     example: false
 *                   gentsOnly:
 *                     type: boolean
 *                     example: false
 *                   bicycleSupport:
 *                     type: boolean
 *                     example: false
 *                   snowTires:
 *                     type: boolean
 *                     example: true
 *                   luggageSize:
 *                     type: string
 *                     enum: [NONE, SMALL, MEDIUM, LARGE]
 *                     example: "MEDIUM"
 *                   luggageCount:
 *                     type: integer
 *                     format: int32
 *                     example: 1
 *                   music:
 *                     type: string
 *                     enum: [LOW,MEDIUM,HIGH,NOT_AT_ALL]
 *                     example: "LOW"
 *               stopovers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [region, city, locationName, latitude, longitude]
 *                   properties:
 *                     region:
 *                       type: string
 *                       example: "QC"
 *                     city:
 *                       type: string
 *                       example: "Drummondville"
 *                     locationName:
 *                       type: string
 *                       example: "Main Bus Terminal"
 *                     latitude:
 *                       type: number
 *                       format: float
 *                       minimum: -90
 *                       maximum: 90
 *                       example: 45.8833
 *                     longitude:
 *                       type: number
 *                       format: float
 *                       minimum: -180
 *                       maximum: 180
 *                       example: -72.4833
 *                     address:
 *                       type: string
 *                       example: "123 Queen Street W, Suite 200"
 *     responses:
 *       200:
 *         description: Ride updated successfully
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
 *                   nullable: true
 *                   description: "Success message"
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a driver
 *       404:
 *         description: Not found - vehicle not found
 *       422:
 *         description: Validation error
 *   delete:
 *     summary: Delete a ride (Driver only)
 *     tags: [Ride Management, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to delete
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
 *         description: Ride deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Ride cannot be deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Ride not found
 *
 * /api/v1/rides/{rideId}/book:
 *   post:
 *     summary: Book a ride (creates a payment session)
 *     tags: [Ride Management, Booking Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to book
 *         example: 123
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *       - in: query
 *         name: useCoupons
 *         schema:
 *           type: boolean
 *         description: Whether to apply loyalty coupons to reduce platform fees
 *         example: false
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - seatsBooked
 *             properties:
 *               seatsBooked:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of seats to book
 *                 example: 1
 *     responses:
 *       200:
 *         description: Payment session created. User must confirm payment to authorize funds.
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
 *                   example: "Payment required to complete booking. Confirm payment to authorize funds."
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                       description: Unique ID of the created payment session
 *                       example: "cr_ps_ca82e6e0-9f87-4835-9a5a-2dcd2c50ee1e"
 *                     baseAmount:
 *                       type: number
 *                       description: Total base contribution (driver payout)
 *                       example: 15.0
 *                     currency:
 *                       type: string
 *                       example: "RWF"
 *                     Your-DriveFee:
 *                       type: number
 *                       description: Platform fee after commission or default fee
 *                       example: 2.50
 *                     taxAmount:
 *                       type: number
 *                       description: Tax applied to platform fee only
 *                       example: 0.32
 *                     discount:
 *                       type: number
 *                       description: Discount percentage applied due to coupons
 *                       example: 20
 *                     discountAmount:
 *                       type: number
 *                       description: Actual discount amount applied
 *                       example: 0.50
 *                     seatsBooked:
 *                       type: integer
 *                       example: 1
 *                     totalToPay:
 *                       type: number
 *                       description: Total amount to authorize (base + fee + tax)
 *                       example: 17.82
 *                     usedCoupons:
 *                       type: integer
 *                       description: Number of coupons applied (only present when useCoupons=true)
 *                       example: 3
 *
 *       400:
 *         description: Bad request - invalid state or business rule violation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       examples:
 *                         rideNotPublished: "Ride is not available for booking"
 *                         rideBlocked: "Ride is blocked"
 *                         selfBooking: "Driver cannot book own ride"
 *                         seatsUnavailable: "Not enough seats available. Only 1 seat(s) left."
 *                         departurePassed: "Cannot book, departure time already passed"
 *                         cutoff: "Booking is not allowed within 10 minutes to departure time."
 *                         couponsConflict: "A driver loyalty coupon is active on this trip. Passenger coupons cannot be applied this time."
 *
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *
 *       403:
 *         description: Forbidden - Admins are not allowed to book rides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Admins are not allowed"
 *
 *       404:
 *         description: Ride not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Ride not found"
 *
 *       422:
 *         description: Validation error
 * 
 * /api/v1/rides/{rideId}/complete:
 *   put:
 *     summary: Complete a ride
 *     tags: [Ride Management, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to mark as completed
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
 *         description: Ride completed successfully
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
 *                   example: "Ride completed successfully"
 *       400:
 *         description: Bad request - Invalid ride or already completed
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not allowed to access this ride
 *       404:
 *         description: Ride not found
 *
 * /api/v1/rides/{rideId}/make-attendance:
 *   patch:
 *     summary: Mark a seat as attended for a ride (Driver Only)
 *     tags: [Ride Management, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride
 *         example: 123
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
 *               code:
 *                 type: string
 *                 description: Attendance code for the seat
 *             required:
 *               - code
 *     responses:
 *       200:
 *         description: Seat marked as attended
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or seat not found
 *       403:
 *         description: Not allowed
 *
 * /api/v1/rides/{rideId}/start-ride:
 *   patch:
 *     summary: Mark a ride as started (ongoing)(Driver Only)
 *     tags: [Ride Management, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride
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
 *         description: Ride marked as started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Invalid input or ride not in published state
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Ride not found
 *
 * /api/v1/rides/{rideId}/publish:
 *   patch:
 *     summary: Publish a ride (Driver only)
 *     tags: [Ride Management, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to publish
 *         example: 123
 *       - in: query
 *         name: useCoupons
 *         schema:
 *           type: boolean
 *         description: Whether to use loyalty coupons to publish a ride
 *         example: false
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
 *         description: Ride published successfully
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
 *                   example: "Ride published successfully."
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *                 usedCoupons:
 *                   type: integer
 *                   description: Number of coupons consumed (only present if useCoupons=true)
 *                   example: 5
 *                 remainingCoupons:
 *                   type: integer
 *                   description: Remaining coupons after redemption
 *                   example: 12
 *
 *       400:
 *         description: Invalid ride state or coupon errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       examples:
 *                         notDraft: "Ride must be in draft to be published"
 *                         departurePassed: "Ride cannot be published, departure time has passed."
 *                         insufficientCoupons: "Insufficient coupons. You need 5 but only have 2"
 *
 *       404:
 *         description: Ride not found or not owned by the driver
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Ride not found"
 *
 * /api/v1/rides/{rideId}/cancel:
 *   patch:
 *     summary: Cancel a ride (Driver only)
 *     tags: [Ride Management, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to cancel
 *         example: 123
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
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Unexpected emergency"
 *     responses:
 *       200:
 *         description: Ride cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Ride cannot be cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed or cancellation allowance exceeded
 *       404:
 *         description: Ride not found
 *
 * /api/v1/rides/{rideId}/block:
 *   patch:
 *     summary: Block a ride or update blocking reason (Admin only)
 *     tags: [Ride Management, Admin, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to block
 *         example: 123
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
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for blocking
 *                 example: "Violation of terms"
 *     responses:
 *       200:
 *         description: Ride blocked or blocking reason updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ride not found
 *
 * /api/v1/rides/{rideId}/unblock:
 *   patch:
 *     summary: Unblock a ride (Admin only)
 *     tags: [Ride Management, Admin, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to unblock
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
 *         description: Ride unblocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Ride is not blocked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ride not found
 *
 * /api/v1/rides/{rideId}/review-ride-cancellation:
 *   patch:
 *     summary: Review ride cancellation (Admin only)
 *     tags: [Ride Management, Admin, D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to review cancellation
 *         example: 123
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
 *             required: [cancellationCountsAgainstAllowance]
 *             properties:
 *               cancellationCountsAgainstAllowance:
 *                 type: string
 *                 enum: [YES, NO]
 *                 description: Whether the cancellation counts against the driver's cancellation allowance
 *                 example: "YES"
 *     responses:
 *       200:
 *         description: Ride cancellation reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Only cancelled rides can be reviewed or already reviewed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ride not found
 */
