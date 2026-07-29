import { Router } from "express";
import { PricingController } from "../controllers/pricing.controller";
import { validateRequestBody } from "../middlewares/validators";
import { isAdmin } from "../middlewares/isAdmin";
import {
  createPricingValidator,
  updatePricingValidator,
  deletePricingValidator,
  fareEstimateValidator,
} from "../middlewares/validators/pricing.request";

// /admin/pricing-settings — full CRUD, admin only
export const adminPricingRouter = Router();
adminPricingRouter.use(isAdmin);
adminPricingRouter.get("/", PricingController.list);
adminPricingRouter.post("/", createPricingValidator, validateRequestBody, PricingController.create);
adminPricingRouter.put("/:id", updatePricingValidator, validateRequestBody, PricingController.update);
adminPricingRouter.delete("/:id", deletePricingValidator, validateRequestBody, PricingController.remove);

// /public/fare-estimate — auth optional, used by passenger ride-request flow
export const publicPricingRouter = Router();
publicPricingRouter.get("/fare-estimate", fareEstimateValidator, validateRequestBody, PricingController.estimate);
