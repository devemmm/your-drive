/**
 * @swagger
 * components:
 *   schemas:
 *     UserRole:
 *       type: string
 *       enum: [USER, ADMIN]
 *       description: The role of the user in the system
 *     ProfileImage:
 *       type: object
 *       nullable: true
 *       properties:
 *         url:
 *           type: string
 *           example: "https://cloudinary.com/..."
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - email
 *         - name
 *         - password
 *         - role
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         role:
 *           $ref: '#/components/schemas/UserRole'
 *           description: Role of the user
 *         isVerified:
 *           type: boolean
 *           default: false
 *           description: Whether the user's email and phone number are verified
 *         isEmailVerified:
 *           type: boolean
 *           default: false
 *           description: Whether the user's email is verified
 *         verificationCode:
 *           type: string
 *           nullable: true
 *           description: Code sent to user's email for verification
 *         verificationCodeExpiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Expiration timestamp of the verification code
 *         resetToken:
 *           type: string
 *           nullable: true
 *           description: Token for password reset
 *         resetTokenExpiry:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Expiration timestamp of the reset token
 *         googleId:
 *           type: string
 *           nullable: true
 *           description: Google OAuth ID if user signed up with Google
 *         appleId:
 *           type: string
 *           nullable: true
 *           description: Apple OAuth ID if user signed up with Apple
 *         language:
 *           type: string
 *           default: "en"
 *           enum: [en, fr]
 *           description: User's preferred language
 *         theme:
 *           type: string
 *           default: "light"
 *           enum: [light, dark]
 *           description: User's preferred theme
 *         profileImage:
 *           $ref: '#/components/schemas/ProfileImage'
 *         isOnboarded:
 *           type: boolean
 *           default: false
 *           description: Whether the user has completed the onboarding process
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was last updated
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: User's date of birth
 *         notificationPref:
 *           type: string
 *           default: email
 *           description: User's notification preference (email, sms, etc.)
 *         twoFactorEnabled:
 *           type: boolean
 *           default: false
 *           description: Whether two-factor authentication is enabled
 *         termsAccepted:
 *           type: boolean
 *           default: false
 *           description: Whether the user has accepted terms
 *         isPassengerOnboarded:
 *           type: boolean
 *           default: false
 *           description: Whether the user has completed passenger onboarding
 *         isDriverOnboarded:
 *           type: boolean
 *           default: false
 *           description: Whether the user has completed driver onboarding
 *         isStripeOnboarded:
 *           type: boolean
 *           default: false
 *           description: Whether the user has has connected stripe account and completed onboarding on stripe
 *         travelPreferences:
 *           type: object
 *           nullable: true
 *           $ref: '#/components/schemas/RidePreferences'
 *           description: Passenger travel preferences
 *         frequentRoutes:
 *           type: array
 *           description: List of frequently traveled routes
 *           items:
 *             type: object
 *             properties:
 *               from:
 *                 type: string
 *                 example: "Downtown"
 *               to:
 *                 type: string
 *                 example: "Airport"
 *         emergencyContactName:
 *           type: string
 *           nullable: true
 *           description: Passenger emergency contact name
 *         emergencyContactPhone:
 *           type: string
 *           nullable: true
 *           description: Passenger emergency contact phone
 *         referralCode:
 *           type: string
 *           nullable: true
 *           description: Passenger referral code
 *         licenseNumber:
 *           type: string
 *           nullable: true
 *           description: Driver license number
 *         licenseImageId:
 *           type: integer
 *           nullable: true
 *           description: Driver license image asset ID
 *         licenseImage:
 *           $ref: '#/components/schemas/Asset'
 *           nullable: true
 *           description: URL to driver's license image
 *         licenseImages:
 *           $ref: '#/components/schemas/LicenseImages'
 *           nullable: true
 *           description: URL to driver's license image
 *         drivingExperience:
 *           type: string
 *           nullable: true
 *           description: Driver's experience (years, description, etc.)
 */
