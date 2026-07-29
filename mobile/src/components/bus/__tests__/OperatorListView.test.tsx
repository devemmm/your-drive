// mobile/src/components/bus/__tests__/OperatorListView.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { OperatorListView } from "@/components/bus/OperatorListView";
import type { BusOperator } from "@/lib/types";

const ops: BusOperator[] = [
  { id: 1, name: "City Link", photoUrl: null, rating: 4.8, totalRatings: 320, routeCount: 12 },
  { id: 2, name: "Pioneer Coaches", photoUrl: null, rating: 4.6, totalRatings: 80, routeCount: 9 },
];

function renderView(onSelect = jest.fn()) {
  return {
    onSelect,
    ...render(
      <ThemeProvider>
        <OperatorListView operators={ops} onSelect={onSelect} />
      </ThemeProvider>
    ),
  };
}

it("renders operators and fires onSelect", () => {
  const { getByTestId, onSelect } = renderView();
  fireEvent.press(getByTestId("bus.operator.1"));
  expect(onSelect).toHaveBeenCalledWith(1);
});

it("filters by search text", () => {
  const { getByTestId, queryByText } = renderView();
  fireEvent.changeText(getByTestId("bus.operatorSearch"), "pioneer");
  expect(queryByText("Pioneer Coaches")).toBeTruthy();
  expect(queryByText("City Link")).toBeNull();
});
