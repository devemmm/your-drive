/**
 * @swagger
 * components:
 *   schemas:
 *     BookingStatus:
 *       type: string
 *       enum: [APPROVED, DECLINED, PENDING, CANCELLED]
 *       description: The status of a booking
 *     BookingSeat:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *         bookingId:
 *           type: integer
 *           format: int32
 *         attendanceCode:
 *           type: string
 *         rideId:
 *           type: integer
 *           format: int32
 *         attendedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Booking:
 *       type: object
 *       required:
 *         - id
 *         - rideId
 *         - vehicleId
 *         - transactionId
 *         - status
 *         - seats
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the booking
 *         rideId:
 *           type: integer
 *           format: int32
 *           description: ID of the associated ride
 *         vehicleId:
 *           type: integer
 *           format: int32
 *           description: ID of the vehicle used for the ride
 *         transactionId:
 *           type: integer
 *           format: int32
 *           description: ID of the associated payment transaction
 *         status:
 *           $ref: '#/components/schemas/BookingStatus'
 *         seats:
 *           type: integer
 *           format: int32
 *           minimum: 1
 *           description: Number of seats booked for this ride
 *         cancellerId:
 *           type: integer
 *           format: int32
 *           description: The ID of the person who cancelled/declined the booking to trace if is the driver or passenger
 *         reason:
 *           type: string
 *           description: A reason why the booking was cancelled or declined
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the booking was created
 *         cancelledAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the booking was created
 *         cancelledBy:
 *           $ref: '#/components/schemas/User'
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the booking was last updated
 *         bookingSeat:
 *           $ref: '#/components/schemas/BookingSeat'
 *           nullable: true
 *           description: A seat that contains code to show to the driver to attend the ride
 *         ride:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               format: int32
 *             departureLocation:
 *               type: string
 *             destinationLocation:
 *               type: string
 *             availableSeats:
 *               type: integer
 *               format: int32
 *               description: Number of seats still available
 *             driver:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   format: int32
 *                 name:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *         vehicle:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               format: int32
 *             plateNumber:
 *               type: string
 *             model:
 *               type: string
 *         paymentTransaction:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               format: int32
 *             amount:
 *               type: number
 *               format: float
 *               description: Total amount for all booked seats
 *             status:
 *               type: string
 *               enum: [PENDING, COMPLETED, FAILED]
 */ 