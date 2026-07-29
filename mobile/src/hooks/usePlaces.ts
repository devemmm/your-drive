import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/services/api";
import * as Crypto from "expo-crypto";
import polyline from "@mapbox/polyline";
import { extractCity } from "@/utils/extractCity";

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AutocompleteResponse {
  success: boolean;
  data: {
    predictions: PlacePrediction[];
    status: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

interface DetailsResponse {
  success: boolean;
  data: {
    result: PlaceDetails;
    status: string;
  };
}

export function usePlacesSessionToken() {
  return useMemo(() => Crypto.randomUUID(), []);
}

export function useCityAutocomplete(input: string, sessionToken: string) {
  return useQuery({
    queryKey: ["places", "cities", input],
    queryFn: async () => {
      if (!input || input.trim().length < 2) return { data: { predictions: [] } };
      return api.get<AutocompleteResponse>("/public/places/autocomplete/cities", {
        input: input.trim(),
        sessiontoken: sessionToken,
      });
    },
    enabled: !!input && input.trim().length >= 2,
    staleTime: 60_000,
  });
}

export function useAddressAutocomplete(input: string, sessionToken: string) {
  return useQuery({
    queryKey: ["places", "addresses", "default", input],
    queryFn: async () => {
      if (!input || input.trim().length < 2) return { data: { predictions: [] } };
      return api.get<AutocompleteResponse>("/public/places/autocomplete/addresses", {
        input: input.trim(),
        sessiontoken: sessionToken,
        types: "default",
      });
    },
    enabled: !!input && input.trim().length >= 2,
    staleTime: 60_000,
  });
}

export async function fetchPlaceDetails(placeId: string, sessionToken: string): Promise<PlaceDetails | null> {
  const response = await api.get<DetailsResponse>("/public/places/details", {
    place_id: placeId,
    sessiontoken: sessionToken,
  });
  return response.data?.result || null;
}

// Helper to extract structured location from Google place details
export interface ExtractedLocation {
  locationName: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  address: string;
}

export function extractLocation(place: PlaceDetails): ExtractedLocation {
  const getComponent = (types: string[]) => {
    const comp = place.address_components.find((c) => types.some((t) => c.types.includes(t)));
    return comp?.long_name || "";
  };

  return {
    locationName: place.name,
    city: extractCity(place.address_components) || place.name,
    region: getComponent(["administrative_area_level_1"]) || "",
    country: getComponent(["country"]) || "",
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    address: place.formatted_address,
  };
}

// ── Directions ────────────────────────────────────────────────────────────────

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface DirectionsResponse {
  success: boolean;
  data: {
    routes: Array<{
      overview_polyline: { points: string };
      legs: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
      }>;
    }>;
    status: string;
  };
}

export function useDirections(
  origin: { latitude: number; longitude: number } | null,
  destination: { latitude: number; longitude: number } | null
) {
  return useQuery({
    queryKey: [
      "directions",
      origin?.latitude,
      origin?.longitude,
      destination?.latitude,
      destination?.longitude,
    ],
    queryFn: async () => {
      if (!origin || !destination) return null;
      const response = await api.post<DirectionsResponse>("/public/directions", {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
      });
      const route = response.data?.routes?.[0];
      if (!route) return null;

      const coords: RouteCoordinate[] = polyline
        .decode(route.overview_polyline.points)
        .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

      return {
        coordinates: coords,
        distance: route.legs[0]?.distance?.text || "",
        duration: route.legs[0]?.duration?.text || "",
        durationSeconds: route.legs[0]?.duration?.value || 0,
      };
    },
    enabled: !!origin && !!destination,
    staleTime: 5 * 60 * 1000,
  });
}
