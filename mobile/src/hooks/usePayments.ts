import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { PaginatedResponse, Transaction } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

interface ConfirmPaymentPayload {
  paymentSessionId: number;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
}

interface ConfirmPaymentResponse {
  success: boolean;
  data: {
    requiresAction?: boolean;
    clientSecret?: string;
    transactionId?: number;
    booking?: any;
  };
  message?: string;
}

export function useConfirmPayment() {
  return useMutation({
    mutationFn: (payload: ConfirmPaymentPayload) =>
      api.post<ConfirmPaymentResponse>("/transactions/confirm", payload),
  });
}

export function useFinalize3DS() {
  return useMutation({
    mutationFn: (payload: { paymentIntentId: string; paymentSessionId: number }) =>
      api.post<ConfirmPaymentResponse>("/transactions/finalize-3ds", payload),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions.all,
    queryFn: () => api.get<PaginatedResponse<Transaction>>("/transactions"),
  });
}

