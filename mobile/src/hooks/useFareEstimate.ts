import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export interface FareEstimateInput {
  vehicleCategory: "CAR" | "MOTORBIKE" | "BUS";
  rideType: "P2P" | "D2D";
  distanceKm: number;
  durationMin: number;
}

export interface FareBreakdown {
  baseFare: number;
  perKm: number;
  perMinute: number;
  distanceKm: number;
  durationMin: number;
  raw: number;
  minimumFare: number;
  suggestedFare: number;
  currency: string;
  commissionPercent: number;
}

export function useFareEstimate(input: FareEstimateInput | null) {
  return useQuery({
    queryKey: ["fare-estimate", input],
    queryFn: () =>
      api.get<{ status: boolean; data: FareBreakdown }>("/public/fare-estimate", input as unknown as Record<string, unknown>),
    enabled: !!input && input.distanceKm > 0,
    staleTime: 60_000,
  });
}

/**
 * Haversine — distance between two lat/lng points in kilometres.
 */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371; // Earth radius km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rough city-driving estimate: 2 minutes per km.
export function durationMinFromKm(distanceKm: number): number {
  return Math.max(2, Math.round(distanceKm * 2));
}
