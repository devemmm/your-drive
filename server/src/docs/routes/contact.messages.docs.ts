/**
 * @swagger
 *
 * /api/v1/public/contact-messages:
 *   post:
 *     summary: Submit a new support message
 *     tags: [Message Management, Public]
 *     parameters:
 *       - in: query
 *         name: lang
 *         enum: [EN, FR]
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
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 example: "The name of the user"
 *               email:
 *                 type: string
 *                 example: "The email of the user"
 *               subject:
 *                 type: string
 *                 example: "Issue with my account"
 *               message:
 *                 type: string
 *                 example: "I cannot access my account after resetting my password."
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Message submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ContactMessage'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *
 * /api/v1/admin/contact-messages:
 *   get:
 *     summary: Get all support messages (admin only)
 *     tags: [Message Management, Admin]
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
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ContactMessage'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only admins can access this resource
 * 
 * /api/v1/admin/contact-messages/{id}:
 *   get:
 *     summary: Get all support messages (admin only)
 *     tags: [Message Management, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *           format: int32
 *         description: The id of the message to retrieve
 *         example: 1
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ContactMessage'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only admins can access this resource
 * 
 *   delete:
 *     summary: Delete a support message (admin only)
 *     tags: [Message Management, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of the message to delete
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
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
 *                 message:
 *                   type: string
 *                   example: "Message deleted successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only admins can access this resource
 *       404:
 *         description: Message not found
 *
 * /api/v1/admin/contact-messages/{id}/read:
 *   patch:
 *     summary: Mark a message as read (admin only)
 *     tags: [Message Management, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: The ID of the message to mark as read
 *         example: 1
 *       - in: query
 *         name: lang
 *         enum: [EN,FR]
 *         schema:
 *           type: string
 *         description: The language selected by the user, EN/FR
 *         example: EN
 *     responses:
 *       200:
 *         description: Message marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Message marked as read successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Only admins can access this resource
 *       404:
 *         description: Message not found
 *
 * components:
 *   schemas:
 *     ContactMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: number
 *           example: 1
 *         name:
 *           type: string
 *           example: John Doe
 *         subject:
 *           type: string
 *           example: "Issue with my account"
 *         message:
 *           type: string
 *           example: "I cannot access my account after resetting my password."
 *         phoneNumber:
 *           type: string
 *           nullable: true
 *           example: "+1234567890"
 *         isRead:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-08-23T14:35:22.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-08-23T14:35:22.000Z"
 */
