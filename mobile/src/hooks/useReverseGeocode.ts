import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

const DEBOUNCE_MS = 300;

export interface ReverseGeocodeResult {
  label: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface UseReverseGeocode {
  result: ReverseGeocodeResult | null;
  error: string | null;
  isLoading: boolean;
  lookup: (coords: { latitude: number; longitude: number }) => void;
  reset: () => void;
}

export function useReverseGeocode(): UseReverseGeocode {
  const [result, setResult] = useState<ReverseGeocodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    lastCoordsRef.current = null;
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const lookup = useCallback((coords: { latitude: number; longitude: number }) => {
    lastCoordsRef.current = coords;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const c = lastCoordsRef.current;
      if (!c) return;
      setIsLoading(true);
      setError(null);
      try {
        const [hit] = await Location.reverseGeocodeAsync(c);
        if (hit) {
          const label = hit.street || hit.name || hit.city || "Pinned location";
          const city = hit.city || hit.subregion || hit.region || "";
          setResult({ label, city, latitude: c.latitude, longitude: c.longitude });
        }
      } catch (err: any) {
        setError(err?.message || "Reverse geocode failed");
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { result, error, isLoading, lookup, reset };
}
