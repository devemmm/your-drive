import { renderHook, act } from "@testing-library/react-native";
import { useRequireAuth } from "../useRequireAuth";

const mockRequestAuth = jest.fn();
const mockIsAuthenticated = jest.fn();

jest.mock("expo-router", () => ({
  usePathname: () => "/rental/abc",
}));
jest.mock("@/providers/AuthGateProvider", () => ({
  AuthGateProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuthGate: () => ({ requestAuth: mockRequestAuth }),
}));
jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({ isAuthenticated: mockIsAuthenticated() }),
}));

describe("useRequireAuth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs the callback synchronously when authenticated", () => {
    mockIsAuthenticated.mockReturnValue(true);
    const { result } = renderHook(() => useRequireAuth());
    const cb = jest.fn();
    act(() => result.current(cb));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(mockRequestAuth).not.toHaveBeenCalled();
  });

  it("stashes the callback and current pathname when guest", () => {
    mockIsAuthenticated.mockReturnValue(false);
    const { result } = renderHook(() => useRequireAuth());
    const cb = jest.fn();
    act(() => result.current(cb, { reason: "ignored" }));
    expect(cb).not.toHaveBeenCalled();
    expect(mockRequestAuth).toHaveBeenCalledWith(cb, "/rental/abc");
  });
});
