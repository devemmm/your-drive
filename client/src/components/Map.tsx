import { Button } from "@/components/ui/button";
import { useTheme } from "@/providers/ThemeProvider";
import {
  Autocomplete,
  DirectionsRenderer,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { MapPin, Plus, X } from "lucide-react";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import CustomLoader from "./CustomLoader";
import { toast } from "sonner";

interface Location {
  latitude: number;
  longitude: number;
  locationName?: string;
  city?: string;
  region?: string;
  address?: string;
}

interface RideMapProps {
  startPoint?: Location;
  endPoint?: Location;
  stops?: Location[];
  height?: string;
  onRouteChange?: (route: {
    start: Location;
    end: Location;
    stops: Location[];
  }) => void;
  mode?: "view" | "edit";
  hideButton?: boolean;
  disabled?: boolean;
  distance?: string;
  setDistance?: (distance: string) => void;
  setDuration?: (duration: number) => void; // duration in seconds
  departureTime?: string; // ISO datetime string for traffic-aware routing
  enableD2D?: boolean; // Whether this is a door-to-door ride
}

export const LIBRARIES = ["places"] as any;

const RideMap: FC<RideMapProps> = ({
  startPoint: initialStartPoint,
  endPoint: initialEndPoint,
  stops: initialStops,
  height = "400px",
  onRouteChange,
  mode = "edit",
  hideButton = false,
  disabled = false,
  distance,
  setDistance,
  setDuration,
  departureTime,
  enableD2D = false,
}) => {
  const { theme } = useTheme();
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  // const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapContainerStyle, setMapContainerStyle] = useState({
    height,
    width: "100%",
    borderRadius: "0.5rem",
  });
  const [isExpanded, setIsExpanded] = useState(mode === "view");

  // For select
  const [selectionMode, setSelectionMode] = useState<
    "start" | "end" | "stop" | null
  >(null);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(
    null
  );

  // Location states
  const [startPoint, setStartPoint] = useState<Location | null>(
    initialStartPoint || null
  );
  const [endPoint, setEndPoint] = useState<Location | null>(
    initialEndPoint || null
  );
  const [stops, setStops] = useState<Location[]>(initialStops || []);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);

  // TODO: To be removed
  const isLocationInRwanda = (
    addressComponents: google.maps.GeocoderAddressComponent[] = []
  ) => {
    const countryComponent = addressComponents.find((c) =>
      c.types.includes("country")
    );
    return countryComponent?.short_name === "RW";
  };

  useEffect(() => {
    setStartPoint(initialStartPoint || null);
    setEndPoint(initialEndPoint || null);
    setStops(initialStops || []);
  }, [initialStartPoint, initialEndPoint, initialStops]);

  useEffect(() => {
    if (
      isExpanded &&
      directions &&
      mapRef.current &&
      directions.routes[0].bounds &&
      !userHasInteracted
    ) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.fitBounds(directions.routes[0].bounds);
        }
      }, 300);

      // console.log("Distance from map:", directions.routes[0].legs[0].distance.text.split(" ")[0]);

      if (setDistance) {
        setDistance(directions.routes[0].legs[0].distance.text.split(" ")[0]);
      }

      // Extract duration from Google Maps API (in seconds)
      // Prefer duration_in_traffic if available (more accurate with traffic), otherwise use duration
      if (setDuration && directions.routes[0].legs[0]) {
        const leg = directions.routes[0].legs[0];
        const durationValue =
          leg.duration_in_traffic?.value || leg.duration?.value;
        if (durationValue) {
          setDuration(durationValue);
          // console.log("Duration extracted:", {
          //   duration: leg.duration?.text,
          //   duration_in_traffic: leg.duration_in_traffic?.text,
          //   using: leg.duration_in_traffic ? "traffic-aware" : "standard",
          // });
        }
      }
    }
  }, [isExpanded, directions, userHasInteracted, setDistance, setDuration]);

  // Refs for autocomplete inputs
  const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(
    null
  );
  const endAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(
    null
  );
  const stopAutocompleteRefs = useRef<
    (google.maps.places.Autocomplete | null)[]
  >([]);

  const apiKey = import.meta.env?.VITE_GOOGLE_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const { t } = useTranslation();

  // Initialize stop refs
  useEffect(() => {
    stopAutocompleteRefs.current = (initialStops || [])?.map(() => null);
  }, [(initialStops || [])?.length]);

  useEffect(() => {
    // Reset interaction state when major route points change
    setUserHasInteracted(false);
  }, [startPoint, endPoint, stops.length]);

  useEffect(() => {
    setMapContainerStyle((prev) => ({ ...prev, height }));
  }, [height]);

  // Calculate center point for map
  const center = useMemo(() => {
    const isValid = (loc?: Location | null) =>
      loc &&
      typeof loc.latitude === "number" &&
      typeof loc.longitude === "number" &&
      !isNaN(loc.latitude) &&
      !isNaN(loc.longitude);

    if (isValid(startPoint) && isValid(endPoint)) {
      return {
        lat: (startPoint!.latitude + endPoint!.latitude) / 2,
        lng: (startPoint!.longitude + endPoint!.longitude) / 2,
      };
    }

    if (isValid(startPoint)) {
      return {
        lat: startPoint!.latitude,
        lng: startPoint!.longitude,
      };
    }

    if (isValid(endPoint)) {
      return {
        lat: endPoint!.latitude,
        lng: endPoint!.longitude,
      };
    }

    // Default: Kigali, Rwanda
    return { lat: -1.9577, lng: 30.1127 };
  }, [startPoint, endPoint]);

  // Calculation
  useEffect(() => {
    if (!isLoaded || !startPoint || !endPoint) return;

    const calculateDirections = async () => {
      const directionsService = new google.maps.DirectionsService();
      const waypoints = stops.map((stop) => ({
        location: new google.maps.LatLng(stop.latitude, stop.longitude),
        stopover: true,
      }));

      try {
        // Build route request options
        const routeRequest: google.maps.DirectionsRequest = {
          origin: new google.maps.LatLng(
            startPoint.latitude,
            startPoint.longitude
          ),
          destination: new google.maps.LatLng(
            endPoint.latitude,
            endPoint.longitude
          ),
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        };

        // Add departure time for traffic-aware routing if provided
        if (departureTime) {
          const departureDate = new Date(departureTime);
          // Only add if the date is valid (allow past times for testing, Google will use best estimate)
          if (!isNaN(departureDate.getTime())) {
            // For past times, use current time instead
            const effectiveDepartureTime =
              departureDate.getTime() > Date.now() ? departureDate : new Date();

            routeRequest.drivingOptions = {
              departureTime: effectiveDepartureTime,
              trafficModel: google.maps.TrafficModel.BEST_GUESS,
            };

            // console.log(
            //   "Using traffic-aware routing for departure:",
            //   effectiveDepartureTime.toISOString()
            // );
          }
        }

        const result = await directionsService.route(routeRequest);

        setDirections(result);

        if (
          isExpanded &&
          mapRef.current &&
          result.routes[0].bounds &&
          !userHasInteracted
        ) {
          setTimeout(() => {
            if (mapRef.current && !userHasInteracted) {
              mapRef.current.fitBounds(result.routes[0].bounds);
            }
          }, 300);
        }

        if (onRouteChange && mode === "edit") {
          onRouteChange({
            start: startPoint,
            end: endPoint,
            stops: stops,
          });
        }
      } catch (error) {
        console.error("Error fetching directions:", error);
        setDirections(null);
      }
    };

    const timer = setTimeout(calculateDirections, 500);
    return () => clearTimeout(timer);
  }, [
    isLoaded,
    startPoint,
    endPoint,
    stops,
    onRouteChange,
    mode,
    isExpanded,
    userHasInteracted,
    departureTime, // Recalculate when departure time changes for traffic updates
  ]);

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 " key="map-error-state">
        <div className="text-red-600 dark:text-red-400 font-medium">
          {t("RideDetail.Map.errorTitle")}
        </div>
        <p className="text-sm text-red-500 dark:text-red-400 mt-2">
          {t("RideDetail.Map.errorDescription")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-red-300 dark:border-red-400 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
          onClick={() => window.location.reload()}
          aria-label={t("common.retry")}
        >
          {t("RideDetail.common.retry")}
        </Button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="bg-gray-100 dark:bg-gray-800  animate-pulse"
        style={{ height }}
        key="map-loading-state"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <CustomLoader />
          </div>
        </div>
      </div>
    );
  }

  // Handle place selection for start point
  const onStartPlaceChanged = () => {
    if (startAutocompleteRef.current) {
      const place = startAutocompleteRef.current.getPlace();
      handlePlaceSelection(place, "start");
    }
  };

  // Handle place selection for end point
  const onEndPlaceChanged = () => {
    if (endAutocompleteRef.current) {
      const place = endAutocompleteRef.current.getPlace();
      handlePlaceSelection(place, "end");
    }
  };

  // Handle place selection for stopovers
  const onStopPlaceChanged = (index: number) => {
    if (stopAutocompleteRefs.current[index]) {
      const place = stopAutocompleteRefs.current[index]?.getPlace();
      if (place) handlePlaceSelection(place, "stop", index);
    }
  };

  // Common place selection handler
  const handlePlaceSelection = (
    place: google.maps.places.PlaceResult,
    type: "start" | "end" | "stop",
    stopIndex?: number
  ) => {
    if (!place.geometry || !place.geometry.location) return;

    if (!isLocationInRwanda(place.address_components)) {
      toast.error("Only Rwandan locations are allowed.", {
        className: "custom-error-toast",
      });
      return;
    }

    const getComponent = (types: string[]) =>
      place.address_components?.find((c) =>
        types.some((t) => c.types.includes(t))
      )?.long_name || "";

    // This gets the city (like "Montreal")
    const city = getComponent(["locality"]);

    const region = getComponent(["administrative_area_level_1"]) || "";

    const location: Location = {
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      locationName: place.name || place.formatted_address || "",
      address: place.formatted_address,
      city,
      region,
    };

    let newStartPoint = startPoint;
    let newEndPoint = endPoint;
    let newStops = stops;

    switch (type) {
      case "start":
        newStartPoint = location;
        setStartPoint(location);
        break;
      case "end":
        newEndPoint = location;
        setEndPoint(location);
        break;
      case "stop":
        if (stopIndex !== undefined) {
          newStops = [...stops];
          newStops[stopIndex] = location;
          setStops(newStops);
        }
        break;
    }

    // Immediately notify parent when a place is selected
    // Use the new values we just set
    if (onRouteChange && mode === "edit") {
      // For start/end, we want to use the new location, but keep the other point
      const finalStart = type === "start" ? location : (newStartPoint || startPoint);
      const finalEnd = type === "end" ? location : (newEndPoint || endPoint);
      
      // Only call if we have at least one valid point
      if (finalStart || finalEnd) {
        onRouteChange({
          start: finalStart || { latitude: 0, longitude: 0, address: "" },
          end: finalEnd || { latitude: 0, longitude: 0, address: "" },
          stops: newStops,
        });
      }
    }

    // In view mode, we don't need to manage showMap state
    if (mode === "edit" && startPoint && endPoint) {
      setIsExpanded(true);
    }
  };

  // Add a new stopover
  const addStopover = () => {
    setStops([
      ...stops,
      {
        latitude: 0,
        longitude: 0,
        locationName: "",
      },
    ]);
    stopAutocompleteRefs.current.push(null);
  };

  // Remove a stopover
  const removeStopover = (index: number) => {
    const updatedStops = stops.filter((_, i) => i !== index);
    setStops(updatedStops);
    stopAutocompleteRefs.current.splice(index, 1);
  };

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!selectionMode || !e.latLng || disabled || enableD2D) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: e.latLng });

      const place =
        response.results.find(
          (r) =>
            r.types.includes("street_address") ||
            r.types.includes("premise") ||
            r.types.includes("route") ||
            r.types.includes("locality") ||
            r.types.includes("administrative_area_level_1")
        ) || response.results[0];

      if (!place) {
        console.warn("No valid place result found.");
        return;
      }

      if (!isLocationInRwanda(place.address_components)) {
        toast.error("Only locations within Rwanda are allowed.", {
          className: "custom-error-toast",
        });
        return;
      }

      const getComponent = (types: string[]) => {
        const match = place.address_components?.find((c) =>
          types.some((t) => c.types.includes(t))
        );
        if (!match) console.warn("Missing component for", types);
        return match?.long_name || "";
      };

      const location: Location = {
        latitude: lat,
        longitude: lng,
        locationName: place.formatted_address || "Selected location",
        address: place.formatted_address || "Selected location",
        city:
          getComponent(["locality"]) ||
          getComponent(["administrative_area_level_2"]),
        region: getComponent(["administrative_area_level_1"]),
      };

      switch (selectionMode) {
        case "start":
          setStartPoint(location);
          break;
        case "end":
          setEndPoint(location);
          break;
        case "stop":
          if (selectedStopIndex !== null) {
            const updatedStops = [...stops];
            updatedStops[selectedStopIndex] = location;
            setStops(updatedStops);
          }
          break;
      }
    } catch (error) {
      console.error("Geocoding error:", error);

      const failedLocation: Location = {
        latitude: lat,
        longitude: lng,
        locationName: "Failed to load address",
        address: "Failed to load address",
        city: "",
        region: "",
      };

      switch (selectionMode) {
        case "start":
          setStartPoint(failedLocation);
          break;
        case "end":
          setEndPoint(failedLocation);
          break;
        case "stop":
          if (selectedStopIndex !== null) {
            const updatedStops = [...stops];
            updatedStops[selectedStopIndex] = failedLocation;
            setStops(updatedStops);
          }
          break;
      }
    }

    setSelectionMode(null);
    setSelectedStopIndex(null);
    if (mode === "edit") setIsExpanded(true);
  };

  const handleMapInteraction = () => {
    setUserHasInteracted(true);
  };

  const shouldShowMap = isExpanded;

  return (
    <div className="space-y-4">
      {/* Global styles for Google Places Autocomplete dropdown */}
      <style>{`
        .pac-container {
          z-index: 10000 !important;
          font-family: inherit;
        }
        .pac-item {
          cursor: pointer;
          padding: 10px 4px;
        }
        .pac-item:hover {
          background-color: #f3f4f6;
        }
        .pac-item-selected {
          background-color: #e5e7eb;
        }
      `}</style>
      {/* Always show map with inputs positioned around it */}
      {mode === "edit" && (
        <div className="space-y-4">
          {/* From and To inputs in a responsive row above map - Hidden for door-to-door */}
          {!enableD2D && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-50">
              {/* Starting Point */}
              <div className="relative z-50">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("driver.departure")} *
                </label>
                <Autocomplete
                  onLoad={(autocomplete) =>
                    (startAutocompleteRef.current = autocomplete)
                  }
                  onPlaceChanged={onStartPlaceChanged}
                  options={{
                    // Restrict to Rwanda for departure city selection
                    componentRestrictions: { country: "rw" },
                    types: ["geocode", "establishment"],
                  }}
                >
                  <div className="relative flex items-center z-50">
                    <MapPin className="absolute left-3 h-4 w-4 text-green-500 z-10" />
                    <input
                      type="text"
                      placeholder={t("driver.departure")}
                      value={startPoint?.address || ""}
                      disabled={disabled}
                      onChange={(e) => {
                        if (startPoint) {
                          setStartPoint({
                            ...startPoint,
                            address: e.target.value,
                          });
                        } else {
                          setStartPoint({
                            latitude: 0,
                            longitude: 0,
                            address: e.target.value,
                          });
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-50"
                    />
                  </div>
                </Autocomplete>
              </div>

              {/* End Point Input */}
              <div className="relative z-50">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("driver.destination")} *
                </label>
                <Autocomplete
                  onLoad={(autocomplete) =>
                    (endAutocompleteRef.current = autocomplete)
                  }
                  onPlaceChanged={onEndPlaceChanged}
                  options={{
                    // Restrict to Rwanda for destination city selection
                    componentRestrictions: { country: "rw" },
                    types: ["geocode", "establishment"],
                  }}
                >
                  <div className="relative flex items-center z-50">
                    <MapPin className="absolute left-3 h-4 w-4 text-red-500 z-10" />
                    <input
                      type="text"
                      placeholder={t("driver.destination")}
                      value={endPoint?.address || ""}
                      disabled={disabled}
                      onChange={(e) => {
                        if (endPoint) {
                          setEndPoint({
                            ...endPoint,
                            address: e.target.value,
                          });
                        } else {
                          setEndPoint({
                            latitude: 0,
                            longitude: 0,
                            address: e.target.value,
                          });
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-50"
                    />
                  </div>
                </Autocomplete>
              </div>
            </div>
          )}

          {/* Map Container - Always visible */}
          <div className="relative z-0">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={7}
              onLoad={(mapInstance) => {
                mapRef.current = mapInstance;
                setMapLoaded(true);
                google.maps.event.addListener(
                  mapInstance,
                  "dragstart",
                  handleMapInteraction
                );
                google.maps.event.addListener(
                  mapInstance,
                  "zoom_changed",
                  handleMapInteraction
                );
              }}
              onClick={handleMapClick}
              options={{
                styles: theme === "dark" ? darkMapStyle : undefined,
                mapTypeControl: true,
                mapTypeControlOptions: {
                  position: google.maps.ControlPosition.TOP_RIGHT,
                },
                fullscreenControl: true,
                fullscreenControlOptions: {
                  position: google.maps.ControlPosition.TOP_RIGHT,
                },
                disableDefaultUI: false,
                gestureHandling: "greedy",
              }}
            >
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    preserveViewport: userHasInteracted,
                  }}
                />
              )}

              {/* Start Marker */}
              {startPoint && (
                <Marker
                  position={{
                    lat: startPoint.latitude,
                    lng: startPoint.longitude,
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#4CAF50",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                    scale: 10,
                  }}
                  title={startPoint.locationName || "Start point"}
                />
              )}

              {/* Stop Markers */}
              {stops.map((stop, index) => (
                <Marker
                  key={`stop-marker-${index}`}
                  position={{ lat: stop.latitude, lng: stop.longitude }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#2196F3",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                    scale: 8,
                  }}
                  title={stop.locationName || `Stop ${index + 1}`}
                />
              ))}

              {/* End Marker */}
              {endPoint && (
                <Marker
                  position={{ lat: endPoint.latitude, lng: endPoint.longitude }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#F44336",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                    scale: 10,
                  }}
                  title={endPoint.locationName || "End point"}
                />
              )}

              {selectionMode && !enableD2D && (
                <div className="absolute inset-0 bg-black bg-opacity-10 pointer-events-none flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-800 p-4  shadow-lg">
                    <p className="font-medium">
                      Click on the map to set {selectionMode} point
                      {selectionMode === "stop" &&
                        selectedStopIndex !== null &&
                        ` (Stop ${selectedStopIndex + 1})`}
                    </p>
                  </div>
                </div>
              )}
            </GoogleMap>

            {/* Map Selection Controls - Overlay on map with glass morphism effect */}
            {!hideButton && mode === "edit" && !enableD2D && (
              <div className="absolute top-2 left-4">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-1 cyan border-2 border-white/50 dark:border-gray-700/50 hover:border-white dark:hover:border-gray-600 transition-all duration-500 shadow-lg">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t("RideDetail.Map.selectOnMap")}
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <Button
                      className="bg-gradient-to-r from-green-500 to-green-500 text-white hover:from-green-500 hover:to-green-500 transition-all duration-300 border-2 border-green-500 hover:border-green-500 backdrop-blur-sm text-center items-center justify-center"
                      title={t("RideDetail.Map.starting")}
                      type="button"
                      variant={
                        selectionMode === "start" ? "default" : "outline"
                      }
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        setSelectionMode((prevMode) =>
                          prevMode === "start" ? null : "start"
                        );
                        setSelectedStopIndex(null);
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-2 text-white font-black text-lg" />
                    </Button>

                    <Button
                      className="bg-gradient-to-r from-red-500 to-red-500 text-white hover:from-red-500 hover:to-red-500 transition-all duration-300 border-2 border-red-500 hover:border-red-500 backdrop-blur-sm"
                      type="button"
                      title={t("RideDetail.Map.end")}
                      variant={selectionMode === "end" ? "default" : "outline"}
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        // setSelectionMode("end");
                        setSelectionMode((prevMode) =>
                          prevMode === "end" ? null : "end"
                        );
                        setSelectedStopIndex(null);
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-2 text-white" />
                    </Button>

                    <Button
                      className="bg-gradient-to-r from-cyan-500 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-500 transition-all duration-300 border-2 border-cyan-500 hover:border-cyan-500 backdrop-blur-sm"
                      type="button"
                      variant={selectionMode === "stop" ? "default" : "outline"}
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        // setSelectionMode("stop");
                        setSelectionMode((prevMode) =>
                          prevMode === "stop" ? null : "stop"
                        );
                        if (selectedStopIndex === null) {
                          setStops((prevStops) => {
                            const newStops = [
                              ...prevStops,
                              { latitude: 0, longitude: 0, locationName: "" },
                            ];
                            setSelectedStopIndex(newStops.length - 1);
                            return newStops;
                          });
                        }
                      }}
                    >
                      <MapPin className="h-4 w-4 mr-2 text-white" />
                      {selectedStopIndex !== null
                        ? `${t("RideDetail.Map.edit")} ${selectedStopIndex + 1}`
                        : t("RideDetail.Map.add")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stopovers - Below the map */}
          {mode === "edit" && !enableD2D &&
            stops.map((stop, index) => (
              <div key={`stop-${index}`} className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("RideDetail.Map.stopover")} {index + 1}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Autocomplete
                      onLoad={(autocomplete) =>
                        (stopAutocompleteRefs.current[index] = autocomplete)
                      }
                      onPlaceChanged={() => onStopPlaceChanged(index)}
                      options={{
                        // Restrict to Rwanda for stopover city selection
                        componentRestrictions: { country: "rw" },
                        types: ["geocode", "establishment"],
                      }}
                    >
                      <div className="relative flex items-center">
                        <MapPin className="absolute left-3 h-4 w-4 text-cyan-500" />
                        <input
                          type="text"
                          placeholder={`${t("RideDetail.Map.stopover")} ${
                            index + 1
                          }`}
                          value={stop.address || ""}
                          disabled={disabled}
                          onChange={(e) => {
                            const updatedStops = [...stops];
                            updatedStops[index] = {
                              ...updatedStops[index],
                              address: e.target.value,
                            };
                            setStops(updatedStops);
                          }}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#30BFDD] focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </Autocomplete>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    onClick={() => removeStopover(index)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2  transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

          {/* Add Stopover Button - Below the map */}
          {mode === "edit" && !enableD2D && (
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={addStopover}
              className="flex items-center gap-2 bg-black text-white hover:bg-[#2aa8c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {t("RideDetail.Map.stopOver")}
            </Button>
          )}

          {/* Distance display */}
          {directions?.routes?.[0]?.legs?.[0]?.distance?.text && (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t("RideDetail.Map.Distance")}:{" "}
              {directions.routes[0].legs[0].distance.text}
            </div>
          )}
        </div>
      )}

      {/* View mode - Just show the map */}
      {mode === "view" && (
        <div className="relative">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={7}
            onLoad={(mapInstance) => {
              mapRef.current = mapInstance;
              setMapLoaded(true);
            }}
            options={{
              styles: theme === "dark" ? darkMapStyle : undefined,
              mapTypeControl: true,
              mapTypeControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT,
              },
              fullscreenControl: true,
              fullscreenControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT,
              },
              disableDefaultUI: false,
              gestureHandling: "greedy",
            }}
          >
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: true,
                  preserveViewport: userHasInteracted,
                }}
              />
            )}

            {/* Start Marker */}
            {startPoint && (
              <Marker
                position={{
                  lat: startPoint.latitude,
                  lng: startPoint.longitude,
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: "#4CAF50",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                  scale: 10,
                }}
                title={startPoint.locationName || "Start point"}
              />
            )}

            {/* Stop Markers */}
            {stops.map((stop, index) => (
              <Marker
                key={`stop-marker-${index}`}
                position={{ lat: stop.latitude, lng: stop.longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: "#2196F3",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                  scale: 8,
                }}
                title={stop.locationName || `Stop ${index + 1}`}
              />
            ))}

            {/* End Marker */}
            {endPoint && (
              <Marker
                position={{ lat: endPoint.latitude, lng: endPoint.longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: "#F44336",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                  scale: 10,
                }}
                title={endPoint.locationName || "End point"}
              />
            )}
          </GoogleMap>

          {/* Distance display for view mode */}
          {directions?.routes?.[0]?.legs?.[0]?.distance?.text && (
            <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2  shadow-lg text-sm text-gray-700 dark:text-gray-300">
              {t("RideDetail.Map.Distance")}:{" "}
              {directions.routes[0].legs[0].distance.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RideMap;

const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#242f3e" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#242f3e" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];
