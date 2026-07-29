import { Router } from "express";
import { body, param } from "express-validator";
import { validateRequestBody } from "../middlewares/validators";
import { chauffeurValidators } from "../middlewares/validators/chauffeur.request.validator";
import { ChauffeurAdminController } from "../controllers/chauffeurAdmin.controller";
import { validationMsg } from "../utils/validation";

const router = Router();

router.get("/", ...chauffeurValidators.getServices, validateRequestBody, ChauffeurAdminController.getAllServices);
router.get("/settings", ChauffeurAdminController.getSettings);
router.put("/settings",
  body("platformFeePercentage").optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body("maxServiceDurationDays").optional().isInt({ min: 1 }).toInt(),
  body("minServiceDurationHours").optional().isInt({ min: 1 }).toInt(),
  body("requestExpiryHours").optional().isInt({ min: 1 }).toInt(),
  body("overdueGracePeriodHours").optional().isInt({ min: 1 }).toInt(),
  validateRequestBody,
  ChauffeurAdminController.updateSettings
);
router.get("/stats", ChauffeurAdminController.getStats);
router.get("/:serviceId", ...chauffeurValidators.getService, validateRequestBody, ChauffeurAdminController.getService);
router.patch("/:serviceId/cancel",
  param("serviceId").isInt({ min: 1 }).withMessage(validationMsg("validation.serviceId_positive")).toInt(),
  body("reason").isString().trim().notEmpty().withMessage(validationMsg("validation.cancel_reason_required")),
  validateRequestBody,
  ChauffeurAdminController.forceCancel
);
router.patch("/:serviceId/resolve-dispute", ...chauffeurValidators.getService, validateRequestBody, ChauffeurAdminController.resolveDispute);

export default router;
