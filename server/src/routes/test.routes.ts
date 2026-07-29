import { Router } from "express";
import { isTestEnv } from "../middlewares/isTestEnv";
import { TestController } from "../controllers/test.controller";

const router = Router();

router.use(isTestEnv);

router.get("/otp", TestController.getOtp);
router.get("/users/by-email/:email", TestController.getUserByEmail);
router.post("/users/:id/verify", TestController.verifyUser);
router.post("/rides/:id/status", TestController.setRideStatus);
router.post("/reset", TestController.reset);
router.post("/bookings/:id/approve", TestController.approveBooking);
router.post("/bookings/:id/board", TestController.boardBooking);
router.post("/rides/:id/book", TestController.bookRideAsPassenger);
router.get("/users/:id/latest-ride", TestController.getLatestRideForDriver);
router.get("/rides/:rideId/booking-for-passenger/:passengerId", TestController.getBookingForPassenger);

export default router;
