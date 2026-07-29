import express from "express";
import { param } from "express-validator";
import { validateRequestBody } from "../middlewares/validators";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { languagePreference } from "../middlewares/languagePreference";
import { TransactionController } from "../controllers/transaction.controller";
import { validateConfirmPaymentForSession, validateFinalizeAfter3DS, validateGetAllTransactions } from "../middlewares/validators/transaction.request.validator";
import { validationMsg } from '../utils/validation';

const router = express.Router();

router.use(isAuthenticated, languagePreference);

router.get(
    "/",
    validateGetAllTransactions,
    validateRequestBody,
    TransactionController.getAllTransactions
);

router.get(
    "/:transactionId",
    param("transactionId").isInt({ gt: 0 }).withMessage(validationMsg("validation.default_transaction_id_positive")).toInt(),
    validateRequestBody,
    TransactionController.getTransactionById
);

router.post(
    "/confirm",
    validateConfirmPaymentForSession,
    validateRequestBody,
    TransactionController.confirmPaymentForSession
);

router.post(
    "/finalize-3ds",
    validateFinalizeAfter3DS,
    validateRequestBody,
    TransactionController.finalizeAfter3DS
);

export default router;
