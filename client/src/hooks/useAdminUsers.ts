import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import {
  useSuspendUser,
  useActivateUser as useActivateUserHook,
} from "./useAdminUserManagement";

/**
 * Legacy hook - use useAdminUserManagement hooks instead for consistency
 * This hook is kept for backward compatibility with existing code
 * @deprecated Use useSuspendUser, useActivateUser, useDeleteAdminUser from useAdminUserManagement
 */
export const useAdminUsers = () => {
  const queryClient = useQueryClient();
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUserHook();

  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      return api.delete<{ success: boolean; message: string }>(
        `/api/v1/admin/users/${userId}`
      );
    },
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete user", {
        className: "custom-error-toast",
      });
    },
  });

  const suspendAccount = useMutation({
    mutationFn: async ({ 
      userId, 
      suspendUntil, 
      suspensionReason 
    }: { 
      userId: number; 
      suspendUntil: number; 
      suspensionReason: string; 
    }) => {
      // Convert suspendUntil timestamp to days if needed
      const duration = suspendUntil 
        ? Math.ceil((suspendUntil - Date.now()) / (1000 * 60 * 60 * 24))
        : undefined;
      
      return suspendUser.mutateAsync({
        id: userId,
        reason: suspensionReason,
        duration: duration && duration > 0 ? duration : undefined,
      });
    },
    onSuccess: () => {
      toast.success("User account suspended");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to suspend user account",
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const activateAccount = useMutation({
    mutationFn: async (userId: number) => {
      return activateUser.mutateAsync(userId);
    },
    onSuccess: () => {
      toast.success("User account activated");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to activate user account",
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  return {
    deleteUser: deleteUser.mutate,
    isDeleting: deleteUser.isPending,
    suspendAccount: suspendAccount.mutate,
    isSuspending: suspendAccount.isPending || suspendUser.isPending,
    activateAccount: activateAccount.mutate,
    isActivating: activateAccount.isPending || activateUser.isPending,
  };
};
