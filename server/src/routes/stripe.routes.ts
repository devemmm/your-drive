import express from "express";
import { StripeController } from "../controllers/stripe.controller";
import { isAuthenticated } from '../middlewares/isAuthenticated';
import { connectStripeValidator } from '../middlewares/validators/stripe.validator';
import { validateRequestBody } from "../middlewares/validators";


const router = express.Router();


router.get(
    '/connect',
    isAuthenticated,
    connectStripeValidator,
    validateRequestBody,
    StripeController.connectStripe
);

// Stripe onboarding return endpoint
router.get(
    '/return',
    StripeController.handleStripeReturn
);

// Stripe onboarding refresh endpoint
router.get(
    '/refresh',
    StripeController.handleStripeRefresh
);

export default router;
