import { api } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface CouponRedemptionRule {
  id: number;
  target:
    | "RIDE_BOOKING"
    | "RIDE_POSTING"
    | "DRIVER_SUBSCRIPTION"
    | "PASSENGER_SUBSCRIPTION"
    | "BOTH_SUBSCRIPTION"
    | string;
  requiredCoupons: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
}

interface ApiItemResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const useCouponRedemptionRules = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "couponRedemptionRules"],
    queryFn: async () => {
      const response = (await api.get<ApiListResponse<CouponRedemptionRule>>(
        "/api/v1/admin/coupon-redemption-rules"
      )) as ApiListResponse<CouponRedemptionRule>;
      return response?.data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const updateRule = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: Pick<CouponRedemptionRule, "requiredCoupons" | "description">;
    }) => {
      // PUT /api/v1/admin/coupon-redemption-rules/{ruleId}
      return (await api.put<ApiItemResponse<CouponRedemptionRule>>(
        `/api/v1/admin/coupon-redemption-rules/${id}`,
        payload
      )) as ApiItemResponse<CouponRedemptionRule>;
    },
    onSuccess: () => {
      toast.success(
        t("couponRules.updateSuccess", "Coupon redemption rule updated")
      );
      queryClient.invalidateQueries({
        queryKey: ["admin", "couponRedemptionRules"],
      });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          t("couponRules.updateError", "Failed to update redemption rule"),
        { className: "custom-error-toast" }
      );
    },
  });

  return {
    rules: data ?? [],
    isLoading,
    error,
    refetch,
    updateRule: updateRule.mutate,
    isUpdating: updateRule.isPending,
  };
};
