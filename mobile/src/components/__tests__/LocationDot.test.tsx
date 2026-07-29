import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LocationDot } from "@/components/ui/LocationDot";
import { lightColors } from "@/lib/theme";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("LocationDot", () => {
  it("renders for from kind", () => {
    const { getByTestId } = wrap(<LocationDot kind="from" testID="dot.from" />);
    expect(getByTestId("dot.from")).toBeTruthy();
    const flat = Array.isArray(getByTestId("dot.from").props.style)
      ? Object.assign({}, ...getByTestId("dot.from").props.style)
      : getByTestId("dot.from").props.style;
    expect(flat.backgroundColor).toBe(lightColors.primary);
    expect(flat.borderWidth).toBe(0);
  });

  it("renders for to kind", () => {
    const { getByTestId } = wrap(<LocationDot kind="to" testID="dot.to" />);
    expect(getByTestId("dot.to")).toBeTruthy();
    const flat = Array.isArray(getByTestId("dot.to").props.style)
      ? Object.assign({}, ...getByTestId("dot.to").props.style)
      : getByTestId("dot.to").props.style;
    expect(flat.backgroundColor).toBe(lightColors.text.primary);
    expect(flat.borderWidth).toBe(0);
  });

  it("renders for stop kind", () => {
    const { getByTestId } = wrap(<LocationDot kind="stop" testID="dot.stop" />);
    expect(getByTestId("dot.stop")).toBeTruthy();
    const flat = Array.isArray(getByTestId("dot.stop").props.style)
      ? Object.assign({}, ...getByTestId("dot.stop").props.style)
      : getByTestId("dot.stop").props.style;
    expect(flat.backgroundColor).toBe(lightColors.background);
    expect(flat.borderWidth).toBe(2);
    expect(flat.borderColor).toBe(lightColors.text.primary);
  });
});
