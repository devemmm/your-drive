import tzlookup from "tz-lookup";
import { DateTime } from "luxon";
import { verifyLocationInCity } from "@/components/CanadianCitySelector";

export const removeItemsFromLocalStorage = (items: string[]) => {
  items.forEach((key) => {
    localStorage.removeItem(key);
  });
};

export async function checkCityMismatch(
  location: any,
  selectedCity: any,
  googleReady: boolean,
): Promise<boolean> {
  try {
    const isInCity = await verifyLocationInCity(
      location,
      selectedCity,
      googleReady,
    );

    return !isInCity;
  } catch (error) {
    console.error("Error checking city mismatch:", error);
    return true;
  }
}

// Animation variants
export const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: { duration: 0.3 },
  },
};

export const buttonVariants = {
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

export const validateField = (
  value: string,
  fieldName: string,
): string | null => {
  const cleanValue = value.replace(/[<>{}[\]\\]/g, "");
  if (cleanValue !== value) return `${fieldName} contains invalid characters`;
  if (value.length > 200)
    return `${fieldName} is too long (max 200 characters)`;
  return null;
};

export const validateNumber = (
  value: number,
  fieldName: string,
): string | null => {
  if (isNaN(value) || value < 0)
    return `${fieldName} must be a valid positive number`;
  if (value > 999999) return `${fieldName} is too large`;
  return null;
};

export function calculateEstimatedArrivalTime(
  departureTime: string,
  from: { latitude: number; longitude: number },
  to: any,
  durationInSeconds: number,
): string {
  if (!durationInSeconds || durationInSeconds === 0) {
    console.warn("No duration from Google Maps, using fallback calculation");
    return "";
  }

  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const departureTimezone = tzlookup(from.latitude, from.longitude);
  const departureLocal = DateTime.fromISO(departureTime, {
    zone: departureTimezone,
  });

  if (!departureLocal.isValid) {
    console.error("Invalid departure time:", departureTime);
    return "";
  }
  const arrivalLocal = departureLocal.plus({ hours, minutes });
  return arrivalLocal.toUTC().toISO();
}

// Animation variants - moved outside component for accessibility
export const progressVariants = {
  animate: {
    scale: [1, 1.1, 1],
    transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 },
  },
};
