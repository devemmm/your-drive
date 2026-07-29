import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
// import { io } from "socket.io-client";
import { DateTime } from "luxon";
import tzlookup from "tz-lookup";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
}

export const getCardIcon = (brand) => {
  const icons = {
    visa: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
    mastercard:
      "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
    amex: "https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo_%282018%29.svg",
    discover:
      "https://upload.wikimedia.org/wikipedia/commons/5/5f/Discover_Card_logo.svg",
  };

  return (
    icons[brand?.toLowerCase()] ||
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Credit_card_font_awesome.svg"
  );
};

export const getRouteId = (route: { from: string; to: string }) => {
  return `${route.from.trim().toLowerCase()}-${route.to.trim().toLowerCase()}`;
};

export const parseRouteId = (id: string) => {
  const [from, to] = id.split("-");
  return {
    from: capitalize(from),
    to: capitalize(to),
  };
};

const capitalize = (s: string) =>
  s.replace(/\b\w/g, (char) => char.toUpperCase());

export function mapSubscriptionTypeToCouponTarget(type) {
  switch (type?.toUpperCase()) {
    case "PASSENGER":
      return "PASSENGER_SUBSCRIPTION";
    case "DRIVER":
      return "DRIVER_SUBSCRIPTION";
    default:
      return "BOTH_SUBSCRIPTION"; // fallback if needed
  }
}

export const formatTime = ({ dateString, timeZone, formatTime }: any) => {
  return new Date(dateString)
    .toLocaleDateString(formatTime, {
      timeZone: timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/^([a-zéèêàâîïç])/u, (match) => match.toUpperCase());
};

// Handle common variations
export const cityVariations: { [key: string]: string[] } = {
  montreal: ["montréal", "montreal"],
  quebec: ["québec", "quebec"],
  "st. john's": ["st john's", "saint john's", "st. johns"],
  "st. john": ["saint john", "st john"],
  "trois-rivières": ["trois-rivières", "trois rivieres", "trois-rivieres"],
  saguenay: ["saguenay", "chicoutimi"],
  longueuil: ["longueuil", "saint-hubert", "lemoyne", "greenfield park"],
  brossard: ["brossard", "saint-lambert", "la prairie"],
  laval: ["laval"],
  lévis: ["lévis", "levis"],
  sherbrooke: ["sherbrooke"],
  gatineau: ["gatineau", "hull"],
  ottawa: ["ottawa"], // remove gatineau from here
  toronto: ["toronto", "mississauga", "brampton", "markham", "scarborough"],
  vancouver: ["vancouver", "burnaby", "richmond", "surrey", "coquitlam"],
  calgary: ["calgary"],
  edmonton: ["edmonton"],
  winnipeg: ["winnipeg"],
  halifax: ["halifax", "dartmouth"],
  victoria: ["victoria"],
  saskatoon: ["saskatoon"],
  regina: ["regina"],
  yellowknife: ["yellowknife"],
  whitehorse: ["whitehorse"],
  iqaluit: ["iqaluit"],
};

export const canadianCities = [
  "Toronto",
  "Montreal",
  "Vancouver",
  "Calgary",
  "Edmonton",
  "Ottawa",
  "Winnipeg",
  "Quebec",
  "Hamilton",
  "Kitchener",
  "London",
  "Victoria",
  "Halifax",
  "Windsor",
  "Saskatoon",
  "Regina",
  "St. John's",
  "Fredericton",
  "Charlottetown",
  "Whitehorse",
  "Yellowknife",
  "Iqaluit",
];

// ✅ Normalizes a name (e.g. "Sainte-Thérèse" → "saintetherese")
export const normalizeName = (name: string): string => {
  if (!name) return "";

  return (
    name
      .toLowerCase()
      .trim()

      // 4️⃣ Normalize the string into Unicode "decomposed form" (NFD).
      //    This splits letters and their accent marks:
      //    "é" → "e" + "́"
      .normalize("NFD")

      // 5️⃣ Remove all accent marks (diacritics) from decomposed characters.
      //    Regex [\u0300-\u036f] targets all combining accent Unicode ranges.
      //    So "é" (now "e + ́") → "e"
      .replace(/[\u0300-\u036f]/g, "")

      // 6️⃣ Replace multiple spaces with a single space.
      //    "sainte   therese" → "sainte therese"
      .replace(/\s+/g, " ")

      // 7️⃣ Remove all non-alphanumeric and non-space characters.
      //    Removes punctuation like hyphens, commas, and apostrophes.
      //    "sainte-thérèse" → "saintetherese"
      .replace(/[^\w\s]/g, "")
  );
};

export function convertRideTimes({
  timeWindowStart,
  timeWindowEnd,
  pickupLat,
  pickupLng,
}: {
  timeWindowStart: number | string;
  timeWindowEnd: number | string;
  pickupLat: number;
  pickupLng: number;
}) {
  if (!pickupLat || !pickupLng) {
    throw new Error("pickupLat and pickupLng are required");
  }

  const pickupTimezone = tzlookup(pickupLat, pickupLng);
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Normalize to milliseconds (number)
  const startMs =
    typeof timeWindowStart === "string"
      ? DateTime.fromISO(timeWindowStart).toMillis()
      : timeWindowStart;

  const endMs =
    typeof timeWindowEnd === "string"
      ? DateTime.fromISO(timeWindowEnd).toMillis()
      : timeWindowEnd;

  if (isNaN(startMs) || isNaN(endMs)) {
    throw new Error("Invalid timeWindowStart or timeWindowEnd value");
  }

  // Pickup timezone versions
  const startInPickupTZ = DateTime.fromMillis(startMs)
    .setZone(pickupTimezone)
    .toFormat("HH:mm");

  const endInPickupTZ = DateTime.fromMillis(endMs)
    .setZone(pickupTimezone)
    .toFormat("HH:mm");

  // Local timezone versions
  const startInLocal = DateTime.fromMillis(startMs)
    .setZone(localTimezone)
    .toFormat("HH:mm");

  const endInLocal = DateTime.fromMillis(endMs)
    .setZone(localTimezone)
    .toFormat("HH:mm");

  return {
    startInPickupTZ,
    endInPickupTZ,
    startInLocal,
    endInLocal,
    pickupTimezone,
    localTimezone,
  };
}

export function formatRideDate(dateISO: string, pickupTimezone: string) {
  if (!dateISO) return "";

  // Convert to pickup location timezone
  const dateInPickupTZ = DateTime.fromISO(dateISO, { zone: "utc" }) // assuming dateISO is UTC
    .setZone(pickupTimezone)
    .toFormat("yyyy-MM-dd");

  // Convert to user's local timezone
  const dateInLocalTZ = DateTime.fromISO(dateISO, { zone: "utc" })
    .setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    .toFormat("yyyy-MM-dd");

  return {
    pickup: dateInPickupTZ,
    local: dateInLocalTZ,
  };
}

/**
 * Format date in a descriptive, human-readable format
 * Example: "Monday, December 28, 2029 at 10:00 AM"
 */
export function formatDescriptiveDate(dateString: string | Date): string {
  if (!dateString) return "";
  
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format date without time in a descriptive format
 * Example: "Monday, December 28, 2029"
 */
export function formatDescriptiveDateOnly(dateString: string | Date): string {
  if (!dateString) return "";
  
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format time in a descriptive format
 * Example: "10:00 AM" or "5:30 PM"
 */
export function formatDescriptiveTime(dateString: string | Date): string {
  if (!dateString) return "";
  
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format payment provider name based on user role
 * Passenger side: "Credit/Debit Card"
 * Driver side: "Bank Transfer"
 */
export function formatPaymentProvider(
  paymentProvider: string | null | undefined,
  isPassenger: boolean = false
): string {
  if (!paymentProvider) return "";

  const provider = paymentProvider.toUpperCase();

  // For passenger view, show as Credit/Debit Card
  if (isPassenger) {
    if (provider === "STRIPE" || provider.includes("CARD")) {
      return "Credit/Debit Card";
    }
    return paymentProvider;
  }

  // For driver view, show as Bank Transfer
  if (provider === "STRIPE" || provider.includes("CARD") || provider.includes("DEBIT") || provider.includes("CREDIT")) {
    return "Bank Transfer";
  }

  // For other providers, return as is or map to Bank Transfer
  return "Bank Transfer";
}