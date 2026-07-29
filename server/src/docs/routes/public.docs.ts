/**
 * @swagger
 * /api/v1/public/rides:
 *   get:
 *     summary: Get all rides (paginated, filterable, orderable)(any user), longitude, latitude and radius are to return rides near the user within a certain distance, default 30Km.
 *     tags: [Public, D2D Rides]
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
 *           type: number
 *           format: int32
 *         description: Filter rides departing after this time converted to milliseconds
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *       - in: query
 *         name: userLatitude
 *         schema:
 *           type: number
 *         description: Latitude of user
 *       - in: query
 *         name: userLongitude
 *         schema:
 *           type: number
 *         description: Longitude of user
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *         description: Radius to determine the area to find the rides in in Km, default 30Km.
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/RideType'
 *         description: Filter by ride type
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
 *                 suggestions:
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
 * /api/v1/public/rides/{rideId}:
 *   get:
 *     summary: Get a ride by ID
 *     tags: [Public]
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
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
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
 * /api/v1/public/rides/search:
 *   get:
 *     summary: Search for rides based on filters and location
 *     tags: [Public, D2D Rides]
 *     description: >
 *       Search for published rides using various filters such as departure/destination city, time, contribution range, preferences, and optionally by proximity to a user's location.
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
 *         description: Number of rides per page
 *         example: 10
 *       - in: query
 *         name: departureCity
 *         schema:
 *           type: string
 *         description: Filter by departure city (case-insensitive, partial match)
 *         example: Montreal
 *       - in: query
 *         name: destinationCity
 *         schema:
 *           type: string
 *         description: Filter by destination city (case-insensitive, partial match)
 *         example: Quebec City
 *       - in: query
 *         name: departureTime
 *         schema:
 *           type: number
 *           format: int32
 *         description: Filter rides departing after this time
 *         example: 1746050400000
 *       - in: query
 *         name: minContribution
 *         schema:
 *           type: number
 *         description: Minimum contribution amount
 *         example: 10
 *       - in: query
 *         name: maxContribution
 *         schema:
 *           type: number
 *         description: Maximum contribution amount
 *         example: 50
 *       - in: query
 *         name: userLatitude
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *         description: User's latitude for proximity search
 *         example: 45.5017
 *       - in: query
 *         name: userLongitude
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *         description: User's longitude for proximity search
 *         example: -73.5673
 *       - in: query
 *         name: radiusKm
 *         schema:
 *           type: number
 *           minimum: 1
 *         description: Search radius in kilometers (default 30km)
 *         example: 30
 *       - in: query
 *         name: preferences.smoking
 *         schema:
 *           type: boolean
 *         description: Filter rides by smoking preference
 *         example: false
 *       - in: query
 *         name: preferences.pets
 *         schema:
 *           type: boolean
 *         description: Filter rides by pets preference
 *         example: true
 *       - in: query
 *         name: preferences.airConditioning
 *         schema:
 *           type: boolean
 *         description: Filter rides by air conditioning preference
 *         example: true
 *       - in: query
 *         name: preferences.ladiesOnly
 *         schema:
 *           type: boolean
 *         description: Filter rides by ladies only preference
 *         example: false
 *       - in: query
 *         name: preferences.gentsOnly
 *         schema:
 *           type: boolean
 *         description: Filter rides by gents only preference
 *         example: false
 *       - in: query
 *         name: preferences.bicycleSupport
 *         schema:
 *           type: boolean
 *         description: Filter rides by bicycle support preference
 *         example: false
 *       - in: query
 *         name: preferences.snowTires
 *         schema:
 *           type: boolean
 *         description: Filter rides by snow tires preference
 *         example: true
 *       - in: query
 *         name: preferences.luggageSize
 *         schema:
 *           type: string
 *           enum: [NONE, SMALL, MEDIUM, LARGE]
 *         description: Filter rides by luggage size
 *         example: MEDIUM
 *       - in: query
 *         name: preferences.luggageCount
 *         schema:
 *           type: integer
 *         description: Filter rides by luggage count
 *         example: 1
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/RideType'
 *         description: Filter by ride type
 *     responses:
 *       200:
 *         description: List of rides matching the search criteria
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
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       422:
 *         description: Validation error
 *
 * /api/v1/public/coupons/redemption-rules:
 *   get:
 *     summary: Get all coupon redemption rules
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
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
 *
 * /api/v1/public/directions:
 *   post:
 *     summary: Get directions data from Google Maps
 *     tags: [Public]
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
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: string
 *                 description: Starting location (address or coordinates)
 *                 example: "Montreal, QC"
 *               destination:
 *                 type: string
 *                 description: Ending location (address or coordinates)
 *                 example: "Quebec City, QC"
 *               waypoints:
 *                 type: string
 *                 example: "place1|place2..."
 *     responses:
 *       200:
 *         description: Directions data retrieved successfully
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
 *                   description: Google Maps Directions API response
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error - Failed to fetch directions
 *
 * /api/v1/public/places/autocomplete/cities:
 *   get:
 *     summary: Get city autocomplete suggestions from Google Places API
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: input
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for city name
 *         example: "Mont"
 *       - in: query
 *         name: sessiontoken
 *         required: true
 *         schema:
 *           type: string
 *         description: Session token for billing purposes
 *         example: "1234567890-abcdef"
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: City autocomplete results retrieved successfully
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
 *                   description: Google Places Autocomplete API response
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "OK"
 *                     predictions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           place_id:
 *                             type: string
 *                           description:
 *                             type: string
 *                           structured_formatting:
 *                             type: object
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *       500:
 *         description: Server error - Failed to fetch autocomplete results
 *
 * /api/v1/public/places/autocomplete/addresses:
 *   get:
 *     summary: Get address autocomplete suggestions from Google Places API
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: input
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for address
 *         example: "123 Main"
 *       - in: query
 *         name: sessiontoken
 *         required: true
 *         schema:
 *           type: string
 *         description: Session token for billing purposes
 *         example: "1234567890-abcdef"
 *       - in: query
 *         name: location
 *         required: false
 *         schema:
 *           type: string
 *         description: Latitude,longitude for location bias
 *         example: "45.5017,-73.5673"
 *       - in: query
 *         name: radius
 *         required: false
 *         schema:
 *           type: number
 *         description: Radius in meters for location bias
 *         example: 25000
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Address autocomplete results retrieved successfully
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
 *                   description: Google Places Autocomplete API response
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *       500:
 *         description: Server error - Failed to fetch autocomplete results
 *
 * /api/v1/public/places/details:
 *   get:
 *     summary: Get detailed information about a place from Google Places API
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: place_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Google Place ID
 *         example: "ChIJPTacEpAayUwRKwIkhKDCR1k"
 *       - in: query
 *         name: sessiontoken
 *         required: true
 *         schema:
 *           type: string
 *         description: Session token for billing purposes
 *         example: "1234567890-abcdef"
 *       - in: query
 *         name: fields
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated list of fields to return
 *         example: "geometry,address_components,formatted_address,name"
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Place details retrieved successfully
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
 *                   description: Google Place Details API response
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "OK"
 *                     result:
 *                       type: object
 *                       properties:
 *                         geometry:
 *                           type: object
 *                         address_components:
 *                           type: array
 *                         formatted_address:
 *                           type: string
 *                         name:
 *                           type: string
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *       500:
 *         description: Server error - Failed to fetch place details
 */
