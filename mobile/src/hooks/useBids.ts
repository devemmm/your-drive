import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKeys } from "@/lib/constants";
import type { ApiResponse } from "@/lib/types";

export type RideBid = {
  id: number;
  rideRequestId: number;
  driverId: number;
  vehicleId: number;
  bidAmount: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  createdAt: string;
  resolvedAt: string | null;
  rideId?: number | null;
};

export type BidListItem = RideBid & {
  driver: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    averageRating: number | null;
    totalRatings: number;
    profileImage: { url: string } | null;
    presence: { latitude: number; longitude: number; updatedAt: string } | null;
  };
  vehicle: {
    id: number;
    make: string;
    model: string;
    category: "CAR" | "MOTORBIKE" | "BUS";
    tier: "ECONOMY" | "PREMIUM" | null;
  };
};

export function useBidsForRequest(rideRequestId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: rideRequestId != null ? queryKeys.bids.forRequest(rideRequestId) : ["bids", "for-request", "null"],
    queryFn: () =>
      api
        .get<ApiResponse<BidListItem[]>>(`/ride-requests/${rideRequestId}/bids`)
        .then((r) => r.data),
    enabled: enabled && rideRequestId != null,
    refetchInterval: 5_000,
  });
}

export function useBid(bidId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: bidId != null ? queryKeys.bids.detail(bidId) : ["bids", "null"],
    queryFn: () =>
      api.get<ApiResponse<RideBid>>(`/bids/${bidId}`).then((r) => r.data),
    enabled: enabled && bidId != null,
    refetchInterval: 5_000,
  });
}

export function useSubmitBid(rideRequestId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: number; vehicleId: number }) =>
      api
        .post<ApiResponse<RideBid>>(`/ride-requests/${rideRequestId}/bids`, input)
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.bids.forRequest(rideRequestId),
      });
    },
  });
}

export function useAcceptBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bidId: number) =>
      api
        .post<ApiResponse<{ ride: unknown; bid: RideBid }>>(`/bids/${bidId}/accept`, {})
        .then((r) => r.data),
    onSuccess: (_, bidId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.bids.detail(bidId) });
      void qc.invalidateQueries({ queryKey: ["bids", "for-request"] });
      void qc.invalidateQueries({ queryKey: ["rideRequests"] });
    },
  });
}

export function useCancelBid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bidId: number) =>
      api
        .post<ApiResponse<RideBid>>(`/bids/${bidId}/cancel`, {})
        .then((r) => r.data),
    onSuccess: (_, bidId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.bids.detail(bidId) });
    },
  });
}
