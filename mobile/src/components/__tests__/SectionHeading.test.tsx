import React from "react";
import { render } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SectionHeading } from "@/components/ui/SectionHeading";

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("SectionHeading", () => {
  it("renders the title", () => {
    const { getByText } = wrap(<SectionHeading title="How It Works" />);
    expect(getByText("How It Works")).toBeTruthy();
  });

  it("renders the subtitle when provided", () => {
    const { getByText } = wrap(
      <SectionHeading title="How It Works" subtitle="Three simple steps to get moving" />
    );
    expect(getByText("Three simple steps to get moving")).toBeTruthy();
  });

  it("renders an accent bar", () => {
    const { getByTestId } = wrap(<SectionHeading title="x" />);
    expect(getByTestId("sectionHeading.accentBar")).toBeTruthy();
  });
});
