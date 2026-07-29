import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SheetHandle } from "@/components/ui/SheetHandle";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("SheetHandle", () => {
  it("renders", () => {
    const { getByTestId } = wrap(<SheetHandle testID="sheet.handle" />);
    expect(getByTestId("sheet.handle")).toBeTruthy();
  });
});
