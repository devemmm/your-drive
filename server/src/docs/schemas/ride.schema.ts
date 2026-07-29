/**
 * @swagger
 * components:
 *   schemas:
 *     BookingType:
 *       type: string
 *       enum: [AUTOMATIC, MANUAL]
 *       description: The type of booking for the ride
 *     RideType:
 *       type: string
 *       description: Ride type enum (server defines acceptable values)
 *       example: P2P
 *       enum: [D2D, P2P]
 *     RideStatus:
 *       type: string
 *       enum: [DRAFT, PUBLISHED, ONGOING, COMPLETED, CANCELLED]
 *       description: The status of the ride
 *     MonitizationType:
 *       type: string
 *       enum: [SUBSCRIPTION, PAYMENT, COUPON, FREE]
 *       description: The monitization type of the ride
 *     LuggageSize:
 *       type: string
 *       enum: [NONE, SMALL, MEDIUM, LARGE]
 *       description: The size of luggage allowed
 *     ERROR_CODES:
 *       type: string
 *       enum: [DRIVER_NOT_ONBOARDED, STRIPE_NOT_ONBOARDED]
 *       description: The size of luggage allowed
 *     MusicPreferences:
 *       type: string
 *       enum: [NOT_AT_ALL, LOW, MEDIUM, HIGH]
 *       description: The musice preference of the user
 *     ContributionCollectionMethod:
 *       type: string
 *       enum: [VIA_PLATFORM, OFF_PLATFORM]
 *       description: The ride contribution collection methods allowed
 *     YesNo:
 *       type: string
 *       enum: [YES, NO]
 *       description: Yes or No value
 *     RidePreferences:
 *       type: object
 *       properties:
 *         smoking:
 *           type: boolean
 *         pets:
 *           type: boolean
 *         airConditioning:
 *           type: boolean
 *         ladiesOnly:
 *           type: boolean
 *         luggageSize:
 *           $ref: '#/components/schemas/LuggageSize'
 *         music:
 *           $ref: '#/components/schemas/MusicPreferences'
 *         luggageCount:
 *           type: integer
 *           format: int32
 *         bicycleSupport:
 *           type: boolean
 *         snowTires:
 *           type: boolean
 *         gentsOnly:
 *           type: boolean
 *     Location:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *         region:
 *           type: string
 *         city:
 *           type: string
 *         locationName:
 *           type: string
 *         latitude:
 *           type: number
 *           format: float
 *         longitude:
 *           type: number
 *           format: float
 *         address:
 *           type: string
 *     Ride:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *         departureTime:
 *           type: string
 *           format: date-time
 *         departureLocation:
 *           $ref: '#/components/schemas/Location'
 *           description: Departure location details
 *         destinationLocation:
 *           $ref: '#/components/schemas/Location'
 *           description: Destination location details
 *         isBlocked:
 *           type: boolean
 *         isRideRequester:
 *           type: boolean
 *         isLocked:
 *           type: boolean
 *         stopovers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Location'
 *           description: Optional list of stopover locations
 *         availableSeats:
 *           type: integer
 *         totalSeats:
 *           type: integer
 *         type:
 *           $ref: '#/components/schemas/RideType'
 *         contribution:
 *           type: number
 *           format: float
 *         preferences:
 *           $ref: '#/components/schemas/RidePreferences'
 *         bookingType:
 *           $ref: '#/components/schemas/BookingType'
 *         status:
 *           $ref: '#/components/schemas/RideStatus'
 *         monitizationType:
 *           $ref: '#/components/schemas/MonitizationType'
 *         driverId:
 *           type: integer
 *           format: int32
 *         vehicleId:
 *           type: integer
 *           format: int32
 *         rideRequestId:
 *           type: integer
 *           format: int32
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         publishedAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         startedAt:
 *           type: string
 *           format: date-time
 *         estimatedArrivalTime:
 *           type: string
 *           format: date-time
 *         vehicle:
 *           $ref: '#/components/schemas/Vehicle'
 *         contributionCollectionMethod:
 *           $ref: '#/components/schemas/ContributionCollectionMethod'
 *         driver:
 *           $ref: '#/components/schemas/User'
 *         distanceKm:
 *           type: string
 *           format: numeric
 *           nullable: true
 *           description: The distance from the user to the depart of the ride in Km, user coordinates are provided.
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *         cancellationReviewed:
 *           type: boolean
 *           nullable: true
 *         cancellationReviewedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancellationReviewedById:
 *           type: integer
 *           format: int32
 *           nullable: true
 *         cancellationReviewer:
 *           $ref: '#/components/schemas/User'
 *           nullable: true
 *         cancellationCountsAgainstAllowance:
 *           $ref: '#/components/schemas/YesNo'
 *           default: NO
 *         isDeleted:
 *           type: boolean
 *           default: false
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         blockedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         blockingReason:
 *           type: string
 *           nullable: true
 *         blockerId:
 *           type: integer
 *           format: int32
 *           nullable: true
 *         blocker:
 *           $ref: '#/components/schemas/User'
 *           nullable: true
 */
