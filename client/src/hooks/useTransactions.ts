import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/services/api";

// Types
export interface Transaction {
  id: number;
  userId: number;
  rideId?: number;
  planId?: number;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "ONHOLD" | "REFUNDED" | "PARTIALLY_REFUNDED";
  type: "RIDE_PAYMENT" | "SUBSCRIPTION" | "REFUND";
  paymentProvider: "STRIPE" | "PAYPAL" | "INTERAC";
  paymentIntentId?: string;
  refundId?: string;
  metadata?: Record<string, any>;
  user: {
    id: number;
    name: string;
    email: string;
    profileImage?: {
      url: string;
    };
  };
  ride?: {
    id: number;
    status: string;
    startLocation: string;
    endLocation: string;
  };
  plan?: {
    id: number;
    name: string;
    type: string;
  };
  createdAt: string;
  updatedAt: string;
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

export interface TransactionsQueryParams {
  page?: number;
  pageSize?: number;
  status?: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "ONHOLD" | "REFUNDED" | "PARTIALLY_REFUNDED";
  type?: "RIDE_PAYMENT" | "SUBSCRIPTION" | "REFUND";
  paymentProvider?: "STRIPE" | "PAYPAL" | "INTERAC";
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  transactionId?: number;
}

export const useTransactions = (params: TransactionsQueryParams = {}) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Get all transactions with pagination and filters
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["transactions", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });

      return api.get<PaginatedResponse<Transaction>>(
        `/api/v1/transactions?${searchParams.toString()}`
      );
    },
  });

  // Get transaction by ID
  const getTransactionById = useQuery({
    queryKey: ["transaction", params.transactionId],
    queryFn: async () => {
      if (!params.transactionId) return null;
      return api.get<{ success: boolean; data: Transaction }>(
        `/api/v1/transactions/${params.transactionId}`
      );
    },
    enabled: !!params.transactionId,
  });

  // Process refund
  const processRefund = useMutation({
    mutationFn: async (transactionId: number) => {
      return api.post<{ success: boolean; data: Transaction }>(
        `/api/v1/transactions/${transactionId}/refund`
      );
    },
    onSuccess: () => {
      toast.success(t("transactions.refundSuccess"));
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("transactions.refundError"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  return {
    transactions: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error,
    refetch,
    transaction: getTransactionById.data?.data,
    isTransactionLoading: getTransactionById.isLoading,
    transactionError: getTransactionById.error,
    processRefund: processRefund.mutate,
    isRefunding: processRefund.isPending,
  };
};
