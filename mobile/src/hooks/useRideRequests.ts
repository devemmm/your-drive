import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKeys } from "@/lib/constants";

export interface RideRequestLocationInput {
  city: string;
  province: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  address?: string;
}

export interface CreateRideRequestPayload {
  origin: RideRequestLocationInput;
  destination: RideRequestLocationInput;
  date?: number;
  timeWindowStart?: number;
  timeWindowEnd?: number;
  seats?: number;
  rideType: "P2P" | "D2D";
  description?: string;
  proposedFare?: number;
  vehicleCategory?: "CAR" | "MOTORBIKE" | "BUS";
}

export interface RideRequest {
  id: number;
  userId: number;
  originCity: string;
  originProvince: string;
  destCity: string;
  destProvince: string;
  seats: number;
  date: string;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  rideType: "P2P" | "D2D";
  vehicleCategory?: "CAR" | "MOTORBIKE" | "BUS";
  status: "DRAFT" | "OPEN" | "CLOSED" | "EXPIRED";
  proposedFare: string | null;
  createdAt: string;
  description?: string | null;
  origin?: {
    id: number;
    city: string;
    locationName: string;
    latitude: number;
    longitude: number;
  } | null;
  destination?: {
    id: number;
    city: string;
    locationName: string;
    latitude: number;
    longitude: number;
  } | null;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    averageRating: number | null;
    totalRatings: number;
    profileImage?: { url: string | null } | null;
  };
  matches?: Array<{
    id: number;
    rideId: number;
    ride: {
      id: number;
      status: string;
      type?: "P2P" | "D2D";
      driver?: { id: number; firstName: string; lastName: string; phoneNumber?: string; profileImage?: { url: string | null } | null };
      vehicle?: { id: number; make: string; model: string; color?: string; plateNumber?: string };
    };
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Paginated<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useCreateRideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRideRequestPayload) =>
      api.post<ApiResponse<RideRequest>>("/ride-requests", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rideRequests.mine });
    },
  });
}

export function useRideRequest(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.rideRequests.detail(id ?? ""),
    queryFn: () =>
      api.get<ApiResponse<RideRequest>>(`/ride-requests/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 5000, // poll every 5s so passenger sees updates
  });
}

export function useMyRideRequests() {
  return useQuery({
    queryKey: queryKeys.rideRequests.mine,
    queryFn: () =>
      api.get<Paginated<RideRequest>>("/ride-requests").then((r) => r.data),
  });
}

export function useOpenRideRequestsForDrivers(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.rideRequests.openForDrivers,
    queryFn: () =>
      api
        .get<Paginated<RideRequest>>("/ride-requests/open-for-drivers")
        .then((r) => r.data),
    enabled,
    refetchInterval: enabled ? 8000 : false,
  });
}

export function useAcceptRideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      vehicleId,
    }: {
      requestId: number;
      vehicleId: number;
    }) =>
      api.post<ApiResponse<{ ride: any; booking: any }>>(
        `/ride-requests/${requestId}/accept`,
        { vehicleId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rideRequests.openForDrivers });
      queryClient.invalidateQueries({ queryKey: queryKeys.rides.mine });
      // Backend auto-creates the chat thread when the ride is accepted; refresh
      // the local cache so the passenger's "Chat driver" button works on the
      // first tap.
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads });
    },
  });
}

export function useCancelRideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) =>
      api.patch(`/ride-requests/${requestId}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rideRequests.mine });
      queryClient.invalidateQueries({ queryKey: queryKeys.rideRequests.openForDrivers });
    },
  });
}
