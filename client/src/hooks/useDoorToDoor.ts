import {
  DoorToDoorRequest,
  DoorToDoorRide,
  DoorToDoorSettingsPayload,
} from "@/lib/types";
import { api } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ApiResponse<T> {
  data: T;
  message?: string;
}

const DOOR_TO_DOOR_BASE = "/api/v1/d2d";

const unwrap = <T>(response: ApiResponse<T> | T): T => {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
};

export const doorToDoorKeys = {
  all: ["door-to-door"] as const,
  driverRides: () => [...doorToDoorKeys.all, "driver-rides"] as const,
  driverRequests: (rideId?: number | string) =>
    [...doorToDoorKeys.all, "driver-requests", rideId ?? "all"] as const,
  passengerRequests: () =>
    [...doorToDoorKeys.all, "passenger-requests"] as const,
  passengerRideRequests: () =>
    [...doorToDoorKeys.all, "passenger-ride-requests"] as const,
  request: (requestId: number | string) =>
    [...doorToDoorKeys.all, "request", requestId] as const,
};

/**
 * Driver – fetch rides with D2D configuration
 * Uses regular rides endpoint and filters for isDoorToDoor=true
 */
export const useDoorToDoorDriverRides = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: doorToDoorKeys.driverRides(),
    queryFn: async () => {
      // Use regular rides endpoint with kind=posted, then filter for D2D rides
      const response = await api.get<ApiResponse<any[]>>(
        `/api/v1/rides?kind=posted&page=1&pageSize=100`
      );
      const rides = unwrap(response);

      // Filter for D2D rides and transform to DoorToDoorRide format

      const d2dRides = rides
        .filter((ride: any) => {
          console.log(ride.type);
          return ride.type === "D2D";
        })
        .map((ride: any) => {
          const d2dRequests = ride.d2dRequests || ride.d2d_requests || [];
          return {
            id: ride.id, // Using ride ID as D2D config ID
            rideId: ride.id,
            driverId: ride.driverId,
            radiusKm: ride.detourRadius || 5,
            capacity: ride.d2dCapacity || 1,
            remainingCapacity: Math.max(
              0,
              (ride.d2dCapacity || 1) - d2dRequests.length
            ),
            isEnabled: true, // If ride exists and isDoorToDoor, it's enabled
            locked: false,
            status: ride.status === "PUBLISHED" ? "ON" : "OFF",
            totalRequests: d2dRequests.length,
            acceptedRequestId:
              d2dRequests.find((r: any) => r.status === "ACCEPTED")?.id || null,
            createdAt: ride.createdAt,
            updatedAt: ride.updatedAt,
            ride: ride,
            requests: d2dRequests,
            configurationNotes: null,
          } as DoorToDoorRide;
        });

      return d2dRides;
    },
    staleTime: 30_000,
    ...(options ?? {}),
  });
};

/**
 * Driver – fetch D2D requests (optionally scoped to a ride)
 * Uses regular rides endpoint and extracts D2D requests
 */
export const useDoorToDoorDriverRequests = (rideId?: number) => {
  return useQuery({
    queryKey: doorToDoorKeys.driverRequests(rideId),
    queryFn: async () => {
      if (rideId) {
        // Get specific ride and extract its D2D requests
        const response = await api.get<ApiResponse<any>>(
          `/api/v1/d2d/ride/${rideId}/requests`
        );

        const ride = unwrap(response);
        return ride || [];
      } else {
        // Get all driver's D2D rides and collect all requests
        const ridesResponse = await api.get<ApiResponse<any[]>>(
          `/api/v1/rides?kind=posted&page=1&pageSize=100`
        );
        const rides = unwrap(ridesResponse);
        const d2dRides = rides.filter(
          (ride: any) => ride.isDoorToDoor === true
        );
        const allRequests: DoorToDoorRequest[] = [];
        d2dRides.forEach((ride: any) => {
          if (ride.d2dRequests && Array.isArray(ride.d2dRequests)) {
            allRequests.push(...ride.d2dRequests);
          }
        });
        return allRequests;
      }
    },
    staleTime: 15_000,
    enabled: rideId === undefined ? true : Number.isFinite(rideId),
  });
};

/**
 * Passenger – fetch their D2D requests
 * Uses GET /api/v1/d2d/requests with passengerId query parameter
 */
export const useDoorToDoorPassengerRequests = (passengerId?: number) => {
  return useQuery({
    queryKey: [...doorToDoorKeys.passengerRequests(), passengerId],
    queryFn: async () => {
      if (!passengerId) {
        return [];
      }

      // Use the dedicated D2D requests endpoint with passengerId query param
      const response = await api.get<ApiResponse<DoorToDoorRequest[]>>(
        `${DOOR_TO_DOOR_BASE}/requests?passengerId=${passengerId}`
      );
      const requests = unwrap(response);

      // The API should return requests with ride information included
      // If ride info is not included, we may need to fetch it separately
      return requests || [];
    },
    staleTime: 20_000,
    enabled: !!passengerId && Number.isFinite(passengerId),
  });
};

/**
 * Driver – fetch a single D2D ride by rideId
 * Uses GET /api/v1/d2d/{rideId}
 */
export const useDoorToDoorPassenger = (passengerId?: number) => {
  return useQuery({
    queryKey: [...doorToDoorKeys.passengerRideRequests(), passengerId],
    queryFn: async () => {
      if (!passengerId) {
        return [];
      }

      // Use the dedicated D2D requests endpoint with passengerId query param
      const response = await api.get<ApiResponse<DoorToDoorRequest[]>>(
        `${DOOR_TO_DOOR_BASE}/requests`
      );
      const requests = unwrap(response);

      // The API should return requests with ride information included
      // If ride info is not included, we may need to fetch it separately
      return requests || [];
    },
    staleTime: 20_000,
    enabled: !!passengerId && Number.isFinite(passengerId),
  });
};

/**
 * Driver – update D2D configuration for a ride
 * Uses PATCH /api/v1/d2d/{rideId}
 */
export const useSaveDoorToDoorSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DoorToDoorRide,
    any,
    DoorToDoorSettingsPayload & { rideId: number; existingRide?: any }
  >({
    mutationFn: async (
      payload: DoorToDoorSettingsPayload & {
        rideId: number;
        existingRide?: any;
      }
    ) => {
      // First, fetch the existing ride data if not provided
      let existingRideData = payload.existingRide;
      if (!existingRideData) {
        const rideResponse = await api.get<ApiResponse<any>>(
          `/api/v1/rides/${payload.rideId}`
        );
        existingRideData = unwrap(rideResponse);
      }

      // Extract the ride object if nested
      const ride = existingRideData.ride || existingRideData;

      // Build the complete payload with all required fields
      const driverStartLocation =
        ride.driverStartLocation || ride.departureLocation;
      const driverStopLocation =
        ride.driverStopLocation || ride.destinationLocation;

      // Convert departureTime and estimatedArrivalTime to timestamps
      const departureTime = ride.departureTime
        ? new Date(ride.departureTime).getTime()
        : Date.now() + 3600000; // Default to 1 hour from now if missing

      const estimatedArrivalTime = ride.estimatedArrivalTime
        ? new Date(ride.estimatedArrivalTime).getTime()
        : departureTime + 7200000; // Default to 2 hours after departure

      const updatePayload = {
        driverStartLocation: {
          region: String(driverStartLocation?.region || ""),
          city: String(driverStartLocation?.city || ""),
          locationName: String(
            driverStartLocation?.locationName ||
              driverStartLocation?.address ||
              ""
          ),
          latitude: Number(driverStartLocation?.latitude) || 0,
          longitude: Number(driverStartLocation?.longitude) || 0,
          address: String(driverStartLocation?.address || ""),
          description: String(driverStartLocation?.description || ""),
        },
        driverStopLocation: {
          region: String(driverStopLocation?.region || ""),
          city: String(driverStopLocation?.city || ""),
          locationName: String(
            driverStopLocation?.locationName ||
              driverStopLocation?.address ||
              ""
          ),
          latitude: Number(driverStopLocation?.latitude) || 0,
          longitude: Number(driverStopLocation?.longitude) || 0,
          address: String(driverStopLocation?.address || ""),
          description: String(driverStopLocation?.description || ""),
        },
        departureTime: departureTime,
        estimatedArrivalTime: estimatedArrivalTime,
        availableSeats: Number(payload.capacity || ride.availableSeats) || 1,
        vehicleId: Number(ride.vehicleId),
        contribution: Number(ride.contribution) || 0,
        detourRadius: Number(payload.radiusKm || ride.detourRadius) || 5,
        extraKmPrice: Number(ride.extraKmPrice) || 0,
        preferences: {
          smoking: Boolean(ride.preferences?.smoking ?? false),
          pets: Boolean(ride.preferences?.pets ?? false),
          airConditioning: Boolean(ride.preferences?.airConditioning ?? false),
          ladiesOnly: Boolean(ride.preferences?.ladiesOnly ?? false),
          gentsOnly: Boolean(ride.preferences?.gentsOnly ?? false),
          bicycleSupport: Boolean(ride.preferences?.bicycleSupport ?? false),
          snowTires: Boolean(ride.preferences?.snowTires ?? false),
          luggageSize: String(ride.preferences?.luggageSize || "NONE"),
          luggageCount: Number(ride.preferences?.luggageCount ?? 0),
          music: String(ride.preferences?.music || "NONE"),
          additionalNotes: String(ride.preferences?.additionalNotes || ""),
        },
      };

      const response = await api.patch<ApiResponse<DoorToDoorRide>>(
        `${DOOR_TO_DOOR_BASE}/${payload.rideId}`,
        updatePayload
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      toast.success("Door-to-door settings saved", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.driverRides(),
      });
      if (data?.rideId) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRequests(data.rideId),
        });
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to save door-to-door settings",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Driver – Publish D2D ride
 * Uses PATCH /api/v1/d2d/{rideId}/publish
 */
export const usePublishDoorToDoorRide = () => {
  const queryClient = useQueryClient();

  return useMutation<DoorToDoorRide, any, { rideId: number }>({
    mutationFn: async ({ rideId }: { rideId: number }) => {
      const response = await api.patch<ApiResponse<DoorToDoorRide>>(
        `${DOOR_TO_DOOR_BASE}/${rideId}/publish`
      );
      return unwrap(response);
    },
    onSuccess: (data) => {
      toast.success("Door-to-door ride published successfully", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.driverRides(),
      });
      if (data?.rideId) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRequests(data.rideId),
        });
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to publish door-to-door ride",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Driver – accept D2D request
 * Uses PATCH /api/v1/d2d/{requestId}/accept
 * Supports optional note field per API docs
 */
export const useAcceptDoorToDoorRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DoorToDoorRequest,
    any,
    { requestId: number; rideId?: number; note?: string }
  >({
    mutationFn: async ({
      requestId,
      note,
    }: {
      requestId: number;
      note?: string;
    }) => {
      const response = await api.patch<ApiResponse<DoorToDoorRequest>>(
        `${DOOR_TO_DOOR_BASE}/${requestId}/accept`,
        note ? { note } : undefined
      );
      return unwrap(response);
    },
    onSuccess: (data, variables) => {
      toast.success("Door-to-door request accepted", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.driverRides(),
      });
      const rideId = data?.rideId ?? variables?.rideId;
      if (rideId) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRequests(rideId),
        });
      }
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.request(data.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.passengerRequests(),
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to accept door-to-door request",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Driver – decline D2D request
 * Uses PATCH /api/v1/d2d/{requestId}/decline
 */
export const useDeclineDoorToDoorRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DoorToDoorRequest,
    any,
    { requestId: number; message?: string; rideId?: number }
  >({
    mutationFn: async ({
      requestId,
      message,
    }: {
      requestId: number;
      message?: string;
    }) => {
      const response = await api.patch<ApiResponse<DoorToDoorRequest>>(
        `${DOOR_TO_DOOR_BASE}/${requestId}/decline`,
        message ? { reason: message } : { reason: "" }
      );
      return unwrap(response);
    },
    onSuccess: (data, variables) => {
      toast.success("Door-to-door request declined", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.driverRides(),
      });
      const rideId = data?.rideId ?? variables?.rideId;
      if (rideId) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRequests(rideId),
        });
      }
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.request(data.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.passengerRequests(),
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to decline door-to-door request",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Passenger – submit D2D request
 * Uses POST /api/v1/d2d/{rideId}/request
 */
export const useCreateDoorToDoorPassengerRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DoorToDoorRequest,
    any,
    {
      rideId: number;
      pickup: DoorToDoorRequest["pickup"];
      dropoff: DoorToDoorRequest["dropoff"];
      note?: string;
    }
  >({
    mutationFn: async (payload: {
      rideId: number;
      pickup: DoorToDoorRequest["pickup"];
      dropoff: DoorToDoorRequest["dropoff"];
      note?: string;
    }) => {
      const { rideId, ...requestBody } = payload;
      console.log(requestBody);
      const response = await api.post<ApiResponse<DoorToDoorRequest>>(
        `${DOOR_TO_DOOR_BASE}/${rideId}/request`,
        requestBody
      );
      return unwrap(response);
    },
    onSuccess: (data, variables) => {
      toast.success("Door-to-door request submitted", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.passengerRequests(),
      });
      const rideId = data?.rideId ?? variables.rideId;
      if (rideId) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRequests(rideId),
        });
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRides(),
        });
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to submit door-to-door request",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Passenger – cancel their D2D request
 * Uses PATCH /api/v1/d2d/{requestId}/cancel
 */
export const useCancelDoorToDoorPassengerRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DoorToDoorRequest,
    any,
    { requestId: number; reason?: string; rideId?: number }
  >({
    mutationFn: async ({
      requestId,
      reason,
      rideId,
    }: {
      requestId: number;
      reason?: string;
      rideId?: number;
    }) => {
      // API requires reason field in body (required: true per docs)
      const response = await api.patch<ApiResponse<DoorToDoorRequest>>(
        `${DOOR_TO_DOOR_BASE}/${requestId}/cancel`,
        { reason: reason || "" }
      );
      return unwrap(response);
    },
    onSuccess: (data, variables) => {
      toast.success("Door-to-door request canceled", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.passengerRequests(),
      });
      const rideId = data?.rideId ?? variables?.rideId;
      if (rideId) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRequests(rideId),
        });
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRides(),
        });
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to cancel door-to-door request",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Driver – Start D2D ride
 * Uses PATCH /api/v1/d2d/{requestId}/start
 */
export const useStartDoorToDoorRide = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DoorToDoorRequest,
    any,
    { requestId: number; rideId?: number }
  >({
    mutationFn: async ({ requestId }: { requestId: number }) => {
      const response = await api.patch<ApiResponse<DoorToDoorRequest>>(
        `${DOOR_TO_DOOR_BASE}/${requestId}/start`
      );
      return unwrap(response);
    },
    onSuccess: (data, variables) => {
      toast.success("Door-to-door ride started", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.driverRides(),
      });
      const rideId = data?.rideId ?? variables?.rideId;
      if (rideId) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRequests(rideId),
        });
      }
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.request(data.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.passengerRequests(),
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to start door-to-door ride",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Driver – Complete D2D ride
 * Uses PATCH /api/v1/d2d/{requestId}/complete
 */
export const useCompleteDoorToDoorRide = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DoorToDoorRequest,
    any,
    { requestId: number; rideId?: number }
  >({
    mutationFn: async ({ requestId }: { requestId: number }) => {
      const response = await api.patch<ApiResponse<DoorToDoorRequest>>(
        `${DOOR_TO_DOOR_BASE}/${requestId}/complete`
      );
      return unwrap(response);
    },
    onSuccess: (data, variables) => {
      toast.success("Door-to-door ride completed", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.driverRides(),
      });
      const rideId = data?.rideId ?? variables?.rideId;
      if (rideId) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.driverRequests(rideId),
        });
      }
      if (data?.id) {
        queryClient.invalidateQueries({
          queryKey: doorToDoorKeys.request(data.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.passengerRequests(),
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Failed to complete door-to-door ride",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Fetch a single D2D request
 */
export const useDoorToDoorRequest = (requestId?: number) => {
  return useQuery({
    queryKey: doorToDoorKeys.request(requestId ?? "unknown"),
    queryFn: async () => {
      if (!requestId) {
        return null;
      }
      const response = await api.get<ApiResponse<DoorToDoorRequest>>(
        `${DOOR_TO_DOOR_BASE}/requests/${requestId}`
      );
      return unwrap(response);
    },
    enabled: Number.isFinite(requestId),
  });
};

/**
 * Driver – Delete D2D ride
 * Uses DELETE /api/v1/rides/{rideId}
 */
export const useDeleteDoorToDoorRide = () => {
  const queryClient = useQueryClient();

  return useMutation<void, any, { rideId: number }>({
    mutationFn: async ({ rideId }: { rideId: number }) => {
      await api.delete(`/api/v1/rides/${rideId}`);
    },
    onSuccess: () => {
      toast.success("Door-to-door ride deleted successfully", {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.driverRides(),
      });
      queryClient.invalidateQueries({
        queryKey: doorToDoorKeys.all,
      });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to delete door-to-door ride",
        { className: "custom-error-toast" }
      );
    },
  });
};

/**
 * Admin – Get D2D settings
 * Uses GET /api/v1/admin/settings/d2d
 */
export const useAdminD2DSettings = () => {
  return useQuery({
    queryKey: [...doorToDoorKeys.all, "admin-settings"],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any>>(
        `/api/v1/admin/settings/d2d`
      );
      return unwrap(response);
    },
    staleTime: 30_000,
  });
};

/**
 * Admin – Update D2D settings
 * Uses PUT /api/v1/admin/settings/d2d
 */
export const useUpdateAdminD2DSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: any) => {
      const response = await api.put<ApiResponse<any>>(
        `/api/v1/admin/settings/d2d`,
        settings
      );
      return unwrap(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...doorToDoorKeys.all, "admin-settings"],
      });
      queryClient.invalidateQueries({
        queryKey: [...doorToDoorKeys.all, "admin-statistics"],
      });
    },
  });
};

/**
 * Admin – Get D2D statistics
 * Fetches all D2D rides and requests to calculate statistics
 */
export const useAdminD2DStatistics = () => {
  return useQuery({
    queryKey: [...doorToDoorKeys.all, "admin-statistics"],
    queryFn: async () => {
      try {
        // Fetch all rides (we'll filter for D2D on the client side)
        // Try with type filter first, if not supported, fetch all and filter
        let rides: any[] = [];
        let pagination: any = null;
        
        try {
          // Try fetching with type filter
          const firstPage = await api.get<any>(
            `/api/v1/rides?page=1&pageSize=100`
          );
          
          // Handle different response structures
          const responseData = firstPage.data?.data || firstPage.data || [];
          rides = Array.isArray(responseData) ? responseData : [];
          pagination = firstPage.data?.pagination || firstPage.pagination;
          
          // If pagination exists and there are more pages, fetch them
          if (pagination && pagination.totalPages > 1) {
            const pageNumbers = Array.from(
              { length: Math.min(pagination.totalPages - 1, 10) }, // Limit to 10 pages to avoid too many requests
              (_, i) => i + 2
            );
            
            const additionalPages = await Promise.all(
              pageNumbers.map((page) =>
                api.get<any>(`/api/v1/rides?page=${page}&pageSize=100`)
              )
            );
            
            const additionalRides = additionalPages.flatMap((res) => {
              const data = res.data?.data || res.data || [];
              return Array.isArray(data) ? data : [];
            });
            
            rides = [...rides, ...additionalRides];
          }
        } catch (fetchError) {
          console.warn("Error fetching rides for D2D stats:", fetchError);
        }
        
        // Filter D2D rides (type === "D2D" or isDoorToDoor === true)
        const d2dRides = rides.filter(
          (ride: any) => ride.type === "D2D" || ride.isDoorToDoor === true
        );
        
        // Calculate statistics
        const totalD2DRides = d2dRides.length;
        const activeD2DRides = d2dRides.filter(
          (ride: any) => ride.status === "PUBLISHED"
        ).length;
        
        // Get all D2D requests from rides
        const allRequests = d2dRides.flatMap(
          (ride: any) => ride.d2dRequests || ride.d2d_requests || ride.requests || []
        );
        
        const totalD2DRequests = allRequests.length;
        const pendingRequests = allRequests.filter(
          (req: any) => 
            req.status === "PENDING" || 
            req.status === "WAITING" ||
            req.status === "REQUESTED"
        ).length;
        
        return {
          totalRides: totalD2DRides,
          totalRequests: totalD2DRequests,
          activeRides: activeD2DRides,
          pendingRequests: pendingRequests,
          rides: d2dRides,
          requests: allRequests,
        };
      } catch (error) {
        console.error("Error fetching D2D statistics:", error);
        // Return default values on error
        return {
          totalRides: 0,
          totalRequests: 0,
          activeRides: 0,
          pendingRequests: 0,
          rides: [],
          requests: [],
        };
      }
    },
    staleTime: 30_000, // 30 seconds
  });
};
