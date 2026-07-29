import { Router } from "express";
import { WalletController } from "../controllers/wallet.controller";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { isAdmin } from "../middlewares/isAdmin";

const router = Router();

router.get("/me", WalletController.getMyWallet);
router.get("/admin/wallets", isAdmin, WalletController.listWalletsAdmin);
router.post("/admin/wallets/:userId/credit", isAdmin, WalletController.creditWalletAdmin);

export default router;
