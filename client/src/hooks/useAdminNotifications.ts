import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useTranslation } from "react-i18next";

export interface AdminNotification {
  id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  priority: "low" | "medium" | "high" | "critical";
  category: "system" | "user" | "payment" | "security";
  isRead: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAlert {
  id: number;
  title: string;
  description: string;
  type: "server_load" | "payment_failure" | "security_breach" | "api_limit";
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "resolved" | "investigating";
  affectedUsers?: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  id: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  systemAlerts: boolean;
  userActivityAlerts: boolean;
  paymentAlerts: boolean;
  securityAlerts: boolean;
  reportAlerts: boolean;
  alertThresholds: {
    serverLoad: number;
    errorRate: number;
    paymentFailureRate: number;
  };
  updatedAt: string;
}

// Admin Notifications
export const useAdminNotifications = (filters?: {
  isRead?: boolean;
  type?: AdminNotification["type"];
  priority?: AdminNotification["priority"];
  category?: AdminNotification["category"];
  limit?: number;
}) => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "notifications", filters],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/notifications", {
        params: filters,
      });
      return response.data.data as AdminNotification[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useUnreadNotificationsCount = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "notifications", "unread-count"],
    queryFn: async () => {
      const response = await api.get(
        "/api/v1/admin/notifications/unread-count"
      );
      return response.data.data as {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(
        `/api/v1/admin/notifications/${id}/read`
      );
      return response.data.data as AdminNotification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "notifications", "unread-count"],
      });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      const response = await api.patch(
        "/api/v1/admin/notifications/mark-all-read"
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "notifications", "unread-count"],
      });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/api/v1/admin/notifications/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "notifications", "unread-count"],
      });
    },
  });
};

// System Alerts
export const useSystemAlerts = (filters?: {
  status?: SystemAlert["status"];
  severity?: SystemAlert["severity"];
  type?: SystemAlert["type"];
}) => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "system-alerts", filters],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/alerts/system", {
        params: filters,
      });
      return response.data.data as SystemAlert[];
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useActiveSystemAlerts = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "system-alerts", "active"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/alerts/system/active");
      return response.data.data as SystemAlert[];
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useResolveSystemAlert = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(
        `/api/v1/admin/alerts/system/${id}/resolve`
      );
      return response.data.data as SystemAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system-alerts"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "system-alerts", "active"],
      });
    },
  });
};

export const useCreateSystemAlert = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      type: SystemAlert["type"];
      severity: SystemAlert["severity"];
      affectedUsers?: number;
    }) => {
      const response = await api.post("/api/v1/admin/alerts/system", data);
      return response.data.data as SystemAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "system-alerts"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "system-alerts", "active"],
      });
    },
  });
};

// Notification Settings
export const useNotificationSettings = () => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "notification-settings"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/notifications/settings");
      return response.data.data as NotificationSettings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: Partial<NotificationSettings>) => {
      const response = await api.put(
        "/api/v1/admin/notifications/settings",
        data
      );
      return response.data.data as NotificationSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "notification-settings"],
      });
    },
  });
};

// Real-time Notifications (WebSocket)
export const useNotificationWebSocket = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // This would integrate with your existing WebSocket setup
  // For now, we'll return a function that can be called to set up listeners
  return {
    subscribe: (onNotification: (notification: AdminNotification) => void) => {
      // Implementation would depend on your WebSocket setup
      // console.log("Setting up notification WebSocket listener");
      return () => {
        // console.log("Cleaning up notification WebSocket listener");
      };
    },
  };
};

// Notification Analytics
export const useNotificationAnalytics = (period: "24h" | "7d" | "30d") => {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ["admin", "notification-analytics", period],
    queryFn: async () => {
      const response = await api.get(
        `/api/v1/admin/notifications/analytics/${period}`
      );
      return response.data.data as {
        totalNotifications: number;
        readNotifications: number;
        unreadNotifications: number;
        notificationsByType: Record<string, number>;
        notificationsByPriority: Record<string, number>;
        averageResponseTime: number;
        topCategories: {
          category: string;
          count: number;
        }[];
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Bulk Actions
export const useBulkMarkNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await api.patch(
        "/api/v1/admin/notifications/bulk-read",
        {
          notificationIds: ids,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "notifications", "unread-count"],
      });
    },
  });
};

export const useBulkDeleteNotifications = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await api.delete(
        "/api/v1/admin/notifications/bulk-delete",
        {
          data: { notificationIds: ids },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "notifications", "unread-count"],
      });
    },
  });
};
