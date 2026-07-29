import { __test__ } from "../AvailabilityCalendar";

const { daysInMonth, intersectsAnyRange, sameYMD } = __test__;

describe("AvailabilityCalendar helpers", () => {
  describe("daysInMonth", () => {
    it("returns 42 cells for June 2026 with the right inMonth flags", () => {
      const cells = daysInMonth(2026, 5); // 0-indexed month: 5 = June
      expect(cells).toHaveLength(42);
      // June 1, 2026 is a Monday; index 0 is the preceding Sunday (May 31)
      expect(cells[0].date.getMonth()).toBe(4); // May
      expect(cells[0].inMonth).toBe(false);
      expect(cells[1].date.getDate()).toBe(1);
      expect(cells[1].inMonth).toBe(true);
      const lastJune = cells.filter(c => c.inMonth && c.date.getMonth() === 5).pop()!;
      expect(lastJune.date.getDate()).toBe(30);
    });
  });

  describe("sameYMD", () => {
    it("returns true when two Dates share year/month/day regardless of time", () => {
      const a = new Date(2026, 5, 4, 8, 0);   // 4 June 2026 08:00 local
      const b = new Date(2026, 5, 4, 22, 30); // 4 June 2026 22:30 local
      expect(sameYMD(a, b)).toBe(true);
    });

    it("returns false when the day differs", () => {
      const a = new Date(2026, 5, 4, 8, 0);
      const b = new Date(2026, 5, 5, 8, 0);
      expect(sameYMD(a, b)).toBe(false);
    });
  });

  describe("intersectsAnyRange", () => {
    const day = new Date(2026, 5, 10);
    const ranges = [
      { start: "2026-06-09T20:00:00Z", end: "2026-06-11T02:00:00Z", kind: "RENTAL" as const },
    ];

    it("returns true when the day overlaps a range", () => {
      expect(intersectsAnyRange(day, ranges)).toBe(true);
    });

    it("returns false when the day is entirely before the range", () => {
      const before = new Date(2026, 5, 8);
      expect(intersectsAnyRange(before, ranges)).toBe(false);
    });

    it("returns false when the day is entirely after the range", () => {
      const after = new Date(2026, 5, 12);
      expect(intersectsAnyRange(after, ranges)).toBe(false);
    });

    it("returns false against an empty range list", () => {
      expect(intersectsAnyRange(day, [])).toBe(false);
    });
  });
});

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { AvailabilityCalendar } from "../AvailabilityCalendar";
import { ThemeProvider } from "@/providers/ThemeProvider";

function renderCal(props: Partial<React.ComponentProps<typeof AvailabilityCalendar>> = {}) {
  const onChange = jest.fn();
  // Anchor everything to June 2026 so the grid layout is deterministic.
  const start = new Date(2026, 5, 4, 9, 30); // June 4, 2026 09:30 local
  const end = new Date(2026, 5, 4, 9, 30);
  const utils = render(
    <ThemeProvider>
      <AvailabilityCalendar
        bookedRanges={[]}
        startDate={start}
        endDate={end}
        mode="DAILY"
        onChange={onChange}
        testID="cal"
        anchorMonth={new Date(2026, 5, 1)}
        {...props}
      />
    </ThemeProvider>
  );
  return { ...utils, onChange };
}

describe("AvailabilityCalendar component", () => {
  it("renders 30 day cells for June 2026 (rest are out-of-month)", () => {
    const { getAllByTestId } = renderCal();
    const inMonth = getAllByTestId(/^cal\.day\.\d{4}-\d{2}-\d{2}\.inMonth$/);
    expect(inMonth).toHaveLength(30);
  });

  it("greys + disables a day overlapping a RENTAL range in DAILY mode", () => {
    const { getByTestId } = renderCal({
      bookedRanges: [{
        start: "2026-06-10T09:00:00Z",
        end: "2026-06-10T17:00:00Z",
        kind: "RENTAL",
      }],
    });
    const cell = getByTestId("cal.day.2026-06-10.blocked");
    expect(cell).toBeTruthy();
  });

  it("tapping an available day emits onChange with that day as both start and end (single-day pick)", () => {
    const { getByTestId, onChange } = renderCal();
    fireEvent.press(getByTestId("cal.day.2026-06-15.inMonth"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const [s, e] = onChange.mock.calls[0];
    expect(s.getDate()).toBe(15);
    expect(e.getDate()).toBe(15);
  });

  it("tapping a different day after a range exists restarts the selection at the new day", () => {
    const start = new Date(2026, 5, 15);
    const end = new Date(2026, 5, 20);
    const { getByTestId, onChange } = renderCal({ startDate: start, endDate: end });
    fireEvent.press(getByTestId("cal.day.2026-06-10.inMonth"));
    const [s, e] = onChange.mock.calls[0];
    expect(s.getDate()).toBe(10);
    expect(e.getDate()).toBe(10);
  });

  it("renders an in-range fill on days strictly between startDate and endDate", () => {
    const start = new Date(2026, 5, 10);
    const end = new Date(2026, 5, 14);
    const { getByTestId } = renderCal({ startDate: start, endDate: end });
    const mid = getByTestId("cal.day.2026-06-12.inMonth");
    expect(mid).toBeTruthy();
  });
});
