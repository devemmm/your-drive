import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export type WalletLedgerEntry = {
  id: number;
  type: string;
  amount: number | string; // server returns Float
  createdAt: string;
};

export type MyWallet = {
  balanceCents: number;
  debtLimitCents: number;
  enforceDebtLimit: boolean;
  ledger: WalletLedgerEntry[];
};

export const useMyWallet = () => useQuery({
  queryKey: ["my-wallet"],
  queryFn: async () => {
    const res = await api.get("/wallet/me");
    return (res as any) as MyWallet; // server returns the shape directly
  },
});
