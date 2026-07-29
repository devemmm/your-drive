import { api } from "@/services/api";
import { getToken } from "@/components/getToken";

export interface DownloadOptions {
  format: "csv" | "excel" | "json";
  filename?: string;
  includeHeaders?: boolean;
}

export interface DownloadParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  status?: string;
  type?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  paymentProvider?: string;
  [key: string]: any;
}

class DownloadService {
  private async downloadFile(url: string, filename: string, format: string) {
    try {
      const token = getToken();
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      throw error;
    }
  }

  private async getAllData<T>(
    endpoint: string,
    params: DownloadParams = {},
    maxPages: number = 100
  ): Promise<T[]> {
    const token = getToken();
    const allData: T[] = [];
    let currentPage = 1;
    const pageSize = 100; // Use larger page size for downloads

    while (currentPage <= maxPages) {
      try {
        const response = await api.get(endpoint, {
          params: {
            ...params,
            page: currentPage,
            pageSize,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = response?.data?.data || response?.data || [];
        // console.log(data, "data");

        if (!Array.isArray(data) || data.length === 0) {
          break; // No more data
        }

        allData.push(...data);

        // If we got less than pageSize, we've reached the end
        if (data.length < pageSize) {
          break;
        }

        currentPage++;
      } catch (error) {
        console.error(`Error fetching page ${currentPage}:`, error);
        break;
      }
    }

    return allData;
  }

  // Users Download
  async downloadUsers(options: DownloadOptions, params: DownloadParams = {}) {
    const data = await this.getAllData("/api/v1/users", params);
    const filename =
      options.filename || `users_${new Date().toISOString().split("T")[0]}`;

    if (options.format === "json") {
      await this.downloadJSON(data, filename);
    } else {
      await this.downloadCSV(data, filename, options.format);
    }
  }

  // Rides Download
  async downloadRides(options: DownloadOptions, params: DownloadParams = {}) {
    const data = await this.getAllData("/api/v1/rides", params);
    const filename =
      options.filename || `rides_${new Date().toISOString().split("T")[0]}`;

    if (options.format === "json") {
      await this.downloadJSON(data, filename);
    } else {
      await this.downloadCSV(data, filename, options.format);
    }
  }

  // Vehicles Download
  async downloadVehicles(
    options: DownloadOptions,
    params: DownloadParams = {}
  ) {
    const data = await this.getAllData("/api/v1/vehicles", params);
    const filename =
      options.filename || `vehicles_${new Date().toISOString().split("T")[0]}`;

    if (options.format === "json") {
      await this.downloadJSON(data, filename);
    } else {
      await this.downloadCSV(data, filename, options.format);
    }
  }

  // Transactions Download
  async downloadTransactions(
    options: DownloadOptions,
    params: DownloadParams = {}
  ) {
    const data = await this.getAllData("/api/v1/transactions", params);
    const filename =
      options.filename ||
      `transactions_${new Date().toISOString().split("T")[0]}`;

    if (options.format === "json") {
      await this.downloadJSON(data, filename);
    } else {
      await this.downloadCSV(data, filename, options.format);
    }
  }

  // Fee Settings Download
  async downloadFeeSettings(
    options: DownloadOptions,
    params: DownloadParams = {}
  ) {
    const data = await this.getAllData("/api/v1/admin/settings", params);
    const filename =
      options.filename ||
      `fee_settings_${new Date().toISOString().split("T")[0]}`;

    if (options.format === "json") {
      await this.downloadJSON(data, filename);
    } else {
      await this.downloadCSV(data, filename, options.format);
    }
  }

  // Tax Rates Download
  async downloadTaxRates(
    options: DownloadOptions,
    params: DownloadParams = {}
  ) {
    const data = await this.getAllData("/api/v1/admin/tax-rates", params);
    const filename =
      options.filename || `tax_rates_${new Date().toISOString().split("T")[0]}`;

    if (options.format === "json") {
      await this.downloadJSON(data, filename);
    } else {
      await this.downloadCSV(data, filename, options.format);
    }
  }

  // Bookings Download
  async downloadBookings(
    options: DownloadOptions,
    params: DownloadParams = {}
  ) {
    const data = await this.getAllData("/api/v1/bookings", params);
    const filename =
      options.filename || `bookings_${new Date().toISOString().split("T")[0]}`;

    if (options.format === "json") {
      await this.downloadJSON(data, filename);
    } else {
      await this.downloadCSV(data, filename, options.format);
    }
  }

  // No-Shows Download
  async downloadNoShows(options: DownloadOptions, params: DownloadParams = {}) {
    const data = await this.getAllData("/api/v1/no-shows/all", params);
    const filename =
      options.filename || `no-shows_${new Date().toISOString().split("T")[0]}`;

    if (options.format === "json") {
      await this.downloadJSON(data, filename);
    } else {
      await this.downloadCSV(data, filename, options.format);
    }
  }

  // Generic CSV Download
  private async downloadCSV(data: any[], filename: string, format: string) {
    if (data.length === 0) {
      throw new Error("No data to download");
    }

    // Flatten nested objects for CSV
    const flattenedData = data.map((item) => this.flattenObject(item));

    // Get headers from first item
    const headers = Object.keys(flattenedData[0]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...flattenedData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Generic JSON Download
  private async downloadJSON(data: any[], filename: string) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Flatten nested objects for CSV export
  private flattenObject(obj: any, prefix = ""): any {
    const flattened: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = prefix ? `${prefix}_${key}` : key;

        if (
          obj[key] !== null &&
          typeof obj[key] === "object" &&
          !Array.isArray(obj[key])
        ) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else if (Array.isArray(obj[key])) {
          flattened[newKey] = obj[key].join("; ");
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }

  // Get download statistics
  async getDownloadStats(
    endpoint: string,
    params: DownloadParams = {}
  ): Promise<{
    totalRecords: number;
    estimatedPages: number;
    estimatedTime: string;
  }> {
    try {
      const token = getToken();
      const response = await api.get(`${endpoint}`, {
        params: {
          ...params,
          page: 1,
          pageSize: 100,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const totalRecords =
        response?.data?.pagination?.total ?? response?.data?.length;
      // console.log(response, "totalRecords");
      const estimatedPages = Math.ceil(totalRecords / 100);
      const estimatedTime = this.estimateDownloadTime(estimatedPages);

      return {
        totalRecords,
        estimatedPages,
        estimatedTime,
      };
    } catch (error) {
      console.error("Error getting download stats:", error);
      return {
        totalRecords: 0,
        estimatedPages: 0,
        estimatedTime: "Unknown",
      };
    }
  }

  private estimateDownloadTime(pages: number): string {
    const secondsPerPage = 2; // Conservative estimate
    const totalSeconds = pages * secondsPerPage;

    if (totalSeconds < 60) {
      return `${totalSeconds} seconds`;
    } else if (totalSeconds < 3600) {
      const minutes = Math.ceil(totalSeconds / 60);
      return `${minutes} minutes`;
    } else {
      const hours = Math.ceil(totalSeconds / 3600);
      return `${hours} hours`;
    }
  }
}

export const downloadService = new DownloadService();
