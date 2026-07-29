import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ResetPasswordScreen from "../reset-password";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/services/api", () => ({
  api: { post: jest.fn() },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/services/api";

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPost = api.post as jest.Mock;

function wrap(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{node}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe("ResetPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace, back: mockBack });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ email: "user@example.com" });
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("renders code, password, and confirm password inputs with a submit button", () => {
    const { getByTestId } = wrap(<ResetPasswordScreen />);
    expect(getByTestId("resetPassword.codeInput")).toBeTruthy();
    expect(getByTestId("resetPassword.passwordInput")).toBeTruthy();
    expect(getByTestId("resetPassword.confirmInput")).toBeTruthy();
    expect(getByTestId("resetPassword.submitButton")).toBeTruthy();
  });

  it("submits token, newPassword, and email to /auth/reset-password and routes to login", async () => {
    mockPost.mockResolvedValue({ data: { success: true } });
    const { getByTestId } = wrap(<ResetPasswordScreen />);
    fireEvent.changeText(getByTestId("resetPassword.codeInput"), "123456");
    fireEvent.changeText(getByTestId("resetPassword.passwordInput"), "Secret123");
    fireEvent.changeText(getByTestId("resetPassword.confirmInput"), "Secret123");
    fireEvent.press(getByTestId("resetPassword.submitButton"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/auth/reset-password", {
        token: "123456",
        newPassword: "Secret123",
        email: "user@example.com",
      })
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(auth)/login"));
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("shows an error and does not call the API when passwords do not match", async () => {
    const { getByTestId, getByText } = wrap(<ResetPasswordScreen />);
    fireEvent.changeText(getByTestId("resetPassword.codeInput"), "123456");
    fireEvent.changeText(getByTestId("resetPassword.passwordInput"), "Secret123");
    fireEvent.changeText(getByTestId("resetPassword.confirmInput"), "Different1");
    fireEvent.press(getByTestId("resetPassword.submitButton"));
    await waitFor(() => expect(getByText("auth.passwordsDontMatch")).toBeTruthy());
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("rejects a weak password without calling the API", async () => {
    const { getByTestId, getAllByText } = wrap(<ResetPasswordScreen />);
    fireEvent.changeText(getByTestId("resetPassword.codeInput"), "123456");
    fireEvent.changeText(getByTestId("resetPassword.passwordInput"), "weak");
    fireEvent.changeText(getByTestId("resetPassword.confirmInput"), "weak");
    fireEvent.press(getByTestId("resetPassword.submitButton"));
    await waitFor(() => expect(getAllByText("auth.passwordRule").length).toBeGreaterThan(0));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("surfaces API errors via alert and stays on the screen", async () => {
    mockPost.mockRejectedValue({
      response: { data: { message: "Invalid or expired reset token." } },
    });
    const { getByTestId } = wrap(<ResetPasswordScreen />);
    fireEvent.changeText(getByTestId("resetPassword.codeInput"), "000000");
    fireEvent.changeText(getByTestId("resetPassword.passwordInput"), "Secret123");
    fireEvent.changeText(getByTestId("resetPassword.confirmInput"), "Secret123");
    fireEvent.press(getByTestId("resetPassword.submitButton"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
