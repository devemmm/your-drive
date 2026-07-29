import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { authStorage } from "./auth";
import i18next from "i18next";

const RAW_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3003/api/v1";
// On the Android emulator, `localhost` resolves to the emulator VM itself, not
// the host dev machine. 10.0.2.2 is the magic alias that points at the host.
const BASE_URL =
  Platform.OS === "android"
    ? RAW_BASE_URL.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, "//10.0.2.2")
    : RAW_BASE_URL;

type SignOutListener = () => void;
let onSignOut: SignOutListener | null = null;

export function setOnSignOut(listener: SignOutListener) {
  onSignOut = listener;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStorage.getCachedToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.params = { ...config.params, lang: i18next.language || "en" };
    return config;
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await authStorage.removeToken();
      onSignOut?.();
    }
    return Promise.reject(error);
  }
);

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiClient.get<T>(url, { params }).then((res) => res.data),
  post: <T>(url: string, data?: unknown) =>
    apiClient.post<T>(url, data).then((res) => res.data),
  put: <T>(url: string, data?: unknown) =>
    apiClient.put<T>(url, data).then((res) => res.data),
  patch: <T>(url: string, data?: unknown) =>
    apiClient.patch<T>(url, data).then((res) => res.data),
  delete: <T>(url: string) =>
    apiClient.delete<T>(url).then((res) => res.data),
  upload: <T>(url: string, formData: FormData) =>
    apiClient.post<T>(url, formData, { headers: { "Content-Type": "multipart/form-data" } }).then((res) => res.data),
};

const publicAxios: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

publicAxios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.params = { ...config.params, lang: i18next.language || "en" };
  return config;
});

// Note: no response interceptor — public endpoints should not trigger sign-out on 401
// (they should never return 401, but if they do, we don't want side effects).

export const publicApi = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    publicAxios.get<T>(url, { params }).then((res) => res.data),
};

export default apiClient;
