import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export type WalletSettings = {
  id: number;
  defaultDebtLimitCents: number;
  enforceDebtLimit: boolean;
};

export const useWalletSettings = () =>
  useQuery({
    queryKey: ["wallet-settings"],
    queryFn: async () => {
      const res = await api.get("/api/v1/admin/wallet-settings");
      return (res.settings ?? res.data?.settings ?? res) as WalletSettings;
    },
  });

export const useUpdateWalletSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<
        Pick<WalletSettings, "defaultDebtLimitCents" | "enforceDebtLimit">
      >
    ) => {
      const res = await api.patch("/api/v1/admin/wallet-settings", input);
      return (res.settings ?? res.data?.settings ?? res) as WalletSettings;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet-settings"] }),
  });
};
