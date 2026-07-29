import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, Vehicle } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useMyVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.mine,
    queryFn: () => api.get<ApiResponse<Vehicle[]>>("/vehicles"),
    select: (data) => data.data,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => api.upload("/vehicles", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine }); },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.put(`/vehicles/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine }); },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine }); },
  });
}

export function useUpdateRentalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/vehicles/${id}/rental-settings`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine }); },
  });
}
