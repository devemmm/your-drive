import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, PaginatedResponse, Booking } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useMyBookings() {
  return useQuery({
    queryKey: queryKeys.bookings.mine,
    queryFn: () => api.get<PaginatedResponse<Booking>>("/bookings"),
  });
}

export function useBookingDetail(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(bookingId),
    queryFn: () => api.get<ApiResponse<Booking>>(`/bookings/${bookingId}`),
    select: (data) => data.data,
    enabled: !!bookingId,
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      api.post(`/bookings/${bookingId}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.mine });
      qc.invalidateQueries({ queryKey: queryKeys.rides.mine });
      // Also refetch any specific ride detail — the cancelled booking may
      // be part of a ride the user is currently looking at.
      qc.invalidateQueries({ queryKey: ["rides"], exact: false });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

/**
 * Driver-side action: approve a PENDING booking on a manual-approval ride.
 * Server: PATCH /bookings/:bookingId/approve (no body).
 */
export function useApproveBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string | number) =>
      api.patch(`/bookings/${bookingId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings.mine });
      qc.invalidateQueries({ queryKey: queryKeys.rides.mine });
      qc.invalidateQueries({ queryKey: ["rides"], exact: false });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
