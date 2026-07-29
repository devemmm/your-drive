import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, publicApi } from "@/services/api";
import { useAuthContext } from "@/providers/AuthProvider";
import { ApiResponse, PaginatedResponse, ChauffeurService, ChauffeurDriverListing, User } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useAvailableDrivers(params?: { city?: string }) {
  const { isAuthenticated } = useAuthContext();
  return useQuery({
    queryKey: [
      ...queryKeys.chauffeur.drivers(params as Record<string, unknown>),
      { guest: !isAuthenticated },
    ] as const,
    queryFn: () => {
      const url = isAuthenticated
        ? "/public/chauffeur-drivers"
        : "/public/chauffeur-services/search";
      const client = isAuthenticated ? api : publicApi;
      return client.get<PaginatedResponse<ChauffeurDriverListing>>(
        url,
        params as Record<string, unknown>
      );
    },
  });
}

export interface MyChauffeurServicesParams {
  role?: "driver" | "passenger";
  status?: "REQUESTED" | "ACCEPTED" | "DECLINED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED";
  page?: number;
  pageSize?: number;
}

export function useMyChauffeurServices(params?: MyChauffeurServicesParams) {
  return useQuery({
    queryKey: queryKeys.chauffeur.mine(params as Record<string, unknown> | undefined),
    queryFn: () =>
      api.get<PaginatedResponse<ChauffeurService>>(
        "/chauffeur-services",
        params as Record<string, unknown> | undefined
      ),
  });
}

/**
 * Fetch a single chauffeur service by ID. The server endpoint enforces
 * that only the passenger, the driver, or an admin can view the service
 * — a 403 surfaces to the caller as a React Query error.
 */
export function useChauffeurServiceDetail(id: string | number | undefined) {
  return useQuery({
    queryKey: queryKeys.chauffeur.service(id ?? ""),
    queryFn: () =>
      api.get<ApiResponse<ChauffeurService>>(`/chauffeur-services/${id}`),
    enabled: id != null && id !== "",
  });
}

/**
 * Invalidate every query that may hold state about a specific service
 * after a status-changing mutation. Includes the detail query, the
 * "my services" list, and the notifications list (so notification rows
 * referencing this service reflect any server-side state transitions).
 */
function invalidateAfterServiceMutation(
  qc: ReturnType<typeof useQueryClient>,
  id: string | number
) {
  qc.invalidateQueries({ queryKey: queryKeys.chauffeur.service(id) });
  // Prefix match — invalidates every useMyChauffeurServices variant regardless
  // of role/status params.
  qc.invalidateQueries({ queryKey: ["chauffeur", "mine"] });
  qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
}

export function useCreateChauffeurService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { driverId: number; vehicleId?: number; serviceType: string; startDate: string; endDate: string }) =>
      api.post<ApiResponse<ChauffeurService>>("/chauffeur-services", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chauffeur", "mine"] }); },
  });
}

export function useAcceptChauffeur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      api.patch(`/chauffeur-services/${id}/accept`),
    onSuccess: (_data, id) => invalidateAfterServiceMutation(qc, id),
  });
}

export function useDeclineChauffeur() {
  const qc = useQueryClient();
  return useMutation({
    // Server requires non-empty `reason` (see chauffeur.request.validator.ts:declineService).
    // Callers may pass a real reason via an object form; otherwise default.
    mutationFn: (input: string | number | { id: string | number; reason?: string }) => {
      const id = typeof input === "object" ? input.id : input;
      const reason =
        typeof input === "object" && input.reason ? input.reason : "No reason provided";
      return api.patch(`/chauffeur-services/${id}/decline`, { reason });
    },
    onSuccess: (_data, input) => {
      const id = typeof input === "object" ? input.id : input;
      return invalidateAfterServiceMutation(qc, id);
    },
  });
}

export function useCancelChauffeur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      api.patch(`/chauffeur-services/${id}/cancel`),
    onSuccess: (_data, id) => invalidateAfterServiceMutation(qc, id),
  });
}

export function useCompleteChauffeur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) =>
      api.patch(`/chauffeur-services/${id}/complete`),
    onSuccess: (_data, id) => invalidateAfterServiceMutation(qc, id),
  });
}

export interface UpdateChauffeurAvailabilityPayload {
  isAvailableForChauffeur?: boolean;
  chauffeurHourlyRate?: number | null;
  chauffeurDailyRate?: number | null;
  chauffeurDescription?: string | null;
  languagesSpoken?: string[] | null;
}

export function useUpdateChauffeurAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateChauffeurAvailabilityPayload) =>
      api.patch<ApiResponse<{ user: User }>>("/users/chauffeur-availability", data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.user.profile });
      await qc.refetchQueries({ queryKey: queryKeys.user.profile });
    },
  });
}
