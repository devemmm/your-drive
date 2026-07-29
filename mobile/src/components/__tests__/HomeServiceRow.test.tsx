import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { HomeServiceRow } from "@/components/HomeServiceRow";

// The cue/overflow logic relies on ScrollView's onLayout / onContentSizeChange /
// onScroll props and its imperative scrollToEnd() method. RN's real ScrollView
// only exposes onContentSizeChange via an inner content-container node that
// isn't reachable through public testIDs, and scrollToEnd is an own-instance
// method (not on the prototype), so it can't be spied on directly. We swap in
// a thin forwardRef mock that exposes all of those the same way a real
// ScrollView does to consumers, so we can drive/observe them from the test.
const mockScrollToEnd = jest.fn();

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  const React = require("react");
  const MockScrollView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ scrollToEnd: mockScrollToEnd }));
    const { children, ...rest } = props;
    return React.createElement(RN.View, rest, children);
  });
  // Proxy (rather than object-spread) so RN's lazily-defined getters (e.g.
  // DevMenu, only resolvable on a real native binary) aren't eagerly
  // evaluated — spreading `RN` would force every getter to run immediately.
  return new Proxy(RN, {
    get(target, prop, receiver) {
      if (prop === "ScrollView") return MockScrollView;
      return Reflect.get(target, prop, receiver);
    },
  });
});

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

const noop = () => {};

describe("HomeServiceRow", () => {
  beforeEach(() => {
    mockScrollToEnd.mockClear();
  });

  it("renders 5 pills with the required testIDs", () => {
    const { getByTestId } = wrap(
      <HomeServiceRow
        vehicleType="CAR"
        onSelectVehicle={noop}
        onOpenRental={noop}
        onOpenChauffeur={noop}
      />
    );
    expect(getByTestId("home.vehicleTab.CAR")).toBeTruthy();
    expect(getByTestId("home.vehicleTab.MOTORBIKE")).toBeTruthy();
    expect(getByTestId("home.vehicleTab.BUS")).toBeTruthy();
    expect(getByTestId("home.serviceTab.RENTAL")).toBeTruthy();
    expect(getByTestId("home.serviceTab.CHAUFFEUR")).toBeTruthy();
  });

  it("tapping RENTAL fires onOpenRental and not onSelectVehicle", () => {
    const onSelectVehicle = jest.fn();
    const onOpenRental = jest.fn();
    const { getByTestId } = wrap(
      <HomeServiceRow
        vehicleType="CAR"
        onSelectVehicle={onSelectVehicle}
        onOpenRental={onOpenRental}
        onOpenChauffeur={noop}
      />
    );
    fireEvent.press(getByTestId("home.serviceTab.RENTAL"));
    expect(onOpenRental).toHaveBeenCalledTimes(1);
    expect(onSelectVehicle).not.toHaveBeenCalled();
  });

  it("tapping CHAUFFEUR fires onOpenChauffeur and not onSelectVehicle", () => {
    const onSelectVehicle = jest.fn();
    const onOpenChauffeur = jest.fn();
    const { getByTestId } = wrap(
      <HomeServiceRow
        vehicleType="CAR"
        onSelectVehicle={onSelectVehicle}
        onOpenRental={noop}
        onOpenChauffeur={onOpenChauffeur}
      />
    );
    fireEvent.press(getByTestId("home.serviceTab.CHAUFFEUR"));
    expect(onOpenChauffeur).toHaveBeenCalledTimes(1);
    expect(onSelectVehicle).not.toHaveBeenCalled();
  });

  it("tapping BUS fires onSelectVehicle('BUS')", () => {
    const onSelectVehicle = jest.fn();
    const { getByTestId } = wrap(
      <HomeServiceRow
        vehicleType="CAR"
        onSelectVehicle={onSelectVehicle}
        onOpenRental={noop}
        onOpenChauffeur={noop}
      />
    );
    fireEvent.press(getByTestId("home.vehicleTab.BUS"));
    expect(onSelectVehicle).toHaveBeenCalledWith("BUS");
  });

  it("hides the overflow cue initially, shows it once content overflows, and hides it again once scrolled to the end", () => {
    const { getByTestId, queryByTestId } = wrap(
      <HomeServiceRow
        vehicleType="CAR"
        onSelectVehicle={noop}
        onOpenRental={noop}
        onOpenChauffeur={noop}
      />
    );
    expect(queryByTestId("home.serviceScrollCue")).toBeNull();

    const scrollView = getByTestId("home.serviceRow.scroll");

    // Layout is narrower than content -> overflowing, cue should appear.
    fireEvent(scrollView, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 56 } },
    });
    fireEvent(scrollView, "contentSizeChange", 500, 56);
    expect(getByTestId("home.serviceScrollCue")).toBeTruthy();

    // Scroll to (within 16px of) the end -> cue should hide.
    fireEvent(scrollView, "scroll", {
      nativeEvent: {
        contentOffset: { x: 200, y: 0 },
        contentSize: { width: 500, height: 56 },
        layoutMeasurement: { width: 300, height: 56 },
      },
    });
    expect(queryByTestId("home.serviceScrollCue")).toBeNull();

    // Scrolling back away from the end reveals the cue again.
    fireEvent(scrollView, "scroll", {
      nativeEvent: {
        contentOffset: { x: 0, y: 0 },
        contentSize: { width: 500, height: 56 },
        layoutMeasurement: { width: 300, height: 56 },
      },
    });
    expect(getByTestId("home.serviceScrollCue")).toBeTruthy();
  });

  it("tapping the cue calls scrollToEnd on the ScrollView", () => {
    const { getByTestId } = wrap(
      <HomeServiceRow
        vehicleType="CAR"
        onSelectVehicle={noop}
        onOpenRental={noop}
        onOpenChauffeur={noop}
      />
    );
    const scrollView = getByTestId("home.serviceRow.scroll");
    fireEvent(scrollView, "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 56 } },
    });
    fireEvent(scrollView, "contentSizeChange", 500, 56);

    fireEvent.press(getByTestId("home.serviceScrollCue"));
    expect(mockScrollToEnd).toHaveBeenCalledWith({ animated: true });
  });
});
