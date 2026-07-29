import CustomLoader from "@/components/CustomLoader";
import PaymentCard from "@/components/ui/paymentCard";
import SeatVisualization from "@/components/ui/seat-visualization";
import {
  AirVentIcon,
  ArrowRight,
  Cigarette,
  DogIcon,
  MapPin,
  X,
  Calendar,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FaFemale } from "react-icons/fa";
import { FaSackDollar, FaSnowflake } from "react-icons/fa6";
import { DateTime } from "luxon";
import tzlookup from "tz-lookup";

const RideCard = ({ ride, navigate, t, userLocale }) => {
  const [currentTime, setCurrentTime] = useState(null);
  const [timeZone, setTimeZone] = useState(null);

  const pointDeparture = ride?.departureLocation;
  const driverDeparture = ride?.driverStartLocation;

  useEffect(() => {
    const userTimeZone = DateTime.local().zoneName;

    if (
      (pointDeparture?.latitude || driverDeparture?.latitude) &&
      (pointDeparture?.longitude || driverDeparture?.longitude)
    ) {
      const departureTimeZone = tzlookup(
        pointDeparture?.latitude || driverDeparture?.latitude,
        pointDeparture?.longitude || driverDeparture?.longitude,
      );

      setTimeZone(departureTimeZone);

      try {
        let departureInCity;
        if (typeof ride.departureTime === "string") {
          departureInCity = DateTime.fromISO(ride.departureTime, {
            zone: departureTimeZone,
          });
        } else if (typeof ride.departureTime === "number") {
          const timestamp =
            ride.departureTime < 10000000000
              ? ride.departureTime * 1000
              : ride.departureTime;
          departureInCity = DateTime.fromMillis(timestamp, {
            zone: departureTimeZone,
          });
        } else {
          return;
        }

        if (!departureInCity.isValid) {
          return;
        }

        const departureInUserZone = departureInCity.setZone(userTimeZone);
        setCurrentTime(departureInUserZone);
      } catch (error) {
        console.error("Error parsing departure time:", error);
        return;
      }
    }
  }, [
    pointDeparture?.latitude,
    pointDeparture?.longitude,
    driverDeparture?.latitude,
    driverDeparture?.longitude,
    ride?.departureTime,
  ]);

  if (!timeZone || !currentTime) {
    return (
      <div className="h-96 flex items-center justify-center">
        <CustomLoader />
      </div>
    );
  }

  const isDoorToDoorRide = ride.type === "D2D";
  const displayPrice = ride.contribution || 0;

  const formatTime = () => {
    try {
      let date;
      if (typeof ride.departureTime === "string") {
        date = new Date(ride.departureTime);
      } else if (typeof ride.departureTime === "number") {
        const timestamp =
          ride.departureTime < 10000000000
            ? ride.departureTime * 1000
            : ride.departureTime;
        date = new Date(timestamp);
      } else {
        return "Invalid date";
      }

      if (isNaN(date.getTime())) return "Invalid date";

      return date
        .toLocaleTimeString(userLocale, {
          timeZone: timeZone && timeZone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .replace(/^([a-zéèêàâîïç])/u, (match) =>
          match.toUpperCase(),
        );
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <div
      key={ride.id}
      onClick={() => navigate(`/ride?rideId=${ride.id}`)}
      className={`cursor-pointer border-2 border-green-600 bg-white dark:bg-gray-800 hover:bg-green-600 hover:text-white dark:hover:bg-green-600 transition-all duration-300 rounded-lg shadow-md hover:shadow-xl ${
        ride.availableSeats === 0 || ride.status === "CLOSED"
          ? "opacity-50 cursor-not-allowed"
          : ""
      }`}
    >
      <div className="p-6">
        {/* Header with Time and Price */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="border-2 border-green-600 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <Clock className="h-6 w-6 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <div className="text-3xl font-black">
                {formatTime()}
              </div>
              <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                {currentTime && currentTime.toFormat("LLL dd, hh:mm a")} {t("common_.small.local")}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black">
              ${displayPrice.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              {isDoorToDoorRide
                ? t("rideSearch.fullRidePrice", "full ride")
                : t("rideSearch.perSeat", "per seat")}
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-600 border-2 border-green-600 rounded-full"></div>
            <div>
              <div className="font-bold text-lg">
                {pointDeparture?.city || driverDeparture?.city}
              </div>
              <div className="text-sm text-gray-600">
                {pointDeparture?.locationName || driverDeparture?.locationName}
              </div>
            </div>
          </div>
          <div className="pl-3 border-l-2 border-green-600 ml-1.5">
            <div className="h-8"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 border-2 border-green-600 rounded-full"></div>
            <div>
              <div className="font-bold text-lg">
                {ride?.destinationLocation?.city ||
                  ride?.driverStopLocation?.city}
              </div>
              <div className="text-sm text-gray-600">
                {ride?.destinationLocation?.locationName ||
                  ride?.driverStopLocation?.locationName}
              </div>
            </div>
          </div>
        </div>

        {/* Amenities and Seats */}
        <div className="flex items-center justify-between pt-6 border-t-2 border-green-600">
          <div className="flex items-center gap-4">
            {ride.preferences.smoking ? (
              <Cigarette className="h-5 w-5 text-green-600" />
            ) : (
              <div className="relative">
                <Cigarette className="h-5 w-5 text-red-500" />
                <X className="h-3 w-3 text-red-500 absolute -top-0.5 -right-0.5 bg-white rounded-full" />
              </div>
            )}
            {ride.preferences.pets ? (
              <DogIcon className="h-5 w-5 text-green-600" />
            ) : (
              <div className="relative">
                <DogIcon className="h-5 w-5 text-red-500" />
                <X className="h-3 w-3 text-red-500 absolute -top-0.5 -right-0.5 bg-white rounded-full" />
              </div>
            )}
            {ride.preferences.airConditioning ? (
              <AirVentIcon className="h-5 w-5 text-green-600" />
            ) : (
              <div className="relative">
                <AirVentIcon className="h-5 w-5 text-red-500" />
                <X className="h-3 w-3 text-red-500 absolute -top-0.5 -right-0.5 bg-white rounded-full" />
              </div>
            )}
            {ride.preferences.ladiesOnly && (
              <FaFemale size="20" className="text-green-600" />
            )}
            {ride.preferences.snowTires && (
              <FaSnowflake size={20} className="text-green-600" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <SeatVisualization
              totalSeats={ride?.totalSeats}
              availableSeats={ride?.availableSeats}
              size="sm"
              showCount={true}
            />
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-4 pt-4 border-t border-black/20">
          <div className="flex items-center justify-between">
            {isDoorToDoorRide ? (
              <span className="text-xs font-semibold uppercase">
                {t("rideSearch.d2d", "Door-to-Door")}
              </span>
            ) : ride.contributionCollectionMethod === "VIA_PLATFORM" ? (
              <div className="flex items-center gap-2">
                <PaymentCard className="size-8" />
                <span className="text-sm">Platform Payment</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FaSackDollar className="size-5" />
                <span className="text-sm">Cash Payment</span>
              </div>
            )}
          </div>
        </div>

        {/* Stopovers */}
        {Array.isArray(ride.stopovers) && ride.stopovers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-black/20">
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2" />
              <span className="font-medium">Stops: </span>
              <span className="ml-1">
                {ride.stopovers.map((stop) => stop.city).join(", ")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideCard;
