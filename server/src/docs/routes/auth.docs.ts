/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     description: |
 *       Login user (driver or passenger) using email and password. Phone number verification is required for full access. If the phone number is not verified, the user will be prompted to verify via SMS code. See error responses for details.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "MyP@ssw0rd123"
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Login successful."
 *       401:
 *         description: Invalid credentials, unverified phone, or account suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Invalid request body or input validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register new user
 *     description: |
 *       Register a new user (driver or passenger). Phone number is required and will be verified via SMS. After registration, a verification code is sent to the user's phone. The user must verify their phone number before accessing all features.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *       - in: query
 *         name: referralCode
 *         schema:
 *           type: string
 *         description: The reference code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - termsAccepted
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: First name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Last name
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "MyP@ssw0rd123"
 *               agreeToTerms:
 *                 type: boolean
 *                 example: true
 *                 description: Whether terms and conditions are accepted
 *               subscribeToUpdates:
 *                 type: boolean
 *                 example: true
 *                 description: Whether a user subscribe to Your-Drive updates
 *     responses:
 *       201:
 *         description: Registration successful. Returns an auth token so the client can sign in immediately.
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
 *                   example: "Registration successful."
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT auth token
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: |
 *           Validation failed. Possible reasons:
 *           - User already exists
 *           - Invalid name format (must be first and last name)
 *           - Invalid email format
 *           - Password doesn't meet strength requirements
 *           - Invalid phone number format (E.164)
 *           - Phone number already in use
 *           - Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized or phone verification required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify user's email address
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               code:
 *                 type: string
 *                 description: Verification code received via email
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
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
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully"
 *       400:
 *         description: Invalid or expired verification code
 * 
 * /api/v1/auth/verify-2fa:
 *   patch:
 *     summary: Verify user's email address
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               code:
 *                 type: string
 *                 description: Verification code received via email
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
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
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully"
 *       400:
 *         description: Invalid or expired verification code
 */

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset, provide either email or phone, not both.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phone:
 *                 type: string
 *                 format: phone
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Password reset instructions sent
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
 *                   example: "Password reset instructions sent to your email"
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/auth/forgot-password/web:
 *   post:
 *     summary: Request password reset for web, provide either email or phone, not both.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phone:
 *                 type: string
 *                 format: phone
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Password reset instructions sent
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
 *                   example: "Password reset instructions sent to your email"
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using token, if phone is provided, we check the code sent to it via sms
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token received via email or sms
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               phone:
 *                 type: string
 *                 description: phone number where the reset token was sent
 *                 example: "+1234567890"
 *               email:
 *                 type: string
 *                 description: Email where the reset token was sent
 *                 example: "me@Your-Drive.ca"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: |
 *                   Must contain:
 *                   - At least 4 characters
 *                 example: "NewP@ssw0rd123"
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: "Password reset successful"
 *       400:
 *         description: Invalid or expired reset token
 */

/**
 * @swagger
 * /api/v1/auth/reset-password/web:
 *   post:
 *     summary: Endpoint to reset password if a user requested on web, no email is required, newPassword, token are required, phone is only required when used phone.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token received via email or sms
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               phone:
 *                 type: string
 *                 description: phone number where the reset token was sent
 *                 example: "+1234567890"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: |
 *                   Must contain:
 *                   - At least 4 characters
 *                 example: "NewP@ssw0rd123"
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: "Password reset successful"
 *       400:
 *         description: Invalid or expired reset token
 */

/**
 * @swagger
 * /api/v1/auth/google:
 *   post:
 *     summary: Finalize Google OAuth login
 *     tags: [Authentication]
 *     description: Verify Google OAuth code and log in the user
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *       - in: query
 *         name: referralCode
 *         schema:
 *           type: string
 *         description: Referral code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Google OAuth authorization code
 *                 example: "4/0AY0e-g5..."
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Login successful."
 */

/**
 * @swagger
 * /api/v1/auth/google/mobile:
 *   post:
 *     summary: Finalize Google OAuth login for mobile
 *     tags: [Authentication, Mobile]
 *     description: Verify Google OAuth id token and log in the user
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EN, FR]
 *       - in: query
 *         name: referralCode
 *         schema:
 *           type: string
 *         description: Referral code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google OAuth authorization id token
 *                 example: "4/0AY0e-g5..."
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Login successful."
 */

// /**
//  * @swagger
//  * /api/v1/auth/apple:
//  *   get:
//  *     summary: Initiate Apple OAuth login
//  *     tags: [Authentication]
//  *     description: Redirects to Apple's OAuth consent screen
//  *     responses:
//  *       302:
//  *         description: Redirect to Apple OAuth consent screen
//  */

// /**
//  * @swagger
//  * /api/v1/auth/apple/callback:
//  *   get:
//  *     summary: Apple OAuth callback
//  *     tags: [Authentication]
//  *     description: Callback URL for Apple OAuth authentication
//  *     responses:
//  *       302:
//  *         description: Redirect to frontend with JWT token
//  */

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend verification code, provide either email or phone, not both.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: lang
 *         description: Language preference for the response (en/fr)
 *         required: false
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
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *                 description: phone number where the code was sent
 *     responses:
 *       200:
 *         description: Verification code resent successfully
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
 *                   example: "Verification code has been resent to your email"
 *       400:
 *         description: |
 *           Validation failed. Possible reasons:
 *           - Email is already verified
 *           - Invalid email format
 *           - Invalid request body
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message describing what went wrong."
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Field 'email' is required.", "Password is too weak."]
 */
