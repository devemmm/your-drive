import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export type Stop = {
  id?: number;
  name: string;
  city: string;
  order: number;
  latitude?: number;
  longitude?: number;
};

export type BusRoute = {
  id: number;
  operatorId: number;
  originCity: string;
  destCity: string;
  distanceKm: number;
  basePrice: string;
  isActive: boolean;
  stops: Stop[];
  operator: { id: number; firstName: string; lastName: string };
};

export const useBusRoutes = () =>
  useQuery({
    queryKey: ["bus-routes"],
    queryFn: async () => {
      // GET /api/v1/bus-routes → response.data is { routes: BusRoute[] }
      const res = await api.get<{ routes: BusRoute[] }>("/api/v1/bus-routes");
      // api wrapper returns response.data, so res = { routes: [...] }
      return ((res as any).routes ?? (res as any).data?.routes ?? res) as BusRoute[];
    },
  });

export const useCreateBusRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<BusRoute, "id" | "operator">
    ) => {
      const res = await api.post("/api/v1/bus-routes", input);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bus-routes"] }),
  });
};

export const useReplaceRouteStops = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; stops: Stop[] }) => {
      const res = await api.put(`/api/v1/bus-routes/${input.id}/stops`, {
        stops: input.stops,
      });
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bus-routes"] }),
  });
};
