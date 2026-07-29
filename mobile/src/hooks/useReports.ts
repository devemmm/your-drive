import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export type ReportTarget =
  | { rideId: number; chauffeurServiceId?: never; rentalId?: never }
  | { chauffeurServiceId: number; rideId?: never; rentalId?: never }
  | { rentalId: number; rideId?: never; chauffeurServiceId?: never };

export interface ReportTripPayload {
  target: ReportTarget;
  subjectUserId: number;
  reason: string;
}

export function useReportTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReportTripPayload) =>
      api.post<ApiResponse<{ id: number }>>("/reports", {
        ...payload.target,
        subjectUserId: payload.subjectUserId,
        reason: payload.reason,
      }),
    onSuccess: (_, payload) => {
      if (payload.target.rideId) {
        qc.invalidateQueries({ queryKey: queryKeys.rides.detail(String(payload.target.rideId)) });
      }
    },
  });
}
