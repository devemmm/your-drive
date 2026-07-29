import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { VehiclePill } from "@/components/ui/VehiclePill";
import { lightColors } from "@/lib/theme";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("VehiclePill", () => {
  it("renders icon + label", () => {
    const { getByText } = wrap(<VehiclePill icon="car" label="Car" onPress={() => {}} />);
    expect(getByText("Car")).toBeTruthy();
  });

  it("fires onPress", () => {
    const onPress = jest.fn();
    const { getByText } = wrap(<VehiclePill icon="car" label="Car" onPress={onPress} />);
    fireEvent.press(getByText("Car"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses primary background when selected", () => {
    const { getByTestId } = wrap(
      <VehiclePill icon="car" label="Car" selected onPress={() => {}} testID="pill.car" />
    );
    const style = getByTestId("pill.car").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.backgroundColor).toBe(lightColors.primary);
  });
});
