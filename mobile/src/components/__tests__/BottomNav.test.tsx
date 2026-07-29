import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { BottomNav } from "@/components/ui/BottomNav";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("BottomNav", () => {
  it("renders item labels", () => {
    const { getByText } = wrap(
      <BottomNav
        items={[
          { icon: "home", label: "Home", active: true, onPress: () => {} },
          { icon: "trips", label: "Trips", onPress: () => {} },
        ]}
      />
    );
    expect(getByText("Home")).toBeTruthy();
    expect(getByText("Trips")).toBeTruthy();
  });

  it("fires onPress for the tapped item", () => {
    const onTrips = jest.fn();
    const { getByText } = wrap(
      <BottomNav
        items={[
          { icon: "home", label: "Home", onPress: () => {} },
          { icon: "trips", label: "Trips", onPress: onTrips },
        ]}
      />
    );
    fireEvent.press(getByText("Trips"));
    expect(onTrips).toHaveBeenCalledTimes(1);
  });
});
