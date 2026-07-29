import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface FeeSetting {
  id: number;
  type: "POSTING" | "BOOKING";
  amount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeeSettingData {
  type: "POSTING" | "BOOKING";
  amount: number;
  active?: boolean;
}

export interface UpdateFeeSettingData {
  amount?: number;
  active?: boolean;
}

interface ApiResponse {
  success: boolean;
  data: FeeSetting[];
}

export const useFeeSettings = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Get all fee settings
  const {
    data: feeSettings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["feeSettings"],
    queryFn: async (): Promise<FeeSetting[]> => {
      const response = (await api.get("/api/v1/admin/settings")) as ApiResponse;
      const apiResponse = response.data;
      return apiResponse || [];
    },
  });

  // Create fee setting
  const createFeeSettingMutation = useMutation({
    mutationFn: async (data: CreateFeeSettingData) => {
      return api.post<{ success: boolean; data: FeeSetting }>(
        "/api/v1/admin/settings",
        data
      );
    },
    onSuccess: () => {
      toast.success(
        t("feeSettings.createSuccess") || "Fee setting created successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["feeSettings"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          t("feeSettings.createError") ||
          "Failed to create fee setting",
        { className: "custom-error-toast" }
      );
    },
  });

  // Update fee setting
  const updateFeeSettingMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateFeeSettingData;
    }) => {
      return api.put<{ success: boolean; data: FeeSetting }>(
        `/api/v1/admin/settings/${id}`,
        data
      );
    },
    onSuccess: () => {
      toast.success(
        t("feeSettings.updateSuccess") || "Fee setting updated successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["feeSettings"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          t("feeSettings.updateError") ||
          "Failed to update fee setting",
        { className: "custom-error-toast" }
      );
    },
  });

  // Delete fee setting
  const deleteFeeSettingMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete<{ success: boolean; message: string }>(
        `/api/v1/admin/settings/${id}`
      );
    },
    onSuccess: () => {
      toast.success(
        t("feeSettings.deleteSuccess") || "Fee setting deleted successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["feeSettings"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          t("feeSettings.deleteError") ||
          "Failed to delete fee setting",
        { className: "custom-error-toast" }
      );
    },
  });

  // Wrapper functions to match expected signatures
  const handleUpdateFeeSetting = (id: number, data: UpdateFeeSettingData) => {
    updateFeeSettingMutation.mutate({ id, data });
  };

  const handleDeleteFeeSetting = (id: number) => {
    deleteFeeSettingMutation.mutate(id);
  };

  return {
    feeSettings: feeSettings || [],
    isLoading,
    error,
    refetch,
    createFeeSetting: createFeeSettingMutation.mutate,
    updateFeeSetting: handleUpdateFeeSetting,
    deleteFeeSetting: handleDeleteFeeSetting,
    isCreating: createFeeSettingMutation.isPending,
    isUpdating: updateFeeSettingMutation.isPending,
    isDeleting: deleteFeeSettingMutation.isPending,
  };
};
