import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { BidController } from "../controllers/bid.controller";
import { bidIdParamValidator } from "../middlewares/validators/bid.request.validator";

const router = Router();

router
  .get("/:id", bidIdParamValidator, validateRequestBody, BidController.getOne)
  .post("/:id/accept", bidIdParamValidator, validateRequestBody, BidController.accept)
  .post("/:id/cancel", bidIdParamValidator, validateRequestBody, BidController.cancel);

export default router;
