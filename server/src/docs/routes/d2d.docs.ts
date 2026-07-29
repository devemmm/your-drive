/**
 * @swagger
 * tags:
 *   name: D2D Rides
 *   description: Door-to-door ride management endpoints
 */

/**
 * @swagger
 * /api/v1/d2d:
 *   post:
 *     summary: Create a new D2D ride (Driver only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     description: Create a door-to-door ride draft. Driver must be onboarded and Stripe account must be set up. The driver specifies start and stop locations, departure/arrival times, vehicle, available seats, and D2D pricing structure.
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverStartLocation
 *               - driverStopLocation
 *               - departureTime
 *               - estimatedArrivalTime
 *               - availableSeats
 *               - contribution
 *               - vehicleId
 *               - detourRadius
 *               - extraKmPrice
 *             properties:
 *               driverStartLocation:
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
 *                     example: "123 Queen Street W"
 *                   description:
 *                     type: string
 *                     example: "Pick up location details"
 *               driverStopLocation:
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
 *                     example: "Downtown"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 45.5100
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -73.5700
 *                   address:
 *                     type: string
 *                     example: "456 Main Street"
 *                   description:
 *                     type: string
 *                     example: "Drop off location details"
 *               detourRadius:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Service radius (km) around the departure location for pickups (cannot exceed max configured radius)
 *                 example: 10
 *               availableSeats:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *                 example: 4
 *               contribution:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 30.00
 *               vehicleId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 12
 *               rideRequestId:
 *                 type: integer
 *                 minimum: 1
 *                 example: 12
 *               departureTime:
 *                 type: integer
 *                 description: Unix timestamp in milliseconds for departure
 *                 example: 1719829200000
 *               estimatedArrivalTime:
 *                 type: integer
 *                 description: Unix timestamp in milliseconds for estimated arrival
 *                 example: 1719843600000
 *               extraKmPrice:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Price per km for detours beyond the service radius (cannot exceed max configured price)
 *                 example: 2.50
 *               preferences:
 *                 type: object
 *                 properties:
 *                   smoking:
 *                     type: boolean
 *                     example: false
 *                   pets:
 *                     type: boolean
 *                     example: false
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
 *                     example: false
 *                   luggageSize:
 *                     type: string
 *                     enum: [SMALL, MEDIUM, LARGE, NONE]
 *                     example: MEDIUM
 *                   luggageCount:
 *                     type: integer
 *                     example: 2
 *                   music:
 *                     type: string
 *                     enum: [NONE, QUIET, MODERATE, LOUD]
 *                     example: QUIET
 *                   additionalNotes:
 *                     type: string
 *                     example: "Non-smoking vehicle"
 *           example:
 *             {
 *               "driverStartLocation": {
 *                 "region": "QC",
 *                 "city": "Montreal",
 *                 "locationName": "Central Station",
 *                 "latitude": 45.5017,
 *                 "longitude": -73.5673,
 *                 "address": "123 Queen Street W"
 *               },
 *               "driverStopLocation": {
 *                 "region": "QC",
 *                 "city": "Montreal",
 *                 "locationName": "Downtown",
 *                 "latitude": 45.5100,
 *                 "longitude": -73.5700,
 *                 "address": "456 Main Street"
 *               },
 *               "departureTime": 1719829200000,
 *               "estimatedArrivalTime": 1719843600000,
 *               "availableSeats": 4,
 *               "contribution": 30,
 *               "vehicleId": 1,
 *               "detourRadius": 10,
 *               "extraKmPrice": 2.5,
 *               "preferences": {
 *                 "airConditioning": true,
 *                 "smoking": false,
 *                 "pets": false
 *               }
 *             }
 *     responses:
 *       201:
 *         description: D2D ride draft created successfully
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
 *                   example: "D2D ride created successfully with service radius"
 *                 data:
 *                   $ref: '#/components/schemas/D2DRide'
 *       400:
 *         description: Bad request - Invalid input, driver not onboarded, Stripe not onboarded, overlapping ride, or validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admins not allowed or user is not a driver
 *       404:
 *         description: Vehicle not found or overlaps with existing ride
 *       422:
 *         description: Validation error
 *
 * /api/v1/d2d/{rideId}/request:
 *   post:
 *     summary: Request a D2D ride (Passenger only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     description: Submit a D2D ride request with specific pickup and dropoff locations. Cost is calculated based on detour distance from driver's departure location to passenger's pickup.
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the D2D ride to request
 *         example: 123
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup
 *               - dropoff
 *               - pickupExtraKms
 *               - dropoffExtraKms
 *             properties:
 *               pickup:
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
 *                     example: "Home"
 *                   address:
 *                     type: string
 *                     example: "456 Rue de la Paix"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 45.4215
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -73.8929
 *                   description:
 *                     type: string
 *                     example: "Pickup location details"
 *               dropoff:
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
 *                     example: "Work"
 *                   address:
 *                     type: string
 *                     example: "789 Boulevard Saint-Laurent"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 45.5085
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -73.5547
 *                   description:
 *                     type: string
 *                     example: "Dropoff location details"
 *               pickupExtraKms:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Extra kilometers for pickup detour
 *                 example: 2.5
 *               dropoffExtraKms:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Extra kilometers for dropoff detour
 *                 example: 1.2
 *           example:
 *             {
 *               "pickup": {
 *                 "region": "QC",
 *                 "city": "Montreal",
 *                 "locationName": "Home",
 *                 "address": "456 Rue de la Paix",
 *                 "latitude": 45.4215,
 *                 "longitude": -73.8929
 *               },
 *               "dropoff": {
 *                 "region": "QC",
 *                 "city": "Montreal",
 *                 "locationName": "Work",
 *                 "address": "789 Boulevard Saint-Laurent",
 *                 "latitude": 45.5085,
 *                 "longitude": -73.5547
 *               },
 *               "pickupExtraKms": 2.5,
 *               "dropoffExtraKms": 1.2
 *             }
 *     responses:
 *       201:
 *         description: D2D request created successfully
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
 *                   example: "D2D request submitted."
 *                 data:
 *                   $ref: '#/components/schemas/D2DBookingRequest'
 *       400:
 *         description: Bad request - Ride not found, not published, locked, driver's own ride, or invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Ride not found
 *       403:
 *         description: Forbidden - Cannot request own ride
 *       422:
 *         description: Validation error
 *
 * /api/v1/d2d/{requestId}:
 *   get:
 *     summary: Get a specific D2D booking request by ID
 *     tags: [D2D Rides, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the D2D booking request
 *         example: 123
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: Language selected by the user (EN/FR)
 *         example: EN
 *     responses:
 *       200:
 *         description: D2D booking request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/D2DBookingRequest'
 *                   description: Detailed D2D booking request with enriched ride data
 *       401:
 *         description: Unauthorized - Token missing or invalid
 *       403:
 *         description: Forbidden - User not allowed to view this request
 *       404:
 *         description: D2D booking request not found
 *
 * /api/v1/d2d/{requestId}/accept:
 *   patch:
 *     summary: Accept a D2D request (Driver only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     description: Accept a D2D request. After acceptance, passenger must complete payment to confirm the ride. Only one accepted request is allowed per ride.
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the D2D request
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     responses:
 *       200:
 *         description: Request accepted, awaiting passenger payment confirmation
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
 *                   example: "Request accepted. Awaiting payment confirmation."
 *                 data:
 *                   $ref: '#/components/schemas/D2DBookingRequest'
 *       400:
 *         description: Bad request - only POSTED requests can be accepted, ride not published, ride blocked/locked, or another request already accepted
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not the ride driver
 *       404:
 *         description: Request not found
 *
 * /api/v1/d2d/{requestId}/initialize-payment:
 *   post:
 *     summary: Initialize payment for D2D ride (Passenger only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     description: Initialize payment session for an accepted D2D request. Calculates platform fees, taxes, and applies passenger coupons if available. Returns payment session details for frontend confirmation.
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the D2D booking request
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *       - in: query
 *         name: useCoupons
 *         schema:
 *           type: boolean
 *         description: Whether to apply loyalty coupons to reduce platform fees
 *         example: false
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               useCoupons:
 *                 type: boolean
 *                 description: Whether to apply passenger coupons to reduce platform fee
 *                 example: true
 *     responses:
 *       200:
 *         description: Payment session created successfully
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
 *                       description: Payment session ID for payment confirmation
 *                       example: "cr_ps_123e4567-e89b-12d3-a456-426614174000"
 *                     currency:
 *                       type: string
 *                       example: "RWF"
 *                     Your-DriveFee:
 *                       type: number
 *                       description: Platform/commission fee before discount
 *                       example: 3.00
 *                     taxAmount:
 *                       type: number
 *                       description: Tax amount based on province
 *                       example: 1.50
 *                     discount:
 *                       type: number
 *                       description: Discount percentage applied via coupons
 *                       example: 50
 *                     discountAmount:
 *                       type: number
 *                       description: Discount amount in currency
 *                       example: 1.50
 *                     totalToPay:
 *                       type: number
 *                       description: Total amount to authorize (base + fee + tax - discount)
 *                       example: 33.00
 *                     taxDetails:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: "HST"
 *                           percentage:
 *                             type: number
 *                             example: 15
 *                           value:
 *                             type: number
 *                             example: 1.50
 *                     usedCoupons:
 *                       type: integer
 *                       description: Number of coupons redeemed (only if useCoupons was true)
 *                       example: 5
 *       400:
 *         description: Bad request - Request not in ACCEPTED status, driver coupon active, or invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not the ride driver
 *       404:
 *         description: Booking request not found
 *
 * /api/v1/d2d/{rideId}:
 *   patch:
 *     summary: Update a D2D ride (Driver only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     description: Update a D2D ride in draft state. Allows changing locations, times, vehicle, seats, and pricing. Cannot update rides that are not in draft status.
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: D2D ride ID to update
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverStartLocation
 *               - driverStopLocation
 *               - departureTime
 *               - estimatedArrivalTime
 *               - availableSeats
 *               - contribution
 *               - vehicleId
 *               - detourRadius
 *               - extraKmPrice
 *             properties:
 *               driverStartLocation:
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
 *                     example: "123 Queen Street W"
 *                   description:
 *                     type: string
 *                     example: "Pick up location details"
 *               driverStopLocation:
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
 *                     example: "Downtown"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     minimum: -90
 *                     maximum: 90
 *                     example: 45.5100
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     minimum: -180
 *                     maximum: 180
 *                     example: -73.5700
 *                   address:
 *                     type: string
 *                     example: "456 Main Street"
 *                   description:
 *                     type: string
 *                     example: "Drop off location details"
 *               detourRadius:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 15
 *               availableSeats:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *                 example: 4
 *               contribution:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 30.00
 *               vehicleId:
 *                 type: integer
 *                 example: 12
 *               departureTime:
 *                 type: integer
 *                 description: Unix timestamp in milliseconds for departure
 *                 example: 1719829200000
 *               estimatedArrivalTime:
 *                 type: integer
 *                 description: Unix timestamp in milliseconds for estimated arrival
 *                 example: 1719843600000
 *               extraKmPrice:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 2.50
 *               preferences:
 *                 type: object
 *                 properties:
 *                   smoking:
 *                     type: boolean
 *                   pets:
 *                     type: boolean
 *                   airConditioning:
 *                     type: boolean
 *                   ladiesOnly:
 *                     type: boolean
 *                   gentsOnly:
 *                     type: boolean
 *                   bicycleSupport:
 *                     type: boolean
 *                   snowTires:
 *                     type: boolean
 *                   luggageSize:
 *                     type: string
 *                     enum: [SMALL, MEDIUM, LARGE, NONE]
 *                   luggageCount:
 *                     type: integer
 *                   music:
 *                     type: string
 *                     enum: [NONE, QUIET, MODERATE, LOUD]
 *                   additionalNotes:
 *                     type: string
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
 *                   example: "Ride updated successfully."
 *                 data:
 *                   $ref: '#/components/schemas/D2DRide'
 *       400:
 *         description: Invalid input - detour radius exceeds max, price exceeds max, overlapping ride, or ride not in draft state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the ride owner or user is admin
 *       404:
 *         description: Ride not found or vehicle not found/unavailable
 *
 * /api/v1/d2d/{requestId}/cancel:
 *   patch:
 *     summary: Cancel a Door-to-Door (D2D) booking request (Driver or Passenger)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the D2D booking request to cancel
 *         example: 456
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user (EN/FR)
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Emergency, can't travel anymore"
 *     responses:
 *       200:
 *         description: D2D booking request cancelled successfully
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
 *                   example: "Request cancelled."
 *                 data:
 *                   $ref: '#/components/schemas/D2DBookingRequest'
 *                   nullable: true
 *                   description: Returned only when the request was in POSTED state
 *       400:
 *         description: Bad Request - Already cancelled, already declined, or ride not in published state
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User not allowed to cancel this request
 *       404:
 *         description: Booking request not found
 *
 * /api/v1/d2d/{requestId}/decline:
 *   patch:
 *     summary: Decline a Door-to-Door (D2D) booking request (Driver only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the D2D booking request to decline
 *         example: 789
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user (EN/FR)
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for declining the request
 *                 example: "Location too far off-route"
 *     responses:
 *       200:
 *         description: D2D booking request declined successfully
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
 *                   example: "Booking request declined"
 *                 data:
 *                   $ref: '#/components/schemas/D2DBookingRequest'
 *       400:
 *         description: Bad Request - Only POSTED requests can be declined
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only the ride driver can decline this request
 *       404:
 *         description: Booking request not found
 *
 * /api/v1/admin/settings/d2d:
 *   get:
 *     summary: Get current D2D settings (Admin only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve the current D2D configuration values including radius limits, pricing, and multi-passenger settings.
 *     responses:
 *       200:
 *         description: Current D2D settings retrieved successfully
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
 *                     id:
 *                       type: number
 *                       description: Id of the setting
 *                     maxRadiusKm:
 *                       type: number
 *                       description: Maximum detour radius in kilometers
 *                       example: 25
 *                     maxPricePerExtraKm:
 *                       type: number
 *                       description: Max price per kilometer a driver can not exceed for extra distance charges
 *                       example: 1.5
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User must be admin
 *
 *   put:
 *     summary: Update D2D settings (Admin only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     description: Update D2D configuration settings. Only provide fields that need to be changed. Admin-only endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minRadiusKm:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Minimum detour radius in kilometers
 *                 example: 0
 *               maxPricePerExtraKm:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Maximum price that can not be exceeded per extra kilometer
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: D2D settings updated successfully
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
 *                   example: "D2D settings updated successfully."
 *       400:
 *         description: Bad request - No valid fields provided or validation failed
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User must be admin
 *       422:
 *         description: Validation error - Invalid field values
 *
 * /api/v1/d2d/ride/{rideId}/requests:
 *   get:
 *     summary: Get D2D booking requests for a specific ride (Driver or Admin)
 *     tags: [D2D Rides, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride to fetch booking requests for
 *         example: 88
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Number of records per page
 *         example: 10
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: Language selected by the user (EN/FR)
 *         example: EN
 *     responses:
 *       200:
 *         description: Booking requests fetched successfully
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
 *                     $ref: '#/components/schemas/D2DBookingRequest'
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
 *         description: Unauthorized - Token missing or invalid
 *       403:
 *         description: Forbidden - Not driver/admin for this ride
 *       404:
 *         description: Ride not found
 *
 * /api/v1/d2d/requests:
 *   get:
 *     summary: Get all D2D booking requests with filters (Admin / Driver / Passenger access control)
 *     tags: [D2D Rides, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [POSTED, ACCEPTED, DECLINED, CANCELED, COMPLETED]
 *         description: Filter by booking request status
 *       - in: query
 *         name: passengerId
 *         schema:
 *           type: integer
 *         description: Filter by passenger ID
 *       - in: query
 *         name: rideId
 *         schema:
 *           type: integer
 *         description: Filter by ride ID
 *       - in: query
 *         name: pickupCity
 *         schema:
 *           type: string
 *         description: Filter by pickup city
 *       - in: query
 *         name: dropoffCity
 *         schema:
 *           type: string
 *         description: Filter by dropoff city
 *       - in: query
 *         name: date
 *         schema:
 *           type: integer
 *         description: Filter by specific date (timestamp)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by passenger name or city
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         description: Language selected by user (EN/FR)
 *         example: EN
 *     responses:
 *       200:
 *         description: D2D booking requests fetched successfully with pagination
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
 *                     $ref: '#/components/schemas/D2DBookingRequest'
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
 *         description: Unauthorized - Token missing or invalid
 *       403:
 *         description: Forbidden - Access denied based on role
 *
 * /api/v1/d2d/{rideId}/book:
 *   post:
 *     summary: Book a D2D ride directly (Passenger only)
 *     tags: [D2D Rides]
 *     security:
 *       - bearerAuth: []
 *     description: Book a D2D ride directly using existing ride request locations. Initializes payment session with cost calculation based on detour distances. Only available for ride requesters.
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the D2D ride to book
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickupExtraKms
 *               - dropoffExtraKms
 *             properties:
 *               pickupExtraKms:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Extra kilometers for pickup detour
 *                 example: 2.5
 *               dropoffExtraKms:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Extra kilometers for dropoff detour
 *                 example: 1.2
 *               useCoupons:
 *                 type: boolean
 *                 description: Whether to apply passenger coupons to reduce platform fee
 *                 example: false
 *           example:
 *             {
 *               "pickupExtraKms": 2.5,
 *               "dropoffExtraKms": 1.2,
 *               "useCoupons": false
 *             }
 *     responses:
 *       200:
 *         description: Payment session created successfully for D2D booking
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
 *                       description: Payment session ID for payment confirmation
 *                       example: "cr_ps_123e4567-e89b-12d3-a456-426614174000"
 *                     baseAmount:
 *                       type: number
 *                       description: Driver contribution amount
 *                       example: 30.00
 *                     currency:
 *                       type: string
 *                       example: "RWF"
 *                     Your-DriveFee:
 *                       type: number
 *                       description: Platform/commission fee before discount
 *                       example: 3.00
 *                     taxAmount:
 *                       type: number
 *                       description: Tax amount based on province
 *                       example: 1.50
 *                     discount:
 *                       type: number
 *                       description: Discount percentage applied via coupons
 *                       example: 50
 *                     discountAmount:
 *                       type: number
 *                       description: Discount amount in currency
 *                       example: 1.50
 *                     extraKmsAmount:
 *                       type: number
 *                       description: Extra charge for detour kilometers
 *                       example: 3.70
 *                     totalToPay:
 *                       type: number
 *                       description: Total amount to authorize (base + fee + tax + extra - discount)
 *                       example: 37.20
 *                     taxDetails:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: "HST"
 *                           percentage:
 *                             type: number
 *                             example: 15
 *                           value:
 *                             type: number
 *                             example: 1.50
 *                     usedCoupons:
 *                       type: integer
 *                       description: Number of coupons redeemed (only if useCoupons was true)
 *                       example: 5
 *       400:
 *         description: Bad request - Ride not found, not published, locked, driver coupon active, or invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not authorized to book this ride
 *       404:
 *         description: Ride not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     D2DBookingRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         rideId:
 *           type: integer
 *           example: 123
 *         passengerId:
 *           type: integer
 *           example: 456
 *         pickupLocationId:
 *           type: integer
 *           example: 789
 *         dropoffLocationId:
 *           type: integer
 *           example: 790
 *         detourDistance:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: 2.5
 *         totalAmount:
 *           type: number
 *           format: float
 *           example: 25.50
 *         status:
 *           type: string
 *           enum: [POSTED, ACCEPTED, CONFIRMED, CANCELED, DECLINED]
 *           example: POSTED
 *         extraKms:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: 1.2
 *         reason:
 *           type: string
 *           nullable: true
 *           example: "Request reason"
 *         transactionId:
 *           type: integer
 *           nullable: true
 *           example: 999
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00Z"
 *         acceptedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         confirmedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         canceledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         declinedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         canceledBy:
 *           type: string
 *           nullable: true
 *           example: null
 *         ride:
 *           $ref: '#/components/schemas/D2DRide'
 *           nullable: true
 *         dropoffExtraKms:
 *           type: number
 *           nullable: true
 *         pickupExtraKms:
 *           type: number
 *           nullable: true
 */
