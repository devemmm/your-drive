// Bus trips span cities, so city → city is the meaningful label.
// Local trips (CAR / MOTORBIKE) usually start and end in the same city,
// so showing "Harare → Harare" hides the actual journey. Use the
// specific pickup/dropoff name (locationName), falling back to city
// only when locationName is missing.

interface RouteEndpoint {
  city?: string | null;
  locationName?: string | null;
}

interface RideRouteSource {
  vehicleCategory?: "CAR" | "MOTORBIKE" | "BUS" | null;
  origin?: RouteEndpoint | null;
  destination?: RouteEndpoint | null;
  originCity?: string | null;
  destCity?: string | null;
}

export function formatRideRoute(req: RideRouteSource): { from: string; to: string } {
  const isBus = req.vehicleCategory === "BUS";
  const originCity = req.origin?.city ?? req.originCity ?? "";
  const destCity = req.destination?.city ?? req.destCity ?? "";

  if (isBus) {
    return { from: originCity, to: destCity };
  }

  const from = req.origin?.locationName?.trim() || originCity;
  const to = req.destination?.locationName?.trim() || destCity;
  return { from, to };
}
