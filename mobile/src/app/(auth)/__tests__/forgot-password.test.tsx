import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/providers/ThemeProvider";
import ForgotPasswordScreen from "../forgot-password";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services/api", () => ({
  api: { post: jest.fn() },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { useRouter } from "expo-router";
import { api } from "@/services/api";

const mockPush = jest.fn();
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

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
  });

  it("navigates to the reset-password screen with the email after the code is sent", async () => {
    mockPost.mockResolvedValue({ data: { success: true } });
    const { getByTestId } = wrap(<ForgotPasswordScreen />);
    fireEvent.changeText(getByTestId("forgotPassword.emailInput"), "user@example.com");
    fireEvent.press(getByTestId("forgotPassword.submitButton"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/auth/forgot-password", { email: "user@example.com" })
    );
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/(auth)/reset-password",
        params: { email: "user@example.com" },
      })
    );
  });
});
