import { Card, CardContent } from "./ui/card";
import { Info, MessageCircle, Star } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import BookingModal from "./BookingModal";
import { useEffect, useState } from "react";

import tzlookup from "tz-lookup";
import { DateTime } from "luxon";

import LoaderIndicator from "@/components/LoadingIndicator";
import { formatTime } from "@/lib/utils";
import { useReactItems } from "@/lib/ReactTranslation";

const RideCard = ({
  ride,
  t,
  navigate,
  hasApprovedBooking,
  handleChat,
  hasBookedRide,
}: {
  ride: any;
  t: any;
  navigate: (path: string) => void;
  hasApprovedBooking?: any;
  handleChat?: any;
  hasBookedRide?: any;
}) => {
  const [timeZone, setTimeZone] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const { currentLanguage } = useReactItems();

  useEffect(() => {
    // const utcDateTime = DateTime.fromISO(departureTime, { zone: "utc" });
    const userTimeZone = DateTime.local().zoneName;

    if (
      ride?.departureLocation?.latitude &&
      ride?.departureLocation?.longitude
    ) {
      // Get timezone of departure location
      const departureTimeZone = tzlookup(
        ride.departureLocation.latitude,
        ride.departureLocation.longitude
      );

      setTimeZone(departureTimeZone);

      let departureInCity;
      try {
        // Handle both ISO string and timestamp (number)
        if (typeof ride.departureTime === 'string') {
          departureInCity = DateTime.fromISO(ride.departureTime, {
            zone: departureTimeZone,
          });
        } else if (typeof ride.departureTime === 'number') {
          // If it's a timestamp in seconds, convert to milliseconds
          const timestamp = ride.departureTime < 10000000000 
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
  }, [ride, currentTime, timeZone]);

  if (!timeZone) return <LoaderIndicator />;

  const userLocale = currentLanguage === "fr" ? "fr-FR" : "en-US";
  const isDoorToDoorRide = ride?.isDoorToDoor === true;
  const doorToDoorConfig =
    ride.doorToDoor ?? ride.door_to_door ?? ride.d2d ?? null;
  const doorToDoorAvailable =
    doorToDoorConfig?.isEnabled &&
    (doorToDoorConfig?.remainingCapacity ?? 0) > 0;

  return (
    <Card
      key={ride.id}
      className="border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-900"
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <img
              src={ride.driver.profileImage?.url || "/default-avatar.png"}
              alt={ride.driver.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
            />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {ride.driver.name}
              </h3>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  4.8 (12 reviews)
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${ride.contribution}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              per seat
            </div>
            {doorToDoorAvailable && (
              <div className="mt-2 inline-flex items-center px-3 py-1 text-xs font-semibold uppercase border border-primary-600 text-primary-700 dark:text-primary-300 dark:border-primary-500 rounded-none">
                Door-to-Door · {doorToDoorConfig.radiusKm ?? 0} km
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
              {t("PassengerHome.from")}
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
              {ride.departureLocation.locationName ||
                ride.departureLocation.city}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
              {t("PassengerHome.to")}
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
              {ride.destinationLocation.locationName ||
                ride.destinationLocation.city}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium flex items-center justify-between">
              <span>{t("PassengerHome.date")}</span>
              {isDoorToDoorRide && (
                <span className="text-xs font-semibold uppercase text-primary-600 dark:text-primary-400">
                  {t("rideSearch.d2d", "D2D")}
                </span>
              )}
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {formatTime({
                dateString: ride.departureTime,
                timeZone: timeZone,

                formatTime: userLocale,
              })}{" "}
              •{" "}
              {(() => {
                try {
                  const date = typeof ride.departureTime === 'string' 
                    ? new Date(ride.departureTime) 
                    : new Date(ride.departureTime * 1000);
                  if (isNaN(date.getTime())) return 'Invalid date';
                  return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                  });
                } catch (e) {
                  return 'Invalid date';
                }
              })()}
            </div>
          </div>
        </div>

        {/* Stopovers */}
        {ride.stopovers.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
              {t("PassengerHome.via")} ({ride.stopovers.length})
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {ride.stopovers.map((stop, i) => (
                <span key={stop.id}>
                  {stop.city}
                  {i < ride.stopovers.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="bg-primary-50 dark:bg-primary-900 text-primary text-xs py-1 px-2 rounded-full">
            {ride.availableSeats} {t("PassengerHome.seats").toLowerCase()}
          </span>
          {ride.preferences.pets && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
              {t("PassengerHome.petsAllowed")}
            </span>
          )}
          {!ride.preferences.smoking && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
              {t("PassengerHome.noSmoking")}
            </span>
          )}
          {ride.preferences.airConditioning && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
              {t("DriverDashboard.airConditioning")}
            </span>
          )}
          {ride.preferences.luggageCount > 0 && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
              {t("DriverDashboard.luggage")}: {ride.preferences.luggageCount}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div className="flex space-x-2 items-center mb-2 sm:mb-0">
            <button
              className="text-primary font-medium flex items-center"
              onClick={() => navigate(`/ride?rideId=${ride.id}`)}
            >
              <Info size={16} className="mr-1" />
              {t("PassengerHome.viewDetails")}
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            {ride.availableSeats === 0 ? (
              <Badge variant="destructive">No Seats Available</Badge>
            ) : hasApprovedBooking(ride.id) ? (
              // Show both Chat and Book Again for approved bookings
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleChat(ride.id)}
                  className="dark:bg-gray-700"
                >
                  <MessageCircle size={14} className="mr-1" />
                  Chat
                </Button>
                <BookingModal ride={ride} booked={true} />
              </div>
            ) : hasBookedRide(ride.id) ? (
              // Show Book Again for already booked rides (not approved yet)
              <BookingModal ride={ride} booked={true} />
            ) : (
              // Show normal Book button for new rides
              <BookingModal ride={ride} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RideCard;
