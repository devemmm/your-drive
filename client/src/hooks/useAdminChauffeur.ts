import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";
import type { ChauffeurService, ChauffeurSettings, ChauffeurStatus } from "@/lib/types";

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

interface AdminChauffeurFilters {
  page?: number;
  pageSize?: number;
  status?: ChauffeurStatus;
}

export function useAdminChauffeurServices(filters: AdminChauffeurFilters = {}) {
  return useQuery({
    queryKey: ["admin", "chauffeurServices", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<ChauffeurService>>(
        `/api/v1/admin/chauffeur-services?${params.toString()}`
      );
    },
  });
}

export function useAdminChauffeurService(serviceId: number | null) {
  return useQuery({
    queryKey: ["admin", "chauffeurService", serviceId],
    queryFn: async () => {
      return api.get<{ success: boolean; data: ChauffeurService }>(
        `/api/v1/admin/chauffeur-services/${serviceId}`
      );
    },
    enabled: !!serviceId,
  });
}

export function useAdminChauffeurSettings() {
  return useQuery({
    queryKey: ["admin", "chauffeurSettings"],
    queryFn: async () => {
      return api.get<{ success: boolean; data: ChauffeurSettings }>(
        "/api/v1/admin/chauffeur-services/settings"
      );
    },
  });
}

export function useAdminChauffeurMutations() {
  const queryClient = useQueryClient();

  const invalidateServices = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "chauffeurServices"] });
  };

  const cancelService = useMutation({
    mutationFn: async ({
      serviceId,
      reason,
    }: {
      serviceId: number;
      reason: string;
    }) => {
      return api.patch(
        `/api/v1/admin/chauffeur-services/${serviceId}/cancel`,
        { reason }
      );
    },
    onSuccess: () => {
      toast.success("Chauffeur service cancelled successfully");
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to cancel service",
        { className: "custom-error-toast" }
      );
    },
  });

  const resolveDispute = useMutation({
    mutationFn: async ({
      serviceId,
      resolution,
    }: {
      serviceId: number;
      resolution?: string;
    }) => {
      return api.patch(
        `/api/v1/admin/chauffeur-services/${serviceId}/resolve-dispute`,
        { resolution }
      );
    },
    onSuccess: () => {
      toast.success("Dispute resolved successfully");
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to resolve dispute",
        { className: "custom-error-toast" }
      );
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<ChauffeurSettings>) => {
      return api.put<{ success: boolean; data: ChauffeurSettings }>(
        "/api/v1/admin/chauffeur-services/settings",
        settings
      );
    },
    onSuccess: () => {
      toast.success("Chauffeur settings updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "chauffeurSettings"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update settings",
        { className: "custom-error-toast" }
      );
    },
  });

  return {
    cancelService: cancelService.mutate,
    isCancelling: cancelService.isPending,
    resolveDispute: resolveDispute.mutate,
    isResolvingDispute: resolveDispute.isPending,
    updateSettings: updateSettings.mutate,
    isUpdatingSettings: updateSettings.isPending,
  };
}
