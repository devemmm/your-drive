import moment from "moment";
import { isStartDateBeforeToday } from "./bookingDates";

describe("isStartDateBeforeToday", () => {
  // Mid-afternoon "now" so an earlier-today start is genuinely in the past
  // instant-wise but still the same calendar day. Built via moment so the
  // day boundaries line up with the local timezone the code compares in.
  const now = moment().hour(14).minute(30).second(0).millisecond(0).toDate();

  it("allows a booking starting earlier *today* (same calendar day)", () => {
    const startToday = moment(now).hour(9).minute(0).toDate();
    expect(isStartDateBeforeToday(startToday, now)).toBe(false);
  });

  it("allows a booking starting at the very start of today (midnight)", () => {
    const startOfToday = moment(now).startOf("day").toDate();
    expect(isStartDateBeforeToday(startOfToday, now)).toBe(false);
  });

  it("allows a booking starting in the future", () => {
    const tomorrow = moment(now).add(1, "day").hour(8).toDate();
    expect(isStartDateBeforeToday(tomorrow, now)).toBe(false);
  });

  it("rejects a booking whose calendar day is before today", () => {
    const yesterday = moment(now).subtract(1, "day").hour(23).minute(59).toDate();
    expect(isStartDateBeforeToday(yesterday, now)).toBe(true);
  });
});
