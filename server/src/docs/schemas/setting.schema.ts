/**
 * @swagger
 * components:
 *   schemas:
 *     FeeSetting:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         type:
 *           type: string
 *           enum: [POSTING, BOOKING]
 *           example: POSTING
 *         amount:
 *           type: number
 *           example: 10.5
 *         active:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T12:00:00.000Z"
 *
 *     CouponRedemptionRule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         target:
 *           type: string
 *           description: Coupon target (must match CouponTarget enum)
 *           example: "USER"
 *         requiredCoupons:
 *           type: integer
 *           example: 5
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Redeem 5 coupons for a reward"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T12:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-06-02T12:00:00.000Z"
 *
 *     Log:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         level:
 *           type: string
 *           description: Log level such as error, info, debug
 *           example: "error"
 *         message:
 *           type: string
 *           description: The log message describing the event
 *           example: "User failed login attempt"
 *         action:
 *           type: string
 *           description: Optional action related to the log
 *           example: "login"
 *           nullable: true
 *         userId:
 *           type: number
 *           nullable: true
 *           escription: Optional ID of the user related to this log
 *           example: 43
 *         meta:
 *           type: object
 *           nullable: true
 *           description: Optional JSON metadata related to the log entry
 *           example:
 *              ip: "192.168.1.1"
 *              evice: "iPhone"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T12:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-06-02T12:00:00.000Z"
 */