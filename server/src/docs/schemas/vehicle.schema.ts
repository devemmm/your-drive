/**
 * @swagger
 * components:
 *   schemas:
 *     VehicleCategory:
 *       type: string
 *       enum: [CAR, MOTORBIKE]
 *       description: The category of the vehicle
 *     AssetType:
 *       type: string
 *       enum: [IMAGE, DOCUMENT, VIDEO]
 *       description: The type of the file
 *     AssetCategory:
 *       type: string
 *       enum: [VEHICLE_IMAGE, LICENSE, PROFILE_PICTURE, OTHER]
 *       description: The type of the file
 *
 *     Asset:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the file
 *         url:
 *           type: string
 *           description: The accessible link to the file
 *         type:
 *           type: string
 *           enum: [IMAGE, DOCUMENT, VIDEO]
 *           description: The type of the file
 *         category:
 *           type: string
 *           enum: [VEHICLE_IMAGE, LICENSE, PROFILE_PICTURE, OTHER]
 *           description: The type of the file
 *         vehicleId:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the associted vehicle
 *         userId:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the associated user if it is a profile image
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the file was uploaded
 *     LicenseImages:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *         userId:
 *           type: integer
 *           format: int32
 *           description: The ID of the related user record
 *         frontImageId:
 *           type: integer
 *           format: int32
 *           nullable: true
 *           description: The ID of the related image for front image of the license
 *         backImageId:
 *           type: integer
 *           format: int32
 *           nullable: true
 *           description: The ID of the related image for back image of the license
 *         frontImage:
 *           $ref: '#/components/schemas/Asset'
 *           nullable: true
 *           description: The front image of the license
 *         backImage:
 *           $ref: '#/components/schemas/Asset'
 *           nullable: true
 *           description: The back image of the license
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the license was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the license was last updated
 *     Vehicle:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int32
 *           description: The auto-generated id of the vehicle
 *         userId:
 *           type: integer
 *           format: int32
 *           description: The associated id of the driver
 *         defaultImageId:
 *           type: integer
 *           format: int32
 *           description: The associated id of the default image
 *         make:
 *           type: string
 *           description: Who made the vehicle
 *         model:
 *           type: string
 *           description: The model of the vehicle
 *         year:
 *           type: integer
 *           description: The year the vehicle made
 *         color:
 *           type: string
 *           description: The color of the vehicle
 *         plateNumber:
 *           type: string
 *           description: The plate number of the vehicle
 *         category:
 *           type: string
 *           enum: [CAR, MOTORBIKE]
 *           default: CAR
 *           description: The category of the vehicle (car or motorbike)
 *         verified:
 *           type: boolean
 *           default: false
 *           description: Whether the vehicle is verified by authorized user like admin
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the vehicle was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the vehicle was last updated
 *         defaultImage:
 *           allOf:
 *             - $ref: '#/components/schemas/Asset'
 *         files:
 *           type: array
 *           items:
 *             allOf:
 *               - $ref: '#/components/schemas/Asset'
 *           description: The list of related images
 */
