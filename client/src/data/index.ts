import { getToken, userRole } from "@/components/getToken";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";

export const apiUrl = import.meta.env.VITE_API_URL;

/**
 * Query keys
 */
export const queryKey = {
  VEHICLES: "vehicles",
  VEHICLE: "vehicle",
  PREFERENCE: "preference",
  USER: "user",
  ONBOARDING: "onboarding",
  RIDES: "rides",
  NOTIFICATIONS: "notifications",
  TRANSACTIONS: "transactions",
  TRANSACTION: "transaction",
  SINGLE_RIDE: "singleRide",
  SINGLE_PASSENGER_RIDE: "singlePassengerRide",
  BOOKINGS: "bookings",
  SINGLE_BOOK: "singleBook",
  PUBLIC_RIDE: "public_ride",
  CARDS: "cards",
  DEFAULT: "default",
  PASSENGER_REVIEWS: "passengerReviews",
  TAX_RATES: "taxRates",
  BOOKINGS_FOR_STATS: "bookingsForStats",
  DOOR_TO_DOOR_RIDES: "doorToDoorRides",
  DOOR_TO_DOOR_REQUESTS: "doorToDoorRequests",
  DOOR_TO_DOOR_PASSENGER_REQUESTS: "doorToDoorPassengerRequests",
  DOOR_TO_DOOR_REQUEST: "doorToDoorRequest",
  RIDE_REQUESTS: "rideRequests",
  RIDE_REQUEST: "rideRequest",
  RENTALS: "rentals",
  RENTAL: "rental",
  AVAILABLE_RENTALS: "availableRentals",
  CHAUFFEUR_SERVICES: "chauffeurServices",
  CHAUFFEUR_SERVICE: "chauffeurService",
  AVAILABLE_DRIVERS: "availableDrivers",
  RENTAL_SETTINGS: "rentalSettings",
  CHAUFFEUR_SETTINGS: "chauffeurSettings",
};

/**
 * All vehicles
 */
export function useAllVehicles() {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  try {
    return useQuery({
      queryKey: [queryKey.VEHICLES],
      queryFn: async () => {
        const { data } = await axios.get(
          `${apiUrl}/api/v1/vehicles?lang=${currentLanguage}&page=1&pageSize=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return data.data;
      },
    });
  } catch (error) {
    console.log(error);
  }
}

/**
 * Single vehicle
 */
export function useSingleVehicle({
  id,
  enable,
}: {
  id: string;
  enable: boolean;
}) {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.VEHICLE, id],
    queryFn: async () => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/vehicles/${id}?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data.data;
    },
    enabled: !!id && enable,
  });
}

/**
 * User preference
 */
export function useUserPreference() {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.PREFERENCE, token],
    queryFn: async () => {
      if (!token) {
        throw new Error("No authentication token available");
      }

      const { data } = await axios.get(
        `${apiUrl}/api/v1/users/onboarding/status?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data.data;
    },
    enabled: !!token,
    retry: false, // Don't retry on auth errors
    throwOnError: false, // Don't throw errors, let React Query handle them
  });
}

/**
 * User data
 */
export function useSingleUser({
  userId,
  enabled,
}: {
  userId: string;
  enabled: boolean;
}) {
  const token = getToken();

  return useQuery({
    queryKey: [queryKey.USER, token],
    queryFn: async () => {
      const { data } = await axios.get(`${apiUrl}/api/v1/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return data.data;
    },
    enabled: !!token && enabled,
  });
}

/**
 * All rides
 */
export function useAllRidesInfinite(
  pageSize: number,
  filters: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    sort?: string;
    departureCity?: string;
    destinationCity?: string;
    status?: string;
    rideType?: string; // D2D or P2P
    minContribution?: number;
    maxContribution?: number;
    departureTime?: string;
    kind: string;
  }
) {
  const token = getToken();

  return useInfiniteQuery({
    queryKey: [queryKey.RIDES, token, filters],
    initialPageParam: 1, // ✅ Required in React Query v5+
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        pageSize: (filters.pageSize ?? pageSize).toString(),
        ...(filters.orderBy && { orderBy: filters.orderBy }),
        ...(filters.sort && { sort: filters.sort }),
        ...(filters.departureCity && { departureCity: filters.departureCity }),
        ...(filters.destinationCity && {
          destinationCity: filters.destinationCity,
        }),
        ...(filters.status && { status: filters.status }),
        ...(filters.rideType && { type: filters.rideType }),
        ...(filters.minContribution !== undefined && {
          minContribution: filters.minContribution.toString(),
        }),
        ...(filters.maxContribution !== undefined && {
          maxContribution: filters.maxContribution.toString(),
        }),
        ...(filters.departureTime && { departureTime: filters.departureTime }),
        kind: filters.kind,
      });
      const { data } = await axios.get(
        `${apiUrl}/api/v1/rides?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.pagination.totalPages ? nextPage : undefined;
    },
  });
}

/**
 * All public rides
 */
export function useAllPublicRidesInfinite(filters: {
  departureCity?: string;
  destinationCity?: string;
  minContribution?: string;
  maxContribution?: string;
  departureTime?: string;
  userLatitude?: string;
  userLongitude?: string;
  radiusKm?: number;
  sort?: string;
  orderBy?: string;
}) {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useInfiniteQuery({
    queryKey: [queryKey.RIDES, token, filters],
    initialPageParam: 1, // ✅ Required in React Query v5+
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(filters.departureCity && { departureCity: filters.departureCity }),
        ...(filters.destinationCity && {
          destinationCity: filters.destinationCity,
        }),
        ...(filters.minContribution && {
          minContribution: filters.minContribution,
        }),
        ...(filters.maxContribution && {
          maxContribution: filters.maxContribution,
        }),
        ...(filters.departureTime && { departureTime: filters.departureTime }),
        ...(filters.userLatitude && { userLatitude: filters.userLatitude }),
        ...(filters.userLongitude && { userLongitude: filters.userLongitude }),
        ...((filters.radiusKm && { radiusKm: filters.radiusKm }) as any),
        ...(filters.sort && { sort: filters.sort }),
        ...(filters.orderBy && { orderBy: filters.orderBy }),
        lang: currentLanguage,
      });

      const { data } = await axios.get(
        `${apiUrl}/api/v1/public/rides/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.pagination.totalPages ? nextPage : undefined;
    },
  });
}

/**
 * Methods
 */
export async function getMakes() {
  try {
    const res = await fetch(
      "https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json"
    );
    const data = await res.json();
  } catch (err) {
    console.error("Failed to fetch vehicle makes:", err);
  }
}

/**
 * All notifications
 */
export function useAllNotification(pageSize: number) {
  const token = getToken();

  return useInfiniteQuery({
    queryKey: [queryKey.NOTIFICATIONS, token],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/notifications?page=${pageParam}&pageSize=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.pagination.totalPages ? nextPage : undefined;
    },
  });
}

export function useAllTransactions({
  page = 1,
  pageSize = 10,
  status,
  type,
  paymentProvider,
  minAmount,
  maxAmount,
  startDate,
  endDate,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  paymentProvider?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  // Build query parameters
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    lang: currentLanguage,
  });

  if (status) params.append("status", status);
  if (type) params.append("type", type);
  if (paymentProvider) params.append("paymentProvider", paymentProvider);
  if (minAmount !== undefined) params.append("minAmount", minAmount.toString());
  if (maxAmount !== undefined) params.append("maxAmount", maxAmount.toString());
  if (startDate) params.append("startDate", startDate.toISOString());
  if (endDate) params.append("endDate", endDate.toISOString());

  return useQuery({
    queryKey: [
      queryKey.TRANSACTIONS,
      page,
      pageSize,
      status,
      type,
      paymentProvider,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      token,
    ],
    queryFn: async () => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/transactions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    enabled: !!token,
  });
}

/**
 * All transactions
 */
export function useAllTransactionsPaginated(
  page: number,
  pageSize: number,
  filters: {
    status?: string;
    type?: string;
    paymentProvider?: string;
    minAmount?: number;
    maxAmount?: number;
  } = {}
) {
  const token = getToken();

  return useQuery({
    queryKey: [queryKey.TRANSACTIONS, token, filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.paymentProvider && {
          paymentProvider: filters.paymentProvider,
        }),
        ...(filters.minAmount && { minAmount: filters.minAmount.toString() }),
        ...(filters.maxAmount && { maxAmount: filters.maxAmount.toString() }),
      });

      const { data } = await axios.get(
        `${apiUrl}/api/v1/transactions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return data;
    },
  });
}
/**
 * Get single ride
 */
export function useSingleRide({
  rideId,
  enabled,
}: {
  rideId: number;
  enabled: boolean;
}) {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.SINGLE_RIDE, rideId, token],
    queryFn: async () => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/rides/${rideId}?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data.data;
    },
    enabled: !!token && enabled,
  });
}

// /**
//  * Get single ride
//  */
export function usePassengerRide({
  rideId,
  enabled,
}: {
  rideId: number;
  enabled: boolean;
}) {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.SINGLE_PASSENGER_RIDE, rideId],
    queryFn: async () => {
      try {
        const { data } = await axios.get(
          `${apiUrl}/api/v1/public/rides/${rideId}?lang=${currentLanguage}`
        );
        if (!data || !data.data) {
          throw new Error("Invalid response structure from API");
        }
        return data.data;
      } catch (error) {
        console.error("Error fetching ride:", error);
        throw error;
      }
    },
    enabled: enabled,
    retry: 1,
  });
}

/**
 * Get single booked ride
 */
export function usePassengerBookedRide({
  rideId,
  enabled,
}: {
  rideId: number;
  enabled: boolean;
}) {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.SINGLE_PASSENGER_RIDE, rideId],
    queryFn: async () => {
      try {
        const { data } = await axios.get(
          `${apiUrl}/api/v1/rides/${rideId}?lang=${currentLanguage}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );

        return data.data;
      } catch (error: any) {
        // Handle 404 gracefully - booking might not be ready yet or ride might not exist
        if (error?.response?.status === 404) {
          console.warn("Ride not found, booking may still be processing");
          return null;
        }
        throw error;
      }
    },
    enabled: enabled,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors - booking might not be ready yet
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * All bookings
 */
export function useAllBookingInfinite(
  pageSize: number,
  filters: {
    status?: string;
    bookingRelation?: string;
  } = {}
) {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useInfiniteQuery({
    queryKey: [queryKey.BOOKINGS, token, filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        pageSize: pageSize.toString(),
        ...(filters.status && { status: filters.status }),
        bookingRelation: filters.bookingRelation,
        lang: currentLanguage,
      });

      const { data } = await axios.get(
        `${apiUrl}/api/v1/bookings?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.pagination.totalPages ? nextPage : undefined;
    },
  });
}

export function useAllBookings(
  page: number,
  pageSize: number,
  filters: { status?: string; bookingRelation?: string } = {}
) {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  // console.log("Fetching bookings with filters:", filters);

  return useQuery({
    queryKey: [queryKey.BOOKINGS, page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.bookingRelation && {
          bookingRelation: filters.bookingRelation,
        }),
        lang: currentLanguage,
      });

      const { data } = await axios.get(
        `${apiUrl}/api/v1/bookings?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return data;
    },
  });
}

/**
 * Get single ride
 */
export function useSingleBook({
  rideId,
  enabled,
}: {
  rideId: number;
  enabled: boolean;
}) {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.SINGLE_BOOK, rideId],
    queryFn: async () => {
      try {
        const { data } = await axios.get(
          `${apiUrl}/api/v1/bookings/${rideId}?lang=${currentLanguage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return data.data;
      } catch (error: any) {
        // Handle 404 gracefully - booking might not exist
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!token && enabled,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * All transactions
 */
export function useAllPublicRides(
  filters: {
    status?: string;
    type?: string;
    paymentProvider?: string;
    minAmount?: number;
    maxAmount?: number;
    minContribution?: any;
    maxContribution?: any;
    doorToDoor?: boolean;

    departureCity?: string;
    destinationCity?: string;
    departureTime?: string;
    userLatitude?: number | null;
    userLongitude?: number | null;
    radiusKm?: number;

    preferences?: {
      smoking?: boolean;
      pets?: boolean;
      airConditioning?: boolean;
      ladiesOnly?: boolean;
      gentsOnly?: boolean;
      bicycleSupport?: boolean;
      snowTires?: boolean;
      luggageSize?: string;
      luggageCount?: number;
    };
  } = {}
) {
  const token = getToken();

  return useInfiniteQuery({
    queryKey: [queryKey.PUBLIC_RIDE, token, filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        // pageSize: pageSize.toString(),
        includeZeroSeats: "true",

        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.paymentProvider && {
          paymentProvider: filters.paymentProvider,
        }),
        ...(filters.minAmount !== undefined && {
          minAmount: filters.minAmount.toString(),
        }),
        ...(filters.maxAmount !== undefined && {
          maxAmount: filters.maxAmount.toString(),
        }),

        ...(filters.minContribution !== undefined && {
          minContribution: filters.minContribution.toString(),
        }),
        ...(filters.maxContribution !== undefined && {
          maxContribution: filters.maxContribution.toString(),
        }),

        ...(filters.departureCity && { departureCity: filters.departureCity }),
        ...(filters.destinationCity && {
          destinationCity: filters.destinationCity,
        }),
        ...(filters.departureTime && { departureTime: filters.departureTime }),
        ...(filters.userLatitude !== null &&
          filters.userLatitude !== undefined && {
            userLatitude: filters.userLatitude.toString(),
          }),
        ...(filters.userLongitude !== null &&
          filters.userLongitude !== undefined && {
            userLongitude: filters.userLongitude.toString(),
          }),
        ...(filters.radiusKm !== undefined && {
          radiusKm: filters.radiusKm.toString(),
        }),

        ...(filters.preferences?.smoking && { smoking: "true" }),
        ...(filters.preferences?.pets && { pets: "true" }),
        ...(filters.preferences?.airConditioning && {
          airConditioning: "true",
        }),
        ...(filters.preferences?.ladiesOnly && { ladiesOnly: "true" }),
        ...(filters.preferences?.gentsOnly && { gentsOnly: "true" }),
        ...(filters.preferences?.bicycleSupport && { bicycleSupport: "true" }),
        ...(filters.preferences?.snowTires && { snowTires: "true" }),
        ...(filters.preferences?.luggageSize && {
          luggageSize: filters.preferences.luggageSize,
        }),
        ...(filters.preferences?.luggageCount !== undefined &&
          filters.preferences.luggageCount !== 0 && {
            luggageCount: filters.preferences.luggageCount.toString(),
          }),
        ...(filters.doorToDoor && { isDoorToDoor: "true" }),
      });

      const { data } = await axios.get(
        `${apiUrl}/api/v1/public/rides/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || !lastPage.pagination || !lastPage.pagination.totalPages) {
        return undefined;
      }
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.pagination.totalPages ? nextPage : undefined;
    },
  });
}

/**
 * Fetch all cards
 */
export function useAllCards() {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.CARDS, token],
    queryFn: async () => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/cards?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data.data;
    },
  });
}

/**
 * Default card
 */
export function useUserDefaultCard() {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.DEFAULT, token],
    queryFn: async () => {
      try {
        const { data } = await axios.get(
          `${apiUrl}/api/v1/cards/default?lang=${currentLanguage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return data.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          // No default card on file — fetch list and pick default/first
          try {
            const { data } = await axios.get(
              `${apiUrl}/api/v1/cards?lang=${currentLanguage}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            const list = data?.data || [];
            const def = list.find((c: any) => c?.isDefault) || list[0] || null;
            return def;
          } catch (_) {
            return null;
          }
        }
        throw err;
      }
    },
  });
}

/**
 * Single transaction by ID
 */
export function useSingleTransaction({
  transactionId,
  enabled = true,
}: {
  transactionId: number | string;
  enabled?: boolean;
}) {
  const token = getToken();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.TRANSACTION, transactionId, token],
    queryFn: async () => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/transactions/${transactionId}?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data.data;
    },
    enabled: !!token && !!transactionId && enabled,
  });
}

/**
 * Fetch all reviews for a driver
 */
// use infinite query to fetch all reviews for a passenger
export function usePassengerReviewsInfinite(
  driverId: string,
  pageSize?: number,
  options?: { enabled?: boolean }
) {
  const token = getToken();

  return useInfiniteQuery({
    queryKey: [queryKey.PASSENGER_REVIEWS, driverId, token],
    initialPageParam: 1,
    enabled: options?.enabled !== false && !!driverId && driverId !== "",
    queryFn: async ({ pageParam }) => {
      if (!driverId || driverId === "") {
        throw new Error("Driver ID is required");
      }
      const response = await axios.get(
        `${apiUrl}/api/v1/ratings/drivers/${driverId}?page=${pageParam}&limit=${
          pageSize || 10
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= lastPage.pagination.totalPages ? nextPage : undefined;
    },
  });
}

/**
 * Get all users for admin dashboard statistics
 */
export function useAllUsersForStats(year?: number) {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: ["users", "stats", token, year],
    queryFn: async () => {
      try {
        // Use larger pageSize to fetch more data per request
        const pageSize = 500;
        // Try admin endpoint first
        try {
          const adminFirst = await axios.get(
            `${apiUrl}/api/v1/admin/users?page=1&limit=${pageSize}&lang=${currentLanguage}&sortBy=createdAt&sortOrder=desc`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          // Handle different response structures from admin endpoint
          let adminData: any[] = [];
          let adminTotal = 0;
          let adminTotalPages = 1;

          // Check various possible response structures
          if (adminFirst.data?.data?.users) {
            // Structure: { data: { users: [], total: ..., page: ..., limit: ..., totalPages: ... } }
            adminData = adminFirst.data.data.users;
            adminTotal =
              adminFirst.data.data.total || adminFirst.data.data.users.length;
            adminTotalPages =
              adminFirst.data.data.totalPages || Math.ceil(adminTotal / 100);
          } else if (adminFirst.data?.users) {
            // Structure: { users: [], total: ..., page: ..., limit: ..., totalPages: ... }
            adminData = adminFirst.data.users;
            adminTotal = adminFirst.data.total || adminFirst.data.users.length;
            adminTotalPages =
              adminFirst.data.totalPages || Math.ceil(adminTotal / 100);
          } else if (Array.isArray(adminFirst.data?.data)) {
            // Structure: { data: [], pagination: { total: ..., totalPages: ... } }
            adminData = adminFirst.data.data;
            adminTotal = adminFirst.data.pagination?.total || adminData.length;
            adminTotalPages =
              adminFirst.data.pagination?.totalPages ||
              Math.ceil(adminTotal / 100);
          } else if (Array.isArray(adminFirst.data)) {
            // Direct array response
            adminData = adminFirst.data;
            adminTotal = adminData.length;
            adminTotalPages = 1;
          }

          const adminPagination = {
            page: 1,
            pageSize: 100,
            total: adminTotal,
            totalPages: Math.max(1, adminTotalPages),
          };

          if (adminTotalPages === 1) {
            return { data: adminData, pagination: adminPagination };
          }

          // Fetch remaining pages
          const adminPageNumbers = Array.from(
            { length: Math.min(adminTotalPages - 1, 50) }, // Limit to 50 pages max
            (_, i) => i + 2
          );
          const adminResults = await Promise.all(
            adminPageNumbers.map((p) =>
              axios.get(
                `${apiUrl}/api/v1/admin/users?page=${p}&limit=100&lang=${currentLanguage}`,
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );

          // Extract data from all pages
          const adminRest = adminResults.flatMap((r) => {
            if (r.data?.data?.users) return r.data.data.users;
            if (r.data?.users) return r.data.users;
            if (Array.isArray(r.data?.data)) return r.data.data;
            if (Array.isArray(r.data)) return r.data;
            return [];
          });

          return {
            data: [...adminData, ...adminRest],
            pagination: { ...adminPagination, total: adminTotal },
          };
        } catch (adminError: any) {
          // Fallback to regular users endpoint
          if (
            adminError.response?.status === 404 ||
            adminError.response?.status === 403
          ) {
            console.warn(
              "Admin users endpoint not available, falling back to regular users endpoint"
            );
          } else {
            throw adminError;
          }
        }

        // Fetch first page to discover total pages with larger pageSize
        const first = await axios.get(
          `${apiUrl}/api/v1/users?page=1&pageSize=${pageSize}&lang=${currentLanguage}&sortBy=createdAt&order=desc`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const firstData = first.data?.data || [];
        const pagination = first.data?.pagination || {
          page: 1,
          pageSize: firstData.length,
          total: firstData.length,
          totalPages: 1,
        };
        const totalPages = Math.max(1, Number(pagination.totalPages || 1));

        if (totalPages === 1) {
          return { data: firstData, pagination };
        }

        // Fetch remaining pages and merge
        const pageNumbers = Array.from(
          { length: totalPages - 1 },
          (_, i) => i + 2
        );
        try {
          const results = await Promise.all(
            pageNumbers.map((p) =>
              axios.get(
                `${apiUrl}/api/v1/users?page=${p}&pageSize=100&lang=${currentLanguage}`,
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );
          const rest = results.flatMap((r) => r.data?.data || []);
          return { data: [...firstData, ...rest], pagination };
        } catch (mergeErr) {
          // Fallback: use latest page rather than first
          try {
            const last = await axios.get(
              `${apiUrl}/api/v1/users?page=${totalPages}&pageSize=${pageSize}&lang=${currentLanguage}&sortBy=createdAt&order=desc`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return {
              data: last.data?.data || [],
              pagination: last.data?.pagination || pagination,
            };
          } catch (_) {
            return { data: firstData, pagination };
          }
        }
      } catch (error) {
        console.error("Error fetching users for stats:", error);
        // Return empty data instead of throwing to prevent UI crashes
        return {
          data: [],
          pagination: { page: 1, pageSize: 0, total: 0, totalPages: 1 },
        };
      }
    },
    enabled: !!token,
  });
}

/**
 * Get all rides for admin dashboard statistics
 */
export function useAllRidesForStats(year?: number) {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: ["rides", "stats", token, year],
    queryFn: async () => {
      try {
        const first = await axios.get(
          `${apiUrl}/api/v1/rides?page=1&pageSize=100&lang=${currentLanguage}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const firstData = first.data?.data || [];
        const pagination = first.data?.pagination || {
          page: 1,
          pageSize: firstData.length,
          total: firstData.length,
          totalPages: 1,
        };
        const totalPages = Math.max(1, Number(pagination.totalPages || 1));

        if (totalPages === 1) {
          return { data: firstData, pagination };
        }

        const pageNumbers = Array.from(
          { length: totalPages - 1 },
          (_, i) => i + 2
        );
        try {
          const results = await Promise.all(
            pageNumbers.map((p) =>
              axios.get(
                `${apiUrl}/api/v1/rides?page=${p}&pageSize=100&lang=${currentLanguage}`,
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );
          const rest = results.flatMap((r) => r.data?.data || []);
          return { data: [...firstData, ...rest], pagination };
        } catch (mergeErr) {
          try {
            const last = await axios.get(
              `${apiUrl}/api/v1/rides?page=${totalPages}&pageSize=100&lang=${currentLanguage}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return {
              data: last.data?.data || [],
              pagination: last.data?.pagination || pagination,
            };
          } catch (_) {
            return { data: firstData, pagination };
          }
        }
      } catch (error) {
        console.error("Error fetching rides for stats:", error);
        throw error;
      }
    },
    enabled: !!token,
  });
}

export function useAllVehiclesForStats() {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: ["vehicles", "stats", token],
    queryFn: async () => {
      // we need to use pagination to get to the last page and count all vehicles
      const first = await axios.get(
        `${apiUrl}/api/v1/vehicles?page=1&pageSize=100&lang=${currentLanguage}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const firstData = first.data?.data || [];
      const pagination = first.data?.pagination || {
        page: 1,
        pageSize: firstData.length,
        total: firstData.length,
        totalPages: 1,
      };
      const totalPages = Math.max(1, Number(pagination.totalPages || 1));

      if (totalPages === 1) {
        return { data: firstData, pagination };
      }

      const pageNumbers = Array.from(
        { length: totalPages - 1 },
        (_, i) => i + 2
      );
      const results = await Promise.all(
        pageNumbers.map((p) =>
          axios.get(
            `${apiUrl}/api/v1/vehicles?page=${p}&pageSize=100&lang=${currentLanguage}&sortBy=createdAt&order=desc`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );
      const rest = results.flatMap((r) => r.data?.data || []);
      return { data: [...firstData, ...rest], pagination };
    },
  });
}

export function useAllBookingsForStats() {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: ["bookings", "stats", token],
    queryFn: async () => {
      try {
        // in order to get real stats we need to get paginations for this and we go on the last page and we count
        const { data } = await axios.get(
          `${apiUrl}/api/v1/bookings?page=1&pageSize=100&lang=${currentLanguage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const totalPages = data.pagination.totalPages;
        const pageNumbers = Array.from(
          { length: totalPages - 1 },
          (_, i) => i + 2
        );
        const results = await Promise.all(
          pageNumbers.map((p) =>
            axios.get(
              `${apiUrl}/api/v1/bookings?page=${p}&pageSize=100&lang=${currentLanguage}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
          )
        );
        const rest = results.flatMap((r) => r.data?.data || []);
        const allData = [...data.data, ...rest];
        return allData;
      } catch (error) {
        console.error("Error fetching bookings for stats:", error);
        throw error;
      }
    },
    enabled: !!token,
  });
}

/**
 * Get user coupons
 */
export function useUserCoupons() {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: ["coupons", token],
    queryFn: async () => {
      try {
        const { data } = await axios.get(
          `${apiUrl}/api/v1/coupons?lang=${currentLanguage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return data;
      } catch (error) {
        console.error("Error fetching user coupons:", error);
        throw error;
      }
    },
    enabled: !!token,
  });
}

/**
 * Apply coupon to booking
 */
export function useApplyCoupon() {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rideId,
      couponCode,
    }: {
      rideId: number;
      couponCode: string;
    }) => {
      try {
        const { data } = await axios.post(
          `${apiUrl}/api/v1/rides/${rideId}/apply-coupon?lang=${currentLanguage}`,
          { couponCode },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return data;
      } catch (error) {
        console.error("Error applying coupon:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    },
  });
}

/**
 * Complete passenger onboarding
 */
export function useCompletePassengerOnboarding() {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (onboardingData: any) => {
      try {
        const { data } = await axios.post(
          `${apiUrl}/api/v1/users/onboarding/passenger?lang=${currentLanguage}`,
          onboardingData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return data;
      } catch (error) {
        console.error("Error completing passenger onboarding:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.ONBOARDING] });
      queryClient.invalidateQueries({ queryKey: [queryKey.USER] });
      queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
    },
  });
}

/**
 * The above were updated
 */

// No-Shows hooks - Updated to match new API specification
export const useNoShowsStats = () => {
  const token = getToken();
  return useQuery({
    queryKey: ["no-shows-stats"],
    queryFn: async () => {
      const response = await axios.get(
        `${apiUrl}/api/v1/admin/no-shows/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    enabled: true,
  });
};

/**
 * All Ride Requests (paginated & filterable)
 */
export function useAllRideRequests(
  page: number = 1,
  pageSize: number = 10,
  filters: {
    status?: string;
    search?: string;
    originCity?: string;
    originProvince?: string;
    destinationCity?: string;
    date?: string;
    destinationProvince?: string;
    mineOnly?: boolean;
  } = {}
) {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.RIDE_REQUESTS, page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.originCity ? { originCity: filters.originCity } : {}),
        ...(filters.originProvince
          ? { originProvince: filters.originProvince }
          : {}),
        ...(filters.destinationCity
          ? { destinationCity: filters.destinationCity }
          : {}),
        ...(filters.destinationProvince
          ? { destinationProvince: filters.destinationProvince }
          : {}),
        ...(filters.mineOnly ? { mineOnly: String(filters.mineOnly) } : {}), // ensure boolean becomes string
        ...(filters.date ? { date: filters.date } : {}),
        lang: currentLanguage,
      });

      const { data } = await axios.get(
        `${apiUrl}/api/v1/ride-requests?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
  });
}

/**
 * Ride update
 */
export function useUpdateRideRequest(id: string | number) {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/ride-requests/${id}?lang=${currentLanguage}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },

    onSuccess: () => {
      // invalidate list + single request queries
      queryClient.invalidateQueries({ queryKey: [queryKey.RIDE_REQUESTS] });
      queryClient.invalidateQueries({ queryKey: [queryKey.RIDE_REQUEST, id] });
    },
  });
}

/**
 * Single Ride Request by ID
 */
export function useSingleRideRequest({
  requestId,
  enabled = true,
}: {
  requestId: number;
  enabled?: boolean;
}) {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.RIDE_REQUEST, requestId],
    queryFn: async () => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/ride-requests/${requestId}?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data.data;
    },
    enabled: enabled && !!requestId,
  });
}

/**
 * Get Matches for Ride Request
 */
export function useRideRequestMatches({
  requestId,
  page = 1,
  pageSize = 10,
  enabled = true,
}: {
  requestId: number;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  return useQuery({
    queryKey: [queryKey.RIDE_REQUEST, requestId, "matches", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        lang: currentLanguage,
      });

      const { data } = await axios.get(
        `${apiUrl}/api/v1/ride-requests/${requestId}/matches?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    enabled: enabled && !!requestId,
  });
}

/**
 * Create Ride Request Mutation
 */
export function useCreateRideRequest() {
  const token = getToken();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const { data: response } = await axios.post(
        `${apiUrl}/api/v1/ride-requests?lang=${currentLanguage}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.RIDE_REQUESTS] });
    },
  });
}

export const useAllNoShows = (
  page: number = 1,
  pageSize: number = 10,
  lang: string = "EN"
) => {
  const token = getToken();
  return useQuery({
    queryKey: ["admin-no-shows", page, pageSize, lang],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        lang,
      });

      const response = await axios.get(
        `${apiUrl}/api/v1/admin/no-shows/all?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    enabled: true,
  });
};

export const useNoShowsByUser = (userId: number, lang: string = "EN") => {
  const token = getToken();
  return useQuery({
    queryKey: ["no-shows-user", userId, lang],
    queryFn: async () => {
      const response = await axios.get(
        `${apiUrl}/api/v1/no-shows/${userId}?lang=${lang}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!userId,
  });
};

export const useNoShowsByRide = (rideId: number, lang: string = "EN") => {
  const token = getToken();
  return useQuery({
    queryKey: ["no-shows-ride", rideId, lang],
    queryFn: async () => {
      const response = await axios.get(
        `${apiUrl}/api/v1/no-shows/ride/${rideId}?lang=${lang}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!rideId,
  });
};

// Admin actions for no-shows
export const useConfirmNoShow = () => {
  const queryClient = useQueryClient();
  const token = getToken();

  return useMutation({
    mutationFn: async ({
      id,
      reviewNotes,
    }: {
      id: number;
      reviewNotes: string;
    }) => {
      const response = await axios.patch(
        `${apiUrl}/api/v1/admin/no-shows/${id}/confirm`,
        { reviewNotes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-no-shows"] });
      queryClient.invalidateQueries({ queryKey: ["no-shows-stats"] });
    },
  });
};

export const useRejectNoShow = () => {
  const queryClient = useQueryClient();
  const token = getToken();

  return useMutation({
    mutationFn: async ({
      id,
      reviewNotes,
    }: {
      id: number;
      reviewNotes: string;
    }) => {
      const response = await axios.patch(
        `${apiUrl}/api/v1/admin/no-shows/${id}/reject`,
        { reviewNotes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-no-shows"] });
      queryClient.invalidateQueries({ queryKey: ["no-shows-stats"] });
    },
  });
};

// Legacy hook for backward compatibility
export const useNoShows = (
  page: number = 1,
  pageSize: number = 10,
  params: {
    userId?: number;
    rideId?: number;
    reportedById?: number;
  } = {}
) => {
  const token = getToken();
  return useQuery({
    queryKey: ["no-shows", page, pageSize, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(params.userId && { userId: params.userId.toString() }),
        ...(params.rideId && { rideId: params.rideId.toString() }),
        ...(params.reportedById && {
          reportedById: params.reportedById.toString(),
        }),
      });

      const response = await axios.get(
        `${apiUrl}/api/v1/no-shows/all?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    enabled: true,
  });
};
