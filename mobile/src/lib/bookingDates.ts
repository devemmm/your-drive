// Helpers for turning the rental / chauffeur booking form's start & end dates
// into a payload the server accepts.
//
// The server requires `endDate > startDate` and allows same-day starts (it
// rejects only start *days* before today). The pickers default both start and
// end to "now", and a single calendar tap selects the same day for both — which
// would send end == start and be rejected. We fix that by widening the end so
// there is always a positive window:
//   • DAILY  → at least one full day (start + 24h) when start and end land on
//             the same instant/day.
//   • HOURLY → at least a 1-hour window.
//
// We deliberately do NOT snap the start back to local midnight: the server
// compares days in its own timezone (UTC in production) while users are in
// CAT (UTC+2), so a local-midnight start would become 22:00 the *previous* day
// in UTC and be rejected as "in the past". Leaving the start at the picked
// instant (≈ now for a same-day booking) keeps it unambiguously today in any
// timezone.

export type BookingMode = "DAILY" | "HOURLY";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function buildBookingDates(
  mode: BookingMode,
  start: Date,
  end: Date
): { startDate: Date; endDate: Date } {
  const startDate = new Date(start);
  let endDate = new Date(end);

  const minWindowMs = mode === "DAILY" ? MS_PER_DAY : MS_PER_HOUR;
  if (endDate.getTime() <= startDate.getTime()) {
    endDate = new Date(startDate.getTime() + minWindowMs);
  }

  return { startDate, endDate };
}
