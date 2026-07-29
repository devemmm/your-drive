import moment from "moment";

/**
 * Whether a booking's start date falls on a calendar day *before* today.
 *
 * Rentals and chauffeur hires are day/hour-range bookings, not point-in-time
 * events, so "today" must be a valid start — a user booking a vehicle for the
 * current day should not be rejected just because the clock has moved past the
 * start instant. We therefore compare at day granularity, mirroring the
 * ride-request rule (`date.isBefore(now.startOf("day"))`). Only genuinely past
 * days (yesterday and earlier) are rejected.
 */
export function isStartDateBeforeToday(
  startDate: Date,
  now: Date = new Date()
): boolean {
  return moment(startDate).isBefore(moment(now).startOf("day"));
}
