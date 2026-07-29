/**
 * @swagger
 * components:
 *   schemas:
 *     TransactionType:
 *       type: string
 *       enum: [RIDE_POSTING, RIDE_BOOKING, SUBSCRIPTION]
 *       description: The type of transaction
 *     PaymentProvider:
 *       type: string
 *       enum: [STRIPE, PAYPAL]
 *       description: The payment provider/processor
 *     TransactionStatus:
 *       type: string
 *       enum: [PENDING, PAID, FAILED, CANCELLED, ONHOLD, REFUNDED, PARTIALLY_REFUNDED]
 *       description: The status of the transaction
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the transaction
 *         transactionId:
 *           type: uuid
 *           description: The unique identifier for the transaction
 *         userId:
 *           type: integer
 *           format: int32
 *           description: The id of the user who made the transaction
 *         rideId:
 *           type: integer
 *           format: int32
 *           nullable: true
 *           description: The id of the ride associated with the transaction (if any)
 *         type:
 *           $ref: '#/components/schemas/TransactionType'
 *         amount:
 *           type: number
 *           format: float
 *           description: The total transaction amount
 *         platformAmount:
 *           type: number
 *           format: float
 *           description: The platform amount
 *         driverAmount:
 *           type: number
 *           format: float
 *           description: The driver amount when the contribution is collected via the platform
 *         currency:
 *           type: string
 *           description: The currency in which the amount is charged in
 *           example: RWF
 *         status:
 *           $ref: '#/components/schemas/TransactionStatus'
 *         paymentProvider:
 *           $ref: '#/components/schemas/PaymentProvider'
 *         externalReference:
 *           type: string
 *           nullable: true
 *           description: External reference for transaction tracking
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the transaction was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the transaction was last updated
 *         clientSecret:
 *           type: string
 *           nullable: true
 *           description: Stripe client secret for frontend payment processing
 *         refundedAmount:
 *           type: number
 *           format: float
 *           default: 0
 *           description: Amount refunded if any
 *         isRefunded:
 *           type: boolean
 *           default: false
 *           description: Whether the transaction has been refunded
 *         planId:
 *           type: integer
 *           format: int32
 *           nullable: true
 *           description: The id of the subscription plan (if any)
 *         refundedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the transaction was refunded
 *         booking:
 *           $ref: '#/components/schemas/Booking'
 *           nullable: true
 */
