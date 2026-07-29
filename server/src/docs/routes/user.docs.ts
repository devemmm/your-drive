/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and retrieval
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
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
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 */

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to retrieve
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
 *         description: User retrieved successfully
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
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       404:
 *         description: User not found
 *
 * /api/v1/users/update:
 *   post:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: Update user profile information including optional profile and license images
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
 *               firstName:
 *                 type: string
 *                 nullable: true
 *                 description: User's first name
 *                 example: John
 *               lastName:
 *                 type: string
 *                 nullable: true
 *                 description: User's last name
 *                 example: Doe
 *               email:
 *                 type: string
 *                 nullable: true
 *                 description: User's email
 *                 example: user@example.ca
 *               language:
 *                 type: string
 *                 enum: [EN, FR]
 *                 nullable: true
 *                 description: Preferred language
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *                 nullable: true
 *                 description: UI theme preference
 *               phoneNumber:
 *                 type: string
 *                 nullable: true
 *                 description: Phone number in E.164 format
 *                 example: +1234567890
 *               dateOfBirth:
 *                 type: string
 *                 nullable: true
 *                 format: date
 *                 description: Date of birth in YYYY-MM-DD format
 *                 example: 1990-01-01
 *               notificationPref:
 *                 type: string
 *                 nullable: true
 *                 enum: [EMAIL, SMS, IN_APP]
 *                 description: Notification preferences
 *               twoFactorEnabled:
 *                 type: boolean
 *                 nullable: true
 *                 description: Whether two-factor authentication is enabled
 *               termsAccepted:
 *                 type: boolean
 *                 nullable: true
 *                 description: Whether terms and conditions are accepted
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
 *               emergencyContactName:
 *                 type: string
 *                 nullable: true
 *                 description: Emergency contact name
 *               emergencyContactPhone:
 *                 type: string
 *                 nullable: true
 *                 description: Emergency contact phone number in E.164 format
 *                 example: +1234567890
 *               licenseNumber:
 *                 type: string
 *                 nullable: true
 *                 description: Driver's license number
 *               drivingExperience:
 *                 type: string
 *                 nullable: true
 *                 description: Driving experience description
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         firstName:
 *                           type: string
 *                           example: John
 *                         lastName:
 *                           type: string
 *                           example: Doe
 *                         # ... other user properties
 *                 message:
 *                   type: string
 *                   example: Profile updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Phone number already in use
 *       422:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 *
 * # Adds a phone number to the authenticated user's profile and sends a verification code via SMS.
 *
 * /api/v1/users/add-phone:
 *   post:
 *     summary: Add phone number and send verification code
 *     tags: [Users]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: ^\+[1-9]\d{1,14}$
 *                 description: User's phone number in E.164 format
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Verification code sent to the phone number
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
 *                   example: "Verification code sent to your phone number"
 *       400:
 *         description: Invalid request body or input validation failed
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *       409:
 *         description: Phone number is already in use
 * 
 * # Verifies the user's phone number using the provided verification code.
 *
 * /api/v1/users/verify-phone:
 *   post:
 *     summary: Verify phone number with code
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *         example: EN
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: ^\+[1-9]\d{1,14}$
 *                 description: User's phone number in E.164 format
 *                 example: "+1234567890"
 *               code:
 *                 type: string
 *                 description: Verification code sent to the phone number
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Phone number verified successfully
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
 *                   example: "Phone number verified successfully"
 *       400:
 *         description: Invalid verification code or code expired
 *       404:
 *         description: No account associated with this phone number
 *
 * # Resends the phone verification code to the user's phone number.
 *
 * /api/v1/users/resend-phone-verification:
 *   post:
 *     summary: Resend phone verification code
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: ^\+[1-9]\d{1,14}$
 *                 description: User's phone number in E.164 format
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Verification code has been resent to the phone number
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
 *                   example: "Verification code has been resent to your phone number"
 *       400:
 *         description: Phone number is already verified or invalid request
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not authorized to access this resource
 *
 * # Get user profile
 *
 * /api/v1/users/profile:
 *   get:
 *     summary: Get logged in user profile/info
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         example: EN
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: success respons
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
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *
 * /api/v1/users/invite:
 *   post:
 *     summary: Invite a friend by email
 *     description: Sends an invitation email to a friend with a referral link.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: friend@example.com
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
 *       200:
 *         description: Invitation sent successfully
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
 *                   example: Invitation sent successfully
 *       400:
 *         description: Bad request - Missing or invalid email
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/change-password:
 *   post:
 *     summary: Change user password
 *     description: Allows the authenticated user to change their password by providing the old and new passwords.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: The user's current password
 *                 example: OldPassword123!
 *               newPassword:
 *                 type: string
 *                 description: The new password to set
 *                 example: NewPassword456!
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
 *       200:
 *         description: Password changed successfully
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
 *                   example: Password changed successfully
 *       400:
 *         description: Old password is incorrect
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: Password not set, use forgot password to set a password
 *       422:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 *
 * /api/v1/admin/users/{userId}/delete-user:
 *   delete:
 *     summary: Delete User
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to delete
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
 *         description: User deleted successfully
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
 *                   example: User deleted
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: User not found
 *
 * /api/v1/users/delete-account:
 *   delete:
 *     summary: Delete your own account
 *     tags: [Users]
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
 *         description: Account deleted successfully
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
 *                   example: Account deleted
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - not allowed to access this resource
 *       404:
 *         description: User not found
 *
 */
