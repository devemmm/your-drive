import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKey } from "@/data";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type {
  ChauffeurService,
  CreateChauffeurRequest,
  ChauffeurDriverListing,
  ChauffeurStatus,
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

interface DriverFilters {
  page?: number;
  pageSize?: number;
  minHourlyRate?: number;
  maxHourlyRate?: number;
  minDailyRate?: number;
  maxDailyRate?: number;
  startDate?: string;
  endDate?: string;
}

interface ChauffeurServiceFilters {
  page?: number;
  pageSize?: number;
  status?: ChauffeurStatus;
  role?: "passenger" | "driver";
}

export function useAvailableDrivers(filters: DriverFilters = {}) {
  return useQuery({
    queryKey: [queryKey.AVAILABLE_DRIVERS, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<ChauffeurDriverListing>>(
        `/api/v1/public/chauffeur-drivers?${params.toString()}`
      );
    },
  });
}

export function useChauffeurServices(filters: ChauffeurServiceFilters = {}) {
  return useQuery({
    queryKey: [queryKey.CHAUFFEUR_SERVICES, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, value.toString());
        }
      });
      return api.get<PaginatedResponse<ChauffeurService>>(
        `/api/v1/chauffeur-services?${params.toString()}`
      );
    },
  });
}

export function useChauffeurService(serviceId: number | null) {
  return useQuery({
    queryKey: [queryKey.CHAUFFEUR_SERVICE, serviceId],
    queryFn: async () => {
      return api.get<{ success: boolean; data: ChauffeurService }>(
        `/api/v1/chauffeur-services/${serviceId}`
      );
    },
    enabled: !!serviceId,
  });
}

export function useChauffeurMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const invalidateServices = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey.CHAUFFEUR_SERVICES] });
    queryClient.invalidateQueries({ queryKey: [queryKey.AVAILABLE_DRIVERS] });
  };

  const createService = useMutation({
    mutationFn: async (data: CreateChauffeurRequest) => {
      return api.post<{ success: boolean; data: ChauffeurService }>(
        "/api/v1/chauffeur-services",
        data
      );
    },
    onSuccess: () => {
      toast.success(t("chauffeur.booking.requestSent"));
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("chauffeur.booking.requestError"),
        { className: "custom-error-toast" }
      );
    },
  });

  const acceptService = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/accept`);
    },
    onSuccess: () => {
      toast.success(t("chauffeur.status.ACCEPTED"));
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to accept service",
        { className: "custom-error-toast" }
      );
    },
  });

  const declineService = useMutation({
    mutationFn: async ({
      serviceId,
      reason,
    }: {
      serviceId: number;
      reason: string;
    }) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/decline`, {
        reason,
      });
    },
    onSuccess: () => {
      toast.success(t("chauffeur.status.DECLINED"));
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to decline service",
        { className: "custom-error-toast" }
      );
    },
  });

  const initializePayment = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.post<{ success: boolean; data: { clientSecret: string } }>(
        `/api/v1/chauffeur-services/${serviceId}/initialize-payment`
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Payment initialization failed",
        { className: "custom-error-toast" }
      );
    },
  });

  const activateService = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/activate`);
    },
    onSuccess: () => {
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to activate service",
        { className: "custom-error-toast" }
      );
    },
  });

  const completeService = useMutation({
    mutationFn: async (serviceId: number) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/complete`);
    },
    onSuccess: () => {
      toast.success(t("chauffeur.status.COMPLETED"));
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to complete service",
        { className: "custom-error-toast" }
      );
    },
  });

  const cancelService = useMutation({
    mutationFn: async ({
      serviceId,
      reason,
    }: {
      serviceId: number;
      reason: string;
    }) => {
      return api.patch(`/api/v1/chauffeur-services/${serviceId}/cancel`, {
        reason,
      });
    },
    onSuccess: () => {
      toast.success(t("chauffeur.status.CANCELLED"));
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to cancel service",
        { className: "custom-error-toast" }
      );
    },
  });

  const disputeService = useMutation({
    mutationFn: async ({
      serviceId,
      reason,
    }: {
      serviceId: number;
      reason: string;
    }) => {
      return api.post(`/api/v1/chauffeur-services/${serviceId}/dispute`, {
        reason,
      });
    },
    onSuccess: () => {
      invalidateServices();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to file dispute",
        { className: "custom-error-toast" }
      );
    },
  });

  return {
    createService: createService.mutate,
    isCreating: createService.isPending,
    acceptService: acceptService.mutate,
    isAccepting: acceptService.isPending,
    declineService: declineService.mutate,
    isDeclining: declineService.isPending,
    initializePayment: initializePayment.mutateAsync,
    isInitializingPayment: initializePayment.isPending,
    activateService: activateService.mutate,
    isActivating: activateService.isPending,
    completeService: completeService.mutate,
    isCompleting: completeService.isPending,
    cancelService: cancelService.mutate,
    isCancelling: cancelService.isPending,
    disputeService: disputeService.mutate,
    isDisputing: disputeService.isPending,
  };
}
