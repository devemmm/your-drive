import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("@/services/api", () => ({ api: { post: jest.fn() } }));
import { api } from "@/services/api";
import { useBookRide } from "@/hooks/useRides";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

it("posts boardingStopId and alightingStopId in the body", async () => {
  (api.post as jest.Mock).mockResolvedValue({ success: true, data: { bookingId: 1, attendanceCodes: ["X"] } });
  const { result } = renderHook(() => useBookRide(), { wrapper: wrapper() });
  await act(async () => {
    await result.current.mutateAsync({ rideId: 9, seats: 2, boardingStopId: 3, alightingStopId: 4 });
  });
  expect(api.post).toHaveBeenCalledWith("/rides/9/book", {
    seatsBooked: 2,
    boardingStopId: 3,
    alightingStopId: 4,
  });
});
