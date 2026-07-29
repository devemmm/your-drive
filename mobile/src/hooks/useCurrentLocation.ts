import { useState, useEffect } from "react";
import * as Location from "expo-location";

interface CurrentLocation {
  latitude: number;
  longitude: number;
}

interface UseCurrentLocationResult {
  location: CurrentLocation | null;
  address: string | null;
  city: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLocation() {
    setIsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        setIsLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);

      const [reverseGeo] = await Location.reverseGeocodeAsync(coords);
      if (reverseGeo) {
        const street = reverseGeo.street || reverseGeo.name || "";
        const cityName = reverseGeo.city || reverseGeo.subregion || "";
        setAddress(street || cityName || "Current Location");
        setCity(cityName);
      }
    } catch (err: any) {
      setError(err.message || "Failed to get location");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLocation();
  }, []);

  return { location, address, city, isLoading, error, refetch: fetchLocation };
}
