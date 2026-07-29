import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@/components/CounterOfferSheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  const CounterOfferSheet = React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ open: () => {}, close: () => {} }));
    return React.createElement(View, { testID: "driverHome.counterOfferSheet" });
  });
  return { CounterOfferSheet };
});

jest.mock("@/components/MapErrorBoundary", () => {
  const React = require("react");
  return {
    MapErrorBoundary: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock("@/hooks/useCurrentLocation", () => ({
  useCurrentLocation: () => ({
    location: null,
    address: null,
    city: null,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/lib/permissions", () => ({
  ensureLocationPermission: () => Promise.resolve("granted"),
}));

jest.mock("@/lib/mapStyleDark", () => ({ mapStyleDark: [] }));

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

// --- Hook mocks. We control these per-test via the setters below. ---
let mockUser: any = { id: 1, isAvailableForRideRequest: false, isDriverOnboarded: true };
let mockVehicles: any[] = [
  { id: 10, make: "Honda", model: "Civic", plateNumber: "ABC123", capacity: 4 },
];
let mockRequests: any[] = [];
let mockTogglePending = false;
let lastToggle: any = null;
let lastAccept: any = null;

jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({ user: mockUser }),
}));

// requireAuth is wired on each gated CTA; in tests we treat the user as
// authenticated so the callback runs synchronously without needing an
// AuthGateProvider wrapper.
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => (cb: () => void) => cb(),
}));

jest.mock("@/providers/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      primary: "#000",
      primaryLight: "#eee",
      error: "#f00",
      success: "#0f0",
      surface: "#fff",
      background: "#fff",
      border: "#ccc",
      text: { primary: "#000", secondary: "#444", tertiary: "#888", inverse: "#fff" },
    },
    resolved: "light",
  }),
}));

jest.mock("@/hooks/useUser", () => ({
  useToggleRideRequestAvailability: () => ({
    mutateAsync: (v: boolean) => {
      lastToggle = v;
      return Promise.resolve();
    },
    isPending: mockTogglePending,
  }),
}));

jest.mock("@/hooks/useVehicles", () => ({
  useMyVehicles: () => ({ data: mockVehicles, isLoading: false }),
}));

jest.mock("@/hooks/useRideRequests", () => ({
  useOpenRideRequestsForDrivers: () => ({
    data: mockRequests,
    isLoading: false,
    refetch: jest.fn(),
    isRefetching: false,
  }),
  useAcceptRideRequest: () => ({
    mutateAsync: (input: any) => {
      lastAccept = input;
      return Promise.resolve({ data: { ride: { id: 99 } } });
    },
    isPending: false,
  }),
}));

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  getCurrentPositionAsync: () =>
    Promise.resolve({ coords: { latitude: 0, longitude: 0, accuracy: 5 } }),
  Accuracy: { Balanced: 3 },
}));

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MapView = (props: any) => React.createElement(View, { testID: "map" }, props.children);
  const Marker = (props: any) => React.createElement(View, { testID: "marker" }, props.children);
  return { __esModule: true, default: MapView, Marker, PROVIDER_GOOGLE: "google" };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useNavigation: () => ({ openDrawer: jest.fn() }),
}));

import { DriverHome } from "../DriverHome";

function resetMocks() {
  mockUser = { id: 1, isAvailableForRideRequest: false, isDriverOnboarded: true };
  mockVehicles = [{ id: 10, make: "Honda", model: "Civic", plateNumber: "ABC123", capacity: 4 }];
  mockRequests = [];
  mockTogglePending = false;
  lastToggle = null;
  lastAccept = null;
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockClear();
}

describe("DriverHome", () => {
  beforeEach(() => {
    resetMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the GO ONLINE button when the driver is offline", () => {
    mockUser.isAvailableForRideRequest = false;
    const { getByTestId } = render(<DriverHome />);
    expect(getByTestId("driverHome.goOnline")).toBeTruthy();
  });

  it("calls toggleAvailability(true) when GO ONLINE is tapped", async () => {
    mockUser.isAvailableForRideRequest = false;
    const { getByTestId } = render(<DriverHome />);
    await act(async () => {
      fireEvent.press(getByTestId("driverHome.goOnline"));
    });
    expect(lastToggle).toBe(true);
  });

  it("renders GO OFFLINE when the driver is online", () => {
    mockUser.isAvailableForRideRequest = true;
    const { getByTestId } = render(<DriverHome />);
    expect(getByTestId("driverHome.goOffline")).toBeTruthy();
  });

  it("calls toggleAvailability(false) when GO OFFLINE is tapped", async () => {
    mockUser.isAvailableForRideRequest = true;
    const { getByTestId } = render(<DriverHome />);
    await act(async () => {
      fireEvent.press(getByTestId("driverHome.goOffline"));
    });
    expect(lastToggle).toBe(false);
  });

  it("shows the idle 'Looking for requests…' caption when online with no requests", () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [];
    const { getByText, queryByTestId } = render(<DriverHome />);
    expect(getByText(/Looking for requests/i)).toBeTruthy();
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
  });

  it("treats the first-poll requests as backlog (no focused sheet, chip count = N)", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [
      { id: 1, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "1" } },
      { id: 2, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "2" } },
      { id: 3, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "3" } },
    ];
    const { queryByTestId, getByText } = render(<DriverHome />);
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
    expect(getByText(/3 requests waiting/i)).toBeTruthy();
  });

  it("Skip moves the focused request to backlog", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = []; // first poll empty
    const { rerender, getByTestId, queryByTestId, getByText } = render(<DriverHome />);

    mockRequests = [
      { id: 7, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "X" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.skip"));
    });

    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
    expect(getByText(/1 requests waiting/i)).toBeTruthy();
  });

  it("focuses a request that arrives after the first poll", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = []; // first poll: empty
    const { rerender, queryByTestId, getByTestId } = render(<DriverHome />);
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();

    // Subsequent poll surfaces a new request.
    mockRequests = [
      {
        id: 42,
        originCity: "X",
        destCity: "Y",
        seats: 1,
        date: "2026-06-01T10:00:00Z",
        timeWindowStart: null,
        proposedFare: "10.00",
        user: { firstName: "P", lastName: "P" },
      },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());
  });

  it("tapping the backlog chip opens the backlog sheet with the dismissed requests", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [
      { id: 11, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "1.00", user: { firstName: "U", lastName: "1" } },
      { id: 12, originCity: "C", destCity: "D", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "1.00", user: { firstName: "U", lastName: "2" } },
    ];
    const { getByTestId, queryByTestId } = render(<DriverHome />);
    expect(queryByTestId("driverHome.backlogSheet")).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.backlogChip"));
    });

    expect(getByTestId("driverHome.backlogSheet")).toBeTruthy();
    // Both backlog rows visible.
    expect(getByTestId("driverHome.backlogRow.11")).toBeTruthy();
    expect(getByTestId("driverHome.backlogRow.12")).toBeTruthy();
  });

  it("tapping a backlog row re-focuses that request", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [
      { id: 21, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "1.00", user: { firstName: "U", lastName: "1" } },
    ];
    const { getByTestId, queryByTestId } = render(<DriverHome />);
    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.backlogChip"));
    });
    await act(async () => {
      fireEvent.press(getByTestId("driverHome.backlogRow.21"));
    });

    expect(getByTestId("driverHome.focusedSheet")).toBeTruthy();
    expect(queryByTestId("driverHome.backlogSheet")).toBeNull();
  });

  it("disables GO ONLINE with a CTA when the driver has no vehicles", () => {
    mockUser.isAvailableForRideRequest = false;
    mockVehicles = [];
    const { getByTestId, getByText } = render(<DriverHome />);
    expect(getByTestId("driverHome.goOnline").props.accessibilityState?.disabled).toBe(true);
    expect(getByText(/Add a vehicle to go online/i)).toBeTruthy();
  });

  it("expiring the 20s countdown moves the request to backlog (same as Skip)", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [];
    const { rerender, getByTestId, queryByTestId, getByText } = render(<DriverHome />);

    mockRequests = [
      { id: 99, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "1.00", user: { firstName: "U", lastName: "Z" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      jest.advanceTimersByTime(20_500);
    });

    expect(queryByTestId("driverHome.focusedSheet")).toBeNull();
    expect(getByText(/1 requests waiting/i)).toBeTruthy();
  });

  it("Accept calls useAcceptRideRequest with the focused request and selected vehicle", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = []; // first poll empty
    const { rerender, getByTestId } = render(<DriverHome />);

    mockRequests = [
      { id: 55, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "X" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.accept"));
    });

    expect(lastAccept).toEqual({ requestId: 55, vehicleId: 10 });
  });

  it("Counter-offer opens the CounterOfferSheet for the focused request", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockRequests = [];
    const { rerender, getByTestId } = render(<DriverHome />);

    mockRequests = [
      { id: 66, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "8.00", user: { firstName: "U", lastName: "Y" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.counter"));
    });

    expect(getByTestId("driverHome.counterOfferSheet")).toBeTruthy();
  });

  it("changing vehicle in the focused sheet persists CURRENT_VEHICLE_ID", async () => {
    mockUser.isAvailableForRideRequest = true;
    mockVehicles = [
      { id: 10, make: "Honda", model: "Civic", plateNumber: "ABC123", capacity: 4 },
      { id: 11, make: "Toyota", model: "Corolla", plateNumber: "XYZ789", capacity: 4 },
    ];
    mockRequests = [];
    const { rerender, getByTestId } = render(<DriverHome />);

    mockRequests = [
      { id: 77, originCity: "A", destCity: "B", seats: 1, date: "2026-06-01T10:00:00Z",
        timeWindowStart: null, proposedFare: "5.00", user: { firstName: "U", lastName: "Z" } },
    ];
    rerender(<DriverHome />);
    await waitFor(() => expect(getByTestId("driverHome.focusedSheet")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId("driverHome.changeVehicle"));
    });
    await act(async () => {
      fireEvent.press(getByTestId("vehiclePicker.row.11"));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith("yourdrive_current_vehicle_id", "11");
  });

  it("renders the hamburger menu and GPS recenter buttons", () => {
    const { getByTestId } = render(<DriverHome />);
    expect(getByTestId("driverHome.menuButton")).toBeTruthy();
    expect(getByTestId("driverHome.locateButton")).toBeTruthy();
  });
});
