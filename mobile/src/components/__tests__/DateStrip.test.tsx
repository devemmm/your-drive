import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DateStrip } from "../DateStrip";
import { ThemeProvider } from "@/providers/ThemeProvider";

describe("DateStrip", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-13T10:00:00Z")); // Wed
  });
  afterAll(() => jest.useRealTimers());

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  it("renders Today + Tomorrow + 5 weekday chips + Pick chip", () => {
    const { getByTestId } = renderWithTheme(<DateStrip value={new Date("2026-05-13")} onChange={() => {}} onPickPress={() => {}} />);
    expect(getByTestId("home.dateStrip.today.selected")).toBeTruthy();
    expect(getByTestId("home.dateStrip.tomorrow")).toBeTruthy();
    expect(getByTestId("home.dateStrip.pick")).toBeTruthy();
  });

  it("today chip is selected when value is today", () => {
    const { getByTestId } = renderWithTheme(<DateStrip value={new Date("2026-05-13")} onChange={() => {}} onPickPress={() => {}} />);
    expect(getByTestId("home.dateStrip.today.selected")).toBeTruthy();
  });

  it("tapping a chip calls onChange with that date", () => {
    const onChange = jest.fn();
    const { getByTestId } = renderWithTheme(<DateStrip value={new Date("2026-05-13")} onChange={onChange} onPickPress={() => {}} />);
    fireEvent.press(getByTestId("home.dateStrip.tomorrow"));
    const called = onChange.mock.calls[0][0] as Date;
    expect(called.toISOString().split("T")[0]).toBe("2026-05-14");
  });

  it("tapping Pick calls onPickPress", () => {
    const onPick = jest.fn();
    const { getByTestId } = renderWithTheme(<DateStrip value={new Date("2026-05-13")} onChange={() => {}} onPickPress={onPick} />);
    fireEvent.press(getByTestId("home.dateStrip.pick"));
    expect(onPick).toHaveBeenCalled();
  });
});
