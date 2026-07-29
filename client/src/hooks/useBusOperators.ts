import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";

export interface BusOperator {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  status: string;
  isActive: boolean;
  createdAt: string;
}

interface CreateBusOperatorInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export function useBusOperators() {
  return useQuery({
    queryKey: ["bus-operators"],
    queryFn: async () => {
      // GET /api/v1/users?role=BUS_OPERATOR — admin-only endpoint, supports role param
      const res = await api.get<{
        success: boolean;
        data: BusOperator[];
        pagination: object;
      }>("/api/v1/users", { params: { role: "BUS_OPERATOR", pageSize: 200 } });

      // res is already response.data (api wrapper unwraps axios)
      const users: BusOperator[] = (res as any).data ?? res ?? [];

      // Client-side filter as fallback in case endpoint ignores role param
      return (users as BusOperator[]).filter(
        (u) => u.role === "BUS_OPERATOR"
      );
    },
  });
}

export function useCreateBusOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBusOperatorInput) => {
      // Admin-only creation endpoint that sets the role atomically.
      // Creates the user ACTIVE + KYC-approved, so it appears in the
      // BUS_OPERATOR list immediately (no manual DB role edit needed).
      const res = await api.post("/api/v1/admin/users", {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        password: input.password,
        role: "BUS_OPERATOR",
      });
      return res;
    },
    onSuccess: () => {
      toast.success("Operator created. They can now log in to the operator dashboard.");
      qc.invalidateQueries({ queryKey: ["bus-operators"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create operator account",
        { className: "custom-error-toast" }
      );
    },
  });
}
