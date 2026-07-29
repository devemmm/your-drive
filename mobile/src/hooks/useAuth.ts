import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { AuthResponse, LoginPayload, RegisterPayload } from "@/lib/types";

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => api.post<AuthResponse>("/auth/login", payload),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => {
      const { referralCode, ...body } = payload;
      const params = referralCode ? `?referralCode=${encodeURIComponent(referralCode)}` : "";
      return api.post<AuthResponse>(`/auth/register${params}`, body);
    },
  });
}

export function useGoogleAuth() {
  return useMutation({
    mutationFn: (idToken: string) => api.post<AuthResponse>("/auth/google/mobile", { idToken }),
  });
}

export function useAppleAuth() {
  return useMutation({
    mutationFn: (payload: { identityToken: string; fullName?: string }) =>
      api.post<AuthResponse>("/auth/apple", payload),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.post("/auth/forgot-password", { email }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: { token: string; newPassword: string; email: string }) =>
      api.post("/auth/reset-password", payload),
  });
}
