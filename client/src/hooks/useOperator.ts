import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";

export interface OperatorStop { id?: number; name: string; city: string; order: number; latitude?: number; longitude?: number; }
export interface OperatorRoute { id: number; originCity: string; destCity: string; distanceKm: number; basePrice: string; isActive: boolean; stops: OperatorStop[]; }
export interface OperatorTrip { id: number; departureTime: string; availableSeats: number; totalSeats: number; contribution: number; route?: { id: number; originCity: string; destCity: string }; vehicle?: { id: number; make: string; model: string; plateNumber: string }; }
export interface OperatorBus { id: number; make: string; model: string; year?: number; color: string; plateNumber: string; category: string; capacity?: number; }
export interface ManifestRow { id: number; seats: number; status: string; booker: { firstName: string; lastName: string; phoneNumber?: string }; bookingSeats: { attendanceCode: string; attendedAt?: string }[]; boardingStop?: { name: string; city: string }; alightingStop?: { name: string; city: string }; }

// ---- Routes ----
export function useOperatorRoutes() {
  return useQuery({
    queryKey: ["operator-routes"],
    queryFn: async () => {
      const res = await api.get<{ routes: OperatorRoute[] }>("/api/v1/operator/routes");
      return res.routes ?? [];
    },
  });
}
export function useCreateOperatorRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<OperatorRoute>) => api.post("/api/v1/operator/routes", input),
    onSuccess: () => { toast.success("Route created"); qc.invalidateQueries({ queryKey: ["operator-routes"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create route"),
  });
}
export function useUpdateOperatorRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & Partial<OperatorRoute>) => api.patch(`/api/v1/operator/routes/${id}`, input),
    onSuccess: () => { toast.success("Route updated"); qc.invalidateQueries({ queryKey: ["operator-routes"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update route"),
  });
}
export function useReplaceOperatorRouteStops() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stops }: { id: number; stops: OperatorStop[] }) => api.put(`/api/v1/operator/routes/${id}/stops`, { stops }),
    onSuccess: () => { toast.success("Stops saved"); qc.invalidateQueries({ queryKey: ["operator-routes"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save stops"),
  });
}
export function useDeleteOperatorRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/operator/routes/${id}`),
    onSuccess: () => { toast.success("Route deleted"); qc.invalidateQueries({ queryKey: ["operator-routes"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to delete route"),
  });
}

// ---- Trips ----
export function useOperatorTrips() {
  return useQuery({
    queryKey: ["operator-trips"],
    queryFn: async () => {
      const res = await api.get<{ trips: OperatorTrip[] }>("/api/v1/operator/trips");
      return res.trips ?? [];
    },
  });
}
export function useCreateOperatorTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { routeId: number; vehicleId: number; departureTime: string; availableSeats: number }) =>
      api.post("/api/v1/operator/trips", input),
    onSuccess: () => { toast.success("Trip scheduled"); qc.invalidateQueries({ queryKey: ["operator-trips"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to schedule trip"),
  });
}
export function useOperatorManifest(tripId: number | null) {
  return useQuery({
    queryKey: ["operator-manifest", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const res = await api.get<{ manifest: ManifestRow[] }>(`/api/v1/operator/trips/${tripId}/manifest`);
      return res.manifest ?? [];
    },
  });
}

// ---- Buses (reuse owner-scoped vehicle endpoints) ----
export interface VehicleListResponse {
  success: boolean;
  data: OperatorBus[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useOperatorBuses() {
  return useQuery({
    queryKey: ["operator-buses"],
    queryFn: async () => {
      const res = await api.get<VehicleListResponse>("/api/v1/vehicles");
      return res.data.filter((v) => v.category === "BUS");
    },
  });
}

export interface CreateBusInput {
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  capacity: number;
  year?: number;
  image: File;
}

export function useCreateOperatorBus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusInput) => {
      const formData = new FormData();
      formData.append("make", input.make);
      formData.append("model", input.model);
      formData.append("color", input.color);
      formData.append("plateNumber", input.plateNumber);
      formData.append("capacity", String(input.capacity));
      formData.append("category", "BUS");
      if (input.year !== undefined) formData.append("year", String(input.year));
      formData.append("images", input.image);
      return api.upload("/api/v1/vehicles", formData);
    },
    onSuccess: () => { toast.success("Bus added"); qc.invalidateQueries({ queryKey: ["operator-buses"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to add bus"),
  });
}

// ---- Departures ----
export interface OperatorDeparture {
  id: number; routeId: number; timeOfDay: string; vehicleId: number; isActive: boolean;
  vehicle?: { id: number; make: string; model: string; plateNumber: string; capacity: number };
}

export function useRouteDepartures(routeId?: number) {
  return useQuery({
    queryKey: ["operator-departures", routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const res = await api.get<{ departures: OperatorDeparture[] }>(`/api/v1/operator/routes/${routeId}/departures`);
      return res.departures ?? [];
    },
  });
}
export function useCreateDeparture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, timeOfDay, vehicleId }: { routeId: number; timeOfDay: string; vehicleId: number }) =>
      api.post(`/api/v1/operator/routes/${routeId}/departures`, { timeOfDay, vehicleId }),
    onSuccess: (_d, v) => { toast.success("Departure added"); qc.invalidateQueries({ queryKey: ["operator-departures", v.routeId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to add departure"),
  });
}
export function useUpdateDeparture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: number; timeOfDay?: string; vehicleId?: number; isActive?: boolean }) =>
      api.patch(`/api/v1/operator/departures/${id}`, patch),
    onSuccess: () => { toast.success("Departure updated"); qc.invalidateQueries({ queryKey: ["operator-departures"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update departure"),
  });
}
export function useDeleteDeparture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/operator/departures/${id}`),
    onSuccess: () => { toast.success("Departure removed"); qc.invalidateQueries({ queryKey: ["operator-departures"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to remove departure"),
  });
}
export function useSwapTripBus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, vehicleId }: { tripId: number; vehicleId: number }) =>
      api.patch(`/api/v1/operator/trips/${tripId}/bus`, { vehicleId }),
    onSuccess: () => { toast.success("Bus updated"); qc.invalidateQueries({ queryKey: ["operator-trips"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to change bus"),
  });
}
