import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const useAdminRides = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Approve ride
  const approveRide = useMutation({
    mutationFn: async (rideId: number) => {
      return api.patch<{ success: boolean; message: string }>(
        `/api/v1/admin/rides/${rideId}/approve`
      );
    },
    onSuccess: () => {
      toast.success(t("AdminDashboard.Rides.approveSuccess", "Ride approved"));
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "rides"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t("AdminDashboard.Rides.approveError", "Failed to approve ride"),
        { className: "custom-error-toast" }
      );
    },
  });

  // Reject ride
  const rejectRide = useMutation({
    mutationFn: async ({ rideId, reason }: { rideId: number; reason?: string }) => {
      return api.patch<{ success: boolean; message: string }>(
        `/api/v1/admin/rides/${rideId}/reject`,
        { reason }
      );
    },
    onSuccess: () => {
      toast.success(t("AdminDashboard.Rides.rejectSuccess", "Ride rejected"));
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "rides"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t("AdminDashboard.Rides.rejectError", "Failed to reject ride"),
        { className: "custom-error-toast" }
      );
    },
  });

  // Cancel ride (admin)
  const cancelRide = useMutation({
    mutationFn: async ({ rideId, reason }: { rideId: number; reason?: string }) => {
      return api.patch<{ success: boolean; message: string }>(
        `/api/v1/admin/rides/${rideId}/cancel`,
        { reason }
      );
    },
    onSuccess: () => {
      toast.success(t("AdminDashboard.Rides.cancelSuccess", "Ride cancelled"));
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "rides"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t("AdminDashboard.Rides.cancelError", "Failed to cancel ride"),
        { className: "custom-error-toast" }
      );
    },
  });

  // Legacy methods for backward compatibility
  const blockRide = useMutation({
    mutationFn: async ({
      rideId,
      reason,
    }: {
      rideId: number;
      reason?: string;
    }) => {
      // Use reject endpoint for blocking
      return api.patch<{ success: boolean; message: string }>(
        `/api/v1/admin/rides/${rideId}/reject`,
        { reason }
      );
    },
    onSuccess: () => {
      toast.success(t("AdminDashboard.Rides.blockSuccess", "Ride blocked"));
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "rides"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("AdminDashboard.Rides.blockError", "Failed to block ride"), {
        className: "custom-error-toast",
      });
    },
  });

  const unblockRide = useMutation({
    mutationFn: async ({ rideId }: { rideId: number }) => {
      // Use approve endpoint for unblocking
      return api.patch<{ success: boolean; message: string }>(
        `/api/v1/admin/rides/${rideId}/approve`
      );
    },
    onSuccess: () => {
      toast.success(t("AdminDashboard.Rides.unblockSuccess", "Ride unblocked"));
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "rides"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t("AdminDashboard.Rides.unblockError", "Failed to unblock ride"), {
        className: "custom-error-toast",
      });
    },
  });

  const reviewRideCancellation = useMutation({
    mutationFn: async ({
      rideId,
      cancellationCountsAgainstAllowance,
    }: {
      rideId: number;
      cancellationCountsAgainstAllowance: "YES" | "NO";
    }) => {
      return api.patch<{ success: boolean; message: string }>(
        `/api/v1/admin/rides/${rideId}/cancel`,
        { cancellationCountsAgainstAllowance }
      );
    },
    onSuccess: () => {
      toast.success(t("AdminDashboard.Rides.reviewSuccess", "Cancellation reviewed"));
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "rides"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t("AdminDashboard.Rides.reviewError", "Failed to review cancellation"),
        { className: "custom-error-toast" }
      );
    },
  });

  return {
    approveRide: approveRide.mutate,
    rejectRide: rejectRide.mutate,
    cancelRide: cancelRide.mutate,
    blockRide: blockRide.mutate,
    unblockRide: unblockRide.mutate,
    reviewRideCancellation: reviewRideCancellation.mutate,
    isApproving: approveRide.isPending,
    isRejecting: rejectRide.isPending,
    isCancelling: cancelRide.isPending,
    isBlocking: blockRide.isPending,
    isUnblocking: unblockRide.isPending,
    isReviewing: reviewRideCancellation.isPending,
  };
};
