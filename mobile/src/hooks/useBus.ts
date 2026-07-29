import { useMutation, useQuery } from "@tanstack/react-query";
import { api, publicApi } from "@/services/api";
import { queryKeys } from "@/lib/constants";
import type { BusOperator, BusRoute, BusRouteDeparture, BusTrip, Ride } from "@/lib/types";

export function useBusOperators() {
  return useQuery({
    queryKey: queryKeys.bus.operators,
    queryFn: () => publicApi.get<{ operators: BusOperator[] }>("/public/operators"),
    select: (r) => r.operators,
  });
}

export function useOperatorRoutes(operatorId?: string) {
  return useQuery({
    queryKey: queryKeys.bus.routes(operatorId ?? ""),
    queryFn: () => publicApi.get<{ routes: BusRoute[] }>(`/public/operators/${operatorId}/routes`),
    select: (r) => r.routes,
    enabled: !!operatorId,
  });
}

export function useRouteDepartures(routeId?: string) {
  return useQuery({
    queryKey: queryKeys.bus.trips(routeId ?? ""),
    queryFn: () => publicApi.get<{ departures: BusRouteDeparture[] }>(`/public/bus-routes/${routeId}/trips`),
    select: (r) => r.departures,
    enabled: !!routeId,
  });
}

export function useMaterializeTrip() {
  return useMutation({
    mutationFn: (vars: { routeDepartureId: number; date: string }) =>
      api.post<{ ride: Ride }>("/rides/from-schedule", vars),
  });
}

export function usePublicRide(rideId?: string) {
  return useQuery({
    queryKey: queryKeys.bus.tripDetail(rideId ?? ""),
    queryFn: () =>
      publicApi.get<{ success: boolean; data: Ride }>(`/public/rides/${rideId}`),
    select: (r) => r.data,
    enabled: !!rideId,
  });
}
