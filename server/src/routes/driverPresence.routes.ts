import { Router } from "express";
import { validateRequestBody } from "../middlewares/validators";
import { DriverPresenceController } from "../controllers/driverPresence.controller";
import {
  upsertPresenceValidator,
  nearbyValidator,
} from "../middlewares/validators/driverPresence.validator";
import { createUserRateLimiter } from "../utils/simpleRateLimiter";

const presenceLimiter = createUserRateLimiter({
  max: 30,
  windowMs: 60_000,
  key: "driver-presence",
});
const nearbyLimiter = createUserRateLimiter({
  max: 30,
  windowMs: 60_000,
  key: "drivers-nearby",
});

export const driverPresenceRouter = Router();
driverPresenceRouter
  .post(
    "/",
    presenceLimiter,
    upsertPresenceValidator,
    validateRequestBody,
    DriverPresenceController.upsert
  )
  .post("/offline", presenceLimiter, DriverPresenceController.offline);

export const driversRouter = Router();
driversRouter.get(
  "/nearby",
  nearbyLimiter,
  nearbyValidator,
  validateRequestBody,
  DriverPresenceController.nearby
);
