import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useTranslation } from "react-i18next";

export interface RevenueReport {
  id: number;
  date: string;
  totalRevenue: number;
  rideRevenue: number;
  feeRevenue: number;
  refunds: number;
  netRevenue: number;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  averageSessionTime: number;
  usersByRole: {
    drivers: number;
    passengers: number;
  };
  userGrowth: {
    date: string;
    count: number;
  }[];
}

export interface SystemMetrics {
  rideCompletionRate: number;
  averageRideRating: number;
  averageWaitTime: number;
  peakHours: {
    hour: number;
    rideCount: number;
  }[];
  popularRoutes: {
    from: string;
    to: string;
    count: number;
  }[];
}

export interface AdminReport {
  id: number;
  type: "revenue" | "user" | "system" | "custom";
  title: string;
  description: string;
  data: any;
  filters: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Revenue Reports
export const useRevenueReports = (filters?: {
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "week" | "month";
}) => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "revenue-reports", filters],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/reports/revenue", {
        params: filters,
      });
      // console.log(response.data, "revenue data ----------");
      return response.data.data as RevenueReport[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRevenueSummary = (
  period: "today" | "week" | "month" | "year"
) => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "revenue-summary", period],
    queryFn: async () => {
      const response = await api.get(
        `/api/v1/admin/reports/revenue/summary/${period}`
      );
      return response.data.data as {
        totalRevenue: number;
        rideRevenue: number;
        feeRevenue: number;
        refunds: number;
        netRevenue: number;
        growthRate: number;
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// User Analytics
export const useUserAnalytics = (filters?: {
  startDate?: string;
  endDate?: string;
  role?: "DRIVER" | "PASSENGER";
}) => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "user-analytics", filters],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/reports/users/analytics", {
        params: filters,
      });
      return response.data.data as UserAnalytics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserGrowth = (period: "7d" | "30d" | "90d" | "1y") => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "user-growth", period],
    queryFn: async () => {
      const response = await api.get(
        `/api/v1/admin/reports/users/growth/${period}`
      );
      return response.data.data as {
        date: string;
        count: number;
        newUsers: number;
        activeUsers: number;
      }[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// System Metrics
export const useSystemMetrics = (filters?: {
  startDate?: string;
  endDate?: string;
}) => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "system-metrics", filters],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/reports/system/metrics", {
        params: filters,
      });
      return response?.data?.data as SystemMetrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePopularRoutes = (limit: number = 10) => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "popular-routes", limit],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/reports/routes/popular", {
        params: { limit },
      });
      return response.data.data as {
        from: string;
        to: string;
        count: number;
        averagePrice: number;
        completionRate: number;
      }[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Custom Reports
export const useCustomReports = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "custom-reports"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/reports/custom");
      return response.data.data as AdminReport[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCustomReport = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      type: "revenue" | "user" | "system" | "custom";
      title: string;
      description: string;
      filters: Record<string, any>;
    }) => {
      const response = await api.post("/api/v1/admin/reports/custom", data);
      return response.data.data as AdminReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "custom-reports"] });
    },
  });
};

export const useUpdateCustomReport = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<AdminReport>;
    }) => {
      const response = await api.put(
        `/api/v1/admin/reports/custom/${id}`,
        data
      );
      return response.data.data as AdminReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "custom-reports"] });
    },
  });
};

export const useDeleteCustomReport = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/api/v1/admin/reports/custom/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "custom-reports"] });
    },
  });
};

// Export Reports
export const useExportReport = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      type,
      format,
      filters,
    }: {
      type: "revenue" | "user" | "system" | "custom";
      format: "csv" | "pdf" | "excel";
      filters?: Record<string, any>;
    }) => {
      const response = await api.post(
        "/api/v1/admin/reports/export",
        {
          type,
          format,
          filters,
        },
        {
          responseType: "blob",
        }
      );
      return response.data;
    },
  });
};
