import { Router } from "express";
import { VehicleBlockedRangeController } from "../controllers/vehicleBlockedRange.controller";
import { isAdmin } from "../middlewares/isAdmin";
import { validateRequestBody } from "../middlewares/validators";
import {
  blockedRangeIdParams,
  createBlockedRangeValidator,
} from "../middlewares/validators/vehicleBlockedRange.request";

// /admin/vehicles/:vehicleId/blocked-ranges — admin-only for now
const blockedRangeRouter = Router({ mergeParams: true });
blockedRangeRouter.use(isAdmin);
blockedRangeRouter.get("/", blockedRangeIdParams, validateRequestBody, VehicleBlockedRangeController.list);
blockedRangeRouter.post("/", createBlockedRangeValidator, validateRequestBody, VehicleBlockedRangeController.create);
blockedRangeRouter.delete("/:rangeId", blockedRangeIdParams, validateRequestBody, VehicleBlockedRangeController.remove);

export default blockedRangeRouter;
