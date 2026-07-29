import express from "express";
import { uploadImage } from "../middlewares/multerUpload";
import * as vehicleValidator from "../middlewares/validators/vehicle.request.validator";
import { VehicleController } from "../controllers/vehicle.controller";
import { param } from "express-validator";
import { validateRequestBody } from '../middlewares/validators';
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { languagePreference } from "../middlewares/languagePreference";
import { validationMsg } from '../utils/validation';
import { validateVehicleRentalSettings } from "../middlewares/validators/rental.request.validator";


const router = express.Router();
router.use(isAuthenticated, languagePreference);

router.post(
  "/",
  uploadImage.fields([
    { name: "images", maxCount: 4 },
    { name: "yellowCard", maxCount: 1 },
    { name: "insurance", maxCount: 1 },
    { name: "authorization", maxCount: 1 },
  ]),
  ...vehicleValidator.validateVehicle,
  validateRequestBody,
  VehicleController.createVehicle,
)
router.get("/", VehicleController.getAllVehicles);
router.patch("/:vehicleId/images/default-image", vehicleValidator.validateSetDefaultVehicleImage, validateRequestBody, VehicleController.setDefaultImage);
router.put("/:vehicleId/images/add-images", param("vehicleId").isInt({ gt: 0 }).withMessage(validationMsg("validation.vehicleId_positive")).escape().toInt(),validateRequestBody, uploadImage.array("images", 4), VehicleController.addImagesToVehicle);
router.patch("/:vehicleId/images/:imageId", vehicleValidator.validateUpdateVehicleImage, validateRequestBody, uploadImage.single("image"), VehicleController.updateVehicleImage);
router.put("/:vehicleId", ...vehicleValidator.validateUpdateVehicle, validateRequestBody, VehicleController.updateVehicle);
router.delete("/:vehicleId", param("vehicleId").isInt({ gt: 0 }).withMessage(validationMsg("validation.vehicleId_positive")).escape().toInt(),validateRequestBody, VehicleController.deleteVehicle);
router.get("/:vehicleId", param("vehicleId").isInt({ gt: 0 }).withMessage(validationMsg("validation.vehicleId_positive")).escape().toInt(), validateRequestBody, VehicleController.getVehicleById);
router.patch("/:vehicleId/rental-settings", ...validateVehicleRentalSettings, validateRequestBody, VehicleController.updateRentalSettings);

export default router;
