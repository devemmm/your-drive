import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DrawerContent } from "@/components/DrawerContent";

// --- Mocks ---------------------------------------------------------------

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCloseDrawer = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/",
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const RN = require("react-native");
  // Strip out `edges` so React Native does not warn about an unknown View prop.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const SafeAreaView = ({ edges: _edges, ...rest }: any) => React.createElement(RN.View, rest);
  return { SafeAreaView };
});

const mockIsAuthenticated = jest.fn();

jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    user: { firstName: "Test", lastName: "User", email: "t@example.com", profileImage: null },
    isAuthenticated: mockIsAuthenticated(),
  }),
}));

jest.mock("@/providers/ModeProvider", () => ({
  useMode: () => ({ mode: "passenger", isDriverMode: false, setMode: jest.fn() }),
}));

jest.mock("@/providers/ThemeProvider", () => {
  const colors = {
    background: "#fff",
    primary: "#000",
    primaryLight: "#eee",
    border: "#ccc",
    text: { primary: "#000", secondary: "#666", tertiary: "#999", inverse: "#fff" },
  };
  return { useTheme: () => ({ colors }) };
});

const mockRequireAuthCallback = jest.fn();
const mockOpenSheet = jest.fn();

// The hook returns a function. When authed, it invokes the callback;
// when guest, it records that it would open the sheet instead.
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => (cb: () => void, opts?: { reason?: string }) => {
    if (mockIsAuthenticated()) {
      cb();
      return;
    }
    mockOpenSheet(opts);
    mockRequireAuthCallback(cb);
  },
}));

const mockUnreadCount = jest.fn();

// DrawerContent reads the notifications badge count via react-query under
// the hood; mock the hook directly so the test doesn't need a QueryClient.
jest.mock("@/hooks/useNotifications", () => ({
  useUnreadNotificationCount: () => mockUnreadCount(),
}));

// Stub the Avatar so we don't drag expo-image into the test.
jest.mock("@/components/ui/Avatar", () => {
  const React = require("react");
  const RN = require("react-native");
  return { Avatar: () => React.createElement(RN.View) };
});

// --- Helpers -------------------------------------------------------------

function renderDrawer() {
  const props: any = {
    navigation: { closeDrawer: mockCloseDrawer },
    state: { routes: [], index: 0 },
    descriptors: {},
  };
  return render(<DrawerContent {...props} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUnreadCount.mockReturnValue(0);
});

// --- Tests ---------------------------------------------------------------

describe("DrawerContent — guest", () => {
  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(false);
  });

  it("opens the auth gate when a guest taps Wallet (does not navigate)", () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId("drawer.wallet"));
    expect(mockOpenSheet).toHaveBeenCalledWith({ reason: "Sign in to access your wallet" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not render Rent a Car / Hire a Driver (moved to home sheet)", () => {
    const { queryByTestId } = renderDrawer();
    expect(queryByTestId("drawer.rental")).toBeNull();
    expect(queryByTestId("drawer.chauffeur")).toBeNull();
  });

  it("does not render the mode toggle for guests", () => {
    const { queryByTestId } = renderDrawer();
    expect(queryByTestId("drawer.modeToggle")).toBeNull();
  });
});

describe("DrawerContent — authenticated", () => {
  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
  });

  it("navigates directly when an authed user taps Wallet", () => {
    const { getByTestId } = renderDrawer();
    fireEvent.press(getByTestId("drawer.wallet"));
    expect(mockPush).toHaveBeenCalledWith("/wallet");
    expect(mockOpenSheet).not.toHaveBeenCalled();
  });

  it("renders the mode toggle for authenticated users", () => {
    const { getByTestId } = renderDrawer();
    expect(getByTestId("drawer.modeToggle")).toBeTruthy();
  });

  it("renders the unread notifications badge when the count is > 0", () => {
    mockUnreadCount.mockReturnValue(3);
    const { getByTestId, getByText } = renderDrawer();
    expect(getByTestId("drawer.notifications.badge")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
  });
});
