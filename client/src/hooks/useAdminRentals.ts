import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import type { CarRental, RentalSettings, RentalStatus } from "@/lib/types";

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

interface AdminRentalFilters {
  page?: number;
  pageSize?: number;
  status?: RentalStatus;
}

export function useAdminRentals(filters: AdminRentalFilters = {}) {
  return useQuery({
    queryKey: ["admin", "rentals", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<CarRental>>(
        `/api/v1/admin/rentals?${params.toString()}`
      );
    },
  });
}

export function useAdminRental(rentalId: number | null) {
  return useQuery({
    queryKey: ["admin", "rental", rentalId],
    queryFn: async () => {
      return api.get<{ success: boolean; data: CarRental }>(
        `/api/v1/admin/rentals/${rentalId}`
      );
    },
    enabled: !!rentalId,
  });
}

export function useAdminRentalSettings() {
  return useQuery({
    queryKey: ["admin", "rentalSettings"],
    queryFn: async () => {
      return api.get<{ success: boolean; data: RentalSettings }>(
        "/api/v1/admin/rentals/settings"
      );
    },
  });
}

export function useAdminRentalMutations() {
  const queryClient = useQueryClient();

  const invalidateRentals = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "rentals"] });
  };

  const cancelRental = useMutation({
    mutationFn: async ({
      rentalId,
      reason,
    }: {
      rentalId: number;
      reason: string;
    }) => {
      return api.patch(`/api/v1/admin/rentals/${rentalId}/cancel`, { reason });
    },
    onSuccess: () => {
      toast.success("Rental cancelled successfully");
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to cancel rental",
        { className: "custom-error-toast" }
      );
    },
  });

  const resolveDispute = useMutation({
    mutationFn: async ({
      rentalId,
      resolution,
    }: {
      rentalId: number;
      resolution?: string;
    }) => {
      return api.patch(`/api/v1/admin/rentals/${rentalId}/resolve-dispute`, {
        resolution,
      });
    },
    onSuccess: () => {
      toast.success("Dispute resolved successfully");
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to resolve dispute",
        { className: "custom-error-toast" }
      );
    },
  });

  const refundDeposit = useMutation({
    mutationFn: async (rentalId: number) => {
      return api.post(`/api/v1/admin/rentals/${rentalId}/refund-deposit`);
    },
    onSuccess: () => {
      toast.success("Deposit refunded successfully");
      invalidateRentals();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to refund deposit",
        { className: "custom-error-toast" }
      );
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<RentalSettings>) => {
      return api.put<{ success: boolean; data: RentalSettings }>(
        "/api/v1/admin/rentals/settings",
        settings
      );
    },
    onSuccess: () => {
      toast.success("Rental settings updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "rentalSettings"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update settings",
        { className: "custom-error-toast" }
      );
    },
  });

  return {
    cancelRental: cancelRental.mutate,
    isCancelling: cancelRental.isPending,
    resolveDispute: resolveDispute.mutate,
    isResolvingDispute: resolveDispute.isPending,
    refundDeposit: refundDeposit.mutate,
    isRefundingDeposit: refundDeposit.isPending,
    updateSettings: updateSettings.mutate,
    isUpdatingSettings: updateSettings.isPending,
  };
}
