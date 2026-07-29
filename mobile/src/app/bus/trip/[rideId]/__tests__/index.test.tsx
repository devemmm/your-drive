// mobile/src/app/bus/trip/[rideId]/__tests__/index.test.tsx
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

const mockMutateAsync = jest.fn().mockResolvedValue({});
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ rideId: "9" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: mockReplace }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock("@/hooks/useBus", () => ({
  usePublicRide: () => ({
    data: {
      id: 9,
      contribution: 25,
      availableSeats: 3,
      route: {
        stops: [
          { id: 1, routeId: 1, name: "Harare", city: "Harare", order: 0, latitude: null, longitude: null },
          { id: 2, routeId: 1, name: "Bulawayo", city: "Bulawayo", order: 1, latitude: null, longitude: null },
        ],
      },
    },
    isLoading: false,
  }),
}));
jest.mock("@/hooks/useRides", () => ({
  useBookRide: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => (cb: () => void) => cb(),
}));

import { ThemeProvider } from "@/providers/ThemeProvider";
import BusBookingScreen from "@/app/bus/trip/[rideId]";

const renderScreen = () =>
  render(
    <ThemeProvider>
      <BusBookingScreen />
    </ThemeProvider>
  );

beforeEach(() => {
  mockMutateAsync.mockClear();
  mockReplace.mockClear();
});

it("starts at 1 seat and increments up to availableSeats", () => {
  const { getByTestId } = renderScreen();
  expect(getByTestId("bus.seats.count")).toHaveTextContent("1");
  fireEvent.press(getByTestId("bus.seats.plus"));
  fireEvent.press(getByTestId("bus.seats.plus"));
  expect(getByTestId("bus.seats.count")).toHaveTextContent("3");
  fireEvent.press(getByTestId("bus.seats.plus")); // at max, no-op
  expect(getByTestId("bus.seats.count")).toHaveTextContent("3");
});

it("does not go below 1 seat", () => {
  const { getByTestId } = renderScreen();
  fireEvent.press(getByTestId("bus.seats.minus"));
  expect(getByTestId("bus.seats.count")).toHaveTextContent("1");
});

it("multiplies the fare by the seat count", () => {
  const { getByTestId } = renderScreen();
  fireEvent.press(getByTestId("bus.seats.plus"));
  expect(getByTestId("bus.fare.total")).toHaveTextContent(/50/);
});

it("books with the selected seat count", async () => {
  const { getByTestId, getAllByText } = renderScreen();
  fireEvent.press(getByTestId("bus.seats.plus"));
  // "Confirm booking" is both the screen title and the button; press the button (last match)
  const matches = getAllByText("Confirm booking");
  fireEvent.press(matches[matches.length - 1]);
  await waitFor(() =>
    expect(mockMutateAsync).toHaveBeenCalledWith({
      rideId: 9,
      seats: 2,
      boardingStopId: 1,
      alightingStopId: 2,
    })
  );
});
