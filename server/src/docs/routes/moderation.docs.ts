/**
 * @swagger
 * tags:
 *   name: Moderation
 *   description: Content moderation endpoints
 */

/**
 * @swagger
 * /api/v1/moderation/content:
 *   post:
 *     summary: Moderate a single piece of content
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - context
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content to moderate
 *                 example: "Hello, when will you arrive at the pickup location?"
 *               context:
 *                 type: object
 *                 required:
 *                   - contentType
 *                 properties:
 *                   contentType:
 *                     type: string
 *                     enum: [chat_message, review, ride_notes, location_name]
 *                     example: "chat_message"
 *                   userRole:
 *                     type: string
 *                     enum: [USER, ADMIN]
 *                     example: "USER"
 *                   questionContext:
 *                     type: string
 *                     example: "Chat thread for ride ID: 123"
 *                   previousMessages:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["Hi", "I'm running 5 minutes late"]
 *     responses:
 *       200:
 *         description: Content moderation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     result:
 *                       type: object
 *                       properties:
 *                         isValid:
 *                           type: boolean
 *                         message:
 *                           type: string
 *                         category:
 *                           type: string
 *                         relevanceScore:
 *                           type: number
 *                         confidenceScore:
 *                           type: number
 *                     content:
 *                       type: string
 *       400:
 *         description: Bad request - invalid content or context
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/v1/moderation/multiple:
 *   post:
 *     summary: Moderate multiple pieces of content at once
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contents
 *             properties:
 *               contents:
 *                 type: array
 *                 maxItems: 10
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - content
 *                     - context
 *                   properties:
 *                     content:
 *                       type: string
 *                     context:
 *                       type: object
 *                       required:
 *                         - contentType
 *                       properties:
 *                         contentType:
 *                           type: string
 *                           enum: [chat_message, review, ride_notes, location_name]
 *                         userRole:
 *                           type: string
 *                           enum: [USER, ADMIN]
 *                         questionContext:
 *                           type: string
 *                         previousMessages:
 *                           type: array
 *                           items:
 *                             type: string
 *     responses:
 *       200:
 *         description: Multiple content moderation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           isValid:
 *                             type: boolean
 *                           message:
 *                             type: string
 *                           category:
 *                             type: string
 *                           relevanceScore:
 *                             type: number
 *                           confidenceScore:
 *                             type: number
 *                           originalContent:
 *                             type: string
 *                     totalModerated:
 *                       type: number
 *       400:
 *         description: Bad request - invalid contents array or context
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */