/**
 * @swagger
 * components:
 *   schemas:
 *     D2DStatus:
 *       type: string
 *       enum: [POSTED, ACCEPTED, DECLINED, CONFIRMED, CANCELED]
 *       description: The status of a D2D request
 *
 *     D2DRequest:
 *       type: object
 *       required:
 *         - id
 *         - rideId
 *         - driverId
 *         - passengerId
 *         - pickupLocationId
 *         - dropoffLocationId
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the D2D request
 *         rideId:
 *           type: integer
 *           format: int32
 *           description: ID of the associated D2D ride
 *         driverId:
 *           type: integer
 *           format: int32
 *           description: ID of the driver
 *         passengerId:
 *           type: integer
 *           format: int32
 *           description: ID of the passenger requesting the ride
 *         pickupLocationId:
 *           type: integer
 *           format: int32
 *           description: ID of the passenger's pickup location
 *         dropoffLocationId:
 *           type: integer
 *           format: int32
 *           description: ID of the passenger's dropoff location
 *         detourDistance:
 *           type: number
 *           format: float
 *           description: Distance from main route departure to passenger pickup in km
 *         distanceKm:
 *           type: number
 *           format: float
 *           description: Distance from passenger pickup to dropoff in km
 *         totalAmount:
 *           type: number
 *           format: float
 *           description: Total amount to be charged to the passenger
 *         status:
 *           $ref: '#/components/schemas/D2DStatus'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the request was created
 *         startedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the ride was started
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the ride was completed
 *         canceledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the request was canceled
 *         cancelReason:
 *           type: string
 *           nullable: true
 *           description: Reason for cancellation
 *         driver:
 *           $ref: '#/components/schemas/User'
 *         passenger:
 *           $ref: '#/components/schemas/User'
 *         ride:
 *           $ref: '#/components/schemas/Ride'
 *         pickupLocation:
 *           $ref: '#/components/schemas/Location'
 *         dropoffLocation:
 *           $ref: '#/components/schemas/Location'
 *
 *     D2DRide:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *         detourRadius:
 *           type: number
 *           format: float
 *           description: Maximum detour radius in km (0-25)
 *         extraKmPrice:
 *           type: number
 *           format: float
 *           description: Price per extra km beyond the 25km free allowance
 *         driverStartLocation:
 *           $ref: '#/components/schemas/Location'
 *         driverStopLocation:
 *           $ref: '#/components/schemas/Location'
 *         availableSeats:
 *           type: integer
 *         totalSeats:
 *           type: integer
 *         contribution:
 *           type: number
 *           format: float
 *         rideRequestId:
 *           type: number
 *           format: int32
 *           nullable: true
 *         status:
 *           $ref: '#/components/schemas/RideStatus'
 *         driver:
 *           $ref: '#/components/schemas/User'
 *         vehicle:
 *           $ref: '#/components/schemas/Vehicle'
 *         isLocked:
 *           type: boolean
 *         preferences:
 *           $ref: '#/components/schemas/RidePreferences'
 *         bookingType:
 *           $ref: '#/components/schemas/BookingType'
 *         driverId:
 *           type: integer
 *           format: int32
 *         vehicleId:
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
 *
 *     D2DRequestBreakdown:
 *       type: object
 *       properties:
 *         detourDistance:
 *           type: number
 *           format: float
 *           description: Distance from main route departure to passenger pickup
 *         freeKmAllowance:
 *           type: number
 *           format: float
 *           description: Free km allowance (25km)
 *         extraDistance:
 *           type: number
 *           format: float
 *           description: Extra distance beyond free allowance
 *         basePrice:
 *           type: number
 *           format: float
 *         extraKmPrice:
 *           type: number
 *           format: float
 *         extraCharges:
 *           type: number
 *           format: float
 *           description: Extra charges calculated as extraDistance * extraKmPrice
 *         totalAmount:
 *           type: number
 *           format: float
 *         passengerTravelDistance:
 *           type: number
 *           format: float
 *           description: Distance from passenger pickup to dropoff
 *         chargeReason:
 *           type: string
 *           description: Explanation of charge calculation
 *
 *     D2DTripSummary:
 *       type: object
 *       properties:
 *         distances:
 *           type: object
 *           properties:
 *             driverToDeparture:
 *               type: string
 *               format: numeric
 *               description: Distance from driver's departure to passenger pickup
 *             passengerTravel:
 *               type: string
 *               format: numeric
 *               description: Distance from passenger pickup to dropoff
 *             dropoffToDestination:
 *               type: string
 *               format: numeric
 *               description: Distance from passenger dropoff to route destination
 *             totalDistance:
 *               type: string
 *               format: numeric
 *         timing:
 *           type: object
 *           properties:
 *             rideDurationMinutes:
 *               type: integer
 *             estimatedMinutes:
 *               type: integer
 *             startedAt:
 *               type: string
 *               format: date-time
 *             completedAt:
 *               type: string
 *               format: date-time
 *         pricing:
 *           type: object
 *           properties:
 *             basePrice:
 *               type: string
 *               format: numeric
 *             detourDistance:
 *               type: string
 *               format: numeric
 *             extraDistance:
 *               type: string
 *               format: numeric
 *             extraKmRate:
 *               type: string
 *               format: numeric
 *             extraCharges:
 *               type: string
 *               format: numeric
 *             totalAmount:
 *               type: string
 *               format: numeric
 *             freeAllowance:
 *               type: number
 *               format: float
 *         participants:
 *           type: object
 *           properties:
 *             driver:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 rating:
 *                   type: string
 *                   format: numeric
 *                 vehicle:
 *                   type: string
 *             passenger:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 rating:
 *                   type: string
 *                   format: numeric
 */