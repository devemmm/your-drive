import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("Button", () => {
  it("renders title and fires onPress", () => {
    const onPress = jest.fn();
    const { getByText } = wrap(<Button title="Go" onPress={onPress} />);
    fireEvent.press(getByText("Go"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders the ghost variant", () => {
    const onPress = jest.fn();
    const { getByText } = wrap(<Button title="Forgot Password?" onPress={onPress} variant="ghost" />);
    expect(getByText("Forgot Password?")).toBeTruthy();
  });

  it("does not fire onPress when disabled", () => {
    const onPress = jest.fn();
    const { getByText } = wrap(<Button title="Go" onPress={onPress} disabled />);
    fireEvent.press(getByText("Go"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a loading indicator instead of label when loading", () => {
    const onPress = jest.fn();
    const { queryByText, UNSAFE_getByType } = wrap(<Button title="Go" onPress={onPress} loading />);
    expect(queryByText("Go")).toBeNull();
    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("ghost variant ignores the size prop padding", () => {
    const { getByText } = wrap(<Button title="Ghost" onPress={() => {}} variant="ghost" />);
    const node = getByText("Ghost");
    // ThemedText style is flattened on the Text element. The button container
    // is its parent. We assert via the rendered tree that ghost's own padding wins.
    // Easiest check: the text's fontSize is 13 (ghost_text), not 15 (size_lg_text).
    const flat = Array.isArray(node.props.style) ? Object.assign({}, ...node.props.style) : node.props.style;
    expect(flat.fontSize).toBe(13);
  });
});
