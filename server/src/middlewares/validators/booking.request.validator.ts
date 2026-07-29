import { body, param, query } from "express-validator";
import { BookingStatus } from "@prisma/client";
import { validationMsg } from "../../utils/validation";

export const bookingValidators = {
  getAllBookings: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.page_positive_int"))
      .toInt(),
    query("pageSize")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage(validationMsg("validation.pageSize_range"))
      .toInt(),
    query("rideId")
      .optional()
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rideId_positive_int"))
      .toInt(),
    query("status")
      .optional()
      .isIn(Object.values(BookingStatus))
      .withMessage(
        validationMsg("validation.bookingStatus_invalid", {
          statuses: Object.values(BookingStatus).join(", "),
        })
      ),
    query("bookingRelation")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.bookingRelation_invalid"))
      .trim()
      .toLowerCase()
      .isIn(["booked_by_me", "booked_from_my_rides"])
      .withMessage(validationMsg("validation.bookingRelation_invalid")),
  ],

  getBooking: [
    param("bookingId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rideId_positive_int"))
      .toInt(),
  ],

  updateBooking: [
    param("bookingId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rideId_positive_int"))
      .toInt(),
    body("status")
      .isString()
      .trim()
      .toUpperCase()
      .isIn([BookingStatus.DECLINED, BookingStatus.CANCELLED])
      .withMessage(validationMsg("validation.only_declined_cancelled")),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.cancel_decline_reason_required")),
  ],

  cancelBooking: [
    param("bookingId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rideId_positive_int"))
      .toInt(),
    body("reason")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(validationMsg("validation.cancel_reason_required")),
  ],

  approveBooking: [
    param("bookingId")
      .isInt({ min: 1 })
      .withMessage(validationMsg("validation.rideId_positive_int"))
      .toInt(),
  ],
};
