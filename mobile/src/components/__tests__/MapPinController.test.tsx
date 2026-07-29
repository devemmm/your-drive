import React from "react";
import { render, act } from "@testing-library/react-native";
import { PickerProvider, usePicker } from "@/providers/PickerProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { MapPinController } from "../MapPinController";

jest.mock("@/hooks/useReverseGeocode", () => ({
  useReverseGeocode: () => ({
    result: null, error: null, isLoading: false,
    lookup: jest.fn(),
    reset: jest.fn(),
  }),
}));

describe("MapPinController", () => {
  it("does not render the pin when mode is idle", () => {
    const { queryByTestId } = render(
      <ThemeProvider>
        <PickerProvider>
          <MapPinController onRegionChange={() => {}} />
        </PickerProvider>
      </ThemeProvider>
    );
    expect(queryByTestId("picker.centerPin")).toBeNull();
  });

  it("renders the pin when picker is active", () => {
    function Activate() {
      const p = usePicker();
      React.useEffect(() => { p.activate("to"); }, [p]);
      return null;
    }
    const { getByTestId } = render(
      <ThemeProvider>
        <PickerProvider>
          <Activate />
          <MapPinController onRegionChange={() => {}} />
        </PickerProvider>
      </ThemeProvider>
    );
    expect(getByTestId("picker.centerPin")).toBeTruthy();
  });
});
