import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { param } from "express-validator";
import { CardController } from "../controllers/card.controller";
import { validationMsg } from '../utils/validation';

const router = Router();

router.get("/", CardController.getCards);
router.post("/", CardController.createCard);
router.delete(
  "/:paymentMethodId",
  param("paymentMethodId")
    .isString()
    .withMessage(validationMsg("validation.payment_method_id_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.payment_method_id_string")),
  validateRequestBody,
  CardController.deleteCard
);
router.patch(
  "/:paymentMethodId/default",
  param("paymentMethodId")
    .isString()
    .withMessage(validationMsg("validation.payment_method_id_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.payment_method_id_string")),
  validateRequestBody,
  CardController.setDefaultCard
);

router.get("/default", CardController.getDefaultCard);

export default router;
