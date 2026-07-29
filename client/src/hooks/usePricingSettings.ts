import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export type VehicleCategory = "CAR" | "MOTORBIKE" | "BUS";
export type RideType = "P2P" | "D2D";

export interface PricingRule {
  id: number;
  vehicleCategory: VehicleCategory;
  rideType: RideType;
  baseFare: string;
  perKm: string;
  perMinute: string;
  minimumFare: string;
  commissionPercent: string;
  currency: string;
  isActive: boolean;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRuleInput {
  vehicleCategory: VehicleCategory;
  rideType: RideType;
  baseFare: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  commissionPercent: number;
  currency?: string;
}

export function usePricingSettings() {
  return useQuery({
    queryKey: ["admin-pricing-settings"],
    queryFn: () => api.get<{ status: boolean; data: PricingRule[] }>("/api/v1/admin/pricing-settings"),
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PricingRuleInput) => api.post("/api/v1/admin/pricing-settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing-settings"] }),
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Omit<PricingRuleInput, "vehicleCategory" | "rideType">> & { isActive?: boolean }) =>
      api.put(`/api/v1/admin/pricing-settings/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing-settings"] }),
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/pricing-settings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-pricing-settings"] }),
  });
}
