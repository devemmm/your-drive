import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl } from "@/data";
import { useReactItems } from "@/lib/ReactTranslation";

export function useRequiredCouponsByType(type) {
  const { currentLanguage } = useReactItems();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coupons", currentLanguage],
    queryFn: async () => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/public/coupons/redemption-rules?lang=${currentLanguage}`
      );
      return data;
    },
  });

  const normalizedType = type?.toUpperCase();
  const rules = data?.data || [];

  const matchingRule = rules.find(
    (rule) => rule.target.toUpperCase() === normalizedType
  );

  return {
    requiredCoupons: matchingRule?.requiredCoupons ?? null,
    isLoading,
    isError,
  };
}
