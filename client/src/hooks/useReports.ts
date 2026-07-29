import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";
export type ReportTargetType = "RIDE" | "CHAUFFEUR" | "RENTAL";

export interface AdminReport {
  id: number;
  rideId: number | null;
  chauffeurServiceId: number | null;
  rentalId: number | null;
  reporterId: number;
  reporter: { id: number; name: string; email: string };
  subjectUserId: number;
  subject: { id: number; name: string; email: string };
  reason: string;
  status: ReportStatus;
  reviewNotes: string | null;
  reviewedById: number | null;
  reviewedBy: { id: number; name: string; email: string } | null;
  reviewedAt: string | null;
  createdAt: string;
  ride: { id: number; departureLocation?: { city?: string }; destinationLocation?: { city?: string } } | null;
  chauffeurService: { id: number; pickupLocation?: { city?: string }; dropoffLocation?: { city?: string } } | null;
  rental: { id: number; pickupLocation?: { city?: string }; returnLocation?: { city?: string } } | null;
}

interface PaginatedResponse<T> {
  status: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function useAdminReports(params: { page?: number; pageSize?: number; status?: ReportStatus; target?: ReportTargetType }) {
  return useQuery({
    queryKey: ["admin-reports", params],
    queryFn: () =>
      api.get<PaginatedResponse<AdminReport>>("/api/v1/admin/reports", {
        params: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
          ...(params.status ? { status: params.status } : {}),
          ...(params.target ? { target: params.target } : {}),
        },
      }),
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; status: "REVIEWED" | "DISMISSED"; reviewNotes?: string }) =>
      api.patch(`/api/v1/admin/reports/${input.id}`, {
        status: input.status,
        reviewNotes: input.reviewNotes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
  });
}
