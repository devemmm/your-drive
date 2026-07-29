import type { BusRouteStop } from "@/lib/types";

export function isValidStopSelection(
  stops: BusRouteStop[],
  boardingStopId: number,
  alightingStopId: number
): boolean {
  const boarding = stops.find((s) => s.id === boardingStopId);
  const alighting = stops.find((s) => s.id === alightingStopId);
  if (!boarding || !alighting) return false;
  return alighting.order > boarding.order;
}

export function clampSeats(next: number, max: number): number {
  const upper = Math.max(1, Math.trunc(max));
  return Math.min(upper, Math.max(1, Math.trunc(next)));
}
