import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import VerifyPhoneScreen from "../verify-phone";
import { lightColors } from "@/lib/theme";

// jest hoists `jest.mock` above variable declarations, so references must be
// `mock*`-prefixed (same convention as AuthGateProvider.test.tsx).
let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

const mockAddPhoneMutate = jest.fn();
const mockVerifyPhoneMutate = jest.fn();
jest.mock("@/hooks/useUser", () => ({
  useAddPhone: () => ({ mutateAsync: mockAddPhoneMutate, isPending: false }),
  useVerifyPhone: () => ({ mutateAsync: mockVerifyPhoneMutate, isPending: false }),
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

describe("VerifyPhoneScreen", () => {
  beforeEach(() => {
    mockParams = {};
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    mockAddPhoneMutate.mockReset();
    mockVerifyPhoneMutate.mockReset();
  });

  it("keeps the legacy onboarding flow without params: phone entry first, then drawer on verify", async () => {
    mockAddPhoneMutate.mockResolvedValueOnce({});
    mockVerifyPhoneMutate.mockResolvedValueOnce({});
    const { getByTestId } = render(<VerifyPhoneScreen />);

    fireEvent.changeText(getByTestId("verifyPhone.phoneInput"), "+263771846532");
    fireEvent.press(getByTestId("verifyPhone.sendCodeButton"));
    await waitFor(() => expect(mockAddPhoneMutate).toHaveBeenCalledWith("+263771846532"));

    fireEvent.changeText(getByTestId("verifyPhone.codeInput"), "123456");
    fireEvent.press(getByTestId("verifyPhone.verifyButton"));
    await waitFor(() =>
      expect(mockVerifyPhoneMutate).toHaveBeenCalledWith({
        phoneNumber: "+263771846532",
        code: "123456",
      })
    );
    expect(mockReplace).toHaveBeenCalledWith("/(drawer)");
  });

  it("starts on the code-entry step when a phone param is provided (code already sent)", () => {
    mockParams = { phone: "+263771846532" };
    const { queryByTestId, getByTestId, getByText } = render(<VerifyPhoneScreen />);

    expect(queryByTestId("verifyPhone.phoneInput")).toBeNull();
    expect(queryByTestId("verifyPhone.sendCodeButton")).toBeNull();
    expect(getByTestId("verifyPhone.codeInput")).toBeTruthy();
    expect(getByText(/\+263771846532/)).toBeTruthy();
  });

  it("verifies the param phone and replaces to returnTo on success", async () => {
    mockParams = { phone: "+263771846532", returnTo: "/(drawer)/profile" };
    mockVerifyPhoneMutate.mockResolvedValueOnce({});
    const { getByTestId } = render(<VerifyPhoneScreen />);

    fireEvent.changeText(getByTestId("verifyPhone.codeInput"), "654321");
    fireEvent.press(getByTestId("verifyPhone.verifyButton"));

    await waitFor(() =>
      expect(mockVerifyPhoneMutate).toHaveBeenCalledWith({
        phoneNumber: "+263771846532",
        code: "654321",
      })
    );
    expect(mockReplace).toHaveBeenCalledWith("/(drawer)/profile");
  });
});
