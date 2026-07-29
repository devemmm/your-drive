import { Router } from "express";
import { BookingSeatController } from "../controllers/bookingSeat.controller";

const router = Router();
router.post("/attend", BookingSeatController.attendByCode);
export default router;
