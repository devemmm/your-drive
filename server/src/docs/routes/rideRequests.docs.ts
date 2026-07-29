/**
 * @swagger
 * /api/v1/ride-requests:
 *   post:
 *     summary: Create a new ride request (User)
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new ride request. All endpoints accept optional `lang` query parameter to return localized messages.
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
 *               - origin
 *               - destination
 *               - date
 *               - rideType
 *             properties:
 *               origin:
 *                 type: object
 *                 required: [city, province]
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Montreal"
 *                   province:
 *                     type: string
 *                     example: "Quebec"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     example: 45.5017
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     example: -73.5673
 *                   locationName:
 *                     type: string
 *                     example: "Central Station"
 *                   address:
 *                     type: string
 *                     example: "123 Queen Street W"
 *               destination:
 *                 type: object
 *                 required: [city, province, latitude, longitude]
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Quebec City"
 *                   province:
 *                     type: string
 *                     example: "Quebec"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     example: 46.8139
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     example: -71.2082
 *                   locationName:
 *                     type: string
 *                     example: "Gare du Palais"
 *                   address:
 *                     type: string
 *                     example: "1 rue Dalhousie"
 *               date:
 *                 type: number
 *                 format: int32
 *                 example: 1766181600000
 *               timeWindowStart:
 *                 type: number
 *                 format: int32
 *                 nullable: true
 *                 example: 1766181600000
 *               timeWindowEnd:
 *                 type: number
 *                 format: int32
 *                 nullable: true
 *                 example: 1766181600000
 *               seats:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               description:
 *                 type: string
 *                 description: Descriptgion about the request describing tghe ride
 *               rideType:
 *                 $ref: '#/components/schemas/RideType'
 *     responses:
 *       201:
 *         description: Ride request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RideRequest'
 *       400:
 *         description: Bad request – validation or business rule violation (date or time window must be in the future etc.)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       422:
 *         description: Validation error
 *
 *   get:
 *     summary: List ride requests (paginated & filterable)
 *     tags: [Ride Requests, Admin]
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
 *         description: Number of items per page
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, OPEN, CLOSED, EXPIRED]
 *         description: Filter by ride request status
 *       - in: query
 *         name: date
 *         description: Filter requests by date (returns requests on that day)
 *         schema:
 *           type: number
 *           format: int32
 *           example: 1766181600000
 *       - in: query
 *         name: originCity
 *         schema:
 *           type: string
 *         description: Filter by origin city (case-insensitive, partial match)
 *       - in: query
 *         name: originProvince
 *         schema:
 *           type: string
 *         description: Filter by origin province (name or code)
 *       - in: query
 *         name: destinationCity
 *         schema:
 *           type: string
 *         description: Filter by destination city (case-insensitive, partial match)
 *       - in: query
 *         name: destinationProvince
 *         schema:
 *           type: string
 *         description: Filter by destination province (name or code)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: General search across city / province / province codes
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *       - in: query
 *         name: mineOnly
 *         description: Filter out owner's requests or general, default is false
 *         required: false
 *         schema:
 *           type: boolean
 *         example: false
 *     responses:
 *       200:
 *         description: List of ride requests with pagination
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
 *                     $ref: '#/components/schemas/RideRequest'
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
 *                       example: 42
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *
 * /api/v1/ride-requests/{requestId}:
 *   get:
 *     summary: Get a ride request by ID
 *     tags: [Ride Requests, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the ride request to retrieve
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
 *         description: Ride request found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RideRequestDetailed'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Not allowed to access this request
 *       404:
 *         description: Ride request not found
 *
 *   delete:
 *     summary: Delete a ride request
 *     tags: [Ride Requests, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the ride request to delete
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
 *         description: Ride request deleted successfully
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
 *                   example: "Ride request deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to delete this request
 *       404:
 *         description: Ride request not found
 *
 *   patch:
 *     summary: Update an existing ride request (only DRAFT allowed)
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the ride request to update
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
 *               origin:
 *                 type: object
 *                 required: [city, province]
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Montreal"
 *                   province:
 *                     type: string
 *                     example: "Quebec"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     example: 45.5017
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     example: -73.5673
 *                   locationName:
 *                     type: string
 *                     example: "Central Station"
 *                   address:
 *                     type: string
 *                     example: "123 Queen Street W"
 *               destination:
 *                 type: object
 *                 required: [city, province, latitude, longitude]
 *                 properties:
 *                   city:
 *                     type: string
 *                     example: "Quebec City"
 *                   province:
 *                     type: string
 *                     example: "Quebec"
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     example: 46.8139
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     example: -71.2082
 *                   locationName:
 *                     type: string
 *                     example: "Gare du Palais"
 *                   address:
 *                     type: string
 *                     example: "1 rue Dalhousie"
 *               date:
 *                 type: number
 *                 format: int32
 *                 example: 1766181600000
 *               timeWindowStart:
 *                 type: number
 *                 format: int32
 *                 nullable: true
 *                 example: 1766181600000
 *               timeWindowEnd:
 *                 type: number
 *                 format: int32
 *                 nullable: true
 *                 example: 1766181600000
 *               seats:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *               proximityMeters:
 *                 type: integer
 *                 minimum: 100
 *                 description: Search proximity in meters (default applied by server if omitted)
 *                 example: 5000
 *               rideType:
 *                 $ref: '#/components/schemas/RideType'
 *               description:
 *                 type: string
 *                 description: Descriptgion about the request describing tghe ride
 *     responses:
 *       200:
 *         description: Ride request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RideRequest'
 *                 message:
 *                   type: string
 *                   example: "Ride request updated successfully"
 *       400:
 *         description: Bad request or business rule violation
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to update this request
 *       404:
 *         description: Ride request not found
 *
 * /api/v1/ride-requests/{requestId}/close:
 *   patch:
 *     summary: Close a ride request (owner only)
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the ride request to close
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
 *         description: Ride request closed successfully. Returns the updated request and potential matches (with distances/time-window flags).
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
 *                     - $ref: '#/components/schemas/RideRequest'
 *                     - $ref: '#/components/schemas/RideRequestDetailed'
 *                 message:
 *                   type: string
 *                   example: "Ride request closed successfully"
 *       400:
 *         description: Bad request - only OPEN ride requests can be closed, or other validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Ride request not found
 *
 * /api/v1/ride-requests/{requestId}/open:
 *   patch:
 *     summary: Open a DRAFT ride request (owner only)
 *     tags: [Ride Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the ride request to open
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
 *         description: Ride request opened successfully and matches (if any) are computed/attached. Returns the annotated request with matches.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RideRequestDetailed'
 *                 message:
 *                   type: string
 *                   example: "Ride request opened successfully"
 *       400:
 *         description: Bad request - only DRAFT requests can be opened or validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Ride request not found
 *
 * /api/v1/ride-requests/{requestId}/matches:
 *   get:
 *     summary: Get matches for a ride request (paginated)
 *     tags: [Ride Requests, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the ride request
 *         example: 123
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for matched rides
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of matches per page
 *         example: 10
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
 *         description: List of matched rides for the ride request (with distances and time-window annotation)
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
 *                     $ref: '#/components/schemas/RideRequestMatch'
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
 *                       example: 3
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Bad request - invalid parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - only owner or admin can fetch matches
 *       404:
 *         description: Ride request not found
 *
 *
 * components:
 *   schemas:
 *     RideType:
 *       type: string
 *       description: Ride type enum (server defines acceptable values)
 *       example: P2P
 *       enum: [D2D,P2P]
 *
 *     LocationSimple:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 12
 *         city:
 *           type: string
 *           example: "Montreal"
 *         region:
 *           type: string
 *           example: "Quebec"
 *         regionCode:
 *           type: string
 *           example: "QC"
 *         latitude:
 *           type: number
 *           format: float
 *           example: 45.5017
 *         longitude:
 *           type: number
 *           format: float
 *           example: -73.5673
 *         locationName:
 *           type: string
 *           example: "Central Station"
 *         address:
 *           type: string
 *           example: "123 Queen Street W"
 *     RideRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 123
 *         userId:
 *           type: integer
 *           example: 42
 *         origin:
 *           $ref: '#/components/schemas/LocationSimple'
 *         destination:
 *           $ref: '#/components/schemas/LocationSimple'
 *         originCity:
 *           type: string
 *           example: "Montreal"
 *         originProvince:
 *           type: string
 *           example: "Quebec"
 *         destCity:
 *           type: string
 *           example: "Quebec City"
 *         destProvince:
 *           type: string
 *           example: "Quebec"
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2025-07-01T10:00:00.000Z"
 *         timeWindowStart:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2025-07-01T09:30:00.000Z"
 *         timeWindowEnd:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2025-07-01T11:00:00.000Z"
 *         seats:
 *           type: integer
 *           example: 1
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Need a ride to the airport"
 *         status:
 *           type: string
 *           enum: [DRAFT, OPEN, CLOSED, EXPIRED]
 *           example: DRAFT
 *         rideType:
 *           $ref: '#/components/schemas/RideType'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         openedAt:
 *           type: string
 *           format: date-time
 *         closedAt:
 *           type: string
 *           format: date-time
 *
 *     RideRequestDetailed:
 *       allOf:
 *         - $ref: '#/components/schemas/RideRequest'
 *         - type: object
 *           properties:
 *             matches:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RideRequestMatch'
 *             _count:
 *               type: object
 *               properties:
 *                 matches:
 *                   type: integer
 *
 *     RideRequestMatch:
 *       type: object
 *       description: A match object including underlying ride
 *       properties:
 *         id:
 *           type: integer
 *           example: 321
 *         requestId:
 *           type: integer
 *           example: 123
 *         rideId:
 *           type: integer
 *           example: 456
 *         matchedAt:
 *           type: string
 *           format: date-time
 *         ride:
 *           $ref: '#/components/schemas/Ride'
 */
