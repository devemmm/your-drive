import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useTranslation } from "react-i18next";

export interface SystemSettings {
  id: number;
  general: {
    appName: string;
    appVersion: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    defaultLanguage: string;
    supportedLanguages: string[];
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  security: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
    sessionTimeout: number;
    requireEmailVerification: boolean;
    requirePhoneVerification: boolean;
    twoFactorRequired: boolean;
    ipWhitelist: string[];
  };
  features: {
    enablePassengerOnboarding: boolean;
    enableDriverOnboarding: boolean;
    enableCoupons: boolean;
    enableStripePayments: boolean;
    enableGoogleMaps: boolean;
    enablePushNotifications: boolean;
    enableEmailNotifications: boolean;
    enableSMSNotifications: boolean;
    enableRealTimeTracking: boolean;
    enableRatingSystem: boolean;
    enableReviewSystem: boolean;
    enableChatSystem: boolean;
    enableEmergencyContacts: boolean;
    enableTravelPreferences: boolean;
    enableFrequentRoutes: boolean;
  };
  limits: {
    maxRidesPerDay: number;
    maxBookingsPerRide: number;
    maxActiveRidesPerDriver: number;
    maxPendingRidesPerDriver: number;
    maxCancellationsPerDay: number;
    maxNoShowsPerMonth: number;
    maxRefundsPerMonth: number;
    maxDisputesPerMonth: number;
  };
  notifications: {
    emailTemplates: Record<string, string>;
    smsTemplates: Record<string, string>;
    pushTemplates: Record<string, string>;
    defaultSenderEmail: string;
    defaultSenderName: string;
    smsProvider: string;
    emailProvider: string;
  };
  integrations: {
    stripe: {
      enabled: boolean;
      publishableKey: string;
      webhookSecret: string;
      currency: string;
    };
    googleMaps: {
      enabled: boolean;
      apiKey: string;
      billingAccount: string;
    };
    twilio: {
      enabled: boolean;
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    };
    sendgrid: {
      enabled: boolean;
      apiKey: string;
      fromEmail: string;
      fromName: string;
    };
  };
  updatedAt: string;
}

export interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  enabledFor: {
    roles: string[];
    users: number[];
    percentage: number;
  };
  conditions: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemMaintenance {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  affectedServices: string[];
  impact: "low" | "medium" | "high" | "critical";
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SystemBackup {
  id: number;
  name: string;
  description: string;
  type: "full" | "incremental" | "partial";
  status: "pending" | "in_progress" | "completed" | "failed";
  size: number;
  location: string;
  createdAt: string;
  completedAt?: string;
}

// System Settings
export const useSystemSettings = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "system-settings"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/settings/system");
      return (response as any).data.data as SystemSettings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      const response = await api.put("/api/v1/admin/settings/system", data);
      return (response as any).data.data as SystemSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system-settings"] });
    },
  });
};

// Feature Flags
export const useFeatureFlags = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/settings/feature-flags");
      return (response as any).data.data as FeatureFlag[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateFeatureFlag = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      enabled: boolean;
      enabledFor?: {
        roles?: string[];
        users?: number[];
        percentage?: number;
      };
      conditions?: Record<string, any>;
    }) => {
      const response = await api.post(
        "/api/v1/admin/settings/feature-flags",
        data
      );
      return (response as any).data.data as FeatureFlag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
  });
};

export const useUpdateFeatureFlag = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<FeatureFlag>;
    }) => {
      const response = await api.put(
        `/api/v1/admin/settings/feature-flags/${id}`,
        data
      );
      return (response as any).data.data as FeatureFlag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
  });
};

export const useDeleteFeatureFlag = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(
        `/api/v1/admin/settings/feature-flags/${id}`
      );
      return (response as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
  });
};

export const useToggleFeatureFlag = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const response = await api.patch(
        `/api/v1/admin/settings/feature-flags/${id}/toggle`,
        {
          enabled,
        }
      );
      return (response as any).data.data as FeatureFlag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
  });
};

// System Maintenance
export const useSystemMaintenance = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "system-maintenance"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/settings/maintenance");
      return (response as any).data.data as SystemMaintenance[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateMaintenance = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      startTime: string;
      endTime: string;
      affectedServices: string[];
      impact: SystemMaintenance["impact"];
      notifications: SystemMaintenance["notifications"];
    }) => {
      const response = await api.post(
        "/api/v1/admin/settings/maintenance",
        data
      );
      return (response as any).data.data as SystemMaintenance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "system-maintenance"],
      });
    },
  });
};

export const useUpdateMaintenance = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<SystemMaintenance>;
    }) => {
      const response = await api.put(
        `/api/v1/admin/settings/maintenance/${id}`,
        data
      );
      return (response as any).data.data as SystemMaintenance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "system-maintenance"],
      });
    },
  });
};

export const useDeleteMaintenance = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(
        `/api/v1/admin/settings/maintenance/${id}`
      );
      return (response as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "system-maintenance"],
      });
    },
  });
};

export const useStartMaintenance = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(
        `/api/v1/admin/settings/maintenance/${id}/start`
      );
      return (response as any).data.data as SystemMaintenance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "system-maintenance"],
      });
    },
  });
};

export const useEndMaintenance = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(
        `/api/v1/admin/settings/maintenance/${id}/end`
      );
      return (response as any).data.data as SystemMaintenance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "system-maintenance"],
      });
    },
  });
};

// System Backups
export const useSystemBackups = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "system-backups"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/settings/backups");
      return (response as any).data.data as SystemBackup[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateBackup = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      type: SystemBackup["type"];
    }) => {
      const response = await api.post("/api/v1/admin/settings/backups", data);
      return (response as any).data.data as SystemBackup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system-backups"] });
    },
  });
};

export const useDownloadBackup = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.get(
        `/api/v1/admin/settings/backups/${id}/download`,
        {
          responseType: "blob",
        }
      );
      return (response as any).data;
    },
  });
};

export const useDeleteBackup = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/api/v1/admin/settings/backups/${id}`);
      return (response as any).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system-backups"] });
    },
  });
};

// System Health
export const useSystemHealth = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/settings/health");
      return (response as any).data.data as {
        status: "healthy" | "warning" | "critical";
        uptime: number;
        memoryUsage: number;
        cpuUsage: number;
        diskUsage: number;
        activeConnections: number;
        databaseStatus: "connected" | "disconnected" | "error";
        cacheStatus: "connected" | "disconnected" | "error";
        externalServices: {
          name: string;
          status: "up" | "down" | "degraded";
          responseTime: number;
        }[];
        errors: {
          timestamp: string;
          level: "error" | "warning" | "info";
          message: string;
          service: string;
        }[];
      };
    },
    refetchInterval: 30 * 1000, // 30 seconds
  });
};

// System Logs
export const useSystemLogs = (filters?: {
  level?: "error" | "warning" | "info" | "debug";
  service?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "system-logs", filters],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/settings/logs", {
        params: filters,
      });
      return (response as any).data.data as {
        logs: {
          id: number;
          timestamp: string;
          level: "error" | "warning" | "info" | "debug";
          service: string;
          message: string;
          metadata: Record<string, any>;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useExportSystemLogs = () => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      filters,
      format,
    }: {
      filters?: {
        level?: "error" | "warning" | "info" | "debug";
        service?: string;
        startDate?: string;
        endDate?: string;
      };
      format: "csv" | "json" | "txt";
    }) => {
      const response = await api.post(
        "/api/v1/admin/settings/logs/export",
        {
          filters,
          format,
        },
        {
          responseType: "blob",
        }
      );
      return (response as any).data;
    },
  });
};

// Cache Management
export const useClearCache = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (
      cacheType?: "all" | "users" | "rides" | "payments" | "reports"
    ) => {
      const response = await api.post("/api/v1/admin/settings/cache/clear", {
        cacheType: cacheType || "all",
      });
      return (response as any).data;
    },
    onSuccess: () => {
      // Invalidate all queries when cache is cleared
      queryClient.invalidateQueries();
    },
  });
};

export const useCacheStats = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "cache-stats"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/settings/cache/stats");
      return (response as any).data.data as {
        totalKeys: number;
        memoryUsage: number;
        hitRate: number;
        missRate: number;
        evictions: number;
        expiredKeys: number;
        cacheTypes: {
          type: string;
          keys: number;
          memoryUsage: number;
        }[];
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
};
