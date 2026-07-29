import { Router } from "express";
import { requestLogger } from "../middlewares/requestLogger";
import authRoutes from "./auth.routes";
import chatRoutes from "./chat.routes";
import onboardingRoutes from "./onboarding.routes";
import subscriptionRoutes from "./subscription.routes";
import usersRoutes from "./user.routes";
import vehicleRoutes from "./vehicle.routes";
import rideRoutes from "./ride.routes";
import bookingRoutes from "./booking.routes";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { isAdmin } from "../middlewares/isAdmin";
import { languagePreference } from "../middlewares/languagePreference";
import adminRoutes from "./admin.routes";
import notificationRoutes from "./notification.routes";
import transactionRoutes from "./transaction.routes";
import publicRoutes from "./public.routes";
import cardRoutes from "./card.routes";
import ratingsRouter from "./rating.route";
import stripeRoutes from "./stripe.routes";
import moderationRoutes from "./moderation.routes";
import noShowRoutes from "./noShow.route";
import d2dRoutes from "./d2d.routes";
import rideRequestsRoutes from "./rideRequests.routes";
import bidRoutes from "./bid.routes";
import rentalRoutes from "./rental.routes";
import rentalAdminRoutes from "./rentalAdmin.routes";
import chauffeurRoutes from "./chauffeur.routes";
import chauffeurAdminRoutes from "./chauffeurAdmin.routes";
import {
  driverPresenceRouter,
  driversRouter,
} from "./driverPresence.routes";
import walletRoutes from "./wallet.routes";
import busRouteRoutes from "./busRoute.routes";
import walletSettingsRoutes from "./walletSettings.routes";
import bookingSeatRoutes from "./bookingSeat.routes";
import testRoutes from "./test.routes";
import { reportsRouter, adminReportsRouter } from "./report.routes";
import kycRouter from "./kyc.routes";
import { adminPricingRouter, publicPricingRouter } from "./pricing.routes";
import blockedRangeRouter from "./vehicleBlockedRange.routes";
import operatorRoutes from "./operator.routes";
import { isBusOperator } from "../middlewares/isBusOperator";

const router = Router();

router.use(requestLogger);

router.get("/", (_, res) => {
  res.json({ message: "Welcome to the Co-Route API" });
});

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/chat/threads", chatRoutes);
router.use("/rides", isAuthenticated, languagePreference, rideRoutes);
router.use("/bookings", isAuthenticated, languagePreference, bookingRoutes);
router.use("/admin", isAuthenticated, languagePreference, isAdmin, adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/transactions", transactionRoutes);
router.use("/public", publicRoutes);
router.use("/cards", isAuthenticated, languagePreference, cardRoutes);
router.use("/ratings", ratingsRouter);
router.use("/stripe", stripeRoutes);
router.use("/d2d" , isAuthenticated, languagePreference, d2dRoutes);
router.use(
  "/moderation",
  isAuthenticated,
  languagePreference,
  moderationRoutes
);
router.use("/no-shows", isAuthenticated, languagePreference, noShowRoutes);
router.use("/ride-requests", isAuthenticated, languagePreference, rideRequestsRoutes);
router.use("/bids", isAuthenticated, languagePreference, bidRoutes);
router.use("/rentals", isAuthenticated, languagePreference, rentalRoutes);
router.use("/admin/rentals", isAuthenticated, languagePreference, isAdmin, rentalAdminRoutes);
router.use("/chauffeur-services", isAuthenticated, languagePreference, chauffeurRoutes);
router.use("/admin/chauffeur-services", isAuthenticated, languagePreference, isAdmin, chauffeurAdminRoutes);
router.use("/driver-presence", isAuthenticated, languagePreference, driverPresenceRouter);
router.use("/drivers", isAuthenticated, languagePreference, driversRouter);
router.use("/wallet", isAuthenticated, languagePreference, walletRoutes);
router.use("/bus-routes", isAuthenticated, languagePreference, busRouteRoutes);
router.use("/admin/wallet-settings", isAuthenticated, languagePreference, walletSettingsRoutes);
router.use("/booking-seats", isAuthenticated, languagePreference, bookingSeatRoutes);
router.use("/reports", isAuthenticated, languagePreference, reportsRouter);
router.use("/admin/reports", isAuthenticated, languagePreference, adminReportsRouter);
router.use("/admin/kyc", isAuthenticated, languagePreference, kycRouter);
router.use("/admin/pricing-settings", isAuthenticated, languagePreference, adminPricingRouter);
router.use("/admin/vehicles/:vehicleId/blocked-ranges", isAuthenticated, languagePreference, blockedRangeRouter);
router.use("/public", publicPricingRouter);
router.use("/operator", isAuthenticated, languagePreference, isBusOperator, operatorRoutes);
router.use("/test", testRoutes);

export { router as routes };
