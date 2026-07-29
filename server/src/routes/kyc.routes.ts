import { Router } from "express";
import { KycController } from "../controllers/kyc.controller";
import { validateRequestBody } from "../middlewares/validators";
import { isAdmin } from "../middlewares/isAdmin";
import {
  listKycValidator,
  reviewKycValidator,
} from "../middlewares/validators/kyc.request";

const kycRouter = Router();
kycRouter.use(isAdmin);

kycRouter.get("/users", listKycValidator, validateRequestBody, KycController.listUserKyc);
kycRouter.get("/vehicles", listKycValidator, validateRequestBody, KycController.listVehicleKyc);
kycRouter.patch("/users/:id", reviewKycValidator, validateRequestBody, KycController.reviewUserKyc);
kycRouter.patch("/vehicles/:id", reviewKycValidator, validateRequestBody, KycController.reviewVehicleKyc);

export default kycRouter;
