import { getToken } from "@/components/getToken";
import RideMap from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl, queryKey, useAllVehicles } from "@/data";
import { useReactItems } from "@/lib/ReactTranslation";
import { haversineDistance } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { DollarSign as DollarSignIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CanadianCitySelector } from "@/components/CanadianCitySelector";
import { useJsApiLoader } from "@react-google-maps/api";
import { LIBRARIES } from "@/components/Map";

import { DateTime } from "luxon";
import tzlookup from "tz-lookup";

type Location = {
  latitude: number;
  longitude: number;
  locationName?: string;
  city?: string;
  region?: string;
  address?: string;
  description?: string;
};

type Preferences = {
  smoking?: boolean;
  pets?: boolean;
  airConditioning?: boolean;
  bicycleSupport?: boolean;
  additionalNotes?: string;
};

type Ride = {
  id: number;
  departureTime: string;
  estimatedArrivalTime?: string;
  availableSeats: number;
  totalSeats: number;
  contribution: number;
  departureLocation: Location;
  destinationLocation: Location;
  stopovers?: Location[];
  preferences?: Preferences;
  bookingType?: "AUTOMATIC" | "MANUAL";
  contributionCollectionMethod?: "VIA_PLATFORM" | "DIRECT" | "OFF_PLATFORM";
  monitizationType?: "SUBSCRIPTION" | "PAYMENT" | "FREE";
  vehicle?: {
    id: number;
  };
  vehicleId?: number;
};

export interface EditRideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ride: Ride;
  // currentTime: string;
  timeZone;
}

function calculateEstimatedArrivalTime(
  departureTime: string,
  from?: Location,
  to?: Location,
  durationInSeconds?: number // Google Maps API duration in seconds
): string | undefined {
  if (!from || !to) return undefined;

  // If no duration provided from Google, fall back to haversine calculation
  if (!durationInSeconds || durationInSeconds === 0) {
    console.warn(
      "No duration from Google Maps, using haversine fallback calculation"
    );
    const distance = haversineDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    const averageSpeedKmh = 60; // km/h
    const timeUsedHours = distance / averageSpeedKmh;
    durationInSeconds = timeUsedHours * 3600;
  }

  // Convert seconds to hours and minutes
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);

  // Get departure timezone from coordinates
  const departureTimezone = tzlookup(from.latitude, from.longitude);

  // Parse departure time in **departure city timezone**
  const departureLocal = DateTime.fromISO(departureTime, {
    zone: departureTimezone,
  });

  if (!departureLocal.isValid) {
    console.error("Invalid departure time:", departureTime);
    return "";
  }

  // Add travel time from Google Maps (or fallback)
  const arrivalLocal = departureLocal.plus({ hours, minutes });

  // Convert to UTC for storage
  return arrivalLocal.toUTC().toISO();
}

const EditRideModal = ({
  open,
  onOpenChange,
  ride,
  timeZone,
}: // currentTime,

EditRideModalProps) => {
  const { t } = useTranslation();
  const { currentLanguage, queryClient } = useReactItems();
  
  // Google Maps loader for city selector - use same env var as other components
  const { isLoaded: googleReady } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY || "",
    libraries: LIBRARIES,
  });

  // City selection state
  const [departureCity, setDepartureCity] = useState<{ name: string; province: string } | null>(
    ride.departureLocation?.city ? { name: ride.departureLocation.city, province: ride.departureLocation.region || "" } : null
  );
  const [destinationCity, setDestinationCity] = useState<{ name: string; province: string } | null>(
    ride.destinationLocation?.city ? { name: ride.destinationLocation.city, province: ride.destinationLocation.region || "" } : null
  );

  // Duration from Google Maps API (in seconds)
  const [duration, setDuration] = useState<number>(0);

  const [form, setForm] = useState({
    departureTime: ride.departureTime || "",
    estimatedArrivalTime: ride.estimatedArrivalTime,
    availableSeats: ride.availableSeats,
    totalSeats: ride.totalSeats,
    contribution: ride.contribution,
    departureLocation: ride.departureLocation,
    destinationLocation: ride.destinationLocation,
    stopovers: ride.stopovers || [],
    preferences: ride.preferences || {},
    monitizationType: ride.monitizationType,
    vehicleId: ride.vehicleId,
    bookingType: ride.bookingType,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      departureTime: ride.departureTime,
      estimatedArrivalTime: ride.estimatedArrivalTime,
      availableSeats: ride.availableSeats,
      totalSeats: ride.totalSeats,
      contribution: ride.contribution,
      departureLocation: ride.departureLocation,
      destinationLocation: ride.destinationLocation,
      stopovers: ride.stopovers || [],
      preferences: ride.preferences || {},
      monitizationType: ride.monitizationType,
      vehicleId: ride.vehicleId,
      bookingType: ride.bookingType,
    });
    // Update city selectors
    setDepartureCity(
      ride.departureLocation?.city
        ? { name: ride.departureLocation.city, province: ride.departureLocation.region || "" }
        : null
    );
    setDestinationCity(
      ride.destinationLocation?.city
        ? { name: ride.destinationLocation.city, province: ride.destinationLocation.region || "" }
        : null
    );
  }, [open, ride]);

  // Local input state for contribution to avoid formatting while typing
  const [contributionInput, setContributionInput] = useState<string>(() =>
    Number(ride.contribution ?? 0).toFixed(2)
  );

  useEffect(() => {
    setContributionInput(Number(form.contribution ?? 0).toFixed(2));
  }, [form.contribution]);

  // Keep estimatedArrivalTime in sync when changing time or route
  useEffect(() => {
    const eta = calculateEstimatedArrivalTime(
      form.departureTime,
      form.departureLocation,
      form.destinationLocation,
      duration // Use duration from Google Maps
    );
    setForm((prev) => ({ ...prev, estimatedArrivalTime: eta }));
  }, [
    form.departureTime,
    form.departureLocation,
    form.destinationLocation,
    duration,
  ]);

  const handleRouteChange = (route: {
    start: Location;
    end: Location;
    stops: Location[];
  }) => {
    setForm((prev) => ({
      ...prev,
      departureLocation: route.start,
      destinationLocation: route.end,
      stopovers: route.stops,
    }));
  };

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const { mutate: updateRide, isPending } = useMutation({
    mutationFn: async () => {
      // Get timezone from DEPARTURE LOCATION
      const timezone = tzlookup(
        form.departureLocation.latitude,
        form.departureLocation.longitude
      );

      // Convert the naive datetime to a Luxon DateTime in the proper zone
      const localDepartureTime = DateTime.fromISO(form.departureTime, {
        zone: timezone,
      });

      // Store UTC in DB
      const utcDepartureTime = localDepartureTime.toUTC().toISO();

      // Clean request body to match exactly what API expects
      const requestBody = {
        departure: {
          region: form.departureLocation.region || "",
          city: form.departureLocation.city || "",
          locationName: form.departureLocation.locationName || "",
          latitude: form.departureLocation.latitude,
          longitude: form.departureLocation.longitude,
          address: form.departureLocation.address || "",
        },
        destination: {
          region: form.destinationLocation.region || "",
          city: form.destinationLocation.city || "",
          locationName: form.destinationLocation.locationName || "",
          latitude: form.destinationLocation.latitude,
          longitude: form.destinationLocation.longitude,
          address: form.destinationLocation.address || "",
        },
        departureTime: new Date(utcDepartureTime).getTime(),
        estimatedArrivalTime: new Date(form.estimatedArrivalTime).getTime(),
        availableSeats: form.availableSeats,
        contribution: form.contribution,
        vehicleId: form.vehicleId,
        bookingType: form.bookingType,
        contributionCollectionMethod:
          ride.contributionCollectionMethod === "DIRECT"
            ? "OFF_PLATFORM"
            : ride.contributionCollectionMethod || "VIA_PLATFORM",
        preferences: {
          smoking: form.preferences?.smoking || false,
          pets: form.preferences?.pets || false,
          airConditioning: form.preferences?.airConditioning || false,
          ladiesOnly: (form as any).preferences?.ladiesOnly || false,
          gentsOnly: (form as any).preferences?.gentsOnly || false,
          bicycleSupport: (form as any).preferences?.bicycleSupport || false,
          snowTires: (form as any).preferences?.snowTires || false,
          luggageSize: (form as any).preferences?.luggageSize || "MEDIUM",
          luggageCount: (form as any).preferences?.luggageCount || 1,
        },
        stopovers:
          form.stopovers?.map((stop) => ({
            region: stop.region || "",
            city: stop.city || "",
            locationName: stop.locationName || "",
            latitude: stop.latitude,
            longitude: stop.longitude,
            address: stop.address || "",
          })) || [],
      };

      const { data } = await axios.put(
        `${apiUrl}/api/v1/rides/${ride.id}?lang=${currentLanguage}`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast.success(
        t("RideDetails.update.success", "Ride updated successfully")
      );
      queryClient.invalidateQueries({
        queryKey: [queryKey.SINGLE_RIDE, ride.id],
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || t("common.error", "Error"), {
        className: "custom-error-toast",
      });
    },
  });

  // Vehicles
  const { data: vehiclesData } = useAllVehicles();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // When updating from Luxon
  useEffect(() => {
    if (!ride?.departureTime) return;

    // D2D rides store driverStartLocation; fall back to departureLocation
    const startLoc = (ride as any).driverStartLocation || ride.departureLocation;
    if (!startLoc?.latitude || !startLoc?.longitude) return;

    const departureZone = tzlookup(startLoc.latitude, startLoc.longitude);

    // Parse original UTC and convert to the ride's departure zone
    const utcDateTime = DateTime.fromISO(ride.departureTime, { zone: "utc" });
    const localISO = utcDateTime.setZone(departureZone).toISO();

    setForm((prev) => ({
      ...prev,
      departureTime: localISO, // ✅ string always
    }));
  }, [ride?.departureTime, (ride as any)?.driverStartLocation, ride?.departureLocation]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center">
      {/* Custom overlay */}
      <div
        className="fixed inset-0 bg-black/25 dark:bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal content */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {/* Header */}
        <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-6">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {t("RideDetails.editRide", "Edit Ride")}
          </h2>
        </div>

        <div className="space-y-6">
          {/* City Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <CanadianCitySelector
                value={departureCity}
                onChange={(city) => {
                  setDepartureCity(city);
                  if (city && form.departureLocation) {
                    setForm((prev) => ({
                      ...prev,
                      departureLocation: {
                        ...prev.departureLocation,
                        city: city.name,
                        region: city.province,
                      },
                    }));
                  }
                }}
                placeholder={t("driver.selectDepartureCity", "Select departure city")}
                label={t("driver.selectDepartureCity", "Select departure city")}
                googleReady={googleReady}
              />
            </div>
            <div className="space-y-2">
              <CanadianCitySelector
                value={destinationCity}
                onChange={(city) => {
                  setDestinationCity(city);
                  if (city && form.destinationLocation) {
                    setForm((prev) => ({
                      ...prev,
                      destinationLocation: {
                        ...prev.destinationLocation,
                        city: city.name,
                        region: city.province,
                      },
                    }));
                  }
                }}
                placeholder={t("driver.selectDestinationCity", "Select destination city")}
                label={t("driver.selectDestinationCity", "Select destination city")}
                googleReady={googleReady}
              />
            </div>
          </div>

          <RideMap
            startPoint={form.departureLocation}
            endPoint={form.destinationLocation}
            stops={form.stopovers}
            mode="edit"
            onRouteChange={handleRouteChange}
            setDuration={setDuration}
            departureTime={form.departureTime}
            height="320px"
          />

          {form?.departureTime &&
            form?.departureLocation?.latitude != null &&
            form?.departureLocation?.longitude != null &&
            (() => {
              try {
                const userTimeZone = DateTime.local().zoneName; // e.g. "Europe/Berlin"

                const departureZone = tzlookup(
                  form.departureLocation.latitude,
                  form.departureLocation.longitude
                );

                const departureInCity = DateTime.fromISO(form.departureTime, {
                  zone: departureZone,
                });

                // Convert that exact point in time to the user's local time
                const departureInUserZone =
                  departureInCity.setZone(userTimeZone);

                return (
                  <div className="text-sm bg-emerald-100 dark:bg-emerald-800/20 text-emerald-900 dark:text-emerald-200 mt-4 p-4 rounded-xl border border-emerald-300 dark:border-emerald-600 shadow-sm">
                    {t("common_.timeConversion", {
                      departureTime: departureInCity.toFormat(
                        "dd MMM yyyy, HH:mm a"
                      ),
                      departureCity: form.departureLocation.city,
                      localTime: departureInUserZone.toFormat(
                        "dd MMM yyyy, HH:mm a"
                      ),
                    })}
                  </div>
                );
              } catch (err) {
                console.error("Timezone lookup failed:", err);
                return null;
              }
            })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                {t("createRide.driver.tripDetails", "Trip Details")}
              </Label>
              <div className="mt-2">
                <Input
                  type="date"
                  value={
                    form.departureTime ? form.departureTime.split("T")[0] : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value;
                    const time =
                      form.departureTime?.split("T")[1]?.slice(0, 5) || "00:00";
                    setForm((prev) => ({
                      ...prev,
                      departureTime: `${date}T${time}`,
                    }));
                  }}
                />
              </div>
            </div>

            <div>
              <Label>
                {t("createRide.driver.tripDetails", "Trip Details")}
              </Label>
              <div className="mt-2">
                <Input
                  type="time"
                  value={
                    form.departureTime
                      ? DateTime.fromISO(form.departureTime, {
                          zone: timeZone,
                        }).toFormat("HH:mm") // ✅ convert to correct local time
                      : ""
                  }
                  onChange={(e) => {
                    const time = e.target.value; // "07:22"

                    // Keep the same date, only update time
                    const dt = DateTime.fromISO(form.departureTime, {
                      zone: timeZone,
                    });
                    const [hour, minute] = time.split(":").map(Number);

                    const updated = dt.set({ hour, minute }).toISO();

                    setForm((prev) => ({
                      ...prev,
                      departureTime: updated, // ✅ always stored as ISO string
                    }));
                  }}
                />
              </div>
            </div>

            <div>
              <Label>
                {t("RideDetails.availableSeats", "Available Seats")}
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleChange(
                      "availableSeats",
                      Math.max(1, form.availableSeats - 1)
                    )
                  }
                  disabled={form.availableSeats <= 1}
                  className="h-10 w-10 p-0"
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  max="8"
                  value={form.availableSeats || 1}
                  onChange={(e) =>
                    handleChange(
                      "availableSeats",
                      Math.max(1, Math.min(parseInt(e.target.value) || 1, 8))
                    )
                  }
                  className="text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleChange(
                      "availableSeats",
                      Math.min(8, form.availableSeats + 1)
                    )
                  }
                  disabled={form.availableSeats >= 8}
                  className="h-10 w-10 p-0"
                >
                  +
                </Button>
              </div>
            </div>

            <div>
              <Label>
                <span className="flex items-center gap-1">
                  {t("RideDetails.contribution", "Contribution")} (
                  <DollarSignIcon className="w-4 h-4" />)
                </span>
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current = Number(form.contribution || 0);
                    let next = current - 1;
                    if (next < 0) next = 0;
                    if (next > 0 && next < 1) next = 1;
                    next = Number(next.toFixed(2));
                    handleChange("contribution", next);
                    setContributionInput(next.toFixed(2));
                  }}
                  className="h-10 w-10 p-0"
                >
                  −
                </Button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="block w-full py-2.5 px-3 pr-10 text-center border rounded-md bg-white dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-[#30BFDD]"
                    value={contributionInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (
                        /^\d*(?:\.)?\d{0,2}$/.test(raw) ||
                        raw === "" ||
                        raw === "."
                      ) {
                        setContributionInput(raw);
                      }
                    }}
                    onBlur={() => {
                      let val = parseFloat(contributionInput);
                      if (isNaN(val)) val = 0;
                      if (val < 0) val = 0;
                      if (val > 0 && val < 1) val = 1;
                      val = Number(val.toFixed(2));
                      handleChange("contribution", val);
                      setContributionInput(val.toFixed(2));
                    }}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500 dark:text-gray-300 pointer-events-none">
                    ($)
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const current = Number(form.contribution || 0);
                    const next = Number((current + 1).toFixed(2));
                    handleChange("contribution", next);
                    setContributionInput(next.toFixed(2));
                  }}
                  className="h-10 w-10 p-0"
                >
                  +
                </Button>
              </div>
            </div>
          </div>

          {/* Preferences - Kangaride Style */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {t("driver.preferences", "Ride Preferences")}
            </h3>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                {[
                  {
                    id: "smoking",
                    label: t("driver.smoking", "Smoking"),
                    icon: "🚭",
                    description: t(
                      "driver.smokingDescription",
                      "Allow smoking in the vehicle"
                    ),
                  },
                  {
                    id: "pets",
                    label: t("driver.pets", "Pets"),
                    icon: "🐕",
                    description: t(
                      "driver.petsDescription",
                      "Allow pets in the vehicle"
                    ),
                  },
                  {
                    id: "airConditioning",
                    label: t("driver.airConditioning", "Air Conditioning"),
                    icon: "❄️",
                    description: t(
                      "driver.airConditioningDescription",
                      "Vehicle has air conditioning"
                    ),
                  },
                  {
                    id: "bicycleSupport",
                    label: t("driver.bicycleSupport", "Bicycle Support"),
                    icon: "🚴",
                    description: t(
                      "driver.bicycleSupportDescription",
                      "Can transport bicycles"
                    ),
                  },
                  {
                    id: "snowTires",
                    label: t("driver.snowTires", "Snow Tires"),
                    icon: "🎿",
                    description: t(
                      "driver.snowTiresDescription",
                      "Vehicle equipped with snow tires"
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <span className="text-lg">{item.icon}</span>
                      </div>
                      <div>
                        <label
                          htmlFor={`preferences.${item.id}`}
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                          {item.label}
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center">
                      <div className="relative">
                        <input
                          id={`preferences.${item.id}`}
                          name={`preferences.${item.id}`}
                          type="checkbox"
                          className="sr-only"
                          checked={
                            (form.preferences as any)?.[item.id] || false
                          }
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              preferences: {
                                ...(prev.preferences || {}),
                                [item.id]: e.target.checked,
                              },
                            }))
                          }
                        />
                        <div
                          className={`block w-14 h-8 rounded-full cursor-pointer transition-colors duration-200 ${
                            (form.preferences as any)?.[item.id]
                              ? "bg-black"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              preferences: {
                                ...(prev.preferences || {}),
                                [item.id]: !(prev.preferences as any)?.[
                                  item.id
                                ],
                              },
                            }));
                          }}
                        >
                          <div
                            className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-all duration-200 ease-in-out ${
                              (form.preferences as any)?.[item.id]
                                ? "transform translate-x-6"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vehicle Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {vehiclesData?.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    vehicleId: vehicle.id,
                  }))
                }
                className={`cursor-pointer border rounded-xl p-4 transition-colors ${
                  form.vehicleId == vehicle.id
                    ? "border-[#30BFDD] bg-[#f0fcfd]"
                    : "border-gray-300 dark:border-gray-600 hover:border-[#30BFDD]"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Vehicle Image */}
                  <div className="relative">
                    <img
                      src={vehicle.defaultImage?.url}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-16 h-16 object-cover rounded-md border border-gray-300 dark:border-gray-600"
                    />
                    {form.vehicleId == vehicle.id && (
                      <div className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Vehicle Info */}
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white">
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <div className="mt-1 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{t("driver.Year")}:</span>
                        <span>{vehicle.year}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{t("driverPlate")}:</span>
                        <span className="font-mono">{vehicle.plateNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">
                          {t("common_.small.color")}:
                        </span>
                        <span className="capitalize">{vehicle.color}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">
                          {t("common_.small.max")}:
                        </span>
                        <span>
                          {vehicle.maxPlaces || "Unknown"}{" "}
                          {t("common_.small.seats")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Booking type */}
          <select
            id="bookingType"
            name="bookingType"
            className="block w-full py-2.5 px-3 border rounded-md bg-white dark:bg-gray-700 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-[#30BFDD]"
            value={form.bookingType}
            onChange={(e) => {
              setForm((prev: any) => ({
                ...prev,
                bookingType: e.target.value,
              }));
            }}
          >
            <option value="" disabled>
              {t("common_.small.bookingType")}
            </option>
            <option value="AUTOMATIC">
              {t("createRide.driver.bookingTypeAutomatic")}
            </option>
            <option value="MANUAL">
              {t("createRide.driver.bookingTypeManual")}
            </option>
          </select>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={() => updateRide()}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending
              ? t("general.saving", "Saving...")
              : t("createRide.driver.rideDetails.save", "Save Changes")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditRideModal;
