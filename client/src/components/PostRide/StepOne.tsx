import {
  ArrowRight,
  MapPin,
  Calendar,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAllRideRequests, useSingleRideRequest } from "@/data";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";

export default function StepOne({
  motion,
  stepVariants,
  t,
  rideDetails,
  setRideDetails,
  itemVariants,
  handleNext,
  buttonVariants,
  setStep,
  setDepartureCity,
  setDestinationCity,
}) {
  const navigate = useNavigate();
  const [loadingRequestId, setLoadingRequestId] = useState<number | null>(null);
  const [autoSelectedRideType, setAutoSelectedRideType] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const { data: rideRequestsData, isLoading: isLoadingRequests } =
    useAllRideRequests(currentPage, pageSize, { status: "OPEN" });
  const rideRequests = rideRequestsData?.data || [];
  const totalPages = rideRequestsData?.pagination?.totalPages || 1;

  // Fetch ride request when loadingRequestId is set
  const { data: selectedRequestData, isLoading: isLoadingRequest } =
    useSingleRideRequest({
      requestId: loadingRequestId || 0,
      enabled: !!loadingRequestId,
    });

  // Handle auto-population when request data is loaded
  useEffect(() => {
    if (selectedRequestData && loadingRequestId) {
      const isD2D = selectedRequestData.rideType === "D2D";
      const departureTimeValue =
        selectedRequestData.timeWindowStart || selectedRequestData.date;

      // Store the auto-selected ride type
      setAutoSelectedRideType(selectedRequestData.rideType || null);

      // Reset and populate form
      if (isD2D) {
        // For D2D rides
        setRideDetails({
          enableD2D: true,
          d2dRadiusKm: 5,
          d2dExtraKmPrice: 0,
          d2dNotes: "",
          driverStartLocation: {
            region: selectedRequestData.origin.region || "",
            city: selectedRequestData.origin.city || "",
            locationName: selectedRequestData.origin.locationName || "",
            latitude: selectedRequestData.origin.latitude || undefined,
            longitude: selectedRequestData.origin.longitude || undefined,
            address: selectedRequestData.origin.address || "",
          },
          driverStopLocation: {
            region: selectedRequestData.destination?.region || "",
            city: selectedRequestData.destination?.city || "",
            locationName: selectedRequestData.destination?.locationName || "",
            latitude: selectedRequestData.destination?.latitude || undefined,
            longitude: selectedRequestData.destination?.longitude || undefined,
            address: selectedRequestData.destination?.address || "",
          },
          departure: {
            region: selectedRequestData.origin.region || "",
            city: selectedRequestData.origin.city || "",
            locationName: selectedRequestData.origin.locationName || "",
            latitude: selectedRequestData.origin.latitude || undefined,
            longitude: selectedRequestData.origin.longitude || undefined,
            address: selectedRequestData.origin.address || "",
          },
          destination: {
            region: selectedRequestData.destination?.region || "",
            city: selectedRequestData.destination?.city || "",
            locationName: selectedRequestData.destination?.locationName || "",
            latitude: selectedRequestData.destination?.latitude || undefined,
            longitude: selectedRequestData.destination?.longitude || undefined,
            address: selectedRequestData.destination?.address || "",
          },
          departureTime: departureTimeValue
            ? new Date(departureTimeValue).toISOString().slice(0, 16)
            : "",
          estimatedArrivalTime: "",
          availableSeats: selectedRequestData.seats || 4,
          contribution: 3,
          vehicleId: 0,
          bookingType: "",
          contributionCollectionMethod: "",
          paymentMethodDisplay: "",
          preferences: {
            smoking: false,
            pets: false,
            airConditioning: false,
            bicycleSupport: false,
            snowTires: false,
            skiRack: false,
            ladiesOnly: false,
            gentsOnly: false,
            luggageSize: "NONE",
            luggageCount: 0,
            music: "NOT_AT_ALL",
            additionalNotes: "",
          },
          stopovers: [],
        });
      } else {
        // For P2P (normal) rides
        setRideDetails({
          enableD2D: false,
          d2dRadiusKm: 5,
          d2dCapacity: 1,
          d2dBasePrice: 0,
          d2dExtraKmPrice: 0,
          d2dNotes: "",
          departure: {
            region: selectedRequestData.origin.region || "",
            city: selectedRequestData.origin.city || "",
            locationName: selectedRequestData.origin.locationName || "",
            latitude: selectedRequestData.origin.latitude || undefined,
            longitude: selectedRequestData.origin.longitude || undefined,
            address: selectedRequestData.origin.address || "",
          },
          destination: {
            region: selectedRequestData.destination?.region || "",
            city: selectedRequestData.destination?.city || "",
            locationName: selectedRequestData.destination?.locationName || "",
            latitude: selectedRequestData.destination?.latitude || undefined,
            longitude: selectedRequestData.destination?.longitude || undefined,
            address: selectedRequestData.destination?.address || "",
          },
          driverStartLocation: {
            region: "",
            city: "",
            locationName: "",
            latitude: undefined,
            longitude: undefined,
            address: "",
          },
          driverStopLocation: {
            region: "",
            city: "",
            locationName: "",
            latitude: undefined,
            longitude: undefined,
            address: "",
          },
          departureTime: departureTimeValue
            ? new Date(departureTimeValue).toISOString().slice(0, 16)
            : "",
          estimatedArrivalTime: "",
          availableSeats: selectedRequestData.seats || 4,
          contribution: 3,
          vehicleId: 0,
          bookingType: "",
          contributionCollectionMethod: "",
          paymentMethodDisplay: "",
          preferences: {
            smoking: false,
            pets: false,
            airConditioning: false,
            bicycleSupport: false,
            snowTires: false,
            skiRack: false,
            ladiesOnly: false,
            gentsOnly: false,
            luggageSize: "NONE",
            luggageCount: 0,
            music: "NOT_AT_ALL",
            additionalNotes: "",
          },
          stopovers: [],
        });
      }

      // Set city selectors
      if (selectedRequestData.origin?.city) {
        setDepartureCity({
          name: selectedRequestData.origin.city,
          province: selectedRequestData.origin.region || "",
        });
      }
      if (selectedRequestData.destination?.city) {
        setDestinationCity({
          name: selectedRequestData.destination.city,
          province: selectedRequestData.destination.region || "",
        });
      }

      // Move to step 2
      setStep(2);
      localStorage.setItem("createRideStep", "2");

      // Clear loading state
      setLoadingRequestId(null);

      toast.success(
        t(
          "createRide.driver.autoPopulated",
          "Form auto-populated from ride request"
        ),
        { className: "custom-success-toast" }
      );
    }
  }, [
    selectedRequestData,
    loadingRequestId,
    setRideDetails,
    setDepartureCity,
    setDestinationCity,
    setStep,
    t,
  ]);

  // Handler for clicking on a ride request
  const handleCreateRideFromRequest = (requestId: number) => {
    setLoadingRequestId(requestId);
  };

  return (
    <motion.div
      className="animate-fade-in"
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      key="step-1-content"
    >
      <div className="space-y-6">
        {/* Ride Type Selection - Radio Buttons */}
        <motion.div className="space-y-4" variants={itemVariants}>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t(
                "createRide.driver.rideTypeDescription",
                "Select the type of ride you want to create"
              )}
            </p>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t("createRide.driver.selectRideType", "Select your ride type")}
              </label>
              {autoSelectedRideType && (
                <Badge
                  variant="outline"
                  className="text-xs border-primary-500 text-primary-600 dark:text-primary-400"
                >
                  {t("createRide.driver.autoSelected", "Auto-selected")}:{" "}
                  {autoSelectedRideType === "D2D"
                    ? t("createRide.driver.doorToDoorRide", "Door-to-Door")
                    : t("createRide.driver.normalRide", "P2P")}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Normal Ride Option */}
              <label
                className={`relative flex flex-col p-5 border-2  cursor-pointer transition-all duration-200 ${
                  !rideDetails.enableD2D
                    ? "border-green-600 bg-green-50 dark:bg-green-900/20 shadow-md"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="rideType"
                    value="normal"
                    checked={!rideDetails.enableD2D}
                    onChange={() => {
                      setRideDetails((prev) => ({
                        ...prev,
                        enableD2D: false,
                        d2dRadiusKm: 5,
                        d2dExtraKmPrice: 0,
                        d2dNotes: "",
                      }));
                      setAutoSelectedRideType(null);
                    }}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-600 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {t("createRide.driver.normalRide", "Point-To-Point")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {t(
                        "createRide.driver.normalRideDescription",
                        "Traditional ride-sharing with fixed pickup and drop-off points. Passengers book seats along your route. Perfect for city-to-city travel with scheduled stops."
                      )}
                    </p>
                  </div>
                </div>
              </label>

              {/* Door-to-Door Ride Option */}
              <label
                className={`relative flex flex-col p-5 border-2  cursor-pointer transition-all duration-200 ${
                  rideDetails.enableD2D
                    ? "border-green-600 bg-green-50 dark:bg-green-900/20 shadow-md"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="rideType"
                    value="d2d"
                    checked={rideDetails.enableD2D}
                    onChange={() => {
                      setRideDetails((prev) => ({
                        ...prev,
                        enableD2D: true,
                        // Initialize D2D-specific fields
                        d2dRadiusKm: prev.d2dRadiusKm || 5,
                        d2dExtraKmPrice: prev.d2dExtraKmPrice || 0,
                        // Clear stopovers for D2D (not applicable)
                        stopovers: [],
                      }));
                      setAutoSelectedRideType(null);
                    }}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-600 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {t(
                          "createRide.driver.doorToDoorRide",
                          "Door-to-Door Ride"
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {t(
                        "createRide.driver.doorToDoorRideDescription",
                        "Flexible pickup and drop-off service. Passengers request rides from their exact location to their destination within your detour radius. Ideal for personalized, on-demand transportation."
                      )}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Available Ride Requests */}
        {rideRequests.length > 0 && (
          <motion.div className="mt-6" variants={itemVariants}>
            <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800  p-4">
              <p className="text-sm font-medium text-accent-900 dark:text-accent-200 mb-3">
                {t(
                  "createRide.driver.peopleRequestingRides",
                  "People are requesting these rides:"
                )}
              </p>
              <div className="space-y-1.5">
                {isLoadingRequests ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-accent-600" />
                  </div>
                ) : (
                  rideRequests.map((request: any) => (
                    <div
                      key={request.id}
                      className="bg-white dark:bg-gray-800 border border-accent-200 dark:border-accent-700 px-3 py-2 hover:shadow-sm hover:border-accent-300 dark:hover:border-accent-600 transition-all cursor-pointer relative rounded-sm"
                      onClick={() => handleCreateRideFromRequest(request.id)}
                    >
                      {/* Loading overlay */}
                      {loadingRequestId === request.id && isLoadingRequest && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10 rounded-sm">
                          <div className="flex flex-col items-center gap-1.5">
                            <Loader2 className="h-4 w-4 animate-spin text-accent-600" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {t(
                                "createRide.driver.loadingRequest",
                                "Loading request..."
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        {/* Left side - Route and details */}
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          {/* Route */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <MapPin className="h-3.5 w-3.5 text-accent-600 dark:text-accent-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {request.origin?.city ||
                                request.origin?.locationName ||
                                request.departure?.city ||
                                request.departure?.locationName ||
                                t(
                                  "common_.small.notSpecified",
                                  "Not specified"
                                )}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              →
                            </span>
                            <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {request.destination?.city ||
                                request.destination?.locationName ||
                                request.departure?.city ||
                                request.departure?.locationName ||
                                t(
                                  "common_.small.notSpecified",
                                  "Not specified"
                                )}
                            </span>
                          </div>

                          {/* Ride Type Badge */}
                          {request.rideType && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0.5 h-5 flex-shrink-0 ${
                                request.rideType === "D2D"
                                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                                  : "border-slate-500 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {request.rideType === "D2D"
                                ? t("createRide.driver.doorToDoorRide", "D2D")
                                : t(
                                    "createRide.driver.normalRide",
                                    "Point-To-Point"
                                  )}
                            </Badge>
                          )}

                          {/* Date */}
                          {request.date && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                              <Calendar className="h-3 w-3" />
                              <span className="whitespace-nowrap">
                                {new Date(request.date).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {/* Seats */}
                          {request.seats && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                              <User className="h-3 w-3" />
                              <span className="whitespace-nowrap">
                                {request.seats}{" "}
                                {request.seats === 1
                                  ? t("common_.small.passenger", "seat")
                                  : t("common_.small.passenger", "seats")}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right side - Create button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] px-2 py-1 h-6 flex-shrink-0"
                          disabled={
                            loadingRequestId === request.id && isLoadingRequest
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateRideFromRequest(request.id);
                          }}
                        >
                          {loadingRequestId === request.id &&
                          isLoadingRequest ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            t("createRide.driver.createForRequest", "Create")
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-accent-200 dark:border-accent-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1 || isLoadingRequests}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("common_.previous", "Previous")}
                  </Button>
                  <span className="text-sm text-accent-700 dark:text-accent-300">
                    {t("common_.page", "Page")} {currentPage}{" "}
                    {t("common_.of", "of")} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages || isLoadingRequests}
                    className="flex items-center gap-1"
                  >
                    {t("common_.next", "Next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation Button */}
      <motion.div className="flex justify-end mt-8" variants={itemVariants}>
        <motion.button
          type="button"
          onClick={() => {
            // Validate that a ride type is selected
            if (rideDetails.enableD2D === undefined) {
              toast.error(
                t(
                  "createRide.driver.selectRideTypeFirst",
                  "Please select a ride type first"
                ),
                {
                  className: "custom-error-toast",
                }
              );
              return;
            }

            // All validations passed, go to next step
            handleNext();
          }}
          className="bg-gradient-to-r from-[#30BFDD] to-[#2aa8c4] hover:from-[#2aa8c4] hover:to-[#30BFDD] text-white px-8 py-4  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105"
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
