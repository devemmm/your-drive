import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";

import { useAllRidesInfinite, useAllBookingInfinite } from "@/data";
import { Clock, Eye, Loader2, MapPin, Star, MessageCircle } from "lucide-react";
import BookingModal from "./BookingModal";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import RideChat from "./Chat/RideChat";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { useSocket } from "@/providers/SocketProvider";
import { toast } from "sonner";

interface PendingProps {
  appliedPassengerFilters: any;
  t: any;
}

const now = new Date();

export const PendingBookedRides = ({
  appliedPassengerFilters,
  t,
}: PendingProps) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAllRidesInfinite(12, appliedPassengerFilters);

  const rides = data?.pages.flatMap((page) => page?.data ?? []) ?? [];

  const pendingRides = rides.filter((ride) => ride.status === "PUBLISHED");

  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [chatRideId, setChatRideId] = useState<number | null>(null);
  const { user } = useAuth();
  const socket = useSocket();

  // Get user's approved bookings to check if they can chat
  const { data: userBookings } = useAllBookingInfinite(50, {
    status: "APPROVED",
  });
  const approvedBookings =
    userBookings?.pages.flatMap((page) => page?.data ?? []) ?? [];

  // Create a set of ride IDs where user has approved bookings
  // Handle both possible field names: rideId and ride.id
  const userApprovedRideIds = new Set(
    approvedBookings
      .map((booking) => {
        const rideId = booking.rideId || booking.ride?.id;
        return rideId;
      })
      .filter(Boolean)
  ); // Filter out undefined values

  // Check if user can chat for a specific ride
  const canUserChat = (rideId: number) => {
    return userApprovedRideIds.has(rideId);
  };

  // Notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3"); // To do I need to add the sound file to the public folder
      audio.volume = 0.5;
      audio.play().catch((err) => console.log("Audio play failed:", err));
    } catch (error) {
      console.log("Audio not available:", error);
    }
  };

  // Listen for new message notifications when not in chat
  useEffect(() => {
    if (!socket.socket || showChat) return;

    const handleNewMessageNotification = (data: {
      success: boolean;
      data: any;
    }) => {
      if (data.success && data.data.threadId) {
        // Check if this notification is for a ride the user is part of
        const isUserInRide = userApprovedRideIds.has(data.data.rideId);
        if (isUserInRide) {
          playNotificationSound();
          toast.info(`New message in ride chat!`);
        }
      }
    };

    socket.onNewMessageNotification(handleNewMessageNotification);

    return () => {
      if (socket.socket) {
        socket.socket.off(
          "new_message_notification",
          handleNewMessageNotification
        );
      }
    };
  }, [socket, showChat, userApprovedRideIds]);

  const handleContactDriver = (rideId: number) => {
    if (!canUserChat(rideId)) {
      toast.error(
        "You need to have an approved booking to chat with the driver",
        { className: "custom-error-toast" }
      );
      return;
    }
    setChatRideId(rideId);
    setShowChat(true);
  };

  return (
    <div>
      <h2 className="text-md text-gray-600 dark:text-gray-300 font-semibold">
        {t("PassengerHome.pendingRidesTitle")}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t("PassengerHome.pendingRidesDescription")}
      </p>
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
        </div>
      ) : (
        <>
          {pendingRides.length === 0 ? (
            <Card className="text-center py-14 dark:bg-gray-900">
              <CardContent>
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("PassengerHome.noRides")}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("PassengerHome.adjustParams")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRides.map((ride) => (
                <Card
                  key={ride.id}
                  className="overflow-hidden dark:bg-gray-900"
                >
                  <div className="p-4">
                    {/* Top: Driver & Price */}
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex items-start space-x-4 mb-4 md:mb-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <img
                            src={ride.driver.profileImage.url}
                            alt={ride.driver.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {ride.driver.name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Star
                              size={16}
                              className="text-yellow-500 mr-1"
                              fill="#facc15"
                            />
                            <span>4.8</span>{" "}
                            {/* Default rating since not in data */}
                            <span className="mx-2">•</span>
                            <span>
                              {ride.driver.trips || 0}{" "}
                              {t("PassengerHome.trips")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-md text-gray-600 dark:text-gray-300 font-semibold">
                          ${ride.contribution?.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {ride.availableSeats}/{ride.totalSeats}{" "}
                          {t("PassengerHome.seatsAvailable")}
                        </div>
                        <div className="text-xs mt-1">
                          {ride.bookingType === "AUTOMATIC"
                            ? "Auto booking"
                            : "Manual approval"}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Ride Info */}
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {t("PassengerHome.from")}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {ride.departureLocation.city}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {t("PassengerHome.to")}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {ride.destinationLocation.city}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {t("PassengerHome.date")}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(ride.departureTime).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              }
                            )}{" "}
                            •{" "}
                            {new Date(ride.departureTime).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
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

                      {/* Duration */}
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock size={14} className="inline mr-1" />
                        {Math.round(
                          (new Date(
                            ride.estimatedArrivalTime as any
                          ).getTime() -
                            new Date(ride.departureTime as any).getTime()) /
                            (1000 * 60)
                        )}{" "}
                        minutes
                      </div>

                      {/* Preferences */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="bg-primary-50 dark:bg-primary-900 text-primary dark:text-primary-200 text-xs py-1 px-2 rounded-full">
                          {ride.availableSeats}{" "}
                          {t("PassengerHome.seats").toLowerCase()}
                        </span>
                        {ride.preferences.pets && (
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
                            {t("PassengerHome.petsAllowed")}
                          </span>
                        )}
                        {ride.preferences.airConditioning && (
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
                            {t("DriverDashboard.airConditioning")}
                          </span>
                        )}
                        {ride.preferences.luggageCount > 0 && (
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
                            {t("DriverDashboard.luggage")}:{" "}
                            {ride.preferences.luggageCount}
                          </span>
                        )}
                        {/* Payment Method */}
                        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs py-1 px-2 rounded-full">
                          {ride.contributionCollectionMethod === "VIA_PLATFORM"
                            ? t(
                                "PassengerRides.paymentViaPlatform",
                                "Via Platform"
                              )
                            : ride.contributionCollectionMethod === "DIRECT"
                            ? t(
                                "PassengerRides.paymentDirect",
                                "Direct Payment"
                              )
                            : ride.contributionCollectionMethod}
                        </span>
                      </div>

                      {/* Bottom: Action Buttons */}
                      <div className="mt-6 flex flex-col sm:flex-row sm:justify-between gap-3">
                        <div className="flex gap-2">
                          {/* Only show chat button if user has approved booking */}
                          {canUserChat(ride.id) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleContactDriver(ride.id)}
                              className="dark:bg-gray-700"
                            >
                              <MessageCircle size={14} className="mr-1" />
                              {t("PassengerHome.contact")}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="dark:bg-gray-700 opacity-50 cursor-not-allowed"
                              title="You need an approved booking to chat"
                            >
                              <MessageCircle size={14} className="mr-1" />
                              {t("PassengerHome.contact")}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(`/ride/booked?rideId=${ride.id}`)
                            }
                            className="dark:bg-gray-700"
                          >
                            <Eye size={14} className="mr-1" />
                            {t("PassengerHome.viewDetails")}
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          {ride.availableSeats === 0 ? (
                            <Badge
                              variant="destructive"
                              className="w-full sm:w-auto"
                            >
                              {t("PassengerHome.noSeatsAvailable")}
                            </Badge>
                          ) : canUserChat(ride.id) ? (
                            // Show both Chat and Book Again for approved bookings
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleContactDriver(ride.id)}
                                className="dark:bg-gray-700"
                              >
                                <MessageCircle size={14} className="mr-1" />
                                Chat
                              </Button>
                              <BookingModal ride={ride} booked={true} />
                            </>
                          ) : (
                            // Show Book Again for already booked rides (not approved yet)
                            <BookingModal ride={ride} booked={true} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className={`mt-6 px-4 py-2 rounded-md text-white font-medium transition-colors ${
            isFetchingNextPage
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
          }`}
        >
          {isFetchingNextPage ? "Loading more..." : "Load More"}
        </button>
      )}

      {/* Chat Modal */}
      {showChat && chatRideId && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white">Chat</h3>
              <button
                onClick={() => {
                  setShowChat(false);
                  setChatRideId(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <RideChat rideId={chatRideId} isDriver={false} isPassenger={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export const CompletedBookedRides = ({
  appliedPassengerFilters,
  t,
}: PendingProps) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAllRidesInfinite(12, appliedPassengerFilters);

  // const rides = data?.pages.map((page) => page.data) || [];
  const rides = data?.pages.flatMap((page) => page?.data ?? []) ?? [];

  const completedRides = rides.filter((ride) => ride.status === "COMPLETED");

  const navigate = useNavigate();

  return (
    <div>
      <h2 className="text-md text-gray-600 dark:text-gray-300 font-semibold">
        {t("PassengerHome.complete")}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t("PassengerHome.completeDesc")}
      </p>
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
        </div>
      ) : (
        <>
          {completedRides.length === 0 ? (
            <Card className="text-center py-14 dark:bg-gray-900">
              <CardContent>
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("PassengerHome.noRides")}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {t("PassengerHome.adjustParams")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedRides.map((ride) => (
                <Card
                  key={ride.id}
                  className="overflow-hidden dark:bg-gray-900"
                >
                  <div className="p-4">
                    {/* Top: Driver & Price */}
                    <div className="flex flex-col md:flex-row justify-between">
                      <div className="flex items-start space-x-4 mb-4 md:mb-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <img
                            src={ride.driver.profileImage.url}
                            alt={ride.driver.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {ride.driver.name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Star
                              size={16}
                              className="text-yellow-500 mr-1"
                              fill="#facc15"
                            />
                            <span>4.8</span>{" "}
                            {/* Default rating since not in data */}
                            <span className="mx-2">•</span>
                            <span>
                              {ride.driver.trips || 0}{" "}
                              {t("PassengerHome.trips")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-md text-gray-600 dark:text-gray-300 font-semibold">
                          ${ride.contribution?.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {ride.availableSeats}/{ride.totalSeats}{" "}
                          {t("PassengerHome.seatsAvailable")}
                        </div>
                        <div className="text-xs mt-1">
                          {ride.bookingType === "AUTOMATIC"
                            ? "Auto booking"
                            : "Manual approval"}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Ride Info */}
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {t("PassengerHome.from")}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {ride.departureLocation.city}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {t("PassengerHome.to")}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {ride.destinationLocation.city}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {t("PassengerHome.date")}
                          </div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(ride.departureTime).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              }
                            )}{" "}
                            •{" "}
                            {new Date(ride.departureTime).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
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

                      {/* Duration */}
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock size={14} className="inline mr-1" />
                        {Math.round(
                          (new Date(
                            ride.estimatedArrivalTime as any
                          ).getTime() -
                            new Date(ride.departureTime as any).getTime()) /
                            (1000 * 60)
                        )}{" "}
                        minutes
                      </div>

                      {/* Preferences */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="bg-primary-50 dark:bg-primary-900 text-primary dark:text-primary-200 text-xs py-1 px-2 rounded-full">
                          {ride.availableSeats}{" "}
                          {t("PassengerHome.seats").toLowerCase()}
                        </span>
                        {ride.preferences.pets && (
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
                            {t("PassengerHome.petsAllowed")}
                          </span>
                        )}
                        {ride.preferences.airConditioning && (
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
                            {t("DriverDashboard.airConditioning")}
                          </span>
                        )}
                        {ride.preferences.luggageCount > 0 && (
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs py-1 px-2 rounded-full">
                            {t("DriverDashboard.luggage")}:{" "}
                            {ride.preferences.luggageCount}
                          </span>
                        )}
                      </div>

                      {/* Bottom: Action Buttons */}
                      <div className="flex justify-end gap-2">
                        <Badge>Completed</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(`/ride/booked?rideId=${ride.id}`)
                          }
                          className="dark:bg-gray-700"
                        >
                          <Eye size={14} className="mr-1" />
                          {t("PassengerHome.viewDetails")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className={`mt-6 px-4 py-2 rounded-md text-white font-medium transition-colors ${
            isFetchingNextPage
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
          }`}
        >
          {isFetchingNextPage ? "Loading more..." : "Load More"}
        </button>
      )}
    </div>
  );
};
