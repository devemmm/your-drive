/**
 * @swagger
 * components:
 *   schemas:
 *     Rating:
 *       type: object
 *       required:
 *         - driverId
 *         - rating
 *         - rideId
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the rating
 *           example: 1
 *         driverId:
 *           type: integer
 *           description: ID of the driver being rated
 *           example: 789
 *         userId:
 *           type: integer
 *           description: ID of the user who created the rating
 *           example: 456
 *         rideId:
 *           type: integer
 *           description: ID of the ride being rated
 *           example: 123
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating value (1-5)
 *           example: 5
 *         review:
 *           type: string
 *           maxLength: 500
 *           description: Optional review text
 *           example: "Great ride experience, very professional!"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the rating was created
 *           example: "2023-01-01T12:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the rating was last updated
 *           example: "2023-01-01T12:00:00Z"
 *         user:
 *           $ref: '#/components/schemas/UserBasic'
 *
 *     UserBasic:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 456
 *         firstName:
 *           type: string
 *           example: "John Doe"
 *         profileImage:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               example: "https://example.com/profile.jpg"
 *
 *     RatingStats:
 *       type: object
 *       properties:
 *         averageRating:
 *           type: number
 *           format: float
 *           example: 4.5
 *         totalRatings:
 *           type: integer
 *           example: 10
 *         ratingCounts:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           example:
 *             1: 0
 *             2: 1
 *             3: 2
 *             4: 3
 *             5: 4
 *     DriverReviews:
 *       type: object
 *       properties:
 *         driverId:
 *           type: integer
 *           description: ID of the driver
 *           example: 789
 *         reviews:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Rating'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             pageSize:
 *               type: integer
 *               example: 10
 *             total:
 *               type: integer
 *               example: 25
 *             totalPages:
 *               type: integer
 *               example: 3
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message describing the issue"
 */
