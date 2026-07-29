import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { validateCreateRental, rentalValidators } from "../middlewares/validators/rental.request.validator";
import { RentalController } from "../controllers/rental.controller";

const router = Router();

router.get("/", ...rentalValidators.getRentals, validateRequestBody, RentalController.getRentals);
router.get("/:rentalId", ...rentalValidators.getRental, validateRequestBody, RentalController.getRental);
router.post("/", validateCreateRental, validateRequestBody, RentalController.createRental);
router.patch("/:rentalId/approve", ...rentalValidators.approveRental, validateRequestBody, RentalController.approveRental);
router.patch("/:rentalId/decline", ...rentalValidators.declineRental, validateRequestBody, RentalController.declineRental);
router.post("/:rentalId/initialize-payment", ...rentalValidators.initializePayment, validateRequestBody, RentalController.initializePayment);
router.patch("/:rentalId/activate", ...rentalValidators.activateRental, validateRequestBody, RentalController.activateRental);
router.patch("/:rentalId/complete", ...rentalValidators.completeRental, validateRequestBody, RentalController.completeRental);
router.patch("/:rentalId/cancel", ...rentalValidators.cancelRental, validateRequestBody, RentalController.cancelRental);
router.post("/:rentalId/release-deposit", ...rentalValidators.releaseDeposit, validateRequestBody, RentalController.releaseDeposit);
router.post("/:rentalId/dispute", ...rentalValidators.dispute, validateRequestBody, RentalController.disputeRental);

export default router;
