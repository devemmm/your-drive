import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { PickerProvider, usePicker } from "../PickerProvider";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PickerProvider>{children}</PickerProvider>
);

describe("PickerProvider", () => {
  it("starts idle with From = current, To = null", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    expect(result.current.mode).toBe("idle");
    expect(result.current.activeField).toBeNull();
    expect(result.current.from).toEqual({ kind: "current", label: "Current location", city: "" });
    expect(result.current.to).toBeNull();
  });

  it("activates a field and switches to picking mode", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    act(() => result.current.activate("to"));
    expect(result.current.mode).toBe("picking");
    expect(result.current.activeField).toBe("to");
  });

  it("setField writes the picked value to the active field", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    act(() => result.current.activate("to"));
    act(() => result.current.setField("to", {
      kind: "place",
      placeId: "p1",
      label: "Huye Bus Park",
      city: "Huye",
      latitude: -2.6,
      longitude: 29.7,
    }));
    expect(result.current.to?.city).toBe("Huye");
    expect(result.current.to?.label).toBe("Huye Bus Park");
  });

  it("confirm() resets to idle but preserves selections", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    act(() => result.current.activate("to"));
    act(() => result.current.setField("to", { kind: "place", placeId: "p1", label: "X", city: "Y", latitude: 0, longitude: 0 }));
    act(() => result.current.confirm());
    expect(result.current.mode).toBe("idle");
    expect(result.current.activeField).toBeNull();
    expect(result.current.to?.label).toBe("X");
  });

  it("useCurrentLocationFor('from') sets a current-kind value with the supplied city", () => {
    const { result } = renderHook(() => usePicker(), { wrapper });
    act(() => result.current.useCurrentLocationFor("from", { city: "Kigali", latitude: -1.9, longitude: 30.0 }));
    expect(result.current.from.kind).toBe("current");
    expect(result.current.from.city).toBe("Kigali");
  });

  it("throws if usePicker is used outside the provider", () => {
    const { result } = renderHook(() => {
      try { return usePicker(); } catch (e: any) { return e.message; }
    });
    expect(result.current).toMatch(/PickerProvider/);
  });
});
