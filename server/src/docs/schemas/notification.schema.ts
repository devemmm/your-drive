/**
 * @swagger
 * components:
 *   schemas:
 *     SocketIoEvents:
 *       type: string
 *       enum: [notification, payment_succeeded, subscription_activated, payment_failed, payment_cancelled, ride_updated, passenger_booking, driver_booking, payment_authorized]
 *       description: SocketIo events in the project to be handled on frontend
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the notification
 *         title:
 *           type: string
 *           description: The title of the notification
 *         userId:
 *           type: integer
 *           format: int32
 *           description: The id of the user who receives the notification
 *         message:
 *           type: string
 *           description: The message content of the notification
 *         isRead:
 *           type: boolean
 *           default: false
 *           description: Whether the notification has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the notification was created
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         pageSize:
 *           type: integer
 *         total:
 *           type: integer
 *         totalPages:
 *           type: integer
 */
