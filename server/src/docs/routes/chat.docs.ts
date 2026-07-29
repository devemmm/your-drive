/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat management and retrieval
 */

/**
 * @swagger
 * /api/v1/chat/threads:
 *   get:
 *     summary: Get all chat threads
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *         example: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field
 *         example: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *         description: Sort order
 *         example: asc
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
 *         description: List of chat threads retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       rideId:
 *                         type: integer
 *                         example: 1
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 */

/**
 * @swagger
 * /api/v1/chat/threads/{threadId}/messages:
 *   get:
 *     summary: Get all messages in a thread
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the thread to retrieve messages from
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *         example: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field
 *         example: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *         description: Sort order
 *         example: asc
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
 *         description: List of messages retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       threadId:
 *                         type: integer
 *                         example: 1
 *                       senderId:
 *                         type: integer
 *                         example: 1
 *                       content:
 *                         type: string
 *                         example: "Hello, how are you?"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       404:
 *         description: Thread not found
 */

/**
 * @swagger
 * /api/v1/chat/threads/{threadId}/messages:
 *   post:
 *     summary: Send a message to a thread
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the thread to send the message to
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content of the message
 *                 example: "Hello, how are you?"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     threadId:
 *                       type: integer
 *                       example: 1
 *                     senderId:
 *                       type: integer
 *                       example: 1
 *                     content:
 *                       type: string
 *                       example: "Hello, how are you?"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       404:
 *         description: Thread not found
 */

/**
 * @swagger
 * /api/v1/chat/threads/{threadId}/messages/{messageId}:
 *   put:
 *     summary: Update a message in a thread
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the thread to update the message in
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the message to update
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: The new content of the message
 *                 example: "Hello, how are you?"
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     threadId:
 *                       type: integer
 *                       example: 1
 *                     senderId:
 *                       type: integer
 *                       example: 1
 *                     content:
 *                       type: string
 *                       example: "Hello, how are you?"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       404:
 *         description: Message not found
 */

/**
 * @swagger
 * /api/v1/chat/threads/{threadId}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message in a thread
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the thread to delete the message from
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the message to delete
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
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     threadId:
 *                       type: integer
 *                       example: 1
 *                     senderId:
 *                       type: integer
 *                       example: 1
 *                     content:
 *                       type: string
 *                       example: "Hello, how are you?"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       404:
 *         description: Message not found
 */