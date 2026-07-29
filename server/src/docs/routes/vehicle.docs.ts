/**
 * @swagger
 * tags:
 *   name: Vehicle Management
 *   description: Vehicle management and retrieval
 */

/**
 * @swagger
 * /api/v1/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Vehicle Management, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: The page size, number of vehicle records to be returned
 *     responses:
 *       200:
 *         description: List of vehicles retrieved successfully
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 */

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicle Management, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vehicle to retrieve
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
 *         description: Vehicle retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                    allOf:
 *                      - $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * /api/v1/vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     tags: [Vehicle Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - make
 *               - model
 *               - color
 *               - plateNumber
 *               - images
 *               - capacity
 *             properties:
 *               make:
 *                 type: string
 *                 example: "Toyota"
 *               model:
 *                 type: string
 *                 example: "Corolla"
 *               year:
 *                 type: integer
 *                 example: 2002
 *               color:
 *                 type: string
 *                 example: "White"
 *               plateNumber:
 *                 type: string
 *                 example: "BZHT 492"
 *               capacity:
 *                 type: integer
 *                 example: 4
 *                 description: Number of seats available in the vehicle
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Images of the vehicle (front, back, side, inside)
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       422:
 *         description: Validation error (e.g., missing images or invalid data)
 */


/**
 * @swagger
 * /api/v1/vehicles/{vehicleId}:
 *   delete:
 *     summary: Delete a vehicle by ID
 *     tags: [Vehicle Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vehicle to delete
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     responses:
 *       204:
 *         description: Vehicle deleted successfully (No Content)
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to delete this vehicle
 *       404:
 *         description: Vehicle not found
 */

/**
 * @swagger
 * /api/v1/vehicles/{vehicleId}/images/default-image:
 *   patch:
 *     summary: Set or change the default image of a vehicle
 *     tags: [Vehicle Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vehicle to update
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
 *             required:
 *               - imageId
 *             properties:
 *               imageId:
 *                 type: integer
 *                 example: 10
 *                 description: The ID of the image to set as default
 *     responses:
 *       200:
 *         description: Default image set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to update this vehicle
 *       404:
 *         description: Vehicle or image not found
 *       422:
 *         description: Validation error (e.g., missing or invalid imageId)
 */


/**
 * Updates a single image of a vehicle.
 *
 * @remarks
 * This endpoint allows an authenticated user to update (replace) a specific image associated with their vehicle.
 * The image is validated and optimized before being uploaded to the cloud storage.
 * The request must be authenticated using a bearer token.
 *
 * @swagger
 * /api/v1/vehicles/{vehicleId}/images/{imageId}:
 *   patch:
 *     summary: Update a single image of the vehicle
 *     tags: [Vehicle Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vehicle whose image is to be updated
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the image to update
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The new image file to upload
 *     responses:
 *       200:
 *         description: Vehicle image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to update this vehicle
 *       404:
 *         description: Vehicle or image not found
 *       422:
 *         description: Validation error (e.g., missing or invalid image file)
 *       500:
 *         description: Internal server error while saving the image
 */


/**
 * Updates a vehicle by its ID.
 *
 * @remarks
 * This endpoint allows an authenticated user to update one or more fields of their vehicle.
 * At least one updatable field must be provided in the request body. The request must be authenticated using a bearer token.
 *
 * @swagger
 * /api/v1/vehicles/{vehicleId}:
 *   put:
 *     summary: Update a vehicle properties
 *     tags: [Vehicle Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vehicle to update
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
 *               make:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *                 example: "Toyota"
 *               model:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 30
 *                 example: "Corolla"
 *               year:
 *                 type: integer
 *                 minimum: 1990
 *                 maximum: {CURRENT_YEAR_PLUS_1}
 *                 example: 2020
 *               color:
 *                 type: string
 *                 maxLength: 20
 *                 example: "White"
 *               plateNumber:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 15
 *                 example: "BZHT 492"
 *               capacity:
 *                 type: integer
 *                 example: 4
 *                 description: Number of seats available in the vehicle
 * 
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to update this vehicle
 *       404:
 *         description: Vehicle not found
 *       422:
 *         description: Validation error (e.g., no fields provided or invalid data)
 */


/**
 * @swagger
 * /api/v1/vehicles/{vehicleId}/images/add-images:
 *   put:
 *     summary: Add images to a vehicle
 *     tags: [Vehicle Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the vehicle to add images to
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                   maxLength: 4
 *                 description: Images to add to the vehicle (max 4 images per vehicle)
 *     responses:
 *       200:
 *         description: Images added to vehicle successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Vehicle'
 *       400:
 *         description: The vehicle can have up to 4 images
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to update this vehicle
 *       404:
 *         description: Vehicle not found
 *       422:
 *         description: Validation error (e.g., no images uploaded or invalid images)
 */