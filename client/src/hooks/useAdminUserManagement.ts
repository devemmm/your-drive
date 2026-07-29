import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useTranslation } from "react-i18next";

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  roles: string[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isPassengerOnboarded: boolean;
  isDriverOnboarded: boolean;
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  address?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  preferences?: {
    language: string;
    notifications: boolean;
    marketingEmails: boolean;
  };
  statistics: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalEarnings: number;
    averageRating: number;
    memberSince: string;
    lastActive: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserFilter {
  search?: string;
  roles?: string[];
  status?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isOnboarded?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface BulkUserAction {
  userIds: number[];
  action: "activate" | "deactivate" | "suspend" | "delete" | "changeRole" | "sendEmail" | "export";
  data?: Record<string, any>;
}

export interface UserRole {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

// Helper function to transform regular user to AdminUser format
const transformToAdminUser = (user: any): AdminUser => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || user.name?.split(' ')[0] || '',
    lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
    phoneNumber: user.phoneNumber || '',
    roles: user.roles || (user.role ? [user.role] : []),
    status: user.status || 'ACTIVE',
    isEmailVerified: user.isEmailVerified || false,
    isPhoneVerified: user.isPhoneVerified || false,
    isPassengerOnboarded: user.isPassengerOnboarded || false,
    isDriverOnboarded: user.isDriverOnboarded || false,
    profilePicture: user.profilePicture || user.profileImage?.url,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    address: user.address,
    preferences: user.preferences,
    statistics: user.statistics || {
      totalRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      totalEarnings: 0,
      averageRating: 0,
      memberSince: user.createdAt || '',
      lastActive: user.updatedAt || '',
    },
    createdAt: user.createdAt || '',
    updatedAt: user.updatedAt || '',
  } as AdminUser;
};

// User Management
export const useAdminUsers = (filters?: UserFilter) => {
  const { t } = useTranslation();
  
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: async () => {
      try {
        // Build query parameters properly
        const params: any = {
          page: filters?.page || 1,
          limit: filters?.limit || 100,
        };
        
        if (filters?.search) {
          params.search = filters.search;
        }
        
        if (filters?.roles && filters.roles.length > 0) {
          params.roles = filters.roles.join(",");
        }
        
        if (filters?.status && filters.status.length > 0) {
          params.status = filters.status.join(",");
        }
        
        if (filters?.sortBy) {
          params.sortBy = filters.sortBy;
        }
        
        if (filters?.sortOrder) {
          params.sortOrder = filters.sortOrder;
        }
        
        // Try admin endpoint first
        const response = await api.get<any>("/api/v1/admin/users", {
          params,
        });
        
        // Handle different response structures
        // Response could be: { data: { users: [], ... }, pagination: {} }
        // or: { users: [], total: ..., page: ..., limit: ..., totalPages: ... }
        // or: { data: [], pagination: {} }
        
        if (response.data?.users) {
          // Structure: { data: { users: [], total: ..., ... } }
          return {
            users: response.data.users,
            total: response.data.total || response.data.users.length,
            page: response.data.page || filters?.page || 1,
            limit: response.data.limit || response.data.pageSize || filters?.limit || 100,
            totalPages: response.data.totalPages || 1,
          };
        } else if (response.users) {
          // Structure: { users: [], total: ..., ... }
          return {
            users: response.users,
            total: response.total || response.users.length,
            page: response.page || filters?.page || 1,
            limit: response.limit || response.pageSize || filters?.limit || 100,
            totalPages: response.totalPages || 1,
          };
        } else if (Array.isArray(response.data)) {
          // Structure: { data: [], pagination: {} }
          const pagination = response.pagination || {
            page: filters?.page || 1,
            limit: filters?.limit || 100,
            total: response.data.length,
            totalPages: 1,
          };
          return {
            users: response.data,
            total: pagination.total || response.data.length,
            page: pagination.page || 1,
            limit: pagination.limit || pagination.pageSize || 100,
            totalPages: pagination.totalPages || 1,
          };
        } else if (Array.isArray(response)) {
          // Structure: [] (direct array)
          return {
            users: response,
            total: response.length,
            page: filters?.page || 1,
            limit: filters?.limit || 100,
            totalPages: 1,
          };
        }
        
        // Default fallback
        return {
          users: [],
          total: 0,
          page: filters?.page || 1,
          limit: filters?.limit || 100,
          totalPages: 0,
        };
      } catch (error: any) {
        // If admin endpoint fails (404), fallback to regular users endpoint
        if (error?.response?.status === 404 || error?.response?.status === 403) {
          try {
            const fallbackResponse = await api.get<any>("/api/v1/users", {
              params: {
                page: filters?.page || 1,
                pageSize: filters?.limit || 100,
                ...(filters?.search && { search: filters.search }),
                ...(filters?.roles && filters.roles.length > 0 && { roles: filters.roles.join(",") }),
                ...(filters?.status && filters.status.length > 0 && { status: filters.status.join(",") }),
              },
            });
            
            // Transform regular users response to admin format
            const users = fallbackResponse.data || [];
            const pagination = fallbackResponse.pagination || {
              page: filters?.page || 1,
              pageSize: filters?.limit || 100,
              total: users.length,
              totalPages: 1,
            };
            
            return {
              users: users,
              total: pagination.total || users.length,
              page: pagination.page || 1,
              limit: pagination.pageSize || pagination.limit || filters?.limit || 100,
              totalPages: pagination.totalPages || 1,
            };
          } catch (fallbackError) {
            console.error("Failed to fetch users from fallback endpoint:", fallbackError);
            throw fallbackError;
          }
        }
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAdminUser = (id: number) => {
  const { t } = useTranslation();
  
  return useQuery({
    queryKey: ["admin", "users", id],
    queryFn: async () => {
      try {
        // Try admin endpoint first
        const response = await api.get<any>(`/api/v1/admin/users/${id}`);
        // Handle different response structures
        if (response.data) {
          return response.data as AdminUser;
        }
        return response as AdminUser;
      } catch (error: any) {
        // If admin endpoint fails (404), fallback to regular users endpoint
        if (error?.response?.status === 404 || error?.response?.status === 403) {
          try {
            // Try direct user endpoint first
            try {
              const directResponse = await api.get<any>(`/api/v1/users/${id}`);
              const user = directResponse.data || directResponse;
              if (user) {
                return transformToAdminUser(user);
              }
            } catch (directError) {
              // If direct endpoint fails, try fetching from users list
              const usersResponse = await api.get<any>("/api/v1/users", {
                params: { page: 1, pageSize: 1000 },
              });
              
              const users = usersResponse.data || usersResponse || [];
              const user = Array.isArray(users) 
                ? users.find((u: any) => u.id === id)
                : null;
              
              if (user) {
                return transformToAdminUser(user);
              }
              
              throw new Error("User not found");
            }
          } catch (fallbackError) {
            console.error("Failed to fetch user from fallback endpoint:", fallbackError);
            throw fallbackError;
          }
        }
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<AdminUser>;
    }) => {
      const response = await api.put(`/api/v1/admin/users/${id}`, data);
      return response.data.data as AdminUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", data.id] });
    },
  });
};

export const useDeleteAdminUser = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/api/v1/admin/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

// User Status Management
export const useActivateUser = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/api/v1/admin/users/${id}/activate`);
      return response.data.data as AdminUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", data.id] });
    },
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/api/v1/admin/users/${id}/deactivate`);
      return response.data.data as AdminUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", data.id] });
    },
  });
};

export const useSuspendUser = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      duration,
    }: {
      id: number;
      reason: string;
      duration?: number; // in days
    }) => {
      const response = await api.patch(`/api/v1/admin/users/${id}/suspend`, {
        reason,
        duration,
      });
      return response.data.data as AdminUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", data.id] });
    },
  });
};

export const useUnsuspendUser = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/api/v1/admin/users/${id}/unsuspend`);
      return response.data.data as AdminUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", data.id] });
    },
  });
};

// Role Management
export const useUserRoles = () => {
  const { t } = useTranslation();
  
  return useQuery({
    queryKey: ["admin", "user-roles"],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/users/roles");
      return response.data.data as UserRole[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: number;
      roleId: number;
    }) => {
      const response = await api.patch(`/api/v1/admin/users/${userId}/role`, {
        roleId,
      });
      return response.data.data as AdminUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", data.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-roles"] });
    },
  });
};

// Bulk Actions
export const useBulkUserAction = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (action: BulkUserAction) => {
      const response = await api.post("/api/v1/admin/users/bulk-action", action);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

export const useBulkActivateUsers = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await api.patch("/api/v1/admin/users/bulk-activate", {
        userIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

export const useBulkDeactivateUsers = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await api.patch("/api/v1/admin/users/bulk-deactivate", {
        userIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

export const useBulkSuspendUsers = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({
      userIds,
      reason,
      duration,
    }: {
      userIds: number[];
      reason: string;
      duration?: number;
    }) => {
      const response = await api.patch("/api/v1/admin/users/bulk-suspend", {
        userIds,
        reason,
        duration,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

export const useBulkDeleteUsers = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await api.delete("/api/v1/admin/users/bulk-delete", {
        data: { userIds },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

// User Analytics
export const useUserAnalytics = (period: "24h" | "7d" | "30d" | "90d") => {
  const { t } = useTranslation();
  
  return useQuery({
    queryKey: ["admin", "user-analytics", period],
    queryFn: async () => {
      const response = await api.get(`/api/v1/admin/users/analytics/${period}`);
      return response.data.data as {
        totalUsers: number;
        activeUsers: number;
        newUsers: number;
        suspendedUsers: number;
        usersByRole: Record<string, number>;
        usersByStatus: Record<string, number>;
        userGrowth: {
          date: string;
          count: number;
        }[];
        topActiveUsers: {
          id: number;
          name: string;
          activity: number;
        }[];
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// User Search and Export
export const useSearchUsers = (query: string) => {
  const { t } = useTranslation();
  
  return useQuery({
    queryKey: ["admin", "users", "search", query],
    queryFn: async () => {
      const response = await api.get("/api/v1/admin/users/search", {
        params: { q: query },
      });
      return response.data.data as AdminUser[];
    },
    enabled: query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useExportUsers = () => {
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({
      filters,
      format,
    }: {
      filters?: UserFilter;
      format: "csv" | "xlsx" | "pdf";
    }) => {
      const response = await api.post("/api/v1/admin/users/export", {
        filters,
        format,
      }, {
        responseType: "blob",
      });
      return response.data;
    },
  });
};

// User Communication
export const useSendUserEmail = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({
      userIds,
      subject,
      message,
      templateId,
    }: {
      userIds: number[];
      subject: string;
      message: string;
      templateId?: string;
    }) => {
      const response = await api.post("/api/v1/admin/users/send-email", {
        userIds,
        subject,
        message,
        templateId,
      });
      return response.data;
    },
  });
};

export const useSendBulkEmail = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({
      filters,
      subject,
      message,
      templateId,
    }: {
      filters?: UserFilter;
      subject: string;
      message: string;
      templateId?: string;
    }) => {
      const response = await api.post("/api/v1/admin/users/send-bulk-email", {
        filters,
        subject,
        message,
        templateId,
      });
      return response.data;
    },
  });
};

// User Verification
export const useVerifyUserEmail = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/api/v1/admin/users/${id}/verify-email`);
      return response.data.data as AdminUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", data.id] });
    },
  });
};

export const useVerifyUserPhone = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/api/v1/admin/users/${id}/verify-phone`);
      return response.data.data as AdminUser;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", data.id] });
    },
  });
}; 