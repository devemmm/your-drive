import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PickerProvider, usePicker } from "@/providers/PickerProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LocationPickerCard } from "../LocationPickerCard";

jest.mock("@/hooks/useCurrentLocation", () => ({
  useCurrentLocation: () => ({ location: null, address: null, city: null, isLoading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("@/hooks/usePlaces", () => ({
  usePlacesSessionToken: () => "test-session-token",
  useAddressAutocomplete: () => ({ data: { data: { predictions: [] } }, isFetching: false }),
  fetchPlaceDetails: jest.fn(() => Promise.resolve(null)),
}));

function renderWithProvider(ui = <LocationPickerCard />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PickerProvider>{ui}</PickerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("LocationPickerCard", () => {
  it("renders From row with 'Current location' default label", () => {
    const { getByTestId, getByText } = renderWithProvider();
    expect(getByTestId("picker.fromField")).toBeTruthy();
    expect(getByText("Current location")).toBeTruthy();
  });

  it("renders To row with 'Where to?' placeholder when empty", () => {
    const { getByTestId, getByText } = renderWithProvider();
    expect(getByTestId("picker.toField")).toBeTruthy();
    expect(getByText("Where to?")).toBeTruthy();
  });

  it("tapping the From row activates from in the provider", () => {
    let snapshot: any;
    const Spy = () => { snapshot = usePicker(); return <></>; };
    const { getByTestId } = renderWithProvider(
      <>
        <LocationPickerCard />
        <Spy />
      </>
    );
    fireEvent.press(getByTestId("picker.fromField"));
    expect(snapshot.activeField).toBe("from");
    expect(snapshot.mode).toBe("picking");
  });

  it("renders the active row with .active testID suffix and reveals the search input", () => {
    const { getByTestId, queryByTestId } = renderWithProvider();
    fireEvent.press(getByTestId("picker.toField"));
    expect(getByTestId("picker.toField.active")).toBeTruthy();
    expect(getByTestId("picker.searchInput")).toBeTruthy();
    // Chip + explicit confirm button were removed — auto-confirm on suggestion press.
    expect(queryByTestId("picker.useCurrentLocationChip")).toBeNull();
    expect(queryByTestId("picker.confirm")).toBeNull();
  });
});
