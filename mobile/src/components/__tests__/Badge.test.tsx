import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Badge } from "@/components/ui/Badge";
import { lightColors } from "@/lib/theme";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("Badge", () => {
  it("renders label", () => {
    const { getByText } = wrap(<Badge label="P2P" />);
    expect(getByText("P2P")).toBeTruthy();
  });

  it("uses primaryDark for the primary variant text color", () => {
    const { getByText } = wrap(<Badge label="P2P" variant="primary" />);
    const style = getByText("P2P").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.color).toBe(lightColors.primaryDark);
  });
});
