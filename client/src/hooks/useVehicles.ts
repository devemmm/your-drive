import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/services/api";

// Types
export type VehicleCategory = "CAR" | "MOTORBIKE" | "BUS";

export interface VehicleImage {
  id: number;
  url: string;
  publicId: string;
  type: string;
  category: string;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  userId: number;
  category?: VehicleCategory;
  seatLayout?: string[] | null;
  defaultImageId?: number;
  defaultImage?: VehicleImage;
  files: VehicleImage[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PaginatedVehiclesResponse {
  success: boolean;
  data: Vehicle[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface VehiclesQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  order?: "asc" | "desc";
  search?: string;
}

export interface CreateVehicleData {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  images: File[];
  category?: VehicleCategory;
  seatLayout?: string[] | null;
}

export interface UpdateVehicleData {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;
}

export const useVehicles = (params: VehiclesQueryParams = {}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Get all vehicles with pagination and filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["vehicles", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });

      return api.get<PaginatedVehiclesResponse>(
        `/api/v1/vehicles?${searchParams.toString()}`
      );
    },
  });

  // Get vehicle by ID
  const useVehicleById = (vehicleId: number) => {
    return useQuery({
      queryKey: ["vehicle", vehicleId],
      queryFn: async () => {
        if (!vehicleId) return null;
        return api.get<{ success: boolean; data: Vehicle }>(
          `/api/v1/vehicles/${vehicleId}`
        );
      },
      enabled: !!vehicleId,
    });
  };

  // Create vehicle
  const createVehicleMutation = useMutation({
    mutationFn: async (data: CreateVehicleData) => {
      const formData = new FormData();
      formData.append("make", data.make);
      formData.append("model", data.model);
      formData.append("year", data.year.toString());
      formData.append("color", data.color);
      formData.append("licensePlate", data.licensePlate);
      if (data.category) {
        formData.append("category", data.category);
      }
      if (data.seatLayout) {
        formData.append("seatLayout", JSON.stringify(data.seatLayout));
      }

      data.images.forEach((image) => {
        formData.append("images", image);
      });

      return api.post<{ success: boolean; data: Vehicle }>(
        "/api/v1/vehicles",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },
    onSuccess: () => {
      toast.success(t("vehicles.createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("vehicles.createError"), {
        className: "custom-error-toast",
      });
    },
  });

  // Update vehicle
  const updateVehicleMutation = useMutation({
    mutationFn: async ({
      vehicleId,
      data,
    }: {
      vehicleId: number;
      data: UpdateVehicleData;
    }) => {
      return api.put<{ success: boolean; data: Vehicle }>(
        `/api/v1/vehicles/${vehicleId}`,
        data
      );
    },
    onSuccess: () => {
      toast.success(t("vehicles.updateSuccess"));
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("vehicles.updateError"), {
        className: "custom-error-toast",
      });
    },
  });

  // Delete vehicle
  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId: number) => {
      return api.delete(`/api/v1/vehicles/${vehicleId}`);
    },
    onSuccess: () => {
      toast.success(t("vehicles.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("vehicles.deleteError"), {
        className: "custom-error-toast",
      });
    },
  });

  // Set default image
  const setDefaultImageMutation = useMutation({
    mutationFn: async ({
      vehicleId,
      imageId,
    }: {
      vehicleId: number;
      imageId: number;
    }) => {
      return api.patch<{ success: boolean; data: Vehicle }>(
        `/api/v1/vehicles/${vehicleId}/images/default-image`,
        {
          imageId,
        }
      );
    },
    onSuccess: () => {
      toast.success(t("vehicles.setDefaultImageSuccess"));
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("vehicles.setDefaultImageError"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  // Add images to vehicle
  const addImagesMutation = useMutation({
    mutationFn: async ({
      vehicleId,
      images,
    }: {
      vehicleId: number;
      images: File[];
    }) => {
      const formData = new FormData();
      images.forEach((image) => {
        formData.append("images", image);
      });

      return api.put<{ success: boolean; data: Vehicle }>(
        `/api/v1/vehicles/${vehicleId}/images/add-images`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },
    onSuccess: () => {
      toast.success(t("vehicles.addImagesSuccess"));
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("vehicles.addImagesError"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  return {
    vehicles: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error,
    refetch,
    useVehicleById,
    createVehicle: createVehicleMutation.mutate,
    isCreating: createVehicleMutation.isPending,
    updateVehicle: updateVehicleMutation.mutate,
    isUpdating: updateVehicleMutation.isPending,
    deleteVehicle: deleteVehicleMutation.mutate,
    isDeleting: deleteVehicleMutation.isPending,
    setDefaultImage: setDefaultImageMutation.mutate,
    isSettingDefaultImage: setDefaultImageMutation.isPending,
    addImages: addImagesMutation.mutate,
    isAddingImages: addImagesMutation.isPending,
  };
};
