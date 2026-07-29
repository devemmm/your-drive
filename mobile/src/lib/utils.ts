import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Alert } from "react-native";
import { TFunction } from "i18next";
import { Asset } from "./types";

const NO_SUBUNIT = new Set(["RWF", "JPY", "KRW", "VND", "UGX"]);

export const formatCurrency = (amountCents: number, currency: string = "RWF"): string => {
  const noSubunit = NO_SUBUNIT.has(currency);
  const amount = noSubunit ? Math.round(amountCents / 100) : amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: noSubunit ? 0 : 2,
    maximumFractionDigits: noSubunit ? 0 : 2,
  }).format(amount);
};

export function formatDate(dateString: string, fmt = "EEE, dd MMM yyyy"): string {
  return format(parseISO(dateString), fmt);
}

export function formatTime(timeString: string): string {
  // Accepts either "HH:MM" or full ISO datetime string
  if (!timeString) return "";
  if (timeString.includes("T") || timeString.includes("-")) {
    try {
      const d = new Date(timeString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
    } catch {}
  }
  return timeString.substring(0, 5);
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function getVehicleImageUrl(vehicle: {
  defaultImage?: Asset | null;
  files?: Asset[];
}): string | null {
  const url = vehicle.defaultImage?.url ?? vehicle.files?.[0]?.url ?? null;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}

export function handleApiError(error: any, t: TFunction): void {
  Alert.alert(
    t("common.error"),
    error?.response?.data?.message || t("common.error")
  );
}

export function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}
