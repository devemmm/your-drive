import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Card } from "@/components/ui/Card";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("Card", () => {
  it("renders children", () => {
    const { getByText } = wrap(
      <Card>
        <Text>inside</Text>
      </Card>
    );
    expect(getByText("inside")).toBeTruthy();
  });

  it("uses a border and no shadow by default", () => {
    const { getByTestId } = wrap(
      <Card testID="card.default">
        <Text>x</Text>
      </Card>
    );
    const style = getByTestId("card.default").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.borderWidth).toBe(1);
    expect(flat.shadowOpacity ?? 0).toBe(0);
  });

  it("applies a shadow when elevated", () => {
    const { getByTestId } = wrap(
      <Card testID="card.elevated" elevated>
        <Text>x</Text>
      </Card>
    );
    const style = getByTestId("card.elevated").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.shadowOpacity).toBeGreaterThan(0);
  });
});
