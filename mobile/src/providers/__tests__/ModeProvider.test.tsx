import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ModeProvider, useMode } from "../ModeProvider";

// Drive the user object the provider reads from AuthProvider.
let mockUser: any = null;
jest.mock("../AuthProvider", () => ({
  useAuthContext: () => ({ user: mockUser }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ModeProvider>{children}</ModeProvider>
);

describe("ModeProvider", () => {
  beforeEach(() => {
    mockUser = null;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  it("defaults to passenger when nothing is stored and user is not a driver", async () => {
    mockUser = { isDriverOnboarded: false };
    const { result } = renderHook(() => useMode(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe("passenger"));
    expect(result.current.isDriverMode).toBe(false);
  });

  it("defaults to driver when nothing is stored and the user is driver-onboarded", async () => {
    mockUser = { isDriverOnboarded: true };
    const { result } = renderHook(() => useMode(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe("driver"));
    expect(result.current.isDriverMode).toBe(true);
  });

  it("clamps a stored 'driver' preference back to passenger when not driver-onboarded", async () => {
    mockUser = { isDriverOnboarded: false };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("driver");
    const { result } = renderHook(() => useMode(), { wrapper });
    // Even after the stored value loads, a non-onboarded account stays passenger.
    await act(async () => {});
    expect(result.current.mode).toBe("passenger");
  });

  it("setMode persists the choice and updates the mode", async () => {
    mockUser = { isDriverOnboarded: true };
    const { result } = renderHook(() => useMode(), { wrapper });
    await act(async () => {
      await result.current.setMode("passenger");
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@yourdrive/app_mode", "passenger");
    expect(result.current.mode).toBe("passenger");
  });

  it("throws if useMode is used outside the provider", () => {
    const { result } = renderHook(() => {
      try {
        return useMode();
      } catch (e: any) {
        return e.message;
      }
    });
    expect(result.current).toMatch(/ModeProvider/);
  });
});
