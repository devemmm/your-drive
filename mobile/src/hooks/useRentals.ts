import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, publicApi } from "@/services/api";
import { useAuthContext } from "@/providers/AuthProvider";
import { ApiResponse, PaginatedResponse, CarRental, RentalVehicleListing } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useAvailableRentals(params?: { city?: string; category?: string }) {
  const { isAuthenticated } = useAuthContext();
  return useQuery({
    queryKey: [
      ...queryKeys.rentals.available(params as Record<string, unknown>),
      { guest: !isAuthenticated },
    ] as const,
    queryFn: () => {
      const url = isAuthenticated
        ? "/public/rentals/vehicles/available"
        : "/public/rentals/search";
      const client = isAuthenticated ? api : publicApi;
      return client.get<PaginatedResponse<RentalVehicleListing>>(
        url,
        params as Record<string, unknown>
      );
    },
  });
}

export function useMyRentals() {
  return useQuery({
    queryKey: queryKeys.rentals.mine,
    queryFn: () => api.get<PaginatedResponse<CarRental>>("/rentals"),
  });
}

export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { vehicleId: number; rentalType: string; startDate: string; endDate: string }) =>
      api.post<ApiResponse<CarRental>>("/rentals", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}

export function useApproveRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/rentals/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}

export function useDeclineRental() {
  const qc = useQueryClient();
  return useMutation({
    // Server requires non-empty `reason` (see rental.request.validator.ts:declineRental).
    // Callers may pass a real reason via an object form; otherwise default.
    mutationFn: (input: string | { id: string; reason?: string }) => {
      const id = typeof input === "object" ? input.id : input;
      const reason =
        typeof input === "object" && input.reason ? input.reason : "No reason provided";
      return api.patch(`/rentals/${id}/decline`, { reason });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}

export function useCancelRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/rentals/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}

export function useCompleteRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/rentals/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.rentals.mine }); },
  });
}
