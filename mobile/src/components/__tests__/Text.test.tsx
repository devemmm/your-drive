import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemedText } from "@/components/ui/Text";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("ThemedText", () => {
  it("renders its children", () => {
    const { getByText } = wrap(<ThemedText>Hello</ThemedText>);
    expect(getByText("Hello")).toBeTruthy();
  });

  it("applies Jost_400Regular by default when fonts are loaded", () => {
    const { getByText } = wrap(<ThemedText>Body</ThemedText>);
    const node = getByText("Body");
    expect(node.props.style).toEqual(
      expect.objectContaining({ fontFamily: "Jost_400Regular" })
    );
  });

  it("maps weight=700 to Jost_700Bold", () => {
    const { getByText } = wrap(<ThemedText weight={700}>Title</ThemedText>);
    expect(getByText("Title").props.style).toEqual(
      expect.objectContaining({ fontFamily: "Jost_700Bold" })
    );
  });

  it("maps weight=600 to Jost_600SemiBold", () => {
    const { getByText } = wrap(<ThemedText weight={600}>Label</ThemedText>);
    expect(getByText("Label").props.style).toEqual(
      expect.objectContaining({ fontFamily: "Jost_600SemiBold" })
    );
  });

  it("maps weight=500 to Jost_500Medium", () => {
    const { getByText } = wrap(<ThemedText weight={500}>Medium</ThemedText>);
    expect(getByText("Medium").props.style).toEqual(
      expect.objectContaining({ fontFamily: "Jost_500Medium" })
    );
  });

  it("uses System font as fallback when fontsLoaded is false", () => {
    const fonts = require("@expo-google-fonts/jost");
    const spy = jest.spyOn(fonts, "useFonts").mockReturnValue([false]);
    try {
      const { getByText } = wrap(<ThemedText>Fallback</ThemedText>);
      expect(getByText("Fallback").props.style).toEqual(
        expect.objectContaining({ fontFamily: "System" })
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("applies fontSize from the size token when set", () => {
    const { getByText } = wrap(<ThemedText size="h2">Heading</ThemedText>);
    expect(getByText("Heading").props.style).toEqual(
      expect.objectContaining({ fontSize: 24 })
    );
  });
});
