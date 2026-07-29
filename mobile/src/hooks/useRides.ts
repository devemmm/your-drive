import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api, publicApi } from "@/services/api";
import { useAuthContext } from "@/providers/AuthProvider";
import { ApiResponse, PaginatedResponse, Ride, RideSearchParams } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function usePublicRides(params: RideSearchParams) {
  // The server validator uses `destCity` (not `destinationCity`), so we alias
  // it here. `destinationCity` is retained in params for display/cache purposes.
  const { destinationCity, ...rest } = params;
  const { isAuthenticated } = useAuthContext();
  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.rides.search(params as unknown as Record<string, unknown>),
      { guest: !isAuthenticated },
    ] as const,
    queryFn: ({ pageParam = 1 }) => {
      // Only the public mount exists on the server today, but routing the
      // call through `api` when authenticated forwards the bearer token so
      // future viewer-aware personalization (favorites, hidden rides, etc.)
      // can pick up `req.user` server-side without a second client swap.
      const client = isAuthenticated ? api : publicApi;
      return client.get<PaginatedResponse<Ride>>("/public/rides/search", {
        ...rest,
        ...(destinationCity ? { destCity: destinationCity } : {}),
        page: pageParam,
        limit: 10,
      });
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useRideDetail(rideId: string, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: queryKeys.rides.detail(rideId),
    // Use the authenticated endpoint so bookings associated with the current
    // user are returned (the /public endpoint hides them).
    queryFn: () => api.get<ApiResponse<Ride>>(`/rides/${rideId}`),
    select: (data) => data.data,
    enabled: !!rideId,
    refetchInterval: options?.refetchInterval,
  });
}

export function useMyRides() {
  return useQuery({
    queryKey: queryKeys.rides.mine,
    queryFn: () => api.get<PaginatedResponse<Ride>>("/rides", { kind: "posted" }),
  });
}

export function useMyBookedRides() {
  return useQuery({
    queryKey: [...queryKeys.rides.mine, "booked"] as const,
    queryFn: () => api.get<PaginatedResponse<Ride>>("/rides", { kind: "booked" }),
  });
}

export function useCreateRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<ApiResponse<Ride>>("/rides", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.rides.mine }); },
  });
}

interface BookRideResponse {
  success: boolean;
  data: {
    sessionId?: string;
    bookingId?: number;
    status?: string;
    seatsBooked?: number;
    attendanceCodes?: string[];
    baseAmount: number;
    platformAmount?: number;
    taxAmount?: number;
    totalAmount?: number;
    currency: string;
  };
}

export function useBookRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rideId,
      seats,
      boardingStopId,
      alightingStopId,
    }: {
      rideId: string | number;
      seats: number;
      boardingStopId?: number;
      alightingStopId?: number;
    }) =>
      api.post<BookRideResponse>(`/rides/${rideId}/book`, {
        seatsBooked: seats,
        boardingStopId,
        alightingStopId,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine }); },
  });
}

export function useCompleteRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rideId: string | number) => api.put<ApiResponse<Ride>>(`/rides/${rideId}/complete`),
    onSuccess: (_, rideId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rides.detail(String(rideId)) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rides.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.mine });
    },
  });
}

export function usePublishRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rideId: string) => api.patch(`/rides/${rideId}/publish`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.rides.mine }); },
  });
}

/** Invalidate every cache entry that could hold state about a specific ride. */
function invalidateAfterRideMutation(
  qc: ReturnType<typeof useQueryClient>,
  rideId: string | number
) {
  qc.invalidateQueries({ queryKey: queryKeys.rides.detail(String(rideId)) });
  qc.invalidateQueries({ queryKey: queryKeys.rides.mine });
  qc.invalidateQueries({ queryKey: queryKeys.bookings.mine });
  qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

export function useStartRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rideId: string | number) =>
      api.patch(`/rides/${rideId}/start-ride`),
    onSuccess: (_data, rideId) => invalidateAfterRideMutation(qc, rideId),
  });
}

export function useCancelRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, reason }: { rideId: string | number; reason: string }) =>
      api.patch(`/rides/${rideId}/cancel`, { reason }),
    onSuccess: (_data, { rideId }) => invalidateAfterRideMutation(qc, rideId),
  });
}

export function useSubmitReview() {
  return useMutation({
    mutationFn: (data: { rideId: string | number; driverId: string | number; rating: number; review?: string }) =>
      api.post("/ratings", data),
  });
}
