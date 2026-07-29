import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import EditProfileScreen from "../edit";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

let mockUser: Record<string, unknown> = {};
jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({ user: mockUser }),
}));

// Pass-through auth gate: run the action immediately.
jest.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => (action: () => void) => action(),
}));

const mockApiPost = jest.fn();
jest.mock("@/services/api", () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args), upload: jest.fn() },
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn().mockResolvedValue(undefined) }),
}));

jest.mock("@/providers/ThemeProvider", () => ({
  useTheme: () => ({
    colors: jest.requireActual("@/lib/theme").lightColors,
    fontsLoaded: false,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Presentational children irrelevant to this behavior.
jest.mock("@/components/DateTimeField", () => ({ DateTimeField: () => null }));
jest.mock("@/components/ui/ScreenHeader", () => ({ ScreenHeader: () => null }));
jest.mock("@/components/ui/Avatar", () => ({ Avatar: () => null }));

describe("EditProfileScreen — phone verification handoff", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    mockApiPost.mockReset();
    mockUser = {
      firstName: "Adrian",
      lastName: "M",
      phoneNumber: "+263771000000",
    };
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  function save(getByText: (t: string) => unknown) {
    fireEvent.press(getByText("Save Changes") as never);
  }

  it("routes to the verify-phone screen when the phone number changed", async () => {
    mockApiPost.mockResolvedValueOnce({});
    const { getByPlaceholderText, getByText } = render(<EditProfileScreen />);

    fireEvent.changeText(
      getByPlaceholderText("Enter your phone number"),
      "+263771846532"
    );
    save(getByText);

    await waitFor(() => expect(mockApiPost).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/onboarding/verify-phone",
        params: { phone: "+263771846532", returnTo: "/(drawer)/profile" },
      })
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("keeps the plain success alert when the phone number is unchanged", async () => {
    mockApiPost.mockResolvedValueOnce({});
    const { getByText } = render(<EditProfileScreen />);

    save(getByText);

    await waitFor(() => expect(mockApiPost).toHaveBeenCalled());
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Success",
        "Profile updated successfully.",
        expect.anything()
      )
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
