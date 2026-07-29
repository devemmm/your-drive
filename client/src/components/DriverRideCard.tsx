import React, { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  AirVentIcon,
  ArrowUpDown,
  Cigarette,
  DogIcon,
  Info,
  MapPin,
  Star,
  Users,
  X,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { FaFemale, FaSnowflake } from "react-icons/fa";

import tzlookup from "tz-lookup";
import { DateTime } from "luxon";

import LoaderIndicator from "@/components/LoadingIndicator";
import { useReactItems } from "@/lib/ReactTranslation";
// import { formatTime } from "@/lib/utils";

const DriverRideCard = ({
  ride,
  t,
  navigate,
  driverRide,
  bookingInfo,
}: {
  ride: any;
  t: any;
  navigate: any;
  driverRide: boolean;
  bookingInfo?: {
    seatsBooked: number;
    bookingStatus: string;
    bookingId: number;
    paymentAmount?: number;
    paymentStatus?: string;
    createdAt?: string;
    cancelledAt?: string;
    reason?: string;
  };
}) => {
  const [timeZone, setTimeZone] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const { currentLanguage } = useReactItems();

  // Check if this is a D2D ride
  const isD2DRide = ride?.type === "D2D" || ride?.isDoorToDoor === true;

  // For D2D rides, use driverStartLocation and driverStopLocation
  // For regular rides, use departureLocation and destinationLocation
  const departureLocation = isD2DRide
    ? ride?.driverStartLocation || ride?.departureLocation
    : ride?.departureLocation;

  const destinationLocation = isD2DRide
    ? ride?.driverStopLocation || ride?.destinationLocation
    : ride?.destinationLocation;

  const {
    id,
    departureTime,
    estimatedArrivalTime,
    contribution,
    totalSeats = 0,
    availableSeats = 0,
    status,
    stopovers = [],
    vehicle,
    driver,
    preferences,
    bookingType,
  } = ride;

  useEffect(() => {
    const userTimeZone = DateTime.local().zoneName;

    // Use the appropriate location based on ride type
    const locationForTimezone = isD2DRide
      ? ride?.driverStartLocation || ride?.departureLocation
      : ride?.departureLocation;

    if (locationForTimezone?.latitude && locationForTimezone?.longitude) {
      // Get timezone of departure location
      const departureTimeZone = tzlookup(
        locationForTimezone.latitude,
        locationForTimezone.longitude
      );

      setTimeZone(departureTimeZone);

      const departureInCity = DateTime.fromISO(ride.departureTime, {
        zone: departureTimeZone,
      });
      const departureInUserZone = departureInCity.setZone(userTimeZone);

      setCurrentTime(departureInUserZone);
    }
  }, [ride, isD2DRide]);

  if (!driver || !vehicle || !preferences) return null;

  const bookedSeats = totalSeats - availableSeats;

  if (!timeZone || !currentTime) return <LoaderIndicator />;

  const userLocale = currentLanguage === "fr" ? "fr-FR" : "en-US";

  const date = departureTime ? (
    <span>
      {new Date(departureTime)
        .toLocaleDateString(userLocale, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
        .replace(/^([a-zéèêàâîïç])/u, (match) => match.toUpperCase())}{" "}
      ({currentTime.toFormat("LLL dd, hh:mm a")} {t("common_.small.local")})
    </span>
  ) : (
    t("Ride.dateNotAvailable")
  );

  const canBePublished =
    new Date(departureTime) > new Date() && status === "DRAFT"; 

  // Status badge configuration
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return (
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600"
          >
            <FileText className="h-3 w-3 mr-1" />
            {t("ride.status.draft", "Draft")}
          </Badge>
        );
      case "PUBLISHED":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-600"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("ride.status.published", "Published")}
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-600"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("ride.status.completed", "Completed")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-600"
          >
            <XCircle className="h-3 w-3 mr-1" />
            {t("ride.status.cancelled", "Cancelled")}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Booking status badge
  const getBookingStatusBadge = (bookingStatus: string) => {
    switch (bookingStatus) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600"
          >
            <Clock className="h-3 w-3 mr-1" />
            {t("common_.small.bookings.PENDING", "Pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-600"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("common_.small.bookings.APPROVED", "Approved")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-600"
          >
            <XCircle className="h-3 w-3 mr-1" />
            {t("common_.small.bookings.CANCELLED", "Cancelled")}
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-600"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("common_.small.bookings.COMPLETED", "Completed")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div
      key={id}
      onClick={() => {
        navigate(
          driverRide ? `/rides?rideId=${id}` : `/ride?t=booked&rideId=${id}`
        );
      }}
      className={`bg-white cursor-pointer border-b dark:bg-gray-800 shadow-xl hover:shadow-md transition-shadow duration-200 ${
        totalSeats - bookedSeats === 0 || status === "CLOSED"
          ? "opacity-50 cursor-not-allowed"
          : ""
      } ${
        !driverRide
          ? "border-l-4 border-l-blue-500 dark:border-l-blue-400"
          : canBePublished
          ? "bg-orange-700/15 hover:bg-none"
          : "hover:bg-green-900/5"
      }`}
    >
      <div className="p-4">
        <div className="bg-primary/20 dark:bg-primary/20 p-3 mb-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-primary">{date}</h2>
            <div className="flex items-center gap-2">
              {/* Show ride status for posted rides, booking status for booked rides */}
              {driverRide
                ? getStatusBadge(status)
                : bookingInfo &&
                  getBookingStatusBadge(bookingInfo.bookingStatus)}
            </div>
          </div>
        </div>

         {ride?.isDoorToDoor && (
        <div className="w-fit relative flex items-center space-x-2 z-10 mx-2 bg-orange-700/25 p-2">
          <p className="text-white/90">
            D2D
          </p>
        </div>
      )}

        {/* Time and Route */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4 sm:gap-6">
          {/* Left: Departure Time & Location */}
          <div className="flex flex-1 items-center space-x-4 min-w-0">
            <div className="text-center shrink-0">
              <div className="text-xl font-black text-gray-900 dark:text-white uppercase">
                {new Date(departureTime).toLocaleTimeString("en-US", {
                  timeZone: timeZone,
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {departureLocation?.city ||
                  (isD2DRide
                    ? t("common_.small.d2dDeparture", "D2D Start")
                    : "City")}
              </div>
              <div className="text-gray-400 text-sm truncate">
                {departureLocation?.locationName ||
                  departureLocation?.address ||
                  t("common_.small.notSpecified", "Location not specified")}
              </div>
            </div>
          </div>

          {/* Arrow for desktop */}
          <ArrowUpDown className="hidden lg:block size-6 text-gray-400" />

          {/* Destination */}
          <div className="flex flex-1 items-center space-x-4 min-w-0">
            <div className="flex flex-col min-w-0">
              <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {destinationLocation?.city ||
                  (isD2DRide
                    ? t("common_.small.d2dDestination", "D2D End")
                    : "City")}
              </div>
              <div className="text-gray-400 text-sm truncate">
                {destinationLocation?.locationName ||
                  destinationLocation?.address ||
                  t("common_.small.notSpecified", "Location not specified")}
              </div>
            </div>
          </div>

          {/* Contribution */}
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${contribution?.toFixed(2)}
            </div>
            {isD2DRide && (
              <div className="text-xs text-primary-600 dark:text-primary-400 font-semibold uppercase">
                {t("rideSearch.d2d", "Door-to-Door")}
              </div>
            )}
          </div>
        </div>

        
      {/* {isRideToPublish}

        {/* Driver Info and Amenities */}
        <div className="flex items-center justify-between">
          {/* Amenities Icons */}
          <div className="flex items-center space-x-4 mb-4">
            <div
              className="text-gray-400 relative"
              title={
                preferences?.smoking
                  ? t("driver.allowSmoking")
                  : t("driver.noSmoking")
              }
            >
              {preferences?.smoking ? (
                <Cigarette className="size-6 text-green-500" />
              ) : (
                <div className="relative">
                  <Cigarette className="size-6 text-red-500" />
                  <X className="size-4 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                </div>
              )}
            </div>

            <div
              className="text-gray-400 relative"
              title={
                preferences?.pets ? t("driver.allowPets") : t("driver.noPets")
              }
            >
              {preferences?.pets ? (
                <DogIcon className="size-6 text-green-500" />
              ) : (
                <div className="relative">
                  <DogIcon className="size-6 text-red-500" />
                  <X className="size-4 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                </div>
              )}
            </div>

            <div
              className="text-gray-400 relative"
              title={
                preferences?.airConditioning
                  ? t("driver.airConditioning")
                  : t("driver.noAirConditioning")
              }
            >
              {preferences?.airConditioning ? (
                <AirVentIcon className="size-6 text-green-500" />
              ) : (
                <div className="relative">
                  <AirVentIcon className="size-6 text-red-500" />
                  <X className="size-4 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                </div>
              )}
            </div>

            {preferences?.ladiesOnly && (
              <div
                className="text-gray-400 relative"
                title={t("driver.ladiesOnly")}
              >
                <FaFemale size="24" className="text-green-500" />
              </div>
            )}

            {preferences?.snowTires && (
              <div
                className="text-gray-400 relative"
                title={t("driver.snowTires")}
              >
                <FaSnowflake size={24} className="text-green-500" />
              </div>
            )}
          </div>

          {/* Rating and Actions */}
          <div className="flex items-center space-x-4">
            <div className="items-center space-x-1 hidden xl:flex">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                4.8
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                (12)
              </span>
            </div>

            <div className="items-center space-x-1 hidden xl:flex">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {driverRide
                  ? `${totalSeats - bookedSeats}/${totalSeats}`
                  : bookingInfo
                  ? `${bookingInfo.seatsBooked} ${
                      bookingInfo.seatsBooked === 1
                        ? t("booking.DriverDashboard.seat", "seat")
                        : t("booking.DriverDashboard.seats", "seats")
                    }`
                  : `${totalSeats - bookedSeats}/${totalSeats}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {driverRide && (status === "DRAFT" || status === "PUBLISHED") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/ride/post?rideId=${id}`);
                  }}
                  className="flex items-center space-x-1"
                >
                  <Edit className="h-4 w-4" />
                  <span>{t("general.edit", "Edit")}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(
                    driverRide
                      ? `/rides?rideId=${id}`
                      : `/ride?type=booked&rideId=${id}`
                  );
                }}
                className="flex items-center space-x-1"
              >
                <Info className="h-4 w-4" />
                <span>{t("PassengerHome.viewDetails")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stopovers */}
        {stopovers.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4 mr-1" />
              {t("passenger.stops")}:{" "}
              {stopovers.map((stop) => stop.city).join(", ")}
            </div>
          </div>
        )}

        {/* Booking Info for Booked Rides - Enhanced Section */}
        {!driverRide && bookingInfo && (
          <div className="mt-4 pt-4 border-t-2 border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              {t("booking.yourBooking", "Your Booking Details")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("booking.seatsBooked", "Seats Booked")}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {bookingInfo.seatsBooked}{" "}
                  {bookingInfo.seatsBooked === 1
                    ? t("booking.DriverDashboard.seat", "seat")
                    : t("booking.DriverDashboard.seats", "seats")}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("booking.status", "Booking Status")}
                </p>
                <div className="flex items-center">
                  {getBookingStatusBadge(bookingInfo.bookingStatus)}
                </div>
              </div>
              {bookingInfo.paymentAmount && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("booking.paymentAmount", "Amount Paid")}
                  </p>
                  <p className="text-base font-semibold text-green-600 dark:text-green-400">
                    ${Number(bookingInfo.paymentAmount).toFixed(2)} CAD
                  </p>
                </div>
              )}
              {bookingInfo.paymentStatus && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("booking.paymentStatus", "Payment Status")}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      bookingInfo.paymentStatus === "COMPLETED"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-600"
                        : bookingInfo.paymentStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-600"
                    }
                  >
                    {bookingInfo.paymentStatus === "COMPLETED"
                      ? t("booking.paymentCompleted", "Paid")
                      : bookingInfo.paymentStatus === "PENDING"
                      ? t("booking.paymentPending", "Pending")
                      : t("booking.paymentFailed", "Failed")}
                  </Badge>
                </div>
              )}
              {bookingInfo.bookingStatus === "PENDING" && (
                <div className="col-span-2 mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {t(
                      "booking.waitingApproval",
                      "Waiting for driver approval"
                    )}
                  </p>
                </div>
              )}
              {bookingInfo.bookingStatus === "APPROVED" && (
                <div className="col-span-2 mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-300 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t(
                      "booking.approvedMessage",
                      "Your booking has been approved by the driver"
                    )}
                  </p>
                </div>
              )}
              {bookingInfo.bookingStatus === "CANCELLED" &&
                bookingInfo.reason && (
                  <div className="col-span-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      <strong>
                        {t("booking.cancellationReason", "Cancellation Reason")}
                        :
                      </strong>{" "}
                      {bookingInfo.reason}
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {canBePublished && (
        <div className="relative flex items-center space-x-2 z-10 m-2 bg-orange-700/25 p-2">
          <p className="text-center w-full text-white/90">
            {t("common_.small.please")}
          </p>
        </div>
      )}

      
    </div>
  );
};

export default DriverRideCard;
