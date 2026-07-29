import { buildBookingDates } from "../bookingDates";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

describe("buildBookingDates", () => {
  describe("DAILY", () => {
    it("widens a single selected day into a full-day window (end > start)", () => {
      const day = new Date(2026, 5, 18, 14, 30); // June 18 2026, 14:30 local
      const { startDate, endDate } = buildBookingDates("DAILY", day, day);
      // Start is left at the picked instant — NOT snapped to local midnight,
      // which would shift it before "today" once converted to UTC.
      expect(startDate).toEqual(day);
      expect(endDate.getTime() - startDate.getTime()).toBe(MS_PER_DAY);
    });

    it("keeps a valid multi-day range untouched", () => {
      const start = new Date(2026, 5, 18, 9, 0);
      const end = new Date(2026, 5, 20, 9, 0);
      const res = buildBookingDates("DAILY", start, end);
      expect(res.startDate).toEqual(start);
      expect(res.endDate).toEqual(end);
      expect(res.endDate.getTime()).toBeGreaterThan(res.startDate.getTime());
    });
  });

  describe("HOURLY", () => {
    it("guarantees at least a 1-hour window when start == end", () => {
      const t = new Date(2026, 5, 18, 10, 0);
      const { startDate, endDate } = buildBookingDates("HOURLY", t, t);
      expect(startDate).toEqual(t);
      expect(endDate.getTime() - startDate.getTime()).toBe(MS_PER_HOUR);
    });

    it("preserves a valid hour range", () => {
      const start = new Date(2026, 5, 18, 10, 0);
      const end = new Date(2026, 5, 18, 13, 0);
      const res = buildBookingDates("HOURLY", start, end);
      expect(res.startDate).toEqual(start);
      expect(res.endDate).toEqual(end);
    });
  });
});
