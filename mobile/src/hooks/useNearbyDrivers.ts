import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api, publicApi } from "@/services/api";
import { useAuthContext } from "@/providers/AuthProvider";
import { queryKeys } from "@/lib/constants";

export interface NearbyDriver {
  id: string;
  latitude: number;
  longitude: number;
  vehicleCategory: "CAR" | "MOTORBIKE";
}

interface NearbyResponse {
  drivers: NearbyDriver[];
  fetchedAt: string;
}

export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

function useForegroundActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) =>
      setActive(next === "active")
    );
    return () => sub.remove();
  }, []);
  return active;
}

export function useNearbyDrivers(bounds: MapBounds | null) {
  const isActive = useForegroundActive();
  const { isAuthenticated } = useAuthContext();
  return useQuery<NearbyResponse>({
    queryKey: bounds
      ? [...queryKeys.drivers.nearby(bounds), { guest: !isAuthenticated }]
      : ["drivers", "nearby", "none", { guest: !isAuthenticated }],
    queryFn: () => {
      const url = isAuthenticated ? "/drivers/nearby" : "/public/drivers/nearby";
      const client = isAuthenticated ? api : publicApi;
      return client.get<NearbyResponse>(url, bounds! as unknown as Record<string, unknown>);
    },
    enabled: !!bounds && isActive,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
