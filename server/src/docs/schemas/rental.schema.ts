/**
 * @swagger
 * components:
 *   schemas:
 *     RentalStatus:
 *       type: string
 *       enum: [REQUESTED, APPROVED, ACTIVE, COMPLETED, CANCELLED, DECLINED, DISPUTED]
 *       description: The status of a car rental
 *
 *     RentalType:
 *       type: string
 *       enum: [HOURLY, DAILY]
 *       description: The billing type for a rental
 *
 *     CarRental:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         vehicleId:
 *           type: integer
 *           example: 5
 *         renterId:
 *           type: integer
 *           example: 10
 *         ownerId:
 *           type: integer
 *           example: 8
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2026-05-01T09:00:00Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2026-05-03T09:00:00Z"
 *         rentalType:
 *           $ref: '#/components/schemas/RentalType'
 *         totalAmount:
 *           type: number
 *           format: float
 *           example: 200.00
 *         securityDepositAmount:
 *           type: number
 *           format: float
 *           example: 500.00
 *         status:
 *           $ref: '#/components/schemas/RentalStatus'
 *         transactionId:
 *           type: integer
 *           nullable: true
 *         depositTransactionId:
 *           type: integer
 *           nullable: true
 *         pickupLocationId:
 *           type: integer
 *           nullable: true
 *         returnLocationId:
 *           type: integer
 *           nullable: true
 *         pickupNotes:
 *           type: string
 *           nullable: true
 *         returnNotes:
 *           type: string
 *           nullable: true
 *         depositRefunded:
 *           type: boolean
 *           example: false
 *         depositRefundedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancellerId:
 *           type: integer
 *           nullable: true
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *         approvedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         declinedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         activatedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         vehicle:
 *           $ref: '#/components/schemas/Vehicle'
 *         renter:
 *           $ref: '#/components/schemas/User'
 *         owner:
 *           $ref: '#/components/schemas/User'
 *         transaction:
 *           type: object
 *           nullable: true
 *         depositTransaction:
 *           type: object
 *           nullable: true
 *         pickupLocation:
 *           type: object
 *           nullable: true
 *         returnLocation:
 *           type: object
 *           nullable: true
 *
 *     RentalSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         platformFeePercentage:
 *           type: number
 *           format: float
 *           example: 15
 *         maxRentalDurationDays:
 *           type: integer
 *           example: 30
 *         minRentalDurationHours:
 *           type: integer
 *           example: 1
 *         requestExpiryHours:
 *           type: integer
 *           example: 24
 *         depositReleaseReminderHours:
 *           type: integer
 *           example: 24
 *         overdueGracePeriodHours:
 *           type: integer
 *           example: 3
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
