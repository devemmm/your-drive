import { Button } from "@/components/ui/button";
import {
  apiUrl,
  queryKey,
  usePassengerBookedRide,
  usePassengerRide,
  useSingleUser,
} from "@/data";

import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft,
  Bike,
  Briefcase,
  Calendar,
  Cigarette,
  CreditCard,
  Heart,
  Luggage,
  MapPin,
  Mountain,
  Music,
  Package,
  PawPrint,
  Snowflake,
  Star,
  UserRound,
  Users,
  Wind,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { getToken } from "./getToken";
import LoadingIndicator from "./LoadingIndicator";
import RideMap from "./Map";
import StripePaymentForm from "./StripePaymentForm";
import { Switch } from "./ui/switch";

import { useReactItems } from "@/lib/ReactTranslation";
import { formatTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { FaSackDollar } from "react-icons/fa6";
import { ComplaintDialog } from "./Complaint";
import Rating from "./Dashboard/Rating";
import PassengerReviews from "./PassengerReviews";
import PassengerDoorToDoorRequest from "@/components/DoorToDoor/PassengerDoorToDoorRequest";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import PaymentCard from "./ui/paymentCard";
import SeatVisualization from "./ui/seat-visualization";

import { DateTime } from "luxon";
import tzlookup from "tz-lookup";
import { Badge } from "./ui/badge";

const stripePromise = (() => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn(
      "Stripe publishable key not found. Payment functionality will be disabled."
    );
    return null;
  }
  return loadStripe(publishableKey);
})();

const PassengerRideDetails = () => {
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [useCoupons, setUseCoupons] = useState(false);
  const [payment_data, setPayment_data] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [timeZone, setTimeZone] = useState(null);

  const [searchParams] = useSearchParams();
  const rideIdParam = searchParams.get("rideId");
  const rideId = rideIdParam ? parseInt(rideIdParam, 10) : null;

  // Get the 't' query parameter
  const rideStatus = searchParams.get("t");
  const isBooked = rideStatus === "booked";

  const { authenticated, user } = useAuth();

  const { currentLanguage, t, queryClient } = useReactItems();
  const location = useLocation();

  const {
    data: publicRide,
    isLoading: isPublicLoading,
    isError: isPublicError,
    error: publicError,
  } = usePassengerRide({
    rideId: rideId,
    enabled: !!rideId && !isBooked,
  });

  const {
    data: bookedRide,
    isLoading: isBookedLoading,
    isError: isBookedError,
    error: bookedError,
  } = usePassengerBookedRide({
    rideId: rideId,
    enabled: !!rideId && isBooked,
  });

  const { data: userData } = useSingleUser({
    userId: user?.id,
    enabled: !!user?.id,
  });

  // Get coupon redemption rules
  const { data: couponRulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["coupons", currentLanguage],
    queryFn: async () => {
      const { data } = await axios.get(
        `${apiUrl}/api/v1/public/coupons/redemption-rules?lang=${currentLanguage}`
      );
      return data;
    },
  });

  const couponRules = couponRulesData?.data || [];

  const rule = couponRules.find((r) => r.target === "RIDE_POSTING");
  const requiredCoupons = rule?.requiredCoupons ?? Infinity;

  const couponsPercentage = (userData?.coupons / requiredCoupons) * 100;
  const incomePercentage = couponsPercentage < 100 ? couponsPercentage : 100;

  // Choose the appropriate ride data
  const rideData = isBooked ? bookedRide : publicRide;

  // D2D helpers
  const isD2D = rideData?.isDoorToDoor || rideData?.type === "D2D";
  const displayDeparture = isD2D
    ? rideData?.driverStartLocation || rideData?.departureLocation
    : rideData?.departureLocation;
  const displayDestination = isD2D
    ? rideData?.driverStopLocation || rideData?.destinationLocation
    : rideData?.destinationLocation;

  // Debug logging
  useEffect(() => {
    if (rideData) {
      console.log("Ride Data Debug:", {
        rideId,
        isD2D,
        hasDriverStartLocation: !!rideData.driverStartLocation,
        hasDriverStopLocation: !!rideData.driverStopLocation,
        hasDepartureLocation: !!rideData.departureLocation,
        hasDestinationLocation: !!rideData.destinationLocation,
        displayDeparture: !!displayDeparture,
        displayDestination: !!displayDestination,
        rideType: rideData.type,
        isDoorToDoor: rideData.isDoorToDoor,
      });
    }
  }, [rideData, isD2D, displayDeparture, displayDestination, rideId]);

  useEffect(() => {
    // Parse as UTC
    const userTimeZone = DateTime.local().zoneName;
    const startLoc = displayDeparture;

    if (startLoc?.latitude && startLoc?.longitude) {
      // Get timezone of departure location (or driver start for D2D)
      const departureTimeZone = tzlookup(startLoc.latitude, startLoc.longitude);

      setTimeZone(departureTimeZone);

      const departureInCity = DateTime.fromISO(rideData?.departureTime, {
        zone: departureTimeZone,
      });
      const departureInUserZone = departureInCity.setZone(userTimeZone);

      setCurrentTime(departureInUserZone);
    } else if (rideData?.departureTime && !timeZone) {
      // Fallback when coordinates are missing (some D2D records)
      setTimeZone(userTimeZone);
      setCurrentTime(
        DateTime.fromISO(rideData.departureTime, { zone: userTimeZone })
      );
    }
  }, [
    displayDeparture?.latitude,
    displayDeparture?.longitude,
    displayDeparture,
    rideData?.departureTime,
    timeZone,
  ]);

  const navigate = useNavigate();

  const { mutate: bookRide, isPending: isBooking } = useMutation({
    mutationFn: async (bookingData: { rideId: number; seats: number }) => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/rides/${rideId}/book?lang=${currentLanguage}&useCoupons=${useCoupons.toString()}`,
        {
          seatsBooked: bookingData.seats,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      if (!data?.data?.totalToPay) {
        window.location.replace(
          "/dashboard?redirect_to=requests&t=booked_by_me"
        );
        return;
      }

      setPayment_data(data.data);
      toast.success(data.message);

      // Don't invalidate SINGLE_PASSENGER_RIDE here to prevent refetch errors
      // The payment form will handle invalidation after successful payment
      queryClient.invalidateQueries({
        queryKey: [queryKey.NOTIFICATIONS],
      });
      queryClient.invalidateQueries({
        queryKey: ["bookings"],
      });
    },
    onError: (err) => {
      console.log("Error while booking", err);
      toast.error((err as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  const isPending = isBooked ? isBookedLoading : isPublicLoading;
  const isError = isBooked ? isBookedError : isPublicError;
  const error = isBooked ? bookedError : publicError;

  // Show error state if query failed
  if (isError) {
    console.error("Error fetching ride data:", error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("RideDetail.backToRides", "Back to Rides")}
            </Button>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                <MapPin className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t(
                  "RideDetail.Ride.loadError",
                  "Impossible de charger toutes les données du trajet"
                )}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                {error instanceof Error
                  ? error.message
                  : (error as any)?.response?.data?.message ||
                    t("common_.somethingWentWrong")}
              </p>
              <Button
                onClick={() => {
                  queryClient.invalidateQueries({
                    queryKey: [queryKey.SINGLE_PASSENGER_RIDE],
                  });
                }}
                variant="outline"
                className="mt-4"
              >
                {t("RideDetail.common.retry", "Réessayer")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (timeZone === null || isPending || !rideData) {
    return <LoadingIndicator />;
  }

  // Check if rideData exists and has required properties
  if (!rideData || !displayDeparture || !displayDestination) {
    console.warn("Ride data missing required properties:", {
      rideData: !!rideData,
      displayDeparture: !!displayDeparture,
      displayDestination: !!displayDestination,
      isD2D,
      driverStartLocation: !!rideData?.driverStartLocation,
      driverStopLocation: !!rideData?.driverStopLocation,
      departureLocation: !!rideData?.departureLocation,
      destinationLocation: !!rideData?.destinationLocation,
    });
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("RideDetail.backToRides", "Back to Rides")}
            </Button>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                <MapPin className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("RideDetail.Ride.loadError", "Ride Not Found")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                {t("common_.somethingWentWrong")}
              </p>
              <Button
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: [queryKey.SINGLE_PASSENGER_RIDE],
                  })
                }
                variant="outline"
                className="mt-4"
              >
                {t("RideDetail.common.retry", "Retry")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleBookRide = () => {
    if (!rideId) return;
    bookRide({ rideId, seats: seatsToBook });
  };

  // Calculate duration in hours and minutes
  const calculateDuration = () => {
    if (!rideData.departureTime || !rideData.estimatedArrivalTime)
      return t("common.notAvailable", "N/A");

    const departureTime = new Date(rideData.departureTime);
    const arrivalTime = new Date(rideData.estimatedArrivalTime);
    const durationMs = arrivalTime.getTime() - departureTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
      return t("RideDetails.duration.hoursMinutes", "{{hours}}h {{minutes}}m", {
        hours,
        minutes,
      });
    } else {
      return t("RideDetails.duration.minutes", "{{minutes}}m", { minutes });
    }
  };

  const userLocale = currentLanguage === "fr" ? "fr-FR" : "en-US";
  const isFullD2DRide = rideData?.type === "D2D";

  // For regular rides with D2D option
  const doorToDoorConfig = !isFullD2DRide
    ? rideData?.doorToDoor ?? rideData?.door_to_door ?? rideData?.d2d ?? null
    : null;
  const doorToDoorAvailable =
    !isFullD2DRide &&
    doorToDoorConfig?.isEnabled &&
    (doorToDoorConfig?.remainingCapacity ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Navigation */}
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 bg-gray-100 dark:bg-gray-800 rounded-xl transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("RideDetail.backToRides", "Back to Rides")}
          </Button>
        </motion.div>

        {/* Hidden Stripe Elements */}
        <div className="hidden">
          {stripePromise && rideData && (
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                payment_data={payment_data}
                setPayment_data={setPayment_data}
                keyToValidate={queryKey.SINGLE_PASSENGER_RIDE}
                rideDetails={{
                  departureLocation: displayDeparture,
                  destinationLocation: rideData.destinationLocation,
                  departureTime: rideData.departureTime,
                  totalSeats: rideData.totalSeats,
                  availableSeats: rideData.availableSeats,
                  contribution: rideData.contribution,
                  vehicle: rideData.vehicle,
                }}
                seatsToBook={seatsToBook}
                redirect="/dashboard?redirect_to=requests&t=booked_by_me"
              />
            </Elements>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Hero Section */}
            <motion.div
              className="relative overflow-hidden  bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900/20 dark:via-gray-800/50 dark:to-gray-900/20 border border-gray-200/50 dark:border-white/50 shadow-md backdrop-blur-sm"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-white text-xl flex items-center gap-3 bg-primary/80  px-4 py-2 ">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <span className="text-2xl">
                    {formatTime({
                      dateString: rideData.departureTime,
                      timeZone: timeZone,
                      formatTime: userLocale,
                    })}
                  </span>
                  {rideData?.departureTime && currentTime && (
                    <Badge
                      variant="outline"
                      className="border-none text-lg text-white"
                    >
                      ({currentTime.toFormat("LLL dd, hh:mm a")} local time)
                    </Badge>
                  )}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-primary-500/5"></div>
              <div className="relative p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="space-y-4">
                    <div className="text-2xl flex flex-col lg:flex-row items-start gap-3 font-black text-gray-900 dark:text-white leading-tight">
                      <div className="text-gray-600 dark:text-gray-400 text-2xl flex flex-col items-start">
                        <MapPin className="h-7 w-7 text-green-500" />
                        <div className="flex flex-col gap-2">
                          <span className="text-2xl">
                            {rideData.type === "P2P"
                              ? rideData.departureLocation?.city || "City"
                              : rideData.driverStartLocation?.city ||
                                displayDeparture?.city ||
                                "Starting Point"}
                          </span>
                          <span className="text-sm font-light">
                            {rideData.type === "P2P"
                              ? rideData.departureLocation?.locationName ||
                                rideData.departureLocation?.address ||
                                ""
                              : rideData.driverStartLocation?.locationName ||
                                rideData.driverStartLocation?.address ||
                                displayDeparture?.address ||
                                ""}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 my-5 text-2xl">
                        →
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-2xl flex flex-col items-start">
                        <MapPin className="h-7 w-7 text-red-500" />
                        <div className="flex flex-col gap-2">
                          <span className="text-xl">
                            {rideData.type === "P2P"
                              ? rideData?.destinationLocation?.city || "City"
                              : rideData?.driverStopLocation?.city ||
                                displayDestination?.city ||
                                "Destination"}
                          </span>
                          <span className="text-sm font-light">
                            {rideData.type === "P2P"
                              ? rideData?.destinationLocation?.locationName ||
                                rideData?.destinationLocation?.address ||
                                ""
                              : rideData?.driverStopLocation?.locationName ||
                                rideData?.driverStopLocation?.address ||
                                displayDestination?.address ||
                                ""}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-2xl mt-5 lg:mt-0">
                        {rideData.stopovers &&
                          rideData.stopovers.length > 0 && (
                            <div>
                              <MapPin className="h-7 w-7 text-primary" />
                              {rideData.stopovers.map((stop, i) => (
                                <div
                                  key={`stopover-${i}`}
                                  className="flex items-center gap-3 pb-4 rounded-xl border-2 transition-all duration-300 bg-primary-50/10 border-primary-50/20"
                                >
                                  <div className="flex flex-col gap-2">
                                    <span className="text-2xl">
                                      {stop.city}
                                    </span>
                                    <span className="text-sm font-light">
                                      {stop.address}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden xl:flex">
                        <SeatVisualization
                          totalSeats={rideData?.totalSeats}
                          availableSeats={rideData?.availableSeats}
                          size="md"
                        />
                      </div>
                    </div>
                    {isFullD2DRide && (
                      <div className="border border-primary-600 text-primary-700 dark:border-primary-500 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 px-4 py-3 text-sm leading-relaxed max-w-xl">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold mb-1">
                              {t(
                                "DoorToDoor.dashboard.request.title",
                                "Door-to-Door Service"
                              )}
                            </p>
                            <p>
                              {t(
                                "DoorToDoor.dashboard.request.within",
                                "Within {{km}} km of departure",
                                { km: rideData?.detourRadius ?? 5 }
                              )}
                            </p>
                            <p className="mt-1 text-xs">
                              {t(
                                "DoorToDoor.dashboard.request.bookNote",
                                "Book this ride and provide your exact pickup and dropoff addresses."
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {doorToDoorAvailable && !isFullD2DRide && (
                      <div className="border border-primary-600 text-primary-700 dark:border-primary-500 dark:text-primary-300 px-4 py-3 text-sm leading-relaxed rounded-none max-w-xl">
                        Door-to-door pickup & drop-off within{" "}
                        {doorToDoorConfig.radiusKm ?? 0} km. Book first, then
                        request your exact addresses from the dashboard.
                      </div>
                    )}
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-4xl font-black text-primary dark:text-primary flex items-center gap-2">
                        <div className="flex flex-col gap-2">
                          <span className="text-2xl">
                            ${rideData.contribution?.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {isFullD2DRide
                              ? t("rideSearch.fullRidePrice", "full ride")
                              : `/${t("common_.small.seat")}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Trip Details Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Duration */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t("RideDetails.duration", "Duration")}
                  </h3>
                </div>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {calculateDuration()}
                </p>
              </div>

              {/* Payment Method */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-8">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t("driver.payment")}
                  </h3>
                </div>
                <div className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                  {rideData.contributionCollectionMethod === "VIA_PLATFORM" ? (
                    <div className="flex items-center justify-start space-x-1">
                      <PaymentCard className="size-12 " />
                    </div>
                  ) : (
                    <div className="flex items-center justify-start space-x-1">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTXM3jkZbdXmmFTSGrKyQDH4mbiJ6elgU7hg&s"
                        alt="cash"
                        className="size-10 rounded-full"
                      />
                      <FaSackDollar className="size-10" />
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Type */}
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {t("common_.booking")}
                  </h3>
                </div>
                <p className="text-lg font-semibold text-primary-600 dark:text-primary-400 capitalize">
                  {rideData.bookingType?.toLowerCase()}
                </p>
              </div>
            </motion.div>

            {/* Vehicle & Driver */}
            <motion.div
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-md p-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("common_.small.Vehicle_")} {t("Register.and")}{" "}
                {t("onboarding.driver")}
              </h2>

              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-6">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <img
                    src={
                      rideData.vehicle.defaultImage?.url ||
                      rideData.vehicle.files?.[0]?.url ||
                      "/placeholder.png"
                    }
                    alt={`${rideData.vehicle.make} ${rideData.vehicle.model}`}
                    className="size-44 object-cover shadow-sm"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {rideData.vehicle.make} {rideData.vehicle.model}
                      </h3>
                      <p className="text-primary-600 dark:text-primary-400 font-medium">
                        {rideData.vehicle.year} • {rideData.vehicle.color} •{" "}
                        {rideData.vehicle.plateNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="size-10 bg-transparent flex items-center justify-center">
                          <Avatar>
                            <AvatarImage
                              src={rideData.driver?.profileImage?.url}
                            />
                            <AvatarFallback>
                              {rideData.driver?.firstName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {rideData.driver?.firstName}{" "}
                            {rideData.driver?.lastName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t("onboarding.driver")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="size-10 bg-primary-500  flex items-center justify-center">
                          <Star className="h-4 w-4 text-white" />
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {rideData.driver.ratingAverage}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ({rideData.driver.totalRatings}{" "}
                            {t("RideDetail.avis")})
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Enhanced Preferences */}
            <motion.div
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-md p-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t("RideDetails.preference_s")}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: "smoking",
                    enabled: rideData?.preferences?.smoking || false,
                    icon: (
                      <Cigarette className="h-5 w-5 text-muted-foreground" />
                    ),
                    label: t(
                      "RideDetails.preferences.smokingAllowed",
                      "Smoking Allowed"
                    ),
                  },
                  {
                    id: "pets",
                    enabled: rideData?.preferences?.pets || false,
                    icon: (
                      <PawPrint className="h-5 w-5 text-muted-foreground" />
                    ),
                    label: t(
                      "RideDetails.preferences.petsAllowed",
                      "Pets Allowed"
                    ),
                  },
                  {
                    id: "airConditioning",
                    enabled: rideData?.preferences?.airConditioning || false,
                    icon: <Wind className="h-5 w-5 text-muted-foreground" />,
                    label: t("common_.small.air"),
                  },
                  {
                    id: "bicycleSupport",
                    enabled: rideData?.preferences?.bicycleSupport || false,
                    icon: <Bike className="h-5 w-5 text-muted-foreground" />, // ✅ Bike icon
                    label: t(
                      "RideDetails.preferences.bicycleSupport",
                      "Bicycle Support"
                    ),
                  },
                  {
                    id: "snowTires",
                    enabled: rideData?.preferences?.snowTires || false,
                    icon: (
                      <Snowflake className="h-5 w-5 text-muted-foreground" />
                    ),
                    label: t("common_.small.Snow"),
                  },
                  {
                    id: "skiRack",
                    enabled: rideData?.preferences?.skiRack || false,
                    icon: (
                      <Mountain className="h-5 w-5 text-muted-foreground" />
                    ), // 🎿 Ski rack
                    label: t("common_.small.SkiRack"),
                  },
                  {
                    id: "ladiesOnly",
                    enabled: rideData?.preferences?.ladiesOnly || false,
                    icon: (
                      <UserRound className="h-5 w-5 text-muted-foreground" />
                    ),
                    label: t("common_.small.LadiesOnly"),
                  },
                  {
                    id: "gentsOnly",
                    enabled: rideData?.preferences?.gentsOnly || false,
                    icon: <Users className="h-5 w-5 text-muted-foreground" />, // 👥 Male group
                    label: t("common_.small.GentsOnly"),
                  },
                ].map((pref) => (
                  <div
                    key={pref.id}
                    className="relative flex items-center gap-3 p-3 rounded-2xl bg-muted border border-border"
                  >
                    {pref.icon}
                    <span className="text-sm font-medium text-foreground">
                      {pref.label}
                    </span>
                    <span className="absolute right-4">
                      {pref.enabled ? "✓" : "✗"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 mt-3 p-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <Music className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {t("profile.preferences.music")}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground uppercase">
                  {rideData.preferences?.music
                    ? t(
                        `profile.preferences.musicLevels.${rideData.preferences.music.toLowerCase()}`
                      )
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {t("profile.preferences.luggageCount")}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {rideData.preferences?.luggageCount ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {t("profile.preferences.luggageSize")}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground uppercase">
                  {rideData.preferences?.luggageSize
                    ? t(
                        `RideDetails.preferences.luggageSize.${rideData.preferences.luggageSize.toLowerCase()}`
                      ) ?? "N/A"
                    : "N/A"}
                </span>
              </div>
            </div>

            {/* Map Section */}
            <motion.div
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-md overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t("RideDetails.routeMap")}
                  </h2>
                </div>
              </div>
              <div className="px-8 pb-8">
                <RideMap
                  mode="view"
                  startPoint={displayDeparture}
                  endPoint={displayDestination}
                  stops={rideData.stopovers}
                  height="400px"
                  hideButton={true}
                />
              </div>
            </motion.div>
          </div>

          {/* Booking Panel */}
          <div className="lg:w-96 space-y-6">
            {/* Ride Rules */}
            <motion.div
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-md p-6"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("RideDetail.rulesToFollow")}
                </h2>
              </div>
              <div className="space-y-3">
                <ul className="space-y-3 text-sm list-none">
                  {[
                    "rules.punctual",
                    "rules.respect",
                    "rules.smoking",
                    "rules.luggage",
                    "rules.courteous",
                  ].map((ruleKey) => (
                    <li key={ruleKey} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        {t(`RideDetail.${ruleKey}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {rideData.status !== "COMPLETED" && (
              <>
                {/* Booking Card */}
                <motion.div
                  className="sticky top-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm  border border-gray-200/60 dark:border-gray-700/60 shadow-md p-6"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {t("RideDetail.bookRide")}
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* D2D Notice for full D2D rides */}
                    {isFullD2DRide && (
                      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 ">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100 mb-1">
                              {t(
                                "DoorToDoor.dashboard.request.title",
                                "Door-to-Door Service"
                              )}
                            </p>
                            <p className="text-xs text-primary-700 dark:text-primary-300">
                              {t(
                                "DoorToDoor.dashboard.request.bookNote",
                                "This is a door-to-door ride. Please use the form below to provide your pickup and dropoff addresses."
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isFullD2DRide && (
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {t("RideDetail.numberOfSeats")}
                        </label>
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700  border border-gray-200 dark:border-gray-600">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSeatsToBook(Math.max(1, seatsToBook - 1))
                            }
                            disabled={seatsToBook <= 1}
                            className="w-10 h-10 p-0 rounded-xl"
                          >
                            -
                          </Button>
                          <span className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-white">
                            {seatsToBook}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSeatsToBook(
                                Math.min(
                                  rideData.availableSeats,
                                  seatsToBook + 1
                                )
                              )
                            }
                            disabled={seatsToBook >= rideData.availableSeats}
                            className={`w-10 h-10 p-0 rounded-xl ${
                              seatsToBook >= rideData.availableSeats
                                ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
                                : "bg-primary-500 hover:bg-primary-600 text-white hover:white"
                            }`}
                          >
                            +
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t("RideDetail.seatsAvailable", {
                            count: rideData.availableSeats,
                          })}
                        </p>

                        {/* Seat Visualization for Booking */}
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 ">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {t("common_.seats")}
                          </p>
                          <SeatVisualization
                            totalSeats={rideData.totalSeats}
                            availableSeats={
                              rideData.availableSeats - seatsToBook
                            }
                            size="sm"
                            showCount={false}
                          />
                        </div>
                      </div>
                    )}

                    {isFullD2DRide ? (
                      <>
                        <Separator className="bg-gray-200 dark:bg-gray-700" />
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t("rideSearch.fullRidePrice", "Full Ride Price")}
                              :
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              ${rideData.contribution?.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* D2D pickup/dropoff form + inline map */}
                        <PassengerDoorToDoorRequest ride={rideData} />
                      </>
                    ) : (
                      <>
                        <Separator className="bg-gray-200 dark:bg-gray-700" />

                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t("RideDetail.pricePerSeat")}:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              ${rideData.contribution?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t("RideDetail.seats")}:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {seatsToBook}
                            </span>
                          </div>
                          {couponDiscount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-green-600 dark:text-green-400">
                                {t(
                                  "RideDetail.couponDiscount",
                                  "Coupon Discount"
                                )}
                                :
                              </span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                -${couponDiscount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <Separator className="bg-gray-200 dark:bg-gray-700" />
                          <div className="flex justify-between text-xl font-bold">
                            <span className="text-gray-900 dark:text-white">
                              {t("RideDetail.total")}:
                            </span>
                            <span className="text-primary-600 dark:text-primary-400">
                              $
                              {Math.max(
                                0,
                                rideData.contribution * seatsToBook -
                                  couponDiscount
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Toggle Coupon Selector */}
                        {authenticated &&
                          incomePercentage > 0 &&
                          !rideData?.appliedDriverCoupons && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label
                                  htmlFor="use-coupon-switch"
                                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                  {t("RideDetail.useCoupon")}
                                </label>
                                <Switch
                                  id="use-coupon-switch"
                                  onCheckedChange={setUseCoupons}
                                  className="bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                                />
                              </div>

                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("RideDetail.useCouponInfo")}
                              </p>

                              <p className="text-primary font-semibold text-xs">
                                {t("common_.passemger_coupons", {
                                  percent: incomePercentage,
                                })}
                              </p>

                              {useCoupons && (
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {t("RideDetail.available")}:{" "}
                                  {userData?.coupons ?? 0}
                                </p>
                              )}
                            </div>
                          )}

                        <Button
                          className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary-700 text-white  shadow-sm hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          size="lg"
                          onClick={() => {
                            if (authenticated) {
                              handleBookRide();
                            } else {
                              const fullPath =
                                location.pathname + location.search;
                              localStorage.setItem(
                                "postLoginRedirect",
                                fullPath
                              );
                              navigate("/login");
                            }
                          }}
                          disabled={isBooking || rideData.availableSeats <= 0}
                        >
                          {isBooking ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              {t("RideDetail.processing")}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-5 w-5" />
                              {t("RideDetail.bookNow")}
                            </div>
                          )}
                        </Button>

                        {rideData.bookingType === "MANUAL" && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                            {t("RideDetail.manualApprovalNote")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              </>
            )}

            {rideData.status === "COMPLETED" && isBooked && (
              <>
                {/* Rating */}
                <Rating driverId={rideData.driver.id} rideId={rideData.id} />
              </>
            )}
          </div>
        </div>

        <div className="mt-10 flex items-start justify-between">
          <PassengerReviews driverId={rideData.driver.id} />
          {isBooked && (
            <ComplaintDialog
              driverId={rideData.driver.id}
              rideId={rideData.id}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PassengerRideDetails;

// ======== booking ======
// baseAmount
// Your-DriveFee
// currency
// discount
// discountAmount
// seatsBooked
// sessionId
// taxAmount
// taxDetails
// totalToPay

// ====== Missed =======
// contributionPerSeat -
// totalBookingFee -
// bookingFeePerSeat -
// amount -
// clientSecret (from comfirm)
// contributionPerSeat -

{
  /*
  // Coupons
  Passenger: When coupons is > 1, show coupons ((number-of-coupons * 100)/required) when is 100%, he will get 100% discount on Your-Drive fee
  const %discount = ((coupons/requiredCoupons) * 100 (on Your-Drive fee)

  Driver: when driver use coupons, bookers will not use coupons because Your-Drive will be generated by driver based on coupons %
  we will check boolean
  */
}
