/**
 * @swagger
 * tags:
 *   name: Onboarding
 *   description: User onboarding management
 */

/**
 * @swagger
 * /api/v1/users/onboarding/status:
 *   get:
 *     summary: Get user's onboarding status
 *     tags: [Onboarding]
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
 *     responses:
 *       200:
 *         description: Onboarding status retrieved successfully
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
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [DRIVER, PASSENGER, ADMIN]
 *                       example: ["DRIVER"]
 *                     common:
 *                       type: object
 *                       properties:
 *                         isOnboarded:
 *                           type: boolean
 *                           example: false
 *                         profileImage:
 *                           $ref: '#/components/schemas/ProfileImage'
 *                         language:
 *                           type: string
 *                           example: "en"
 *                         theme:
 *                           type: string
 *                           example: "light"
 *                         notificationPref:
 *                           type: string
 *                           example: "email"
 *                         twoFactorEnabled:
 *                           type: boolean
 *                           example: false
 *                         billingAddress:
 *                           $ref: '#/components/schemas/BillingAddress'
 *                     driver:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         isDriverOnboarded:
 *                           type: boolean
 *                           example: false
 *                         licenseNumber:
 *                           type: string
 *                           example: "ABC123456"
 *                         licenseImage:
 *                           type: string
 *                           example: "https://cloudinary.com/license.jpg"
 *                         drivingExperience:
 *                           type: string
 *                           example: "5 years"
 *                         licenseImages:
 *                           $ref: '#/components/schemas/LicenseImages'
 *                           nullable: true
 *                     passenger:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         isPassengerOnboarded:
 *                           type: boolean
 *                           example: false
 *                         travelPreferences:
 *                           type: object
 *                           example: {"smoking":false,"pets":true}
 *                         frequentRoutes:
 *                           type: string
 *                           example: "Downtown - Airport"
 *                         emergencyContactName:
 *                           type: string
 *                           example: "Jane Doe"
 *                         emergencyContactPhone:
 *                           type: string
 *                           example: "+1234567890"
 *                         referralCode:
 *                           type: string
 *                           example: "REF123"
 *                     termsAccepted:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/users/onboarding/progress:
 *   get:
 *     summary: Get detailed onboarding progress
 *     tags: [Onboarding]
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
 *     responses:
 *       200:
 *         description: Onboarding progress retrieved successfully
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
 *                     isFullyOnboarded:
 *                       type: boolean
 *                       example: false
 *                     progressPercentage:
 *                       type: integer
 *                       example: 60
 *                     totalSteps:
 *                       type: integer
 *                       example: 8
 *                     completedSteps:
 *                       type: integer
 *                       example: 5
 *                     common:
 *                       type: object
 *                       properties:
 *                         requirements:
 *                           type: object
 *                           properties:
 *                             hasName:
 *                               type: boolean
 *                               example: true
 *                             hasEmail:
 *                               type: boolean
 *                               example: true
 *                             hasPhoneNumber:
 *                               type: boolean
 *                               example: true
 *                             hasProfileImage:
 *                               type: boolean
 *                               example: false
 *                             hasAcceptedTerms:
 *                               type: boolean
 *                               example: true
 *                         progress:
 *                           type: integer
 *                           example: 4
 *                         totalSteps:
 *                           type: integer
 *                           example: 5
 *                     driver:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         requirements:
 *                           type: object
 *                           properties:
 *                             hasLicenseNumber:
 *                               type: boolean
 *                               example: false
 *                             hasLicenseImage:
 *                               type: boolean
 *                               example: false
 *                             hasDrivingExperience:
 *                               type: boolean
 *                               example: false
 *                         progress:
 *                           type: integer
 *                           example: 0
 *                         totalSteps:
 *                           type: integer
 *                           example: 3
 *                     passenger:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         requirements:
 *                           type: object
 *                           properties:
 *                             hasTravelPreferences:
 *                               type: boolean
 *                               example: true
 *                             hasEmergencyContactName:
 *                               type: boolean
 *                               example: false
 *                             hasEmergencyContactPhone:
 *                               type: boolean
 *                               example: false
 *                         progress:
 *                           type: integer
 *                           example: 1
 *                         totalSteps:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/users/onboarding/profile-image:
 *   post:
 *     summary: Upload user profile image
 *     tags: [Onboarding]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (min 50KB, min 640x480 resolution)
 *             required:
 *               - image
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "Profile image updated successfully."
 *       400:
 *         description: Bad request - No file uploaded
 *       422:
 *         description: Unprocessable entity - File too small or low resolution
 *       500:
 *         description: Internal server error - Upload failed
 */

/**
 * @swagger
 * /api/v1/users/onboarding/driver:
 *   post:
 *     summary: Update driver onboarding information
 *     tags: [Onboarding]
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
 *             properties:
 *               licenseNumber:
 *                 type: string
 *                 description: Driver's license number
 *                 example: "DL123456789"
 *               drivingExperience:
 *                 type: string
 *                 enum: ["1", "2", "3", "4", "more"]
 *                 description: Driver's experience description
 *                 example: "2"
 *             required:
 *               - licenseNumber
 *               - drivingExperience
 *     responses:
 *       200:
 *         description: Driver onboarding updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "Driver onboarding updated successfully"
 *       400:
 *         description: Bad request - Missing required fields
 *       403:
 *         description: Forbidden - User is not registered as a driver
 */

/**
 * @swagger
 * /api/v1/users/onboarding/driver/license:
 *   post:
 *     summary: Upload driver license images
 *     tags: [Onboarding]
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
 *         name: side
 *         required: true
 *         schema:
 *           type: string
 *           enum: [front, back]
 *         description: The side of the license image front or back
 *         example: front
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               license:
 *                 type: string
 *                 format: binary
 *                 description: Driver license image file (min 50KB, min 640x480 resolution)
 *             required:
 *               - license
 *     responses:
 *       200:
 *         description: License image uploaded successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "License image uploaded successfully"
 *       400:
 *         description: Bad request - No file uploaded
 *       403:
 *         description: Forbidden - User is not registered as a driver
 *       422:
 *         description: Unprocessable entity - File too small or low resolution
 *       500:
 *         description: Internal server error - Upload failed
 */

/**
 * @swagger
 * /api/v1/users/onboarding/passenger:
 *   post:
 *     summary: Update passenger onboarding information
 *     tags: [Onboarding]
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
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: The user's phone number
 *                 example: "+250788123456"
 *               travelPreferences:
 *                 type: object
 *                 description: Passenger's travel preferences
 *                 properties:
 *                   smoking:
 *                     type: boolean
 *                     example: false
 *                   pets:
 *                     type: boolean
 *                     example: true
 *                   airConditioning:
 *                     type: boolean
 *                     example: true
 *                   ladiesOnly:
 *                     type: boolean
 *                     example: false
 *                   bicycleSupport:
 *                     type: boolean
 *                     example: true
 *                   snowTires:
 *                     type: boolean
 *                     example: false
 *                   luggageSize:
 *                     $ref: '#/components/schemas/LuggageSize'
 *                   additionalNotes:
 *                     type: string
 *                     example: "I prefer front seat"
 *                   gentsOnly:
 *                     type: boolean
 *                     example: false
 *                   music:
 *                     $ref: '#/components/schemas/MusicPreferences'
 *               emergencyContactName:
 *                 type: string
 *                 example: "Jane Doe"
 *               emergencyContactPhone:
 *                 type: string
 *                 example: "+250788000111"
 *               frequentRoutes:
 *                 type: array
 *                 description: List of frequently traveled routes
 *                 items:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       example: "Downtown"
 *                     to:
 *                       type: string
 *                       example: "Airport"
 *               referralCode:
 *                 type: string
 *                 description: Optional referral code
 *                 example: "REF123456"
 *               termsAccepted:
 *                 type: boolean
 *                 example: true
 *             required:
 *               - phoneNumber
 *               - emergencyContactName
 *               - emergencyContactPhone
 *               - termsAccepted
 *     responses:
 *       200:
 *         description: Passenger onboarding updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "Passenger onboarding updated successfully"
 *       400:
 *         description: Bad request - Missing required fields or invalid phone format
 *       403:
 *         description: Forbidden - User is not registered as a passenger
 *       409:
 *         description: Conflict - Phone number is already in use by another user
 */


/**
 * @swagger
 * /api/v1/users/onboarding/preferences:
 *   post:
 *     summary: Update user preferences and onboarding settings
 *     tags: [Onboarding]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [EN, FR]
 *                 description: User's preferred language
 *                 example: EN
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *                 description: User's preferred theme
 *                 example: light
 *               notificationPref:
 *                 type: string
 *                 description: User's notification preference
 *                 example: EMAIL
 *               twoFactorEnabled:
 *                 type: boolean
 *                 description: Whether two-factor authentication is enabled
 *                 example: false
 *     responses:
 *       200:
 *         description: Preferences updated successfully (onboarding flags auto-updated based on completion)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: "Preferences updated successfully!"
 *       400:
 *         description: Bad request - Invalid language or theme option
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
