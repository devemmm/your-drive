import { useJsApiLoader } from "@react-google-maps/api";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  LoaderIcon,
  MapPin,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { LIBRARIES } from "../Map";
import { useEffect, useState } from "react";
import { Input } from "../ui/input";
import GooglePlacesInput from "../GoogleInput";

export default function StepTwo({
  motion,
  stepVariants,
  t,
  departureCity,
  handleDepartureCityChange,
  destinationCity,
  handleDestinationCityChange,
  checkCityMismatch,
  rideDetails,
  CanadianCitySelector,
  RideMap,
  distance,
  setDistance,
  duration,
  setDuration,
  setRideDetails,
  tzlookup,
  DateTime,
  itemVariants,
  setFormErrors,
  handleBack,
  handleNext,
  buttonVariants,
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  // Create a custom hook for city mismatch checking
  function useCityMismatch(
    location: any,
    selectedCity: any,
    googleReady: boolean
  ) {
    const [isMismatch, setIsMismatch] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const { isMismatch: departureMismatch, isLoading: checkingDeparture } =
    useCityMismatch(rideDetails.departure, departureCity?.name, isLoaded);

  const { isMismatch: destinationMismatch, isLoading: checkingDestination } =
    useCityMismatch(rideDetails.destination, destinationCity?.name, isLoaded);

  return (
    <motion.div
      className="animate-fade-in"
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      key="step-2-content"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {t("createRide.driver.tripDetails", "Trip Details")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {rideDetails.enableD2D
              ? t(
                  "createRide.driver.tripDetailsDescriptionD2D",
                  "Select your departure and destination cities"
                )
              : t(
                  "createRide.driver.tripDetailsDescription",
                  "Select your departure and destination cities, then choose specific locations on the map"
                )}
          </p>
        </div>

        {/* City Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <CanadianCitySelector
              value={departureCity}
              onChange={handleDepartureCityChange}
              placeholder={t(
                "driver.selectDepartureCity",
                "Select departure city"
              )}
              label={t("driver.selectDepartureCity", "Select departure city")}
              googleReady={isLoaded}
            />
            {checkingDeparture ? (
              <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 border border-blue-200 dark:border-blue-800">
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
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 border border-amber-200 dark:border-amber-800">
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
              onChange={handleDestinationCityChange}
              placeholder={t(
                "driver.selectDestinationCity",
                "Select destination city"
              )}
              label={t(
                "driver.selectDestinationCity",
                "Select destination city"
              )}
              googleReady={isLoaded}
            />
            {checkingDestination ? (
              <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 border border-blue-200 dark:border-blue-800">
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
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 border border-amber-200 dark:border-amber-800">
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

        {/* Map for route visualization - Regular rides */}
        {!rideDetails.enableD2D && (
          <div className="space-y-2">
            <RideMap
              distance={distance}
              setDistance={setDistance}
              setDuration={setDuration}
              departureTime={rideDetails.departureTime}
              startPoint={rideDetails.departure}
              endPoint={rideDetails.destination}
              stops={rideDetails.stopovers}
              height="400px"
              enableD2D={false}
              onRouteChange={(route) => {
                setRideDetails((prev) => ({
                  ...prev,
                  departure: route.start,
                  destination: route.end,
                  stopovers: route.stops,
                }));
              }}
              disabled={!departureCity || !destinationCity}
            />
            {rideDetails.stopovers && rideDetails.stopovers.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 p-3 border border-gray-200 dark:border-gray-800 rounded">
                <p>
                  {t(
                    "createRide.driver.stopoversNote",
                    "You can add stopovers by clicking on the map along your route."
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Location Input Fields for D2D - Driver Start and Stop locations */}
        {rideDetails.enableD2D && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(
                    "createRide.driver.driverStartLocation",
                    "Driver Starting Point"
                  )}
                </label>
                <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                  <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <GooglePlacesInput
                    value={
                      rideDetails.driverStartLocation?.locationName ||
                      rideDetails.driverStartLocation?.address ||
                      ""
                    }
                    onChange={(e) => {
                      // Allow typing
                      setRideDetails((prev) => ({
                        ...prev,
                        driverStartLocation: {
                          ...prev.driverStartLocation,
                          locationName: e.target.value,
                          address: e.target.value,
                        },
                      }));
                    }}
                    onPlaceSelected={(data) => {
                      setRideDetails((prev) => ({
                        ...prev,
                        driverStartLocation: {
                          region: data.region || "",
                          city: data.city || "",
                          locationName: data.locationName || "",
                          latitude: data.latitude,
                          longitude: data.longitude,
                          address: data.address || data.locationName || "",
                        },
                        // Also update departure for backward compatibility
                        departure: {
                          region: data.region || "",
                          city: data.city || "",
                          locationName: data.locationName || "",
                          latitude: data.latitude,
                          longitude: data.longitude,
                          address: data.address || data.locationName || "",
                        },
                      }));
                    }}
                    placeholder={t(
                      "createRide.driver.searchStartLocation",
                      "Search for starting point..."
                    )}
                    googleReady={isLoaded}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(
                    "createRide.driver.driverStopLocation",
                    "Driver Destination"
                  )}
                </label>
                <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                  <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <GooglePlacesInput
                    value={
                      rideDetails.driverStopLocation?.locationName ||
                      rideDetails.driverStopLocation?.address ||
                      ""
                    }
                    onChange={(e) => {
                      // Allow typing
                      setRideDetails((prev) => ({
                        ...prev,
                        driverStopLocation: {
                          ...prev.driverStopLocation,
                          locationName: e.target.value,
                          address: e.target.value,
                        },
                      }));
                    }}
                    onPlaceSelected={(data) => {
                      setRideDetails((prev) => ({
                        ...prev,
                        driverStopLocation: {
                          region: data.region || "",
                          city: data.city || "",
                          locationName: data.locationName || "",
                          latitude: data.latitude,
                          longitude: data.longitude,
                          address: data.address || data.locationName || "",
                        },
                        // Also update destination for backward compatibility
                        destination: {
                          region: data.region || "",
                          city: data.city || "",
                          locationName: data.locationName || "",
                          latitude: data.latitude,
                          longitude: data.longitude,
                          address: data.address || data.locationName || "",
                        },
                      }));
                    }}
                    placeholder={t(
                      "createRide.driver.searchStopLocation",
                      "Search for destination..."
                    )}
                    googleReady={isLoaded}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Map for D2D - Driver Start and Stop locations */}
            <div className="space-y-2">
              <RideMap
                distance={distance}
                setDistance={setDistance}
                setDuration={setDuration}
                departureTime={rideDetails.departureTime}
                startPoint={
                  rideDetails.driverStartLocation || rideDetails.departure
                }
                endPoint={
                  rideDetails.driverStopLocation || rideDetails.destination
                }
                stops={[]}
                height="400px"
                enableD2D={true}
                onRouteChange={(route) => {
                  setRideDetails((prev) => ({
                    ...prev,
                    driverStartLocation: route.start,
                    driverStopLocation: route.end,
                    // Also update departure/destination for backward compatibility
                    departure: route.start,
                    destination: route.end,
                  }));
                }}
                disabled={!departureCity || !destinationCity}
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800 rounded">
                <p>
                  {t(
                    "createRide.driver.d2dMapNote",
                    "You can search for locations above or select them on the map. Passengers will be able to request pickup along your route."
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Door-to-Door Detour Radius */}
        {rideDetails.enableD2D && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("DoorToDoor.dashboard.driver.radius", "Radius")}{" "}
              {t("createRide.driver.radiusRange", "(0 - max km)")}
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  const currentValue =
                    typeof rideDetails.d2dRadiusKm === "number"
                      ? rideDetails.d2dRadiusKm
                      : parseFloat(rideDetails.d2dRadiusKm as any) || 0;
                  if (currentValue > 0) {
                    const newValue = Math.max(0, currentValue - 1);
                    setRideDetails((prev) => ({
                      ...prev,
                      d2dRadiusKm: newValue,
                    }));
                  }
                }}
                disabled={
                  (typeof rideDetails.d2dRadiusKm === "number"
                    ? rideDetails.d2dRadiusKm
                    : parseFloat(rideDetails.d2dRadiusKm as any) || 0) <= 0
                }
                className={`w-12 h-12 border-2 flex items-center justify-center transition-all duration-300 rounded ${
                  (typeof rideDetails.d2dRadiusKm === "number"
                    ? rideDetails.d2dRadiusKm
                    : parseFloat(rideDetails.d2dRadiusKm as any) || 0) <= 0
                    ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105"
                }`}
              >
                <Minus className="h-5 w-5" />
              </button>

              <div className="min-w-[80px] text-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof rideDetails.d2dRadiusKm === "number"
                    ? rideDetails.d2dRadiusKm
                    : parseFloat(rideDetails.d2dRadiusKm as any) || 0}
                </span>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t("common_.small.km", "km")}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const currentValue =
                    typeof rideDetails.d2dRadiusKm === "number"
                      ? rideDetails.d2dRadiusKm
                      : parseFloat(rideDetails.d2dRadiusKm as any) || 0;
                  if (currentValue < 25) {
                    const newValue = Math.min(25, currentValue + 1);
                    setRideDetails((prev) => ({
                      ...prev,
                      d2dRadiusKm: newValue,
                    }));
                  }
                }}
                disabled={
                  (typeof rideDetails.d2dRadiusKm === "number"
                    ? rideDetails.d2dRadiusKm
                    : parseFloat(rideDetails.d2dRadiusKm as any) || 0) >= 25
                }
                className={`w-12 h-12 border-2 flex items-center justify-center transition-all duration-300 rounded ${
                  (typeof rideDetails.d2dRadiusKm === "number"
                    ? rideDetails.d2dRadiusKm
                    : parseFloat(rideDetails.d2dRadiusKm as any) || 0) >= 25
                    ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105"
                }`}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                "createRide.driver.d2dRadiusDescription",
                "Maximum distance from your route for pickup/drop-off"
              )}
            </p>
          </div>
        )}

        {/* Departure Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="departureDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("driver.departureDate")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Calendar className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <motion.input
                type="date"
                id="departureDate"
                name="departureDate"
                className="block w-full pl-12 pr-4 py-4 border-2 border-gray-300 dark:border-gray-600  shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500"
                value={
                  rideDetails.departureTime
                    ? rideDetails.departureTime.split("T")[0]
                    : ""
                }
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  const selectedDate = e.target.value;

                  let time = "";

                  if (rideDetails.departureTime) {
                    time =
                      rideDetails.departureTime.split("T")[1]?.slice(0, 5) ||
                      "08:00";
                  } else {
                    const now = new Date();

                    // Create a new date 30 minutes in the future
                    const minDeparture = new Date(
                      now.getTime() + 30 * 60 * 1000
                    );

                    // Round up to next full :00 or :30 that is at least 30 minutes ahead
                    const rounded = new Date(minDeparture);
                    const minutes = rounded.getMinutes();

                    if (minutes > 0 && minutes <= 30) {
                      rounded.setMinutes(30);
                    } else if (minutes > 30 || minutes === 0) {
                      rounded.setHours(rounded.getHours() + 1);
                      rounded.setMinutes(0);
                    }

                    rounded.setSeconds(0);
                    rounded.setMilliseconds(0);

                    // Double-check: is it now 30+ minutes ahead of the original time?
                    const diff = rounded.getTime() - now.getTime();
                    if (diff < 30 * 60 * 1000) {
                      // Not enough gap — add another 30 minutes and re-round
                      rounded.setMinutes(rounded.getMinutes() + 30);
                      const newMins = rounded.getMinutes();
                      if (newMins > 0 && newMins <= 30) {
                        rounded.setMinutes(30);
                      } else {
                        rounded.setHours(rounded.getHours() + 1);
                        rounded.setMinutes(0);
                      }
                    }

                    // Format to HH:MM
                    const pad = (n: number) => n.toString().padStart(2, "0");
                    time = `${pad(rounded.getHours())}:${pad(
                      rounded.getMinutes()
                    )}`;
                  }

                  const newISO = `${selectedDate}T${time}`;
                  console.log({
                    newISO,
                  });

                  setRideDetails((prev) => ({
                    ...prev,
                    departureTime: newISO,
                  }));
                }}
                required
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="departureTime"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("driver.departureTime")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Clock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="time"
                id="departureTime"
                name="departureTime"
                className="block w-full pl-12 pr-4 py-4 border-2 border-gray-300 dark:border-gray-600  shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 bg-white dark:bg-gray-700 dark:text-white transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500"
                value={
                  rideDetails.departureTime
                    ? rideDetails.departureTime.split("T")[1]?.slice(0, 5)
                    : ""
                }
                onChange={(e) => {
                  const time = e.target.value; // "07:22"

                  const date =
                    rideDetails.departureTime?.split("T")[0] ||
                    new Date().toISOString().split("T")[0];

                  const newISO = `${date}T${time}`; // local "naive" datetime string

                  // Get timezone from DEPARTURE LOCATION
                  const timezone = tzlookup(
                    rideDetails.departure.latitude,
                    rideDetails.departure.longitude
                  );

                  // Convert the naive datetime to a Luxon DateTime in the proper zone
                  const localDepartureTime = DateTime.fromISO(newISO, {
                    zone: timezone,
                  });

                  // Store UTC in DB
                  localDepartureTime.toUTC().toISO();

                  setRideDetails((prev) => ({
                    ...prev,
                    departureTime: newISO,
                  }));
                }}
                required
              />
            </div>
            {/* Banner to show departure city time and estimated arrival */}
            {rideDetails?.departureTime &&
              rideDetails?.departure?.latitude != null &&
              rideDetails?.departure?.longitude != null &&
              (() => {
                try {
                  const userTimeZone = DateTime.local().zoneName; // e.g. "Europe/Berlin"

                  const departureZone = tzlookup(
                    rideDetails.departure.latitude,
                    rideDetails.departure.longitude
                  );

                  const departureInCity = DateTime.fromISO(
                    rideDetails.departureTime,
                    { zone: departureZone }
                  );

                  // Convert that exact point in time to the user's local time
                  const departureInUserZone =
                    departureInCity.setZone(userTimeZone);

                  // Calculate ETA display if available
                  let etaDisplay = null;
                  if (
                    rideDetails?.estimatedArrivalTime &&
                    rideDetails?.destination?.latitude != null &&
                    rideDetails?.destination?.longitude != null
                  ) {
                    try {
                      const destinationZone = tzlookup(
                        rideDetails.destination.latitude,
                        rideDetails.destination.longitude
                      );

                      const arrivalInCity = DateTime.fromISO(
                        rideDetails.estimatedArrivalTime,
                        { zone: destinationZone }
                      );

                      if (arrivalInCity.isValid) {
                        // Calculate duration text if duration is available
                        let durationText = null;
                        if (duration > 0) {
                          const durationHours = Math.floor(duration / 3600);
                          const durationMinutes = Math.floor(
                            (duration % 3600) / 60
                          );
                          durationText =
                            durationHours > 0
                              ? `${durationHours}h ${durationMinutes}m`
                              : `${durationMinutes}m`;
                        }

                        etaDisplay = (
                          <div className="mt-3 pt-3 border-t border-cyan-200 dark:border-cyan-700 space-y-3">
                            {/* Journey Duration - Prominent Display */}
                            {durationText && (
                              <div className="bg-white dark:bg-gray-800/50 p-3  border border-cyan-200 dark:border-cyan-700">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs text-cyan-700 dark:text-cyan-300 font-medium mb-1">
                                      {t("common_.small.Duration")}
                                    </p>
                                    <p className="text-2xl font-bold text-cyan-800 dark:text-cyan-100">
                                      {durationText}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {t("common_.viaGoogleMaps")}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Arrival Time */}
                            <div>
                              <p className="text-xs text-cyan-700 dark:text-cyan-300 font-medium mb-1">
                                {t("common_.small.Estimated")}
                              </p>
                              <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100">
                                {arrivalInCity.toFormat("dd MMM yyyy, HH:mm a")}{" "}
                                {t("common_.in", "in")}{" "}
                                {rideDetails.destination.city}
                              </p>
                            </div>
                          </div>
                        );
                      }
                    } catch (err) {
                      console.error("ETA display failed:", err);
                    }
                  }

                  return (
                    <div className="text-sm bg-cyan-100 dark:bg-black/20 text-cyan-900 dark:text-cyan-200 mt-4 p-4  border border-cyan-300 dark:border-cyan-600 shadow-sm">
                      {t("common_.timeConversion", {
                        departureTime: departureInCity.toFormat(
                          "dd MMM yyyy, HH:mm a"
                        ),
                        departureCity: rideDetails.departure.city,
                        localTime: departureInUserZone.toFormat(
                          "dd MMM yyyy, HH:mm a"
                        ),
                      })}
                      {etaDisplay}
                    </div>
                  );
                } catch (err) {
                  console.error("Timezone lookup failed:", err);
                  return null;
                }
              })()}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <motion.div className="flex justify-between mt-8" variants={itemVariants}>
        <motion.button
          type="button"
          onClick={handleBack}
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-4 px-6  hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 flex items-center gap-3 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">{t("driver.back")}</span>
        </motion.button>
        <motion.button
          type="button"
          onClick={() => {
            const { departure, destination, departureTime } = rideDetails;

            // 1️⃣ Ensure both cities are set in rideDetails
            setRideDetails((prev) => ({
              ...prev,
              departure: {
                ...prev.departure,
                city: prev.departure.city || departureCity?.name || "",
              },
              destination: {
                ...prev.destination,
                city: prev.destination.city || destinationCity?.name || "",
              },
            }));

            // 2️⃣ Validate all required fields
            const errors: { [key: string]: string } = {};

            // Cities must be selected
            if (!departureCity) {
              errors["departureCity"] = t(
                "createRide.driver.departureCityRequired",
                "Departure city is required"
              );
            }

            if (!destinationCity) {
              errors["destinationCity"] = t(
                "createRide.driver.destinationCityRequired",
                "Destination city is required"
              );
            }

            // If cities not selected, stop validation
            if (!departureCity || !destinationCity) {
              setFormErrors(errors);
              toast.error(
                t(
                  "createRide.driver.selectCitiesFirst",
                  "Please select both departure and destination cities first"
                ),
                {
                  className: "custom-error-toast",
                }
              );
              return;
            }

            // For door-to-door rides, validate driverStartLocation and driverStopLocation
            if (rideDetails.enableD2D) {
              // Check if cities are the same
              // if (
              //   departureCity &&
              //   destinationCity &&
              //   departureCity.name.toLowerCase() ===
              //     destinationCity.name.toLowerCase() &&
              //   departureCity.province.toLowerCase() ===
              //     destinationCity.province.toLowerCase()
              // ) {
              //   toast.error(
              //     t(
              //       "createRide.driver.sameCityError",
              //       "Departure and destination cities must be different"
              //     ),
              //     {
              //       className: "custom-error-toast",
              //     }
              //   );
              //   return;
              // }

              // Validate driverStartLocation
              const driverStart =
                rideDetails.driverStartLocation || rideDetails.departure;
              if (
                !driverStart?.latitude ||
                !driverStart?.longitude ||
                !driverStart?.locationName?.trim() ||
                !driverStart?.address?.trim()
              ) {
                errors["driverStartLocation"] = t(
                  "createRide.driver.driverStartLocationRequired",
                  "Driver starting point is required. Please search and select a location."
                );
              }

              // Validate driverStopLocation
              const driverStop =
                rideDetails.driverStopLocation || rideDetails.destination;
              if (
                !driverStop?.latitude ||
                !driverStop?.longitude ||
                !driverStop?.locationName?.trim() ||
                !driverStop?.address?.trim()
              ) {
                errors["driverStopLocation"] = t(
                  "createRide.driver.driverStopLocationRequired",
                  "Driver destination is required. Please search and select a location."
                );
              }

              // Check if start and stop locations are the same
              if (
                driverStart?.latitude &&
                driverStop?.latitude &&
                driverStart.latitude === driverStop.latitude &&
                driverStart.longitude === driverStop.longitude
              ) {
                toast.error(t("common_.small.identical"), {
                  className: "custom-error-toast",
                });
                return;
              }
            } else {
              // For normal rides, check locations have addresses
              if (!departure.address?.trim()) {
                errors["departure"] = t(
                  "createRide.driver.startingPointRequired",
                  "Starting point is required"
                );
              }

              if (!destination.address?.trim()) {
                errors["destination"] = t(
                  "createRide.driver.endingPointRequired",
                  "Ending point is required"
                );
              }

              // Check for city mismatches
              if (departureMismatch) {
                errors["departureMismatch"] = t(
                  "createRide.driver.departureCityMismatch",
                  "The pickup point should be in {{city}}, {{province}}. You might need to zoom in to the map and select a specific location.",
                  { city: departureCity.name, province: departureCity.province }
                );
              }

              if (destinationMismatch) {
                errors["destinationMismatch"] = t(
                  "createRide.driver.destinationCityMismatch",
                  "The destination point should be in {{city}}, {{province}}. You might need to zoom in to the map and select a specific location.",
                  {
                    city: destinationCity.name,
                    province: destinationCity.province,
                  }
                );
              }

              // Check if departure & destination are the same point
              if (
                departure.latitude === destination.latitude &&
                departure.longitude === destination.longitude
              ) {
                toast.error(t("common_.small.identical"), {
                  className: "custom-error-toast",
                });
                return;
              }
            }

            // Departure time required
            if (!departureTime) {
              errors["departureTime"] = t("common_.small.required");
            }

            // 3️⃣ Handle errors if any
            if (Object.keys(errors).length > 0) {
              setFormErrors(errors);

              // Prioritize city mismatch errors for toast
              const mismatchError =
                errors["departureMismatch"] || errors["destinationMismatch"];
              if (mismatchError) {
                toast.error(mismatchError, {
                  className: "custom-error-toast",
                });
                return;
              }

              // Show missing location or general errors
              if (
                errors["driverStartLocation"] ||
                errors["driverStopLocation"]
              ) {
                const errorMsg =
                  errors["driverStartLocation"] || errors["driverStopLocation"];
                toast.error(errorMsg, {
                  className: "custom-error-toast",
                });
              } else if (errors["departure"] || errors["destination"]) {
                toast.error(t("createRide.driver.bothPointsRequired"), {
                  className: "custom-error-toast",
                });
              } else {
                toast.error(t("createRide.driver.fixErrors"), {
                  className: "custom-error-toast",
                });
              }
              return;
            }

            // 4️⃣ All validations passed, go to next step
            handleNext();
          }}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-600 text-white px-8 py-4  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105 rounded-lg"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <span className="text-lg">{t("driver.nextStep")}</span>
          <ArrowRight className="h-5 w-5" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
