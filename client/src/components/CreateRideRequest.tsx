import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCreateRideRequest, useUpdateRideRequest } from "@/data";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  MapPin,
  Calendar,
  User,
  Loader2,
  Plus,
  Route,
  LoaderIcon,
  AlertTriangle,
  Edit,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useJsApiLoader } from "@react-google-maps/api";
import { LIBRARIES } from "./Map";
import {
  CanadianCitySelector,
  verifyLocationInCity,
} from "./CanadianCitySelector";
import { DateTime } from "luxon";
import tzlookup from "tz-lookup";
import { useNavigate } from "react-router-dom";

interface CreateRideRequestProps {
  initialRequest?: any;
  type?: string;
}

interface Location {
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  address?: string;
}

const CreateRideRequest = ({
  initialRequest,
  type,
}: CreateRideRequestProps) => {
  const { t } = useTranslation();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  const [open, setOpen] = useState(false);
  const [departureCity, setDepartureCity] = useState(null);
  const [destinationCity, setDestinationCity] = useState(null);
  const [departureLocation, setDepartureLocation] = useState<Location>({
    city: "",
    province: "",
    latitude: undefined,
    longitude: undefined,
    locationName: "",
    address: "",
  });
  const [destinationLocation, setDestinationLocation] = useState<Location>({
    city: "",
    province: "",
    latitude: undefined,
    longitude: undefined,
    locationName: "",
    address: "",
  });

  const [rideType, setRideType] = useState<"P2P" | "D2D">("P2P");
  const [passengers, setPassengers] = useState(1);
  const [notes, setNotes] = useState("");

  const [rideDate, setRideDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Refs for Google Places Autocomplete
  const departureAutocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(null);
  const destinationAutocompleteRef =
    useRef<google.maps.places.Autocomplete | null>(null);
  const departureInputRef = useRef<HTMLInputElement | null>(null);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);
  const departurePacIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const destinationPacIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isMismatch, setIsMismatch] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const updateRide = useUpdateRideRequest(initialRequest?.id);
  const router = useNavigate();

  async function checkCityMismatch(
    location: any,
    selectedCity: any,
    googleReady: boolean
  ): Promise<boolean> {
    try {
      const isInCity = await verifyLocationInCity(
        location,
        selectedCity,
        googleReady
      );

      return !isInCity;
    } catch (error) {
      console.error("Error checking city mismatch:", error);
      return true;
    }
  }

  function useCityMismatch(
    location: any,
    selectedCity: any,
    googleReady: boolean
  ) {
    useEffect(() => {
      const checkMismatch = async () => {
        if (!location || !selectedCity) {
          setIsMismatch(false);
          return;
        }

        setIsLoading(true);
        try {
          const mismatch = await checkCityMismatch(
            location,
            selectedCity,
            googleReady
          );
          setIsMismatch(mismatch);
        } catch (error) {
          console.error("Mismatch check failed:", error);
          setIsMismatch(true);
        } finally {
          setIsLoading(false);
        }
      };

      const timeoutId = setTimeout(checkMismatch, 300);
      return () => clearTimeout(timeoutId);
    }, [location, selectedCity, googleReady]);

    return { isMismatch, isLoading };
  }

  useEffect(() => {
    if (!initialRequest) return;

    setDepartureCity({
      name: initialRequest.origin?.city,
      province: initialRequest?.originProvince,
    });

    setDestinationCity({
      name: initialRequest.destination?.city,
      province: initialRequest?.destProvince,
    });

    setDepartureLocation({
      latitude: initialRequest.origin.latitude,
      longitude: initialRequest.origin.longitude,
      locationName: initialRequest.origin.locationName,
      address: initialRequest.origin.address,
      province: initialRequest.origin.province,
    });

    setDestinationLocation({
      latitude: initialRequest.destination.latitude,
      longitude: initialRequest.destination.longitude,
      locationName: initialRequest.destination.locationName,
      address: initialRequest.destination.address,
      city: initialRequest.destination.city,
      province: initialRequest.destination.province,
    });

    setDepartureCity({
      province: initialRequest.originProvince,
      name: initialRequest.originCity,
    });

    setDestinationCity({
      province: initialRequest.destProvince,
      name: initialRequest.destCity,
    });

    setRideType(initialRequest.rideType);
    setPassengers(initialRequest.seats || 1);
    setNotes(initialRequest.description || "");

    if (initialRequest.formattedDate)
      setRideDate(initialRequest.formattedDate.pickup);

    if (initialRequest.startInPickupTZ)
      setStartTime(initialRequest.startInPickupTZ);

    if (initialRequest.endInPickupTZ) setEndTime(initialRequest.endInPickupTZ);
  }, [initialRequest]);

  // Initialize Google Places Autocomplete for departure
  useEffect(() => {
    if (!open || !isLoaded || !window.google) return;

    // Wait for the input to be rendered in the DOM
    const timer = setTimeout(() => {
      if (!departureInputRef.current) return;
      // Clean up existing autocomplete
      if (departureAutocompleteRef.current) {
        try {
          window.google.maps.event.clearInstanceListeners(
            departureAutocompleteRef.current
          );
        } catch (e) {
          // Ignore cleanup errors
        }
        departureAutocompleteRef.current = null;
      }

      try {
        departureAutocompleteRef.current =
          new window.google.maps.places.Autocomplete(
            departureInputRef.current!,
            {
              componentRestrictions: { country: "rw" },
              types: ["geocode", "establishment"],
            }
          );

        // Add error listener for billing/API errors
        window.google.maps.event.addListener(
          departureAutocompleteRef.current,
          "error",
          (error: any) => {
            console.error("Google Places Autocomplete error:", error);
            if (
              error?.message?.includes("BillingNotEnabled") ||
              error?.message?.includes("billing")
            ) {
              toast.error(
                t(
                  "googleMaps.billingError",
                  "Google Maps API billing is not enabled. Please enable billing in Google Cloud Console to use location search."
                ),
                {
                  className: "custom-error-toast",
                  duration: 10000,
                }
              );
            }
          }
        );

        departureAutocompleteRef.current.addListener("place_changed", () => {
          const place = departureAutocompleteRef.current?.getPlace();
          if (!place?.geometry?.location) return;

          const addressComponents = place.address_components || [];
          const getComponent = (types: string[]) =>
            addressComponents.find((c) =>
              types.some((t) => c.types.includes(t))
            )?.long_name || "";

          const location: Location = {
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            locationName: place.name || place.formatted_address || "",
            address: place.formatted_address || "",
            city:
              getComponent(["locality"]) ||
              getComponent(["administrative_area_level_2"]),
            province: getComponent(["administrative_area_level_1"]) || "",
          };

          setDepartureLocation(location);
        });

        // Ensure pac-container is clickable
        const ensurePacClickable = () => {
          const pacContainer = document.querySelector(
            ".pac-container"
          ) as HTMLElement;
          if (pacContainer) {
            pacContainer.style.pointerEvents = "auto";
            pacContainer.style.zIndex = "99999";
            // Make sure all pac-items are clickable
            const pacItems = pacContainer.querySelectorAll(".pac-item");
            pacItems.forEach((item) => {
              (item as HTMLElement).style.pointerEvents = "auto";
              (item as HTMLElement).style.cursor = "pointer";
            });
          }
        };

        // Check periodically and on input focus
        const inputElement = departureInputRef.current;
        departurePacIntervalRef.current = setInterval(ensurePacClickable, 100);
        inputElement.addEventListener("focus", ensurePacClickable);
      } catch (error) {
        console.error("Error initializing departure autocomplete:", error);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (departurePacIntervalRef.current) {
        clearInterval(departurePacIntervalRef.current);
        departurePacIntervalRef.current = null;
      }
      if (departureAutocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners?.(
            departureAutocompleteRef.current
          );
        } catch (e) {
          // Ignore cleanup errors
        }
        departureAutocompleteRef.current = null;
      }
    };
  }, [open, isLoaded, t]);

  // Initialize Google Places Autocomplete for destination
  useEffect(() => {
    if (!open || !isLoaded || !window.google) return;

    // Wait for the input to be rendered in the DOM
    const timer = setTimeout(() => {
      if (!destinationInputRef.current) {
        return;
      }

      // Clean up existing autocomplete
      if (destinationAutocompleteRef.current) {
        try {
          window.google.maps.event.clearInstanceListeners(
            destinationAutocompleteRef.current
          );
        } catch (e) {
          // Ignore cleanup errors
        }
        destinationAutocompleteRef.current = null;
      }

      try {
        destinationAutocompleteRef.current =
          new window.google.maps.places.Autocomplete(
            destinationInputRef.current!,
            {
              componentRestrictions: { country: "rw" },
              types: ["geocode", "establishment"],
            }
          );

        // Add error listener for billing/API errors
        window.google.maps.event.addListener(
          destinationAutocompleteRef.current,
          "error",
          (error: any) => {
            console.error("Google Places Autocomplete error:", error);
            if (
              error?.message?.includes("BillingNotEnabled") ||
              error?.message?.includes("billing")
            ) {
              toast.error(
                t(
                  "googleMaps.billingError",
                  "Google Maps API billing is not enabled. Please enable billing in Google Cloud Console to use location search."
                ),
                {
                  className: "custom-error-toast",
                  duration: 10000,
                }
              );
            }
          }
        );

        destinationAutocompleteRef.current.addListener("place_changed", () => {
          const place = destinationAutocompleteRef.current?.getPlace();
          if (!place?.geometry?.location) return;

          const addressComponents = place.address_components || [];
          const getComponent = (types: string[]) =>
            addressComponents.find((c) =>
              types.some((t) => c.types.includes(t))
            )?.long_name || "";

          const location: Location = {
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            locationName: place.name || place.formatted_address || "",
            address: place.formatted_address || "",
            city:
              getComponent(["locality"]) ||
              getComponent(["administrative_area_level_2"]),
            province: getComponent(["administrative_area_level_1"]) || "",
          };

          setDestinationLocation(location);
        });

        // Ensure pac-container is clickable
        const ensurePacClickable = () => {
          const pacContainer = document.querySelector(
            ".pac-container"
          ) as HTMLElement;
          if (pacContainer) {
            pacContainer.style.pointerEvents = "auto";
            pacContainer.style.zIndex = "99999";
            // Make sure all pac-items are clickable
            const pacItems = pacContainer.querySelectorAll(".pac-item");
            pacItems.forEach((item) => {
              (item as HTMLElement).style.pointerEvents = "auto";
              (item as HTMLElement).style.cursor = "pointer";
            });
          }
        };

        // Check periodically and on input focus
        const inputElement = destinationInputRef.current;
        destinationPacIntervalRef.current = setInterval(
          ensurePacClickable,
          100
        );
        inputElement.addEventListener("focus", ensurePacClickable);
      } catch (error) {
        console.error("Error initializing destination autocomplete:", error);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (destinationPacIntervalRef.current) {
        clearInterval(destinationPacIntervalRef.current);
        destinationPacIntervalRef.current = null;
      }
      if (destinationAutocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners?.(
            destinationAutocompleteRef.current
          );
        } catch (e) {
          // Ignore cleanup errors
        }
        destinationAutocompleteRef.current = null;
      }
    };
  }, [open, isLoaded, t]);

  const { mutate: createRideRequest, isPending } = useCreateRideRequest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!departureCity) {
      toast.error(
        t(
          "rideRequests.create.validation.departureCityRequired",
          "Departure city is required"
        ),
        {
          className: "custom-error-toast",
        }
      );
      return;
    }

    if (!destinationCity) {
      toast.error(
        t(
          "rideRequests.create.validation.destinationCityRequired",
          "Destination city is required"
        ),
        {
          className: "custom-error-toast",
        }
      );
      return;
    }

    // Convert departure time to timestamp (number)
    let dateTimestamp: number;
    let timeWindowStart: number;
    let timeWindowEnd: number;

    try {
      // Get timezone from departure location
      const timezone = tzlookup(
        departureLocation.latitude!,
        departureLocation.longitude!
      );

      // 1️⃣ DATE → Midnight timestamp
      const dateISO = `${rideDate}T00:00`;
      const dateObj = DateTime.fromISO(dateISO, { zone: timezone });
      if (!dateObj.isValid) throw new Error("Invalid date");
      dateTimestamp = dateObj.toMillis();

      // 2️⃣ START TIME → on same date
      const startISO = `${rideDate}T${startTime}`;
      const startObj = DateTime.fromISO(startISO, { zone: timezone });
      if (!startObj.isValid) throw new Error("Invalid start time");
      timeWindowStart = startObj.toMillis();

      // 3️⃣ END TIME → on same date
      const endISO = `${rideDate}T${endTime}`;
      const endObj = DateTime.fromISO(endISO, { zone: timezone });
      if (!endObj.isValid) throw new Error("Invalid end time");
      timeWindowEnd = endObj.toMillis();

      // Validate that the date is in the future
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (dateTimestamp <= currentTimestamp) {
        toast.error(
          t(
            "rideRequests.create.validation.dateMustBeFuture",
            "Departure date and time must be in the future"
          ),
          {
            className: "custom-error-toast",
          }
        );
        return;
      }
    } catch (error) {
      toast.error(
        t(
          "rideRequests.create.validation.invalidDate",
          "Invalid departure date/time"
        ),
        {
          className: "custom-error-toast",
        }
      );
      return;
    }
    const originLat = Number(departureLocation.latitude);
    const originLng = Number(departureLocation.longitude);
    const destLat = Number(destinationLocation.latitude);
    const destLng = Number(destinationLocation.longitude);

    if (
      isNaN(originLat) ||
      isNaN(originLng) ||
      isNaN(destLat) ||
      isNaN(destLng)
    ) {
      toast.error(
        t(
          "rideRequests.create.validation.invalidCoordinates",
          "Invalid location coordinates. Please select locations from the dropdown."
        ),
        {
          className: "custom-error-toast",
        }
      );
      return;
    }

    const requestData = {
      origin: {
        latitude: originLat,
        longitude: originLng,
        address: departureLocation.address,
        locationName: departureLocation.locationName,
        city: departureLocation.city || departureCity.name,
        province: departureLocation.province || departureCity.province,
      },

      destination: {
        latitude: destLat,
        longitude: destLng,
        locationName: destinationLocation.locationName,
        address: destinationLocation.address,
        city: destinationLocation.city || destinationCity.name,
        province: destinationLocation.province || destinationCity.province,
      },
      date: dateTimestamp,
      timeWindowStart,
      timeWindowEnd,
      seats: passengers || 1,
      rideType: rideType,
      ...(notes && { notes }),
    };

    if (type === "Edit") {
      updateRide.mutate(requestData, {
        onSuccess() {
          toast.success(
            t(
              "rideRequests.create.success",
              "Ride request updated successfully!"
            ),
            {
              className: "custom-success-toast",
            }
          );

          setOpen(false);
          setDepartureCity(null);
          setDestinationCity(null);
          setDepartureLocation({
            city: "",
            latitude: undefined,
            longitude: undefined,
            locationName: "",
            address: "",
            province: "",
          });

          setDestinationLocation({
            latitude: undefined,
            longitude: undefined,
            locationName: "",
            address: "",
            city: "",
            province: "",
          });
          setRideDate("");
          setStartTime("");
          setEndTime("");
          setRideType("P2P");
          setPassengers(1);
          setNotes("");
        },
      });
      return;
    }

    createRideRequest(requestData as any, {
      onSuccess: (data) => {
        toast.success(
          t(
            "rideRequests.create.success",
            "Ride request created successfully!"
          ),
          {
            className: "custom-success-toast",
          }
        );

        setOpen(false);
        // Reset form
        setDepartureCity(null);
        setDestinationCity(null);
        setDepartureLocation({
          latitude: undefined,
          longitude: undefined,
          locationName: "",
          address: "",
          city: "",
          province: "",
        });
        setDestinationLocation({
          latitude: undefined,
          longitude: undefined,
          locationName: "",
          address: "",
          city: "",
          province: "",
        });
        setRideDate("");
        setStartTime("");
        setEndTime("");
        setRideType("P2P");
        setPassengers(1);
        setNotes("");

        setTimeout(() => {
          router(`/dashboard?redirect_to=requests&new_request=${data.id}`);
        }, 500);
      },
      onError: (error: any) => {
        toast.error(
          error?.response?.data?.message ||
            t("rideRequests.create.error", "Failed to create ride request"),
          {
            className: "custom-error-toast",
          }
        );
      },
    });
  };

  const { isMismatch: departureMismatch, isLoading: checkingDeparture } =
    useCityMismatch(departureLocation, departureCity?.name, isLoaded);

  const { isMismatch: destinationMismatch, isLoading: checkingDestination } =
    useCityMismatch(destinationLocation, destinationCity?.name, isLoaded);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {type === "Edit" ? (
          <Button
            variant="outline"
            className="flex-1 border-accent hover:border-accent/90 text-accent"
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("rideRequests.edit", "Edit")}
          </Button>
        ) : (
          <Button
            variant="default"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="h-4 w-4" />
            {t("rideRequests.create.button", "Create Ride Request")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-w-4xl max-h-[95vh] overflow-y-auto bg-gray-50 dark:bg-primary-900 text-primary-900 dark:text-primary-50 mt-5 pb-4"
        style={{ pointerEvents: "auto" }}
        onInteractOutside={(e) => {
          // Prevent dialog from closing when clicking on Google Places Autocomplete dropdown
          const target = e.target as HTMLElement;
          if (target.closest(".pac-container") || target.closest(".pac-item")) {
            e.preventDefault();
          }
        }}
      >
        {/* Global styles for Google Places Autocomplete dropdown */}
        <style>{`
          .pac-container {
            z-index: 99999 !important;
            font-family: inherit;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            pointer-events: auto !important;
            position: absolute !important;
            background-color: #fff;
            border: 1px solid #d1d5db;
          }
          .pac-item {
            cursor: pointer !important;
            padding: 10px 4px;
            border-top: 1px solid #e5e7eb;
            pointer-events: auto !important;
            color: #111827;
          }
          .pac-item:first-child {
            border-top: none;
          }
          .pac-item:hover {
            background-color: #f3f4f6;
          }
          .pac-item-selected {
            background-color: #e5e7eb;
          }
          .pac-icon {
            margin-right: 8px;
          }
          /* Dark mode styles */
          .dark .pac-container {
            background-color: #0A282E; /* primary-800 */
            border-color: #103B45; /* primary-700 */
          }
          .dark .pac-item {
            color: #E6F0F2; /* primary-50 */
            border-top-color: #103B45; /* primary-700 */
          }
          .dark .pac-item:hover {
            background-color: #154F5C; /* primary-600 */
          }
          .dark .pac-item-selected {
            background-color: #1A6373; /* primary-500 */
          }
        `}</style>

        <DialogHeader className="p-6">
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-primary-800 dark:text-white">
            <MapPin className="h-6 w-6 text-accent" />
            {t("rideRequests.create.title", "Create Ride Request")}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-primary-200">
            {t(
              "rideRequests.create.description",
              "Request a ride for a route that's not currently available. Drivers will see your request and can create a ride for you."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 p-6">
          {/* Ride Type Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-primary-800 dark:text-primary-100">
              {t("rideRequests.create.rideType", "Ride Type")} *
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                  rideType === "P2P"
                    ? "border-accent bg-primary-50 dark:bg-primary-800 ring-2 ring-accent"
                    : "border-gray-300 dark:border-primary-700 bg-white dark:bg-primary-800/50 hover:border-primary-400 dark:hover:border-primary-500"
                }`}
              >
                <input
                  type="radio"
                  name="rideType"
                  value="P2P"
                  checked={rideType === "P2P"}
                  onChange={(e) => setRideType(e.target.value as "P2P" | "D2D")}
                  className="sr-only"
                />
                <div className="flex items-center gap-3 mb-2">
                  <Route className="h-6 w-6 text-accent" />
                  <span className="font-bold text-base text-primary-900 dark:text-white">
                    {t(
                      "rideRequests.create.rideTypeP2P",
                      "Point-to-Point (P2P)"
                    )}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-primary-200">
                  {t(
                    "rideRequests.create.rideTypeP2PDescription",
                    "Fixed pickup and drop-off locations"
                  )}
                </p>
              </label>
              <label
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                  rideType === "D2D"
                    ? "border-accent bg-primary-50 dark:bg-primary-800 ring-2 ring-accent"
                    : "border-gray-300 dark:border-primary-700 bg-white dark:bg-primary-800/50 hover:border-primary-400 dark:hover:border-primary-500"
                }`}
              >
                <input
                  type="radio"
                  name="rideType"
                  value="D2D"
                  checked={rideType === "D2D"}
                  onChange={(e) => setRideType(e.target.value as "P2P" | "D2D")}
                  className="sr-only"
                />
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="h-6 w-6 text-accent" />
                  <span className="font-bold text-base text-primary-900 dark:text-white">
                    {t("rideRequests.create.rideTypeD2D", "Door-to-Door (D2D)")}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-primary-200">
                  {t(
                    "rideRequests.create.rideTypeD2DDescription",
                    "Flexible pickup and drop-off"
                  )}
                </p>
              </label>
            </div>
          </div>

          {/* City Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <CanadianCitySelector
                value={departureCity}
                onChange={setDepartureCity}
                placeholder={t(
                  "rideRequests.create.selectDepartureCity",
                  "Select departure city"
                )}
                label={t("rideRequests.create.departureCity", "Departure City")}
                googleReady={isLoaded}
              />
              {checkingDeparture ? (
                <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <LoaderIcon className="animate-spin w-4 h-4" />
                    <span>
                      {t(
                        "createRide.driver.verifyingLocation",
                        "Verifying location..."
                      )}
                    </span>
                  </div>
                </div>
              ) : departureMismatch ? (
                <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {t(
                        "createRide.driver.departureCityMismatch",
                        "The pickup point should be in {{city}}, {{province}}. You might need to zoom in to the map and select a specific location.",
                        {
                          city: departureCity?.name,
                          province: departureCity?.province,
                        }
                      )}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <CanadianCitySelector
                value={destinationCity}
                onChange={setDestinationCity}
                placeholder={t(
                  "rideRequests.create.selectDestinationCity",
                  "Select destination city"
                )}
                label={t(
                  "rideRequests.create.destinationCity",
                  "Destination City"
                )}
                googleReady={isLoaded}
              />

              {checkingDestination ? (
                <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <LoaderIcon className="animate-spin w-4 h-4" />
                    <span>
                      {t(
                        "createRide.driver.verifyingLocation",
                        "Verifying location..."
                      )}
                    </span>
                  </div>
                </div>
              ) : destinationMismatch ? (
                <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {t(
                        "createRide.driver.destinationCityMismatch",
                        "The destination point should be in {{city}}, {{province}}. You might need to zoom in to the map and select a specific location.",
                        {
                          city: destinationCity?.name,
                          province: destinationCity?.province,
                        }
                      )}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Location Selection with Autocomplete */}
          {loadError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 font-semibold mb-2">
                {t("googleMaps.loadError", "Google Maps API Error")}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                {loadError.message?.includes("BillingNotEnabled") ||
                loadError.message?.includes("billing")
                  ? t(
                      "googleMaps.billingError",
                      "Google Maps API billing is not enabled. Please enable billing in Google Cloud Console to use location search."
                    )
                  : loadError.message ||
                    t(
                      "googleMaps.unknownError",
                      "An error occurred loading Google Maps."
                    )}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {t(
                  "googleMaps.billingInstructions",
                  "To enable billing, visit: https://console.cloud.google.com/project/_/billing/enable"
                )}
              </p>
            </div>
          )}

          {isLoaded && !loadError && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Departure Location */}
                <div className="space-y-2">
                  <Label className="font-semibold text-primary-800 dark:text-primary-100">
                    {t(
                      "rideRequests.create.departureLocation",
                      "Departure Location"
                    )}
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500 z-10" />
                    <input
                      ref={departureInputRef}
                      type="text"
                      placeholder={t(
                        "rideRequests.create.departureLocationPlaceholder",
                        "Type to search for a location..."
                      )}
                      value={departureLocation?.address || ""}
                      onChange={(e) => {
                        setDepartureLocation((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }));
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-primary-700 rounded-md bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                    />
                  </div>
                  {departureLocation?.address &&
                    departureLocation?.latitude && (
                      <p className="text-xs text-accent dark:text-accent/80">
                        {departureLocation.address}
                      </p>
                    )}
                </div>

                {/* Destination Location */}
                <div className="space-y-2">
                  <Label className="font-semibold text-primary-800 dark:text-primary-100">
                    {t(
                      "rideRequests.create.destinationLocation",
                      "Destination Location"
                    )}
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500 z-10" />
                    <input
                      ref={destinationInputRef}
                      type="text"
                      placeholder={t(
                        "rideRequests.create.destinationLocationPlaceholder",
                        "Type to search for a location..."
                      )}
                      value={destinationLocation?.address || ""}
                      onChange={(e) => {
                        setDestinationLocation((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }));
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-primary-700 rounded-md bg-white dark:bg-primary-800 text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                    />
                  </div>
                  {destinationLocation?.address &&
                    destinationLocation?.latitude && (
                      <p className="text-xs text-accent dark:text-accent/80">
                        {destinationLocation.address}
                      </p>
                    )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-primary-300">
                {t(
                  "rideRequests.create.locationInstructions",
                  "Type in the fields above to search and select locations. Make sure the locations are in the selected cities."
                )}
              </p>
            </div>
          )}

          {!isLoaded && !loadError && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t("googleMaps.loading", "Loading Google Maps...")}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* DATE INPUT */}
            <div className="space-y-2">
              <Label
                htmlFor="rideDate"
                className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100"
              >
                <Calendar className="h-4 w-4" />
                {t("rideRequests.create.date", "Date")} *
              </Label>
              <Input
                id="rideDate"
                type="date"
                value={rideDate}
                required
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setRideDate(e.target.value)}
                className="bg-white dark:bg-primary-800 border-gray-300 dark:border-primary-700"
              />
            </div>

            {/* Number of passengers */}
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <Label
                htmlFor="passengers"
                className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100"
              >
                <User className="h-4 w-4" />
                {t("rideRequests.create.passengers", "Number of Passengers")}
              </Label>
              <Input
                id="passengers"
                type="number"
                min="1"
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value) || 1)}
                className="bg-white dark:bg-primary-800 border-gray-300 dark:border-primary-700"
              />
            </div>
          </div>

          <div className="border border-primary-200 p-7">
            <div className="mb-4 bg-orange-50 dark:bg-orange-900/20 p-4 border border-orange-200 dark:border-orange-800 rounded-md text-primary-400 dark:text-gray-500 text-center">
              <p> {t("rideRequests.create.timeRangeInstructions")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* START TIME INPUT */}
              <div className="space-y-2">
                <Label
                  htmlFor="startTime"
                  className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100"
                >
                  <Clock className="h-4 w-4" />
                  {t("rideRequests.create.startTime", "Start Time")} *
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  required
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-white dark:bg-primary-800 border-gray-300 dark:border-primary-700"
                />
              </div>

              {/* END TIME INPUT */}
              <div className="space-y-2">
                <Label
                  htmlFor="endTime"
                  className="flex items-center gap-2 font-semibold text-primary-800 dark:text-primary-100"
                >
                  <Clock className="h-4 w-4" />
                  {t("rideRequests.create.endTime", "End Time")} *
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  required
                  min={startTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-white dark:bg-primary-800 border-gray-300 dark:border-primary-700"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="dark:bg-primary-700 dark:hover:bg-primary-600 dark:border-primary-600 dark:text-white"
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {type === "Edit"
                    ? t("rideRequests.create.creating", "Updating...")
                    : t("rideRequests.create.creating", "Creating...")}
                </>
              ) : type === "Edit" ? (
                t("rideRequests.create.submit", "Update Request")
              ) : (
                t("rideRequests.create.submit", "Create Request")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRideRequest;
