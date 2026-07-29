import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ThemeProvider } from "@/providers/ThemeProvider";
import WelcomeScreen from "../welcome";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services/auth", () => ({
  authStorage: { setHasSeenWelcome: jest.fn() },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { useRouter } from "expo-router";
import { authStorage } from "@/services/auth";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSetHasSeenWelcome = authStorage.setHasSeenWelcome as jest.Mock;

function wrap(node: React.ReactNode) {
  return render(<ThemeProvider>{node}</ThemeProvider>);
}

describe("WelcomeScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockSetHasSeenWelcome.mockReset();
    mockSetHasSeenWelcome.mockResolvedValue(undefined);
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace, push: mockPush });
  });

  it("renders three buttons", () => {
    const { getByTestId } = wrap(<WelcomeScreen />);
    expect(getByTestId("welcome.signUpButton")).toBeTruthy();
    expect(getByTestId("welcome.loginButton")).toBeTruthy();
    expect(getByTestId("welcome.guestButton")).toBeTruthy();
  });

  it("Continue as guest persists the flag and navigates to /(drawer)", async () => {
    const { getByTestId } = wrap(<WelcomeScreen />);
    fireEvent.press(getByTestId("welcome.guestButton"));
    await Promise.resolve();
    expect(mockSetHasSeenWelcome).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith("/(drawer)");
  });

  it("Sign Up routes to /(auth)/register and Log In routes to /(auth)/login", () => {
    const { getByTestId } = wrap(<WelcomeScreen />);
    fireEvent.press(getByTestId("welcome.signUpButton"));
    expect(mockPush).toHaveBeenCalledWith("/(auth)/register");
    fireEvent.press(getByTestId("welcome.loginButton"));
    expect(mockPush).toHaveBeenCalledWith("/(auth)/login");
  });
});
