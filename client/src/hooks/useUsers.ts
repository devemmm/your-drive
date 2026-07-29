import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/services/api";

// Types
export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber?: string;
  isPhoneVerified: boolean;
  roles: string[];
  status?: string;
  isOnboarded: boolean;
  isPassengerOnboarded: boolean;
  isDriverOnboarded: boolean;
  language: "EN" | "FR";
  theme: "LIGHT" | "DARK" | "SYSTEM";
  gender?: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth?: Date;
  notificationPref?: "NONE" | "EMAIL" | "SMS";
  twoFactorEnabled: boolean;
  termsAccepted: boolean;
  travelPreferences?: string[];
  frequentRoutes?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  referralCode?: string;
  licenseNumber?: string;
  licenseImageId?: string;
  drivingExperience?: number;
  profileImage?: {
    url: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UsersQueryParams {
  page?: number;
  pageSize?: number;
  role?: "DRIVER" | "PASSENGER";
  sortBy?: string;
  order?: "asc" | "desc";
}

export interface UpdateProfileData {
  name?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  language?: "EN" | "FR";
  theme?: "LIGHT" | "DARK" | "SYSTEM";
  phoneNumber?: string;
  dateOfBirth?: string;
  notificationPref?: "NONE" | "EMAIL" | "SMS";
  twoFactorEnabled?: boolean;
  termsAccepted?: boolean;
  isPassengerOnboarded?: boolean;
  isDriverOnboarded?: boolean;
  travelPreferences?: string[];
  frequentRoutes?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  referralCode?: string;
  licenseNumber?: string;
  licenseImageId?: string;
  drivingExperience?: number;
  file?: File;
  licenseImage?: File;
}

export const useUsers = (params: UsersQueryParams = {}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Get all users with pagination and filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });

      return api.get<PaginatedResponse<User>>(
        `/api/v1/users?${searchParams.toString()}`
      );
    },
  });

  // Update user
  const updateUser = useMutation({
    mutationFn: async (user: Partial<User> & { id: number }) => {
      return api.put(`/api/v1/users/${user.id}`, user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.updateSuccess"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("common.error"), {
        className: "custom-error-toast",
      });
    },
  });

  // Delete user
  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/api/v1/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.deleteSuccess"));
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          t("common.error", { className: "custom-error-toast" })
      );
    },
  });

  return {
    users: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error,
    refetch,
    updateUser: updateUser.mutate,
    deleteUser: deleteUser.mutate,
    isUpdating: updateUser.isPending,
    isDeleting: deleteUser.isPending,
  };
};
