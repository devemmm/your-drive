import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useReverseGeocode } from "../useReverseGeocode";

jest.mock("expo-location", () => ({
  reverseGeocodeAsync: jest.fn(),
}));

import * as Location from "expo-location";
const mockReverseGeo = Location.reverseGeocodeAsync as jest.Mock;

describe("useReverseGeocode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("debounces lookups by 300ms", async () => {
    mockReverseGeo.mockResolvedValue([{ city: "Kigali", street: "KG 7 Ave", name: "Place X", district: "Nyarugenge", region: "Kigali" }]);
    const { result } = renderHook(() => useReverseGeocode());

    act(() => result.current.lookup({ latitude: -1.94, longitude: 30.06 }));
    act(() => result.current.lookup({ latitude: -1.95, longitude: 30.07 }));
    act(() => result.current.lookup({ latitude: -1.96, longitude: 30.08 }));

    // No call yet — debounce is pending
    expect(mockReverseGeo).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(mockReverseGeo).toHaveBeenCalledTimes(1));
    expect(mockReverseGeo).toHaveBeenCalledWith({ latitude: -1.96, longitude: 30.08 });
  });

  it("returns { label, city } from the last result", async () => {
    mockReverseGeo.mockResolvedValue([{ city: "Harare", street: "Borrowdale Rd", name: "Borrowdale", district: null, region: null }]);
    const { result } = renderHook(() => useReverseGeocode());
    act(() => result.current.lookup({ latitude: -17.8, longitude: 31.0 }));
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.result?.city).toBe("Harare"));
    expect(result.current.result?.label).toBe("Borrowdale Rd");
  });

  it("falls back to name when street is missing", async () => {
    mockReverseGeo.mockResolvedValue([{ city: "Huye", street: null, name: "Bus Park", district: null, region: null }]);
    const { result } = renderHook(() => useReverseGeocode());
    act(() => result.current.lookup({ latitude: -2.59, longitude: 29.73 }));
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.result?.label).toBe("Bus Park"));
  });

  it("exposes an error when expo-location throws", async () => {
    mockReverseGeo.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useReverseGeocode());
    act(() => result.current.lookup({ latitude: 0, longitude: 0 }));
    act(() => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(result.current.error).toBe("network down"));
  });
});
