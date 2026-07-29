import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { apiUrl } from "@/data";

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      let token = null;
      if (typeof window !== "undefined") {
        try {
          const tokenStr = localStorage.getItem("Your-DriveToken");
          if (tokenStr) {
            token = JSON.parse(tokenStr);
          }
        } catch (error) {
          console.error("Failed to parse token from localStorage:", error);
          // Clear corrupted token
          localStorage.removeItem("Your-DriveToken");
          localStorage.removeItem("userRole");
        }
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add language parameter to all requests
      const lang = localStorage.getItem("i18nextLng") || "EN";
      if (config.url && !config.params?.lang) {
        // Only add lang if not already in params
        if (!config.params) {
          config.params = {};
        }
        config.params.lang = lang;
      }

      return config;
    });

    // Add response interceptor to handle 401 errors globally
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear tokens on unauthorized
          if (typeof window !== "undefined") {
            localStorage.removeItem("Your-DriveToken");
            localStorage.removeItem("userRole");
            localStorage.removeItem("postLoginRedirect");
            
            // Redirect to appropriate login page
            const currentPath = window.location.pathname;
            if (currentPath.startsWith("/admin")) {
              window.location.href = "/admin/login";
            } else {
              window.location.href = "/login";
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.api.get<T>(url, config);
    return response.data;
  }

  // Generic POST request
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.api.post<T>(url, data, config);
    return response.data;
  }

  // Generic PUT request
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.api.put<T>(url, data, config);
    return response.data;
  }

  // Generic PATCH request
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.api.patch<T>(url, data, config);
    return response.data;
  }

  // Generic DELETE request
  async delete<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.api.delete<T>(url, config);
    return response.data;
  }

  // For file uploads
  async upload<T>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ) {
    const response = await this.api.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
}

export const api = new ApiService();
