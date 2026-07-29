import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";

export type ManifestSeat = {
  id: number;
  attendanceCode: string;
  attendedAt: string | null;
  passengerName: string;
  seats: number;
  boardingStop: string | null;
};

type ManifestResponse = { bookingSeats: ManifestSeat[] };

export const useRideManifest = (rideId: number) => useQuery({
  queryKey: ["ride-manifest", rideId],
  queryFn: () =>
    api.get<ManifestResponse>(`/rides/${rideId}/manifest`).then(res => res.bookingSeats ?? []),
});

export const useAttendByCode = () => useMutation({
  mutationFn: (input: { rideId: number; attendanceCode: string }) =>
    api.post<unknown>(`/booking-seats/attend`, input),
});
