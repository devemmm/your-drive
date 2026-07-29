import { Router } from "express";
import { body, param } from "express-validator";
import { validateRequestBody } from "../middlewares/validators";
import { rentalValidators } from "../middlewares/validators/rental.request.validator";
import { RentalAdminController } from "../controllers/rentalAdmin.controller";
import { validationMsg } from "../utils/validation";

const router = Router();

router.get("/", ...rentalValidators.getRentals, validateRequestBody, RentalAdminController.getAllRentals);
router.get("/settings", RentalAdminController.getSettings);
router.put("/settings",
  body("platformFeePercentage").optional().isFloat({ min: 0, max: 100 }).toFloat(),
  body("maxRentalDurationDays").optional().isInt({ min: 1 }).toInt(),
  body("minRentalDurationHours").optional().isInt({ min: 1 }).toInt(),
  body("requestExpiryHours").optional().isInt({ min: 1 }).toInt(),
  body("depositReleaseReminderHours").optional().isInt({ min: 1 }).toInt(),
  body("overdueGracePeriodHours").optional().isInt({ min: 1 }).toInt(),
  validateRequestBody,
  RentalAdminController.updateSettings
);
router.get("/stats", RentalAdminController.getStats);
router.get("/:rentalId", ...rentalValidators.getRental, validateRequestBody, RentalAdminController.getRental);
router.patch("/:rentalId/cancel",
  param("rentalId").isInt({ min: 1 }).withMessage(validationMsg("validation.rentalId_positive")).toInt(),
  body("reason").isString().trim().notEmpty().withMessage(validationMsg("validation.cancel_reason_required")),
  validateRequestBody,
  RentalAdminController.forceCancel
);
router.patch("/:rentalId/resolve-dispute", ...rentalValidators.getRental, validateRequestBody, RentalAdminController.resolveDispute);
router.post("/:rentalId/refund-deposit", ...rentalValidators.getRental, validateRequestBody, RentalAdminController.refundDeposit);

export default router;
