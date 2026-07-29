/**
 * @swagger
 * /api/v1/no-shows/{userId}:
 *   get:
 *     summary: Get all no-shows for a specific user (Admin only)
 *     tags: [NoShow, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: ID of the user to retrieve no-shows for
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 12
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     responses:
 *       200:
 *         description: Successfully retrieved no-shows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NoShow'
 *       400:
 *         description: Invalid user ID
 *       404:
 *         description: No no-shows found
 *       500:
 *         description: Failed to retrieve no-shows
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/no-shows/rides/{rideId}:
 *   get:
 *     summary: Get all no-shows for a specific ride (Admin only)
 *     tags: [NoShow, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         description: ID of the ride to retrieve no-shows for
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 34
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     responses:
 *       200:
 *         description: Successfully retrieved no-shows for the ride
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NoShow'
 *       400:
 *         description: Invalid ride ID
 *       404:
 *         description: No no-shows found
 *       500:
 *         description: Failed to retrieve no-shows
 *       401:
 *         description: Unauthorized
*/

/**
 * @swagger
 * /api/v1/admin/no-shows/all:
 *   get:
 *     summary: Get all no-shows (Admin only)
 *     tags: [NoShow, Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           format: int32
 *         description: The page number for pagination (default is 1)
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: number
 *           format: int32
 *         description: The page size for pagination (default is 10)
 *         example: 10
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all no-shows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NoShow'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: No no-shows found
 *       500:
 *         description: Failed to retrieve no-shows
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/admin/no-shows/stats:
 *   get:
 *     summary: Get no-show statistics (Admin only)
 *     tags: [NoShow, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     responses:
 *       200:
 *         description: Successfully retrieved no-show statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   example:
 *                     totalNoShows: 25
 *                     mostCommonReason: "User did not show up"
 *       500:
 *         description: Failed to retrieve no-show statistics
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/no-shows:
 *   post:
 *     summary: Report a new no-show
 *     tags: [NoShow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rideId
 *               - userId
 *               - reason
 *               - reporterType
 *             properties:
 *               rideId:
 *                 type: integer
 *                 example: 34
 *               userId:
 *                 type: integer
 *                 example: 12
 *               reason:
 *                 type: string
 *                 example: "User did not show up"
 *               reporterType:
 *                 type: string
 *                 enum: [DRIVER, PASSENGER]
 *                 example: PASSENGER
 *                 description: This is to identify who is reporting the no-show either DRIVER or PASSENGER
 *     responses:
 *       201:
 *         description: Successfully reported no-show
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NoShow'
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Failed to report no-show
 */

/**
 * @swagger
 * /api/v1/admin/no-shows/{id}/confirm:
 *   patch:
 *     summary: Confirm a no-show (Admin only)
 *     tags: [NoShow, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the no-show report to confirm
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 10
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewNotes:
 *                 type: string
 *                 example: "Verified by support team"
 *     responses:
 *       200:
 *         description: Successfully confirmed the no-show
 *       400:
 *         description: Invalid request or no-show already reviewed
 *       404:
 *         description: No-show not found
 *       500:
 *         description: Failed to confirm no-show
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/admin/no-shows/{id}/reject:
 *   patch:
 *     summary: Reject a no-show (Admin only)
 *     tags: [NoShow, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the no-show report to reject
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 10
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewNotes:
 *                 type: string
 *                 example: "Insufficient evidence to confirm"
 *     responses:
 *       200:
 *         description: Successfully rejected the no-show
 *       400:
 *         description: Invalid request or no-show already reviewed
 *       404:
 *         description: No-show not found
 *       500:
 *         description: Failed to reject no-show
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NoShow:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 12
 *         rideId:
 *           type: integer
 *           example: 34
 *         reason:
 *           type: string
 *           example: "User did not show up"
 *         reportedById:
 *           type: integer
 *           example: 56
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-08-13T09:00:00Z"
 */
