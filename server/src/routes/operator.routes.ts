import { Router } from "express";
import { OperatorRouteController } from "../controllers/operatorRoute.controller";
import { OperatorTripController } from "../controllers/operatorTrip.controller";
import { OperatorDepartureController } from "../controllers/operatorDeparture.controller";

const router = Router();

// Routes (operator-scoped)
router.get("/routes", OperatorRouteController.list);
router.post("/routes", OperatorRouteController.create);
router.patch("/routes/:id", OperatorRouteController.update);
router.put("/routes/:id/stops", OperatorRouteController.replaceStops);
router.delete("/routes/:id", OperatorRouteController.delete_);

// Trips / schedules (operator-scoped)
router.get("/trips", OperatorTripController.list);
router.post("/trips", OperatorTripController.create);
router.get("/trips/:id/manifest", OperatorTripController.manifest);
router.patch("/trips/:id/bus", OperatorTripController.swapBus);

// Departures (recurring schedules, operator-scoped)
router.get("/routes/:routeId/departures", OperatorDepartureController.list);
router.post("/routes/:routeId/departures", OperatorDepartureController.create);
router.patch("/departures/:id", OperatorDepartureController.update);
router.delete("/departures/:id", OperatorDepartureController.delete_);

export default router;
