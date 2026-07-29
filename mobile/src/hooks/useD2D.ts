import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, PaginatedResponse, D2DBookingRequest } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useD2DRequests(rideId: string) {
  return useQuery({
    queryKey: queryKeys.d2d.requests(rideId),
    queryFn: () => api.get<PaginatedResponse<D2DBookingRequest>>(`/d2d/${rideId}/requests`),
    enabled: !!rideId,
  });
}

export function useCreateD2DRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      rideId: string;
      pickupLocationName: string;
      pickupLatitude: number;
      pickupLongitude: number;
      dropoffLocationName: string;
      dropoffLatitude: number;
      dropoffLongitude: number;
    }) => api.post(`/d2d/${data.rideId}/request`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["d2d"] }); },
  });
}

export function useCancelD2DRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.patch(`/d2d/${requestId}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["d2d"] }); },
  });
}
