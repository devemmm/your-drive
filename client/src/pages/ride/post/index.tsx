import { CameraCapture } from "@/components/CameraCapture";
import { CanadianCitySelector } from "@/components/CanadianCitySelector";
import DriverOnboardingForm from "@/components/DriverOnboardingForm";
import {
  RestrictedVehicleMakesSearchable,
  VehicleModelsSearchable,
  VehicleYearSelector,
} from "@/components/GetMakes";
import LoadingIndicator from "@/components/LoadingIndicator";
import RideMap from "@/components/Map";
import { MessageDialog } from "@/components/PostRide/messageDialog";
import StepFour from "@/components/PostRide/StepFour";
import StepOne from "@/components/PostRide/StepOne";
import StepThree from "@/components/PostRide/StepThree";
import StepThreeVehicle from "@/components/PostRide/StepThreeVehicle";
import StepTwo from "@/components/PostRide/StepTwo";
import {
  apiUrl,
  queryKey,
  useAllVehicles,
  useSingleRide,
  useSingleRideRequest,
  useUserPreference,
} from "@/data";
import i18n from "@/i18n";
import {
  clearAllImagesFromDB,
  deleteImageFromDB,
  getAllImagesFromDB,
  saveImageToDB,
} from "@/lib/vehicleDb";
import { useAuth } from "@/providers/Context/UseAuthContext";
import {
  buttonVariants,
  calculateEstimatedArrivalTime,
  checkCityMismatch,
  containerVariants,
  itemVariants,
  removeItemsFromLocalStorage,
  stepVariants,
  validateField,
  validateNumber,
} from "@/utils/ride";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Car, DollarSign, MapPin, Settings } from "lucide-react";
import { DateTime } from "luxon";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import tzlookup from "tz-lookup";
import {
  defaultPreferences,
  defaultRideDetails,
  getLocationName,
  resetRideDetailsData,
} from "./helper";
import ProgressConnector from "./ProgressConnector";
import ProgressStep from "./ProgressStep";
import SubmitFunction from "./handleSubmit";

const PostARide: React.FC = () => {
  const { t } = useTranslation();
  const { authenticated } = useAuth();
  const [imagePreviews, setImagePreviews] = useState([]);
  const [addCar, setAddCar] = useState(false);
  const [newRideId, setNewRideId] = useState(0);
  const [newRideStatus, setNewRideStatus] = useState("");
  const [delayTime, setDelayTime] = useState(true);
  const [departureCity, setDepartureCity] = useState<{
    name: string;
    province: string;
  } | null>(null);
  const [destinationCity, setDestinationCity] = useState<{
    name: string;
    province: string;
  } | null>(null);

  const [distance, setDistance] = useState<string>(() => {
    const storedDistance = localStorage.getItem("distance");
    return storedDistance ? storedDistance : "";
  });

  // Duration from Google Maps API (in seconds) - persist to localStorage
  const [duration, setDuration] = useState<number>(() => {
    const storedDuration = localStorage.getItem("duration");
    return storedDuration ? parseInt(storedDuration) : 0;
  });

  // Save duration to localStorage whenever it changes
  useEffect(() => {
    if (duration > 0) localStorage.setItem("duration", duration.toString());
  }, [duration]);

  // User preference
  const { data: userPreference, isPending: isPendingUserPreference } =
    useUserPreference();

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [rideDetails, setRideDetails] = useState(() => {
    const saved = localStorage.getItem("rideDetails");
    const defaultTime = new Date();
    defaultTime.setMinutes(defaultTime.getMinutes() + 30);
    const userPreferences = userPreference?.passenger?.travelPreferences;
    return saved
      ? JSON.parse(saved)
      : defaultRideDetails(defaultPreferences(userPreferences));
  });

  // Local input state for contribution to avoid formatting on every keystroke
  const [contributionInput, setContributionInput] = useState<string>(() =>
    Number(
      JSON.parse(localStorage.getItem("rideDetails") || "null")?.contribution ??
        3
    ).toFixed(2)
  );

  // Reset function to clear all form states
  const resetFormStates = () => {
    removeItemsFromLocalStorage(["rideDetails", "duration", "distance"]);
    const defaultTime = new Date();
    defaultTime.setMinutes(defaultTime.getMinutes() + 30);
    setRideDetails(resetRideDetailsData);
    setDepartureCity(null);
    setAddCar(false);
    setNewRideId(0);
    setNewRideStatus("");
    setFormErrors({});
    setStep(1);
  };

  // Handle departure city change
  const handleDepartureCityChange = (
    city: { name: string; province: string } | null
  ) => {
    setDepartureCity(city);

    if (city) localStorage.setItem("departureCity", JSON.stringify(city));
    else removeItemsFromLocalStorage(["departureCity"]);

    // Clear departure location when city changes
    if (city !== departureCity) {
      setRideDetails((prev) => ({
        ...prev,
        departure: {
          region: "",
          city: "",
          locationName: "",
          latitude: undefined,
          longitude: undefined,
          address: "",
        },
      }));
    }
  };

  // Handle destination city change
  const handleDestinationCityChange = (
    city: { name: string; province: string } | null
  ) => {
    setDestinationCity(city);

    if (city) localStorage.setItem("destinationCity", JSON.stringify(city));
    else removeItemsFromLocalStorage(["destinationCity"]);

    if (city !== destinationCity) {
      setRideDetails((prev) => ({
        ...prev,
        destination: {
          region: "",
          city: "",
          locationName: "",
          latitude: undefined,
          longitude: undefined,
          address: "",
        },
      }));
    }
  };

  useEffect(() => {
    if (vehicleInfo.plateNumber && vehicleInfo.plateNumber.length > 0)
      setAddCar(true);
  }, []);

  useEffect(() => {
    const numDistance =
      typeof distance === "string" ? Number(distance) : distance;

    if (!isNaN(numDistance) && numDistance > 0)
      localStorage.setItem("distance", JSON.stringify(numDistance));
    else localStorage.setItem("distance", "0");

    setTimeout(() => {
      setDelayTime(false);
    }, 3000);
  }, []);

  useEffect(() => {
    const savedDeparture = localStorage.getItem("departureCity");
    const savedDestination = localStorage.getItem("destinationCity");

    if (savedDeparture) {
      try {
        const parsedDeparture = JSON.parse(savedDeparture);
        setDepartureCity(parsedDeparture);
      } catch (err) {
        console.error("Failed to parse saved departure city", err);
      }
    }

    if (savedDestination) {
      try {
        const parsedDestination = JSON.parse(savedDestination);
        setDestinationCity(parsedDestination);
      } catch (err) {
        console.error("Failed to parse saved destination city", err);
      }
    }
  }, []);

  // Driver onboarding
  const [showMessage, setShowMessage] = useState(false);
  const [completeDriver, setCompleteDriver] = useState(false);

  const [vehicleInfo, setVehicleInfo] = useState(() => {
    const saved = localStorage.getItem("vehicleInfo");
    const parsed = saved ? JSON.parse(saved) : null;

    return {
      make: parsed?.make || "",
      model: parsed?.model || "",
      year: parsed?.year || new Date().getFullYear(),
      color: parsed?.color || "",
      plateNumber: parsed?.plateNumber || "",
      images: [] as File[],
    };
  });

  const vehicleId = new URLSearchParams(window.location.search).get(
    "vehicleId"
  );
  const requestId = new URLSearchParams(window.location.search).get(
    "requestId"
  );
  const rideId = new URLSearchParams(window.location.search).get("rideId");

  // Fetch ride request data if requestId is provided
  const { data: rideRequestData } = useSingleRideRequest({
    requestId: requestId ? parseInt(requestId, 10) : 0,
    enabled: !!requestId,
  });

  // Fetch existing ride data if rideId is provided (for updates)
  const { data: existingRideData } = useSingleRide({
    rideId: rideId ? parseInt(rideId, 10) : 0,
    enabled: !!rideId,
  });

  // Auto-populate form when ride request data is loaded
  useEffect(() => {
    if (rideRequestData && requestId) {
      // Only populate if we haven't already (check if departure is still empty)
      const isD2D = rideRequestData.rideType === "D2D";
      const hasOrigin = rideRequestData.origin;
      const shouldPopulate = isD2D
        ? !rideDetails.driverStartLocation?.city && hasOrigin
        : !rideDetails.departure.city && hasOrigin;

      if (hasOrigin) {
        setRideDetails(resetRideDetailsData);

        // Determine departure time - use timeWindowStart if available, otherwise use date
        const departureTimeValue =
          rideRequestData.timeWindowStart || rideRequestData.date;

        if (isD2D) {
          // For D2D rides, populate driverStartLocation and driverStopLocation
          setRideDetails((prev) => ({
            ...prev,
            enableD2D: true,
            driverStartLocation: {
              region: rideRequestData.origin.region || "",
              city: rideRequestData.origin.city || "",
              locationName: rideRequestData.origin.locationName || "",
              latitude: rideRequestData.origin.latitude || undefined,
              longitude: rideRequestData.origin.longitude || undefined,
              address: rideRequestData.origin.address || "",
            },
            driverStopLocation: {
              region: rideRequestData.destination?.region || "",
              city: rideRequestData.destination?.city || "",
              locationName: rideRequestData.destination?.locationName || "",
              latitude: rideRequestData.destination?.latitude || undefined,
              longitude: rideRequestData.destination?.longitude || undefined,
              address: rideRequestData.destination?.address || "",
            },
            // Also populate departure/destination for compatibility
            departure: {
              region: rideRequestData.origin.region || "",
              city: rideRequestData.origin.city || "",
              locationName: rideRequestData.origin.locationName || "",
              latitude: rideRequestData.origin.latitude || undefined,
              longitude: rideRequestData.origin.longitude || undefined,
              address: rideRequestData.origin.address || "",
            },
            destination: {
              region: rideRequestData.destination?.region || "",
              city: rideRequestData.destination?.city || "",
              locationName: rideRequestData.destination?.locationName || "",
              latitude: rideRequestData.destination?.latitude || undefined,
              longitude: rideRequestData.destination?.longitude || undefined,
              address: rideRequestData.destination?.address || "",
            },
            departureTime: departureTimeValue
              ? new Date(departureTimeValue).toISOString().slice(0, 16)
              : prev.departureTime,
            availableSeats: rideRequestData.seats || prev.availableSeats,
          }));
        } else {
          // For P2P (normal) rides, populate departure and destination
          setRideDetails((prev) => ({
            ...prev,
            enableD2D: false,
            departure: {
              region: rideRequestData.origin.region || "",
              city: rideRequestData.origin.city || "",
              locationName: rideRequestData.origin.locationName || "",
              latitude: rideRequestData.origin.latitude || undefined,
              longitude: rideRequestData.origin.longitude || undefined,
              address: rideRequestData.origin.address || "",
            },
            destination: {
              region: rideRequestData.destination?.region || "",
              city: rideRequestData.destination?.city || "",
              locationName: rideRequestData.destination?.locationName || "",
              latitude: rideRequestData.destination?.latitude || undefined,
              longitude: rideRequestData.destination?.longitude || undefined,
              address: rideRequestData.destination?.address || "",
            },
            departureTime: departureTimeValue
              ? new Date(departureTimeValue).toISOString().slice(0, 16)
              : prev.departureTime,
            availableSeats: rideRequestData.seats || prev.availableSeats,
          }));
        }

        // Set the city selectors if cities are available
        if (rideRequestData.origin?.city) {
          setDepartureCity({
            name: rideRequestData.origin.city,
            province: rideRequestData.origin.region || "",
          });
        }
        if (rideRequestData.destination?.city) {
          setDestinationCity({
            name: rideRequestData.destination.city,
            province: rideRequestData.destination.region || "",
          });
        }

        // Automatically move to Step 2 (Trip Details) since form is pre-filled
        setStep(2);
        localStorage.setItem("createRideStep", "2");

        // Show a toast to inform the user
        toast.success(
          t(
            "createRide.driver.autoPopulated",
            "Form auto-populated from ride request"
          ),
          { className: "custom-success-toast" }
        );
      }
    }
  }, [rideRequestData, requestId]);

  // Auto-populate form when existing ride data is loaded (for updates)
  useEffect(() => {
    if (existingRideData && rideId && !rideRequestData) {
      // Only populate if we haven't already populated from a request
      const isD2D =
        existingRideData.type === "D2D" ||
        existingRideData.isDoorToDoor === true;

      if (isD2D) {
        // For D2D rides, populate driverStartLocation and driverStopLocation
        const driverStartLocation =
          existingRideData.driverStartLocation ||
          existingRideData.departureLocation;
        const driverStopLocation =
          existingRideData.driverStopLocation ||
          existingRideData.destinationLocation;

        if (driverStartLocation && driverStopLocation) {
          setRideDetails((prev) => ({
            ...prev,
            enableD2D: true,
            driverStartLocation: {
              region: driverStartLocation.region || "",
              city: driverStartLocation.city || "",
              locationName: driverStartLocation.locationName || "",
              latitude: driverStartLocation.latitude || undefined,
              longitude: driverStartLocation.longitude || undefined,
              address: driverStartLocation.address || "",
            },
            driverStopLocation: {
              region: driverStopLocation.region || "",
              city: driverStopLocation.city || "",
              locationName: driverStopLocation.locationName || "",
              latitude: driverStopLocation.latitude || undefined,
              longitude: driverStopLocation.longitude || undefined,
              address: driverStopLocation.address || "",
            },
            departureTime: existingRideData.departureTime
              ? new Date(existingRideData.departureTime)
                  .toISOString()
                  .slice(0, 16)
              : prev.departureTime,
            estimatedArrivalTime: existingRideData.estimatedArrivalTime
              ? new Date(existingRideData.estimatedArrivalTime)
                  .toISOString()
                  .slice(0, 16)
              : prev.estimatedArrivalTime,
            availableSeats:
              existingRideData.availableSeats || prev.availableSeats,
            contribution: existingRideData.contribution || prev.contribution,
            d2dRadiusKm: existingRideData.detourRadius || prev.d2dRadiusKm,
            extraKmPrice: existingRideData.extraKmPrice || prev.extraKmPrice,
            vehicleId: existingRideData.vehicleId || prev.vehicleId,
            preferences: existingRideData.preferences || prev.preferences,
          }));

          // Set the city selectors
          if (driverStartLocation.city) {
            setDepartureCity({
              name: driverStartLocation.city,
              province: driverStartLocation.region || "",
            });
          }
          if (driverStopLocation.city) {
            setDestinationCity({
              name: driverStopLocation.city,
              province: driverStopLocation.region || "",
            });
          }

          // Move to Step 2 since form is pre-filled
          setStep(2);
          localStorage.setItem("createRideStep", "2");

          toast.success(
            t("createRide.driver.rideLoaded", "Ride loaded for editing"),
            { className: "custom-success-toast" }
          );
        }
      }
    }
  }, [existingRideData, rideId, rideRequestData]);

  const [step, setStep] = useState(() => {
    // Check if requestId is in URL - if so, start at step 2 (skip ride type selection)
    const urlParams = new URLSearchParams(window.location.search);
    const hasRequestId = urlParams.get("requestId");

    if (hasRequestId) {
      return 2; // Skip step 1 when coming from ride request
    }

    const savedStep = localStorage.getItem("createRideStep");
    const parsedStep = savedStep ? parseInt(savedStep, 10) : 1;

    // If on step 6 or 7 but no ride data exists in localStorage, reset to step 1
    // (Step 6 was removed, step 7 is success page)
    if (parsedStep === 6 || parsedStep === 7) {
      const savedRideDetails = localStorage.getItem("rideDetails");
      if (!savedRideDetails) return 1;
    }

    // If step is 6 (old review step), reset to 5 (payment step)
    if (parsedStep === 6) return 5;
    return parsedStep;
  });

  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();
  const { data: vehiclesData } = useAllVehicles();

  const { mutate: createMutation } = useMutation({
    mutationFn: async (backData: any) => {
      const token =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
          : null;

      const { data } = await axios.post(
        `${apiUrl}/api/v1/vehicles?lang=${currentLanguage}`,
        backData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLES] });
    },
    onError: (error) => {
      toast.error((error as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  //   Upload ride
  const { mutate: createRideMutation, isPending: isPendingRideCreate } =
    useMutation({
      mutationFn: async (rideData: any) => {
        const token =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("Your-DriveToken") || "null")
            : null;

        // Check if this is an update (rideId exists in URL)
        const urlParams = new URLSearchParams(window.location.search);
        const updateRideId = urlParams.get("rideId");

        // If D2D is enabled, use the D2D endpoint instead
        if (rideData.isD2DRide) {
          // For D2D, use driverStartLocation and driverStopLocation
          const driverStartLocation =
            rideData.driverStartLocation || rideData.departure;
          const driverStopLocation =
            rideData.driverStopLocation || rideData.destination;

          const startLocationName = getLocationName(
            driverStartLocation,
            "Driver Start"
          );
          const stopLocationName = getLocationName(
            driverStopLocation,
            "Driver Stop"
          );

          if (!startLocationName || startLocationName.length === 0) {
            console.error(
              "Driver start location name is still empty after fallback"
            );
            throw new Error("Driver start location name is required");
          }

          if (!stopLocationName || stopLocationName.length === 0) {
            console.error(
              "Driver stop location name is still empty after fallback"
            );
            throw new Error("Driver stop location name is required");
          }

          // Convert to timestamps (integers) as required by validator
          const departureTimeStamp =
            rideData.departureTime instanceof Date
              ? rideData.departureTime.getTime()
              : typeof rideData.departureTime === "string"
              ? new Date(rideData.departureTime).getTime()
              : Number(rideData.departureTime);

          // Handle estimatedArrivalTime - if empty, calculate fallback (departure + 2 hours default)
          let estimatedArrivalTimeStamp: number;
          if (
            !rideData.estimatedArrivalTime ||
            rideData.estimatedArrivalTime === "" ||
            (typeof rideData.estimatedArrivalTime === "string" &&
              rideData.estimatedArrivalTime.trim() === "")
          ) {
            // Fallback: add 2 hours to departure time if ETA is missing
            console.warn(
              "Estimated arrival time is empty, using fallback (departure + 2 hours)"
            );
            estimatedArrivalTimeStamp = departureTimeStamp + 2 * 60 * 60 * 1000; // 2 hours in milliseconds
          } else {
            estimatedArrivalTimeStamp =
              rideData.estimatedArrivalTime instanceof Date
                ? rideData.estimatedArrivalTime.getTime()
                : typeof rideData.estimatedArrivalTime === "string"
                ? new Date(rideData.estimatedArrivalTime).getTime()
                : Number(rideData.estimatedArrivalTime);
          }

          if (isNaN(departureTimeStamp) || isNaN(estimatedArrivalTimeStamp)) {
            throw new Error("Invalid departure or arrival time");
          }

          // Ensure locationName is explicitly a non-empty string
          const finalStartLocationName = String(
            startLocationName || "Unnamed location"
          ).trim();
          const finalStopLocationName = String(
            stopLocationName || "Unnamed location"
          ).trim();

          if (!finalStartLocationName || finalStartLocationName.length === 0) {
            console.error("Final driver start locationName is empty!");
            throw new Error("Driver start location name is required");
          }

          if (!finalStopLocationName || finalStopLocationName.length === 0) {
            console.error("Final driver stop locationName is empty!");
            throw new Error("Driver stop location name is required");
          }

          const d2dPayload = {
            driverStartLocation: {
              region: String(driverStartLocation?.region || ""),
              city: String(driverStartLocation?.city || ""),
              locationName: finalStartLocationName,
              latitude: Number(driverStartLocation?.latitude) || 0,
              longitude: Number(driverStartLocation?.longitude) || 0,
              address: String(driverStartLocation?.address || ""),
              description: String(driverStartLocation?.description || ""),
            },
            driverStopLocation: {
              region: String(driverStopLocation?.region || ""),
              city: String(driverStopLocation?.city || ""),
              locationName: finalStopLocationName,
              latitude: Number(driverStopLocation?.latitude) || 0,
              longitude: Number(driverStopLocation?.longitude) || 0,
              address: String(driverStopLocation?.address || ""),
              description: String(driverStopLocation?.description || ""),
            },
            departureTime: departureTimeStamp,
            estimatedArrivalTime: estimatedArrivalTimeStamp,
            availableSeats: Number(rideData.availableSeats) || 1,
            vehicleId: Number(rideData.vehicleId),
            contribution: Number(rideData.contribution) || 0,
            detourRadius:
              Number(rideData.d2dRadiusKm || rideData.detourRadius) || 5,
            extraKmPrice: Number(rideData.extraKmPrice) || 0,
            preferences: {
              smoking: Boolean(rideData.preferences?.smoking ?? false),
              pets: Boolean(rideData.preferences?.pets ?? false),
              airConditioning: Boolean(
                rideData.preferences?.airConditioning ?? false
              ),
              ladiesOnly: Boolean(rideData.preferences?.ladiesOnly ?? false),
              gentsOnly: Boolean(rideData.preferences?.gentsOnly ?? false),
              bicycleSupport: Boolean(
                rideData.preferences?.bicycleSupport ?? false
              ),
              snowTires: Boolean(rideData.preferences?.snowTires ?? false),
              luggageSize: String(rideData.preferences?.luggageSize || "NONE"),
              luggageCount: Number(rideData.preferences?.luggageCount ?? 0),
              music: String(rideData.preferences?.music || "NONE"),
              additionalNotes: String(
                rideData.preferences?.additionalNotes || ""
              ),
            },
          };

          try {
            // Check if this is an update (updateRideId exists) or create
            const isUpdate =
              updateRideId && Number.isFinite(parseInt(updateRideId, 10));
            const rideIdToUpdate = isUpdate ? parseInt(updateRideId, 10) : null;

            if (isUpdate && rideIdToUpdate) {
              // Use PATCH for updates
              const { data } = await axios.patch(
                `${apiUrl}/api/v1/d2d/${rideIdToUpdate}?lang=${currentLanguage}`,
                d2dPayload,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              return data;
            } else {
              // Use POST for creation
              const { data } = await axios.post(
                `${apiUrl}/api/v1/d2d?lang=${currentLanguage}`,
                d2dPayload,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              return data;
            }
          } catch (error: any) {
            console.error("D2D creation/update error:", error);
            throw error;
          }
        } else {
          const { data } = await axios.post(
            `${apiUrl}/api/v1/rides?lang=${currentLanguage}`,
            rideData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          return data;
        }
      },
      onSuccess: async (data) => {
        const rideId = data.data.id;
        setNewRideId(rideId);

        setNewRideStatus(data.data.status);
        queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLES] });

        // D2D rides are created with isDoorToDoor: true from the start via POST /api/v1/d2d
        // No need to update D2D configuration separately
        if (rideDetails.enableD2D && data.data.isDoorToDoor) {
          toast.success(
            t(
              "createRide.driver.d2dConfigSuccess",
              "Door-to-Door ride created successfully!"
            ),
            { className: "custom-success-toast" }
          );
        }

        // Clean up image previews to prevent memory leaks
        imagePreviews.forEach((url) => URL.revokeObjectURL(url));

        // Clear saved image files from IndexedDB
        await clearAllImagesFromDB();

        // Update state to reflect cleanup
        setVehicleInfo((prev) => ({
          ...prev,
          images: [],
        }));
        setImagePreviews([]);
        removeItemsFromLocalStorage([
          "createRideStep",
          "rideDetails",
          "duration",
          "distance",
          "vehicleInfo",
          "postLoginRedirect",
          "vehicleId",
          "departureCity",
          "destinationCity",
          "resubmit",
        ]);

        // Redirect immediately without showing success message
        if (authenticated) {
          window.location.replace(`/rides?rideId=${rideId}`);
          return;
        }
        // For non-authenticated users, redirect to login
        window.location.replace(`/login`);
      },
      onError: (error) => {
        toast.error((error as any).response.data.message, {
          className: "custom-error-toast",
        });
      },
    });

  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Validate input based on field type
    let validationError: string | null = null;

    if (type === "text" || type === "textarea")
      validationError = validateField(value, name);
    else if (type === "number")
      validationError = validateNumber(Number(value), name);

    // Clear error for this field if validation passes
    if (!validationError) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    } else {
      setFormErrors((prev) => ({
        ...prev,
        [name]: validationError,
      }));
    }

    // Split name into path segments e.g., "departure.city" => ["departure", "city"]
    const keys = name.split(".");

    // Clone the current state
    const updatedState = { ...rideDetails };
    let current = updatedState;

    // Traverse to the last key
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      current[key] = { ...current[key] }; // clone nested object
      current = current[key];
    }

    // Set the final value
    const lastKey = keys[keys.length - 1];
    current[lastKey] = type === "checkbox" ? checked : value;

    // Special handling for payment method to track display name
    if (name === "contributionCollectionMethod") {
      if (value === "OFF_PLATFORM") {
        // We need to determine which option was selected
        // This will be handled by the select element's text content
        const selectElement = e.target as HTMLSelectElement;
        const selectedOption =
          selectElement.options[selectElement.selectedIndex];
        updatedState.paymentMethodDisplay = selectedOption.text;
      } else if (value === "VIA_PLATFORM") {
        updatedState.paymentMethodDisplay = "Bank Transfer";
      } else {
        updatedState.paymentMethodDisplay = value;
      }
    }

    // Special handling for luggage count - set size to NONE when count is 0
    if (name === "preferences.luggageCount") {
      const numValue = Number(value);
      if (numValue === 0) {
        updatedState.preferences.luggageSize = "NONE";
      }
      if (numValue > 0 && updatedState.preferences.luggageSize === "NONE") {
        updatedState.preferences.luggageSize = "MEDIUM";
      }
    }

    // Special handling for luggage size - set count to 0 when size is NONE
    if (name === "preferences.luggageSize" && value === "NONE") {
      updatedState.preferences.luggageCount = 0;
    }

    setRideDetails(updatedState);
  };

  const handleVehicleChange = (e: any) => {
    const { name, value } = e.target;
    setVehicleInfo({
      ...vehicleInfo,
      [name]: value,
    });
  };

  const handleNext = () => {
    window.scrollTo({ top: 50, behavior: "smooth" });

    // Step 3 is now vehicle selection - validate vehicle
    if (step === 3) {
      const errors: { [key: string]: string } = {};

      if (!rideDetails.availableSeats || rideDetails.availableSeats < 1) {
        errors["availableSeats"] = t(
          "createRide.driver.minSeatsRequired",
          "At least 1 seat must be available"
        );
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        toast.error(
          t(
            "createRide.driver.fixErrors",
            "Please fix the highlighted errors before proceeding."
          ),
          {
            className: "custom-error-toast",
          }
        );
        return;
      }
    }

    const nextStep = step + 1;

    setStep(nextStep);
    localStorage.setItem("createRideStep", nextStep.toString());
  };

  const handleBack = () => {
    window.scrollTo({ top: 50, behavior: "smooth" });

    const previousStep = step - 1;

    setStep(previousStep);
    localStorage.setItem("createRideStep", previousStep.toString());
  };

  // Function to check if we can navigate to a specific step
  const canNavigateToStep = (targetStep: number): boolean => {
    // Can always go back to step 1
    if (targetStep === 1) return true;

    // Can't go to step 6 (success) or step 7 by clicking - only after submission
    if (targetStep === 6 || targetStep === 7) return false;

    // For step 2 and beyond, need ride type selected
    if (targetStep >= 2) {
      if (rideDetails.enableD2D === undefined) {
        toast.error(
          t(
            "createRide.driver.selectRideTypeFirst",
            "Please select a ride type first"
          ),
          { className: "custom-error-toast" }
        );
        return false;
      }
    }

    // For step 3 and beyond, need departure and destination (or driverStartLocation/driverStopLocation for D2D)
    if (targetStep >= 3) {
      const hasLocations = rideDetails.enableD2D
        ? (rideDetails.driverStartLocation?.latitude ||
            rideDetails.departure?.latitude) &&
          (rideDetails.driverStartLocation?.longitude ||
            rideDetails.departure?.longitude) &&
          (rideDetails.driverStopLocation?.latitude ||
            rideDetails.destination?.latitude) &&
          (rideDetails.driverStopLocation?.longitude ||
            rideDetails.destination?.longitude) &&
          rideDetails.departureTime
        : rideDetails.departure.latitude &&
          rideDetails.departure.longitude &&
          rideDetails.destination.latitude &&
          rideDetails.destination.longitude &&
          rideDetails.departureTime;

      if (!hasLocations) {
        toast.error(
          t(
            "createRide.driver.completeStep2First",
            "Please complete trip details first"
          ),
          { className: "custom-error-toast" }
        );
        return false;
      }
    }

    // For step 4 and beyond, need a vehicle selected or created
    if (targetStep >= 4) {
      const hasVehicle =
        rideDetails.vehicleId ||
        vehicleId ||
        localStorage.getItem("vehicleId") ||
        (vehicleInfo.plateNumber && vehicleInfo.color);

      if (!hasVehicle) {
        toast.error(
          t(
            "createRide.driver.selectVehicleFirst",
            "Please select or create a vehicle first"
          ),
          { className: "custom-error-toast" }
        );
        return false;
      }
    }

    return true;
  };

  // Handle clicking on a step to navigate
  const handleStepClick = (targetStep: number) => {
    // Don't navigate if already on this step
    if (targetStep === step) return;

    // Check if navigation is allowed
    if (!canNavigateToStep(targetStep)) return;

    // Navigate to the step
    window.scrollTo({ top: 50, behavior: "smooth" });
    setStep(targetStep);
    localStorage.setItem("createRideStep", targetStep.toString());
  };

  useEffect(() => {
    if (
      step > 1 &&
      !completeDriver &&
      userPreference?.driver &&
      (!userPreference.driver.isDriverOnboarded ||
        !userPreference.driver.isPhoneVerified)
    ) {
      setShowMessage(true);
    } else {
      // Hide message if onboarding is complete or user is in onboarding flow
      setShowMessage(false);
    }
  }, [
    userPreference?.driver,
    step,
    completeDriver,
    rideDetails.departure?.locationName,
    rideDetails.destination?.locationName,
  ]);

  useEffect(() => {
    localStorage.setItem("rideDetails", JSON.stringify(rideDetails));
  }, [rideDetails]);

  // Keep input string in sync when contribution changes programmatically
  useEffect(() => {
    setContributionInput(Number(rideDetails.contribution ?? 0).toFixed(2));
  }, [rideDetails.contribution]);

  useEffect(() => {
    localStorage.setItem("vehicleInfo", JSON.stringify(vehicleInfo));
  }, [vehicleInfo]);

  // Load image files
  useEffect(() => {
    const loadImages = async () => {
      const storedImages = await getAllImagesFromDB();
      setVehicleInfo((prev) => ({
        ...prev,
        images: storedImages,
      }));
      setImagePreviews(storedImages.map((file) => URL.createObjectURL(file)));
    };

    loadImages();
  }, []);

  // Estimated arrival time - recalculates when departure time OR duration changes
  useEffect(() => {
    const { departure, destination, departureTime } = rideDetails;

    const isValid =
      departure.latitude &&
      departure.longitude &&
      destination.latitude &&
      destination.longitude &&
      departureTime &&
      duration > 0; // Ensure we have duration from Google Maps

    if (isValid) {
      const eta = calculateEstimatedArrivalTime(
        departureTime,
        departure,
        destination,
        duration
      );

      setRideDetails((prev) => ({
        ...prev,
        estimatedArrivalTime: eta,
      }));
    }
  }, [
    rideDetails.departure.latitude,
    rideDetails.departure.longitude,
    rideDetails.destination.latitude,
    rideDetails.destination.longitude,
    rideDetails.departureTime,
    duration, // Use duration from Google Maps instead of distance
  ]);

  // toggle between ladies only and gents only
  useEffect(() => {
    if (
      rideDetails.preferences.ladiesOnly &&
      rideDetails.preferences.gentsOnly
    ) {
      setRideDetails((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          gentsOnly: false,
        },
      }));
    }
  }, [rideDetails.preferences.ladiesOnly, rideDetails.preferences.gentsOnly]);

  useEffect(() => {
    if (
      rideDetails.preferences.gentsOnly &&
      rideDetails.preferences.ladiesOnly
    ) {
      setRideDetails((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          ladiesOnly: false,
        },
      }));
    }
  }, [rideDetails.preferences.gentsOnly, rideDetails.preferences.ladiesOnly]);

  const handleVehicleSelect = (id) => {
    const selectedVehicle = vehiclesData?.find((vehicle) => vehicle.id == id);
    const maxSeats = selectedVehicle?.capacity || 10;
    const availableSeats = Math.max(1, maxSeats - 1); // Reserve 1 seat for driver

    setRideDetails((prev) => ({
      ...prev,
      vehicleId: id,
      availableSeats: availableSeats,
    }));
  };

  if (delayTime && authenticated && isPendingUserPreference) {
    return <LoadingIndicator />;
  }

  const { handleSubmit, preferenceItems } = SubmitFunction({
    step: step,
    createMutation: createMutation,
    setRideDetails: setRideDetails,
    t: t,
    rideDetails: rideDetails,
    vehicleInfo: vehicleInfo,
    setStep: setStep,
    userPreference: userPreference,
    tzlookup: tzlookup,
    DateTime: DateTime,
    createRideMutation: createRideMutation,
    departureCity: departureCity,
    destinationCity: destinationCity,
    imagePreviews: imagePreviews,
    clearAllImagesFromDB: clearAllImagesFromDB,
    authenticated: authenticated,
    vehicleId: vehicleId,
    setVehicleInfo: setVehicleInfo,
    setImagePreviews: setImagePreviews,
    removeItemsFromLocalStorage: removeItemsFromLocalStorage,
    setAddCar: setAddCar,
    getLocationName: getLocationName,
  });

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {!completeDriver && (
        <div className="container mx-auto px-4">
          <div className="xl:flex xl:items-start xl:gap-12 max-w-6xl mx-auto">
            {/* Stepper Sidebar */}
            <motion.aside
              className="hidden xl:block xl:w-56 xl:sticky xl:top-24"
              variants={stepVariants}
            >
              <div className="mb-10">
                <motion.div
                  className="flex flex-col gap-2 w-full"
                  variants={containerVariants}
                >
                  {/* Step 1: Ride Type */}
                  <ProgressStep
                    step={step}
                    currentStep={1}
                    icon={<MapPin className="h-5 w-5" />}
                    label={`1. ${t("createRide.driver.rideType", "Ride Type")}`}
                    onClick={() => handleStepClick(1)}
                  />
                  <ProgressConnector isActive={step >= 2} />
                  {/* Step 2: Trip Details */}
                  <ProgressStep
                    step={step}
                    currentStep={2}
                    icon={<MapPin className="h-5 w-5" />}
                    label={`2. ${t(
                      "createRide.driver.tripDetails",
                      "Trip Details"
                    )}`}
                    onClick={() => handleStepClick(2)}
                  />
                  <ProgressConnector isActive={step >= 3} />
                  {/* Step 3: Vehicle Details */}
                  <ProgressStep
                    step={step}
                    currentStep={3}
                    icon={<Car className="h-5 w-5" />}
                    label={`3. ${t(
                      "createRide.driver.vehicleDetails",
                      "Vehicle"
                    )}`}
                    onClick={() => handleStepClick(3)}
                  />
                  <ProgressConnector isActive={step >= 4} />
                  {/* Step 4: Preferences */}
                  <ProgressStep
                    step={step}
                    currentStep={4}
                    icon={<Settings className="h-5 w-5" />}
                    label={`4. ${t(
                      "createRide.driver.preferences",
                      "Preferences"
                    )}`}
                    onClick={() => handleStepClick(4)}
                  />
                  <ProgressConnector isActive={step >= 5} />
                  {/* Step 5: Payment */}
                  <ProgressStep
                    step={step}
                    currentStep={5}
                    icon={<DollarSign className="h-5 w-5" />}
                    label={`5. ${t("createRide.driver.payment", "Payment")}`}
                    onClick={() => handleStepClick(5)}
                  />
                </motion.div>
              </div>
            </motion.aside>

            {/* Main Content (Stepper for <xl, Form for all) */}
            <motion.div
              className="flex-1 w-full max-w-3xl mx-auto xl:max-w-none"
              variants={itemVariants}
            >
              {/* Stepper for <xl screens */}
              <motion.div
                className="text-center mb-20 xl:hidden"
                variants={itemVariants}
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <motion.h2
                    className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    {t("driver.postRide")}
                  </motion.h2>
                  <motion.p
                    className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    {t("driver.offerSeats")}
                  </motion.p>
                </motion.div>
                <motion.div className="mb-10" variants={containerVariants}>
                  <div className="flex xl:flex-col xl:gap-2 xl:w-30 xl:flex-wrap items-center justify-between flex-nowrap w-[90%] overflow-x-auto no-scrollbar">
                    <ProgressStep
                      step={step}
                      currentStep={1}
                      icon={<MapPin className="h-5 w-5" />}
                      label={t("createRide.driver.rideType", "Ride Type")}
                      onClick={() => handleStepClick(1)}
                    />
                    <ProgressConnector isActive={step >= 2} />
                    <ProgressStep
                      step={step}
                      currentStep={2}
                      icon={<MapPin className="h-5 w-5" />}
                      label={t("createRide.driver.tripDetails", "Trip Details")}
                      onClick={() => handleStepClick(2)}
                    />
                    <ProgressConnector isActive={step >= 3} />
                    <ProgressStep
                      step={step}
                      currentStep={3}
                      icon={<Car className="h-5 w-5" />}
                      label={t("createRide.driver.vehicleDetails", "Vehicle")}
                      onClick={() => handleStepClick(3)}
                    />
                    {/* Step 4: Preferences - Show for all ride types */}
                    <ProgressConnector isActive={step >= 4} />
                    <ProgressStep
                      step={step}
                      currentStep={4}
                      icon={<Settings className="h-5 w-5" />}
                      label={t("createRide.driver.preferences", "Preferences")}
                      onClick={() => handleStepClick(4)}
                    />
                    <ProgressConnector isActive={step >= 5} />
                    <ProgressStep
                      step={step}
                      currentStep={5}
                      icon={<DollarSign className="h-5 w-5" />}
                      label={t("createRide.driver.payment", "Payment")}
                      onClick={() => handleStepClick(5)}
                    />
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              ></motion.div>

              {/* Form Card */}
              <motion.form onSubmit={handleSubmit} variants={itemVariants}>
                <motion.div className="bg-white dark:bg-gray-800 shadow-2xl border-2 border-green-600 dark:border-green-500 p-8 md:p-10 xl:p-12 rounded-lg">
                  <AnimatePresence mode="wait">
                    {step === 1 && (
                      <motion.div
                        className="animate-fade-in"
                        variants={stepVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        key="step-1"
                      >
                        <motion.div
                          className="flex items-center gap-4 mb-8"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                              {t(
                                "createRide.driver.rideType",
                                "Choose Ride Type"
                              )}
                            </h2>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {step === 1 && (
                    <StepOne
                      motion={motion}
                      stepVariants={stepVariants}
                      t={t}
                      rideDetails={rideDetails}
                      setRideDetails={setRideDetails}
                      itemVariants={itemVariants}
                      handleNext={handleNext}
                      buttonVariants={buttonVariants}
                      setStep={setStep}
                      setDepartureCity={setDepartureCity}
                      setDestinationCity={setDestinationCity}
                    />
                  )}

                  {step === 2 && (
                    <StepTwo
                      motion={motion}
                      stepVariants={stepVariants}
                      t={t}
                      departureCity={departureCity}
                      handleDepartureCityChange={handleDepartureCityChange}
                      destinationCity={destinationCity}
                      handleDestinationCityChange={handleDestinationCityChange}
                      checkCityMismatch={checkCityMismatch}
                      rideDetails={rideDetails}
                      CanadianCitySelector={CanadianCitySelector}
                      RideMap={RideMap}
                      distance={distance}
                      setDistance={setDistance}
                      duration={duration}
                      setDuration={setDuration}
                      setRideDetails={setRideDetails}
                      tzlookup={tzlookup}
                      DateTime={DateTime}
                      itemVariants={itemVariants}
                      setFormErrors={setFormErrors}
                      handleBack={handleBack}
                      handleNext={handleNext}
                      buttonVariants={buttonVariants}
                    />
                  )}

                  {step === 3 && (
                    <StepThreeVehicle
                      t={t}
                      authenticated={authenticated}
                      addCar={addCar}
                      vehicleId={vehicleId}
                      vehiclesData={vehiclesData}
                      setRideDetails={setRideDetails}
                      rideDetails={rideDetails}
                      formErrors={formErrors}
                      handleBack={handleBack}
                      handleNext={handleNext}
                      handleVehicleSelect={handleVehicleSelect}
                      setAddCar={setAddCar}
                      RestrictedVehicleMakesSearchable={
                        RestrictedVehicleMakesSearchable
                      }
                      vehicleInfo={vehicleInfo}
                      handleVehicleChange={handleVehicleChange}
                      VehicleModelsSearchable={VehicleModelsSearchable}
                      VehicleYearSelector={VehicleYearSelector}
                      setVehicleInfo={setVehicleInfo}
                      saveImageToDB={saveImageToDB}
                      setImagePreviews={setImagePreviews}
                      CameraCapture={CameraCapture}
                      imagePreviews={imagePreviews}
                      deleteImageFromDB={deleteImageFromDB}
                    />
                  )}

                  {/* Step 4: Preferences - Show for all ride types */}
                  {step === 4 && (
                    <StepThree
                      clsx={clsx}
                      formErrors={formErrors}
                      handleBack={handleBack}
                      handleNext={handleNext}
                      t={t}
                      rideDetails={rideDetails}
                      handleChange={handleChange}
                      preferenceItems={preferenceItems}
                    />
                  )}

                  {step === 5 && (
                    <StepFour
                      t={t}
                      rideDetails={rideDetails}
                      setRideDetails={setRideDetails}
                      formErrors={formErrors}
                      handleBack={handleBack}
                      handleNext={handleNext}
                      handleSubmit={handleSubmit}
                      setContributionInput={setContributionInput}
                      contributionInput={contributionInput}
                      handleChange={handleChange}
                      setFormErrors={setFormErrors}
                      isStripeOnboarded={
                        userPreference?.driver?.isStripeOnboarded
                      }
                      isPendingRideCreate={isPendingRideCreate}
                    />
                  )}
                </motion.div>
              </motion.form>
            </motion.div>
          </div>
        </div>
      )}

      {completeDriver && (
        <DriverOnboardingForm
          setCompleteDriver={setCompleteDriver}
          modifyRideStep={() => setStep(1)}
        />
      )}

      {showMessage && (
        <MessageDialog
          showMessage={showMessage}
          setShowMessage={setShowMessage}
          setCompleteDriver={setCompleteDriver}
          userPreference={userPreference}
          resetFormStates={resetFormStates}
        />
      )}
    </motion.div>
  );
};

export default PostARide;
