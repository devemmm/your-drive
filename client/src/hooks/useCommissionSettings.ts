import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface CommissionSettings {
  id?: number;
  driverCommissionRate: number;
  platformCommissionRate: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateCommissionSettingsData {
  driverCommissionRate?: number;
  platformCommissionRate?: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const useCommissionSettings = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const {
    data: commissionSettingsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["commissionSettings"],
    queryFn: async (): Promise<CommissionSettings> => {
      const response = (await api.get<ApiEnvelope<CommissionSettings>>(
        "/api/v1/admin/settings/commission"
      )) as ApiEnvelope<CommissionSettings>;
      return response?.data ?? {
        driverCommissionRate: 0,
        platformCommissionRate: 0,
      };
    },
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateCommissionSettingsData) => {
      return api.put<ApiEnvelope<CommissionSettings>>(
        "/api/v1/admin/settings/commission",
        data
      );
    },
    onSuccess: (res: any) => {
      toast.success(
        res?.message ||
          t("AdminDashboard.CommissionSettings.updateSuccess") ||
          "Commission settings updated successfully."
      );
      queryClient.invalidateQueries({ queryKey: ["commissionSettings"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          t("AdminDashboard.CommissionSettings.updateError") ||
          "Failed to update commission settings.",
        { className: "custom-error-toast" }
      );
    },
  });

  return {
    commissionSettings: commissionSettingsResponse ?? {
      driverCommissionRate: 0,
      platformCommissionRate: 0,
    },
    isLoading,
    error,
    refetch,
    updateCommissionSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  } as const;
};
