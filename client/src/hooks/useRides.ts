import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/services/api";

// Types
export interface Location {
  id?: number;
  region: string;
  city: string;
  locationName: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface RidePreferences {
  smoking: boolean;
  pets: boolean;
  airConditioning: boolean;
  ladiesOnly: boolean;
  gentsOnly: boolean;
  bicycleSupport: boolean;
  snowTires: boolean;
  luggageSize: "SMALL" | "MEDIUM" | "LARGE";
  luggageCount: number;
}

export interface Ride {
  id: number;
  departureTime: Date;
  estimatedArrivalTime: Date;
  availableSeats: number;
  totalSeats: number;
  contribution: number;
  departureLocation: Location;
  destinationLocation: Location;
  // D2D specific fields
  type?: "D2D" | "P2P";
  isDoorToDoor?: boolean;
  driverStartLocation?: Location;
  driverStopLocation?: Location;
  stopovers: Location[];
  preferences: RidePreferences;
  bookingType: "AUTOMATIC" | "MANUAL";
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED" | "ONGOING" | "EXPIRED" | "BLOCKED";
  driver: {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
    profileImage?: {
      url: string;
    };
  };
  vehicle: {
    id: number;
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    files: {
      url: string;
    }[];
    defaultImage?: {
      url: string;
    };
  };
  contributionCollectionMethod: "VIA_PLATFORM" | "DIRECT";
  monitizationType: "SUBSCRIPTION" | "PAYMENT" | "FREE";
  isBlocked?: boolean;
  route?: {
    id: number;
    originCity: string;
    destCity: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  chatThread?: {
    id: number;
    rideId?: number;
    users: {
      id: number;
      name: string;
      email: string;
      profileImage?: {
        url: string;
      };
    }[];
  };
  _count?: {
    bookingSeats?: number;
    reports?: number;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface RidesQueryParams {
  page?: number;
  pageSize?: number;
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  type?: "D2D" | "P2P";
  search?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  rideId?: number;
  vehicleCategory?: string;
}

export interface CreateRideData {
  departureTime: Date;
  estimatedArrivalTime: Date;
  availableSeats: number;
  contribution: number;
  departure: Location;
  destination: Location;
  stopovers?: Location[];
  preferences: RidePreferences;
  bookingType?: "AUTOMATIC" | "MANUAL";
  contributionCollectionMethod: "VIA_PLATFORM" | "DIRECT";
  vehicleId: number;
}

export interface BookRideData {
  rideId: number;
  seatsBooked: number;
}

export const useRides = (params: RidesQueryParams = {}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Get all rides with pagination and filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["rides", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });

      return api.get<PaginatedResponse<Ride>>(
        `/api/v1/rides?${searchParams.toString()}`
      );
    },
  });

  // Create a new ride
  const createRide = useMutation({
    mutationFn: async (rideData: CreateRideData) => {
      return api.post(`/api/v1/rides`, rideData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      toast.success(t("rides.createSuccess"));
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("common.error"), {
        className: "custom-error-toast",
      });
    },
  });

  // Book a ride
  const bookRide = useMutation({
    mutationFn: async (bookingData: BookRideData) => {
      return api.post(`/api/v1/rides/${bookingData.rideId}/book`, {
        seatsBooked: bookingData.seatsBooked,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      toast.success(t("rides.bookSuccess"));
      return data;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("common.error"), {
        className: "custom-error-toast",
      });
    },
  });

  // Get ride by ID
  const getRideById = useQuery({
    queryKey: ["ride", params.rideId],
    queryFn: async () => {
      return api.get<{ data: Ride }>(`/api/v1/public/rides/${params.rideId}`);
    },

    enabled: !!params.rideId,
  });

  return {
    rides: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error,
    refetch,
    createRide: createRide.mutate,
    bookRide: bookRide.mutate,
    isCreating: createRide.isPending,
    isBooking: bookRide.isPending,
    ride: getRideById.data?.data,
    isRideLoading: getRideById.isLoading,
    rideError: getRideById.error,
  };
};
