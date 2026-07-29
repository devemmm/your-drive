// mobile/src/app/bus/route/[routeId]/__tests__/trips.test.tsx
import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ routeId: "1", routeTitle: "Harare → Bulawayo" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock("@/hooks/useBus", () => ({
  useRouteDepartures: () => ({
    data: [
      { id: 9, timeOfDay: "06:00", fare: 25000, vehicle: { make: "Scania", model: "Marcopolo", plateNumber: "AB", capacity: 45 } },
    ],
    isLoading: false,
  }),
  useMaterializeTrip: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => (cb: () => void) => cb(),
}));
import { ThemeProvider } from "@/providers/ThemeProvider";
import ScheduleScreen from "@/app/bus/route/[routeId]/trips";

it("renders the route title and a departure card", () => {
  const { getByText, getByTestId } = render(
    <ThemeProvider>
      <ScheduleScreen />
    </ThemeProvider>
  );
  expect(getByText("Harare → Bulawayo")).toBeTruthy();
  expect(getByTestId("bus.departure.9")).toBeTruthy();
  expect(getByText("06:00")).toBeTruthy();
  expect(getByText("Tap to pick a date")).toBeTruthy();
});
