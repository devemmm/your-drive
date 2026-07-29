/**
 * @swagger
 * /api/v1/admin/logs:
 *   get:
 *     summary: Get logs with filtering, pagination, and stats
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 10
 *         description: Number of logs per page (default 10)
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           example: error
 *         description: Log level (e.g., info, error, warn)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: LOGIN
 *         description: Action type to filter logs
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 42
 *         description: Filter logs by user ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: failed
 *         description: Search in message, action, or meta.message
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           example: createdAt
 *         description: Field to sort by (default "createdAt")
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           example: desc
 *         description: Sort order (asc or desc, default "desc")
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00Z"
 *         description: Filter logs created after this date (ISO8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-12-31T23:59:59Z"
 *         description: Filter logs created before this date (ISO8601)
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     responses:
 *       200:
 *         description: List of logs with stats and pagination
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
 *                     $ref: '#/components/schemas/Log'
 *                 stats:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                   example: { "info": 50, "error": 10 }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Log:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         level:
 *           type: string
 *           enum: [info, error, warn, debug]
 *           example: error
 *         message:
 *           type: string
 *           example: "User login failed"
 *         action:
 *           type: string
 *           nullable: true
 *           example: login
 *         userId:
 *           type: integer
 *           nullable: true
 *           example: 1
 */