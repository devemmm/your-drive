import React from "react";
import { render, act } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthGateProvider, useAuthGate } from "../AuthGateProvider";

// Flippable auth state and segments. jest hoists `jest.mock` above the
// variable declarations, so the references must be `mock*`-prefixed.
let mockAuthState: { isAuthenticated: boolean } = { isAuthenticated: false };
let mockSegments: string[] = ["(drawer)"];
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("../AuthProvider", () => ({
  useAuthContext: () => mockAuthState,
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSegments: () => mockSegments,
}));

function Probe() {
  const { requestAuth } = useAuthGate();
  const cb = React.useMemo(() => jest.fn().mockName("pendingCb"), []);
  // Expose the cb via a global handle so the test can assert on it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__pendingCb = cb;
  return (
    <Text
      testID="probe.request"
      onPress={() => requestAuth(cb, "/rental/abc")}
    >
      request
    </Text>
  );
}

function getPendingCb(): jest.Mock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).__pendingCb as jest.Mock;
}

describe("AuthGateProvider", () => {
  beforeEach(() => {
    mockAuthState = { isAuthenticated: false };
    mockSegments = ["(drawer)"];
    mockPush.mockClear();
    mockReplace.mockClear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("requestAuth pushes the welcome route and remembers the callback", () => {
    const { getByTestId } = render(
      <AuthGateProvider>
        <Probe />
      </AuthGateProvider>
    );
    act(() => getByTestId("probe.request").props.onPress());
    expect(mockPush).toHaveBeenCalledWith("/(auth)/welcome");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(getPendingCb()).not.toHaveBeenCalled();
  });

  it("resumes by replacing to returnTo and firing the callback once auth + segments settle", () => {
    const { getByTestId, rerender } = render(
      <AuthGateProvider>
        <Probe />
      </AuthGateProvider>
    );
    act(() => getByTestId("probe.request").props.onPress());

    // Simulate the auth flow: user is now on (auth)/welcome and authenticates.
    // The resume must NOT fire while still on the (auth) segment.
    mockAuthState = { isAuthenticated: true };
    mockSegments = ["(auth)", "welcome"];
    rerender(
      <AuthGateProvider>
        <Probe />
      </AuthGateProvider>
    );
    expect(mockReplace).not.toHaveBeenCalled();

    // (auth) layout redirects to (drawer). Now resume should fire.
    mockSegments = ["(drawer)"];
    rerender(
      <AuthGateProvider>
        <Probe />
      </AuthGateProvider>
    );
    expect(mockReplace).toHaveBeenCalledWith("/rental/abc");
    expect(getPendingCb()).not.toHaveBeenCalled();
    act(() => {
      jest.runAllTimers();
    });
    expect(getPendingCb()).toHaveBeenCalledTimes(1);
  });

  it("defers resume through onboarding (sign-up path)", () => {
    const { getByTestId, rerender } = render(
      <AuthGateProvider>
        <Probe />
      </AuthGateProvider>
    );
    act(() => getByTestId("probe.request").props.onPress());

    // Sign-up authenticates the user, but routes through phone verification.
    mockAuthState = { isAuthenticated: true };
    mockSegments = ["onboarding", "verify-phone"];
    rerender(
      <AuthGateProvider>
        <Probe />
      </AuthGateProvider>
    );
    expect(mockReplace).not.toHaveBeenCalled();

    // Verification finishes -> user lands on (drawer). Resume fires.
    mockSegments = ["(drawer)"];
    rerender(
      <AuthGateProvider>
        <Probe />
      </AuthGateProvider>
    );
    expect(mockReplace).toHaveBeenCalledWith("/rental/abc");
    act(() => {
      jest.runAllTimers();
    });
    expect(getPendingCb()).toHaveBeenCalledTimes(1);
  });
});
