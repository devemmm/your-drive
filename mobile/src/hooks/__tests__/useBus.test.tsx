import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("@/services/api", () => ({ publicApi: { get: jest.fn() }, api: { post: jest.fn() } }));
import { publicApi } from "@/services/api";
import { useBusOperators, useOperatorRoutes, useRouteDepartures } from "@/hooks/useBus";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}
beforeEach(() => jest.clearAllMocks());

it("useBusOperators unwraps { operators }", async () => {
  (publicApi.get as jest.Mock).mockResolvedValue({ operators: [{ id: 1, name: "City Link" }] });
  const { result } = renderHook(() => useBusOperators(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 1, name: "City Link" }]));
  expect(publicApi.get).toHaveBeenCalledWith("/public/operators");
});

it("useOperatorRoutes is disabled without an id and hits the right url", async () => {
  (publicApi.get as jest.Mock).mockResolvedValue({ routes: [{ id: 7 }] });
  const { result } = renderHook(() => useOperatorRoutes("5"), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 7 }]));
  expect(publicApi.get).toHaveBeenCalledWith("/public/operators/5/routes");
});

it("useRouteDepartures unwraps { departures }", async () => {
  (publicApi.get as jest.Mock).mockResolvedValue({ departures: [{ id: 9, timeOfDay: "06:00", fare: 25000 }] });
  const { result } = renderHook(() => useRouteDepartures("1"), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 9, timeOfDay: "06:00", fare: 25000 }]));
  expect(publicApi.get).toHaveBeenCalledWith("/public/bus-routes/1/trips");
});
