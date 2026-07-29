import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export type LogLevel = "error" | "warning" | "info" | "debug";

export interface AdminLogEntry {
  id: number;
  createdAt: string;
  level: LogLevel;
  service: string;
  message: string;
  metadata: Record<string, unknown>;
}

export const useAdminLogs = (params?: {
  page?: number;
  pageSize?: number; // legacy name; mapped to limit
  limit?: number;
  level?: LogLevel;
  service?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string; // default createdAt
  order?: "asc" | "desc"; // legacy name; mapped to sortOrder
  sortOrder?: "asc" | "desc";
}) => {
  // Normalize params to backend expectations
  const normalized = {
    page: params?.page ?? 1,
    limit: params?.pageSize ?? params?.limit ?? 30,
    level: params?.level,
    service: params?.service,
    search: params?.search,
    startDate: params?.startDate,
    endDate: params?.endDate,
    sortBy: params?.sortBy ?? "createdAt",
    sortOrder: params?.order ?? params?.sortOrder ?? "desc",
  } as const;

  return useQuery({
    queryKey: ["admin", "logs", normalized],
    queryFn: async () => {
      const qs = new URLSearchParams();
      Object.entries(normalized).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
      });
      // console.log(qs.toString(), "qs --------------");
      const url = `/api/v1/admin/logs?${qs.toString()}`;
      const res = await api.get<{
        data: AdminLogEntry[];
        meta?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(url);

      return {
        success: true,
        data: res.data,
        pagination: {
          page: res.meta?.page ?? 1,
          pageSize: res.meta?.limit ?? normalized.limit,
          total: res.meta?.total ?? 0,
          totalPages: res.meta?.totalPages ?? 1,
        },
        stats: {},
      };
    },
    staleTime: 30_000,
  });
};
