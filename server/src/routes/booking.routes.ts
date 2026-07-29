import express from "express";
import { BookingController } from "../controllers/booking.controller";
import { bookingValidators } from "../middlewares/validators/booking.request.validator";
import { validateRequestBody } from "../middlewares/validators";
import { isAuthenticated } from "../middlewares/isAuthenticated";

const router = express.Router();

router.use(isAuthenticated);

// Get all bookings for the authenticated user
router.get(
  "/",
  bookingValidators.getAllBookings,
  validateRequestBody,
  BookingController.getAllBookings
);

// Get a specific booking
router.get(
  "/:bookingId",
  bookingValidators.getBooking,
  validateRequestBody,
  BookingController.getBooking
);

// Update booking status (cancel/decline)
router.patch(
  "/:bookingId/status",
  bookingValidators.updateBooking,
  validateRequestBody,
  BookingController.updateBooking
);

// Cancel a booking
router.post(
  "/:bookingId/cancel",
  bookingValidators.cancelBooking,
  validateRequestBody,
  BookingController.cancelBooking
);

// Approve a booking
router.patch(
  "/:bookingId/approve",
  bookingValidators.approveBooking,
  validateRequestBody,
  BookingController.approveBooking
);

export default router;
