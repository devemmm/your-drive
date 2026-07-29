/**
 * @swagger
 * components:
 *   schemas:
 *     ChauffeurStatus:
 *       type: string
 *       enum: [REQUESTED, ACCEPTED, ACTIVE, COMPLETED, CANCELLED, DECLINED, DISPUTED]
 *       description: The status of a chauffeur service
 *
 *     ChauffeurServiceType:
 *       type: string
 *       enum: [HOURLY, DAILY]
 *       description: The billing type for a chauffeur service
 *
 *     ChauffeurService:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         vehicleId:
 *           type: integer
 *           example: 5
 *         passengerId:
 *           type: integer
 *           example: 10
 *         driverId:
 *           type: integer
 *           example: 12
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2026-05-01T09:00:00Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2026-05-01T17:00:00Z"
 *         serviceType:
 *           $ref: '#/components/schemas/ChauffeurServiceType'
 *         totalAmount:
 *           type: number
 *           format: float
 *           example: 150.00
 *         status:
 *           $ref: '#/components/schemas/ChauffeurStatus'
 *         transactionId:
 *           type: integer
 *           nullable: true
 *         pickupLocationId:
 *           type: integer
 *           nullable: true
 *         dropoffLocationId:
 *           type: integer
 *           nullable: true
 *         pickupNotes:
 *           type: string
 *           nullable: true
 *         dropoffNotes:
 *           type: string
 *           nullable: true
 *         cancellerId:
 *           type: integer
 *           nullable: true
 *         cancellationReason:
 *           type: string
 *           nullable: true
 *         acceptedAt:
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
 *         passenger:
 *           $ref: '#/components/schemas/User'
 *         driver:
 *           $ref: '#/components/schemas/User'
 *         transaction:
 *           type: object
 *           nullable: true
 *         pickupLocation:
 *           type: object
 *           nullable: true
 *         dropoffLocation:
 *           type: object
 *           nullable: true
 *
 *     ChauffeurSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         platformFeePercentage:
 *           type: number
 *           format: float
 *           example: 15
 *         maxServiceDurationDays:
 *           type: integer
 *           example: 30
 *         minServiceDurationHours:
 *           type: integer
 *           example: 1
 *         requestExpiryHours:
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
