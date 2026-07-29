import { Router } from "express";
import { WalletSettingsController } from "../controllers/walletSettings.controller";
import { isAdmin } from "../middlewares/isAdmin";

const router = Router();
router.get("/", isAdmin, WalletSettingsController.get);
router.patch("/", isAdmin, WalletSettingsController.update);
export default router;
