import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuthContext } from "../AuthProvider";

// jest hoists `jest.mock` above declarations, so refs must be `mock*`-prefixed.
const mockReplace = jest.fn();
const mockRemoveToken = jest.fn(() => Promise.resolve());
const mockClear = jest.fn();
let mockForcedSignOut: (() => void) | null = null;

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));
jest.mock("@/services/auth", () => ({
  authStorage: {
    getToken: jest.fn(() => Promise.resolve("existing-token")),
    removeToken: (...args: unknown[]) => mockRemoveToken(...args),
  },
}));
jest.mock("@/services/api", () => ({
  setOnSignOut: (cb: () => void) => {
    mockForcedSignOut = cb;
  },
}));
jest.mock("@/hooks/useUser", () => ({
  useCurrentUser: () => ({ data: { id: "u1", name: "Test" }, isLoading: false }),
}));
jest.mock("../QueryProvider", () => ({
  queryClient: {
    clear: (...args: unknown[]) => mockClear(...args),
    invalidateQueries: jest.fn(),
  },
}));

function Probe() {
  const { signOut } = useAuthContext();
  return (
    <Text testID="probe.signOut" onPress={() => signOut()}>
      sign out
    </Text>
  );
}

describe("AuthProvider sign-out navigation", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockRemoveToken.mockClear();
    mockClear.mockClear();
    mockForcedSignOut = null;
  });

  it("redirects to the welcome screen after an explicit sign out", async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    // Let loadToken() resolve so the user starts authenticated.
    await act(async () => {});

    await act(async () => {
      await getByTestId("probe.signOut").props.onPress();
    });

    expect(mockRemoveToken).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/welcome");
  });

  it("redirects to the welcome screen when the session is forcibly cleared (401)", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await act(async () => {});

    expect(mockForcedSignOut).toBeTruthy();
    await act(async () => {
      mockForcedSignOut!();
    });

    expect(mockReplace).toHaveBeenCalledWith("/(auth)/welcome");
  });
});
