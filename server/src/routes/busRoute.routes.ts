import { Router } from "express";
import { BusRouteController } from "../controllers/busRoute.controller";
import { isAdmin } from "../middlewares/isAdmin";

const router = Router();

// Public (authenticated) passenger search — no admin gate
router.get("/search", BusRouteController.publicSearch);

// Admin-only CRUD
router.get("/", isAdmin, BusRouteController.list);
router.post("/", isAdmin, BusRouteController.create);
router.patch("/:id", isAdmin, BusRouteController.update);
router.put("/:id/stops", isAdmin, BusRouteController.replaceStops);
router.delete("/:id", isAdmin, BusRouteController.delete_);

export default router;
