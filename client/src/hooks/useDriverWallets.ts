import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export type WalletRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  walletBalanceCents: number;
  walletDebtLimitCents: number | null;
};

export const useDriverWallets = (filters: { negative?: boolean } = {}) =>
  useQuery({
    queryKey: ["driver-wallets", filters],
    queryFn: async () => {
      const res = await api.get("/api/v1/wallet/admin/wallets", {
        params: { negative: filters.negative ? "true" : undefined },
      });
      return ((res as any).users ?? (res as any).data?.users ?? []) as WalletRow[];
    },
  });

export const useCreditWallet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: number;
      amountCents: number;
      reason: string;
    }) => {
      const res = await api.post(
        `/api/v1/wallet/admin/wallets/${input.userId}/credit`,
        {
          amountCents: input.amountCents,
          reason: input.reason,
        }
      );
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["driver-wallets"] }),
  });
};
