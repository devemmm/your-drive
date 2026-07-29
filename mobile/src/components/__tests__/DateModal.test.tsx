import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { DateModal } from "../DateModal";

describe("DateModal", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-13T10:00:00Z"));
  });
  afterAll(() => jest.useRealTimers());

  function renderWithTheme(element: React.ReactElement) {
    return render(<ThemeProvider>{element}</ThemeProvider>);
  }

  function createDate(year: number, month: number, day: number) {
    return new Date(year, month - 1, day);
  }

  it("renders today highlighted", () => {
    const { getByTestId } = renderWithTheme(
      <DateModal visible value={createDate(2026, 5, 13)} onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(getByTestId("home.dateModal.day.2026-05-13.today")).toBeTruthy();
  });

  function getLocalDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  it("disables Confirm until a different day is picked? — Confirm is always enabled with current selection", () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderWithTheme(
      <DateModal visible value={createDate(2026, 5, 13)} onConfirm={onConfirm} onCancel={() => {}} />
    );
    fireEvent.press(getByTestId("home.dateModal.confirm"));
    expect(onConfirm).toHaveBeenCalledWith(expect.any(Date));
    const arg = onConfirm.mock.calls[0][0] as Date;
    expect(getLocalDateString(arg)).toBe("2026-05-13");
  });

  it("tapping a future day selects it and Confirm passes that date", () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderWithTheme(
      <DateModal visible value={createDate(2026, 5, 13)} onConfirm={onConfirm} onCancel={() => {}} />
    );
    fireEvent.press(getByTestId("home.dateModal.day.2026-05-20"));
    fireEvent.press(getByTestId("home.dateModal.confirm"));
    const arg = onConfirm.mock.calls[0][0] as Date;
    expect(getLocalDateString(arg)).toBe("2026-05-20");
  });

  it("does not render past days as tappable", () => {
    const { queryByTestId } = renderWithTheme(
      <DateModal visible value={createDate(2026, 5, 13)} onConfirm={() => {}} onCancel={() => {}} />
    );
    // May 1 is in the past relative to "today" 2026-05-13
    expect(queryByTestId("home.dateModal.day.2026-05-01")).toBeNull();
  });
});
