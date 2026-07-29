import { isValidStopSelection, clampSeats } from "@/lib/busBooking";
import type { BusRouteStop } from "@/lib/types";

const stops: BusRouteStop[] = [
  { id: 1, routeId: 1, name: "A", city: "A", order: 0, latitude: null, longitude: null },
  { id: 2, routeId: 1, name: "B", city: "B", order: 1, latitude: null, longitude: null },
  { id: 3, routeId: 1, name: "C", city: "C", order: 2, latitude: null, longitude: null },
];

it("accepts alighting after boarding", () => {
  expect(isValidStopSelection(stops, 1, 3)).toBe(true);
});
it("rejects alighting before or equal to boarding", () => {
  expect(isValidStopSelection(stops, 3, 1)).toBe(false);
  expect(isValidStopSelection(stops, 2, 2)).toBe(false);
});
it("rejects unknown stop ids", () => {
  expect(isValidStopSelection(stops, 1, 99)).toBe(false);
});

describe("clampSeats", () => {
  it("keeps values inside the range", () => {
    expect(clampSeats(2, 5)).toBe(2);
  });
  it("clamps below 1 up to 1", () => {
    expect(clampSeats(0, 5)).toBe(1);
    expect(clampSeats(-3, 5)).toBe(1);
  });
  it("clamps above max down to max", () => {
    expect(clampSeats(9, 5)).toBe(5);
  });
  it("treats max below 1 as 1", () => {
    expect(clampSeats(3, 0)).toBe(1);
    expect(clampSeats(3, -2)).toBe(1);
  });
  it("truncates fractional input", () => {
    expect(clampSeats(2.7, 5)).toBe(2);
  });
});
