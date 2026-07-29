/**
 * @swagger
 * /api/v1/admin/chauffeur-services:
 *   get:
 *     summary: Get all chauffeur services (Admin only, paginated)
 *     tags: [Chauffeur Services, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of services per page
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/ChauffeurStatus'
 *         description: Filter by service status
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: List of all chauffeur services
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
 *                     $ref: '#/components/schemas/ChauffeurService'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *
 * /api/v1/admin/chauffeur-services/settings:
 *   get:
 *     summary: Get chauffeur settings (Admin only)
 *     tags: [Chauffeur Services, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chauffeur settings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurSettings'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *
 *   put:
 *     summary: Update chauffeur settings (Admin only)
 *     tags: [Chauffeur Services, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platformFeePercentage:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Platform fee percentage
 *                 example: 15
 *               maxServiceDurationDays:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum service duration in days
 *                 example: 30
 *               minServiceDurationHours:
 *                 type: integer
 *                 minimum: 1
 *                 description: Minimum service duration in hours
 *                 example: 1
 *               requestExpiryHours:
 *                 type: integer
 *                 minimum: 1
 *                 description: Hours before a request expires
 *                 example: 24
 *               overdueGracePeriodHours:
 *                 type: integer
 *                 minimum: 1
 *                 description: Grace period in hours for overdue services
 *                 example: 3
 *     responses:
 *       200:
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurSettings'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *
 * /api/v1/admin/chauffeur-services/stats:
 *   get:
 *     summary: Get chauffeur service statistics (Admin only)
 *     tags: [Chauffeur Services, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chauffeur statistics retrieved
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
 *                     totalServices:
 *                       type: integer
 *                       example: 150
 *                     byStatus:
 *                       type: object
 *                       properties:
 *                         requested:
 *                           type: integer
 *                         accepted:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         cancelled:
 *                           type: integer
 *                         declined:
 *                           type: integer
 *                         disputed:
 *                           type: integer
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         totalTransactions:
 *                           type: integer
 *                         totalAmount:
 *                           type: number
 *                         totalPlatformAmount:
 *                           type: number
 *                         totalDriverAmount:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *
 * /api/v1/admin/chauffeur-services/{serviceId}:
 *   get:
 *     summary: Get a chauffeur service by ID (Admin only)
 *     tags: [Chauffeur Services, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the chauffeur service
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Service found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service not found
 *
 * /api/v1/admin/chauffeur-services/{serviceId}/cancel:
 *   patch:
 *     summary: Force cancel a chauffeur service (Admin only)
 *     description: Admin force-cancels a chauffeur service. Refunds payment if applicable.
 *     tags: [Chauffeur Services, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the service to cancel
 *         example: 1
 *       - in: query
 *         name: lang
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Policy violation"
 *     responses:
 *       200:
 *         description: Service cancelled by admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service not found
 *
 * /api/v1/admin/chauffeur-services/{serviceId}/resolve-dispute:
 *   patch:
 *     summary: Resolve a chauffeur service dispute (Admin only)
 *     description: Resolves a disputed chauffeur service by marking it as completed.
 *     tags: [Chauffeur Services, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the disputed service
 *         example: 1
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     responses:
 *       200:
 *         description: Dispute resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChauffeurService'
 *       400:
 *         description: Service is not in DISPUTED status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service not found
 */
