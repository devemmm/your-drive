import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { validateCreateChauffeurService, chauffeurValidators } from "../middlewares/validators/chauffeur.request.validator";
import { ChauffeurController } from "../controllers/chauffeur.controller";

const router = Router();

router.get("/", ...chauffeurValidators.getServices, validateRequestBody, ChauffeurController.getServices);
router.get("/:serviceId", ...chauffeurValidators.getService, validateRequestBody, ChauffeurController.getService);
router.post("/", validateCreateChauffeurService, validateRequestBody, ChauffeurController.createService);
router.patch("/:serviceId/accept", ...chauffeurValidators.acceptService, validateRequestBody, ChauffeurController.acceptService);
router.patch("/:serviceId/decline", ...chauffeurValidators.declineService, validateRequestBody, ChauffeurController.declineService);
router.post("/:serviceId/initialize-payment", ...chauffeurValidators.initializePayment, validateRequestBody, ChauffeurController.initializePayment);
router.patch("/:serviceId/activate", ...chauffeurValidators.activateService, validateRequestBody, ChauffeurController.activateService);
router.patch("/:serviceId/complete", ...chauffeurValidators.completeService, validateRequestBody, ChauffeurController.completeService);
router.patch("/:serviceId/cancel", ...chauffeurValidators.cancelService, validateRequestBody, ChauffeurController.cancelService);
router.post("/:serviceId/dispute", ...chauffeurValidators.dispute, validateRequestBody, ChauffeurController.disputeService);

export default router;
