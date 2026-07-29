import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKey } from "@/data";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type {
  CarRental,
  CreateRentalRequest,
  RentalVehicleListing,
  RentalStatus,
} from "@/lib/types";

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface RentalFilters {
  page?: number;
  pageSize?: number;
  city?: string;
  region?: string;
  category?: string;
  minDailyRate?: number;
  maxDailyRate?: number;
  startDate?: string;
  endDate?: string;
}

interface RentalListFilters {
  page?: number;
  pageSize?: number;
  status?: RentalStatus;
  role?: "renter" | "owner";
}

export function useAvailableRentals(filters: RentalFilters = {}) {
  return useQuery({
    queryKey: [queryKey.AVAILABLE_RENTALS, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<RentalVehicleListing>>(
        `/api/v1/public/rentals/vehicles/available?${params.toString()}`
      );
    },
  });
}

export function useRentals(filters: RentalListFilters = {}) {
  return useQuery({
    queryKey: [queryKey.RENTALS, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<CarRental>>(
        `/api/v1/rentals?${params.toString()}`
      );
    },
  });
}

export function useRental(rentalId: number | null) {
  return useQuery({
    queryKey: [queryKey.RENTAL, rentalId],
    queryFn: async () => {
      return api.get<{ success: boolean; data: CarRental }>(
        `/api/v1/rentals/${rentalId}`
      );
    },
    enabled: !!rentalId,
  });
}

export function useRentalMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const invalidateRentals = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey.RENTALS] });
    queryClient.invalidateQueries({ queryKey: [queryKey.AVAILABLE_RENTALS] });
  };

  const createRental = useMutation({
    mutationFn: async (data: CreateRentalRequest) => {
      return api.post<{ success: boolean; data: CarRental }>(
        "/api/v1/rentals",
        data
      );
    },
    onSuccess: () => {
      toast.success(t("rental.booking.requestSent"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("rental.booking.requestError"),
        { className: "custom-error-toast" }
      );
    },
  });

  const approveRental = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.patch(`/api/v1/rentals/${rentalId}/approve`);
    },
    onSuccess: () => {
      toast.success(t("rental.status.APPROVED"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to approve rental", {
        className: "custom-error-toast",
      });
    },
  });

  const declineRental = useMutation({
    mutationFn: async ({ rentalId, reason }: { rentalId: number; reason: string }) => {
      return api.patch(`/api/v1/rentals/${rentalId}/decline`, { reason });
    },
    onSuccess: () => {
      toast.success(t("rental.status.DECLINED"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to decline rental", {
        className: "custom-error-toast",
      });
    },
  });

  const initializePayment = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.post<{ success: boolean; data: { clientSecret: string } }>(
        `/api/v1/rentals/${rentalId}/initialize-payment`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Payment initialization failed", {
        className: "custom-error-toast",
      });
    },
  });

  const activateRental = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.patch(`/api/v1/rentals/${rentalId}/activate`);
    },
    onSuccess: () => {
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to activate rental", {
        className: "custom-error-toast",
      });
    },
  });

  const completeRental = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.patch(`/api/v1/rentals/${rentalId}/complete`);
    },
    onSuccess: () => {
      toast.success(t("rental.status.COMPLETED"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to complete rental", {
        className: "custom-error-toast",
      });
    },
  });

  const cancelRental = useMutation({
    mutationFn: async ({ rentalId, reason }: { rentalId: number; reason: string }) => {
      return api.patch(`/api/v1/rentals/${rentalId}/cancel`, { reason });
    },
    onSuccess: () => {
      toast.success(t("rental.status.CANCELLED"));
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to cancel rental", {
        className: "custom-error-toast",
      });
    },
  });

  const releaseDeposit = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.post(`/api/v1/rentals/${rentalId}/release-deposit`);
    },
    onSuccess: () => {
      toast.success("Deposit released");
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to release deposit", {
        className: "custom-error-toast",
      });
    },
  });

  const disputeRental = useMutation({
    mutationFn: async ({ rentalId, reason }: { rentalId: number; reason: string }) => {
      return api.post(`/api/v1/rentals/${rentalId}/dispute`, { reason });
    },
    onSuccess: () => {
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to file dispute", {
        className: "custom-error-toast",
      });
    },
  });

  return {
    createRental: createRental.mutate,
    isCreating: createRental.isPending,
    approveRental: approveRental.mutate,
    isApproving: approveRental.isPending,
    declineRental: declineRental.mutate,
    isDeclining: declineRental.isPending,
    initializePayment: initializePayment.mutateAsync,
    isInitializingPayment: initializePayment.isPending,
    activateRental: activateRental.mutate,
    isActivating: activateRental.isPending,
    completeRental: completeRental.mutate,
    isCompleting: completeRental.isPending,
    cancelRental: cancelRental.mutate,
    isCancelling: cancelRental.isPending,
    releaseDeposit: releaseDeposit.mutate,
    isReleasingDeposit: releaseDeposit.isPending,
    disputeRental: disputeRental.mutate,
    isDisputing: disputeRental.isPending,
  };
}
