import { apiUrl, queryKey, usePassengerBookedRide } from "@/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  User,
  CreditCard,
  Calendar,
  Users,
  Star,
  CheckCircle,
  DollarSign,
  Snowflake,
  Package,
  Luggage,
  Wind,
  Heart,
  XCircle,
} from "lucide-react";
import RideMap from "./Map";
import { useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import StripePaymentForm from "./StripePaymentForm";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { getToken } from "./getToken";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import PassengerReviews from "./PassengerReviews";
import { ComplaintDialog } from "./Complaint";
import PassengerDoorToDoorRequest from "@/components/DoorToDoor/PassengerDoorToDoorRequest";

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
  const [payment_data, setPayment_data] = useState<any>(null);

  const [searchParams] = useSearchParams();
  const rideIdParam = searchParams.get("rideId");
  const rideId = rideIdParam ? parseInt(rideIdParam, 10) : null;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: singleRide, isPending } = usePassengerBookedRide({
    rideId: rideId,
    enabled: !!rideId,
  });

  const rideData = singleRide;
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const { mutate: bookRide, isPending: isBooking } = useMutation({
    mutationFn: async (bookingData: { rideId: number; seats: number }) => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/rides/${rideId}/book?lang=${currentLanguage}`,
        {
          rideId: bookingData.rideId,
          seats: bookingData.seats,
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
      setPayment_data(data.data);
      toast.success(data.message);
    },
    onError: (err) => {
      toast.error((err as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  const { mutate: submitRating, isPending: isSubmittingRating } = useMutation({
    mutationFn: async ({
      driverId,
      rating,
      review,
      rideId,
    }: {
      driverId: number;
      rating: number;
      review: string;
      rideId: number;
    }) => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/ratings`,
        {
          driverId,
          rating,
          review,
          rideId,
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
      toast.success(t("RideDetail.ratingSubmitted"));
      if (rideData.driver.id) {
        queryClient.invalidateQueries({
          queryKey: [queryKey.PASSENGER_REVIEWS, rideData.driver.id],
        });
      }
    },
    onError: (error: any) => {
      console.error("Failed to submit rating:", error);
      toast.error(
        error?.response?.data?.message || t("RideDetail.ratingError"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  if (isPending) {
    return (
      <div
        className="h-[90vh] w-full flex items-center justify-center text-gray-700 dark:text-gray-300"
        key="ride-loading-state"
      >
        {t("RideDetail.loading")}
      </div>
    );
  }

  if (!singleRide?.departureLocation || !singleRide?.destinationLocation) {
    return (
      <div
        className="h-[90vh] w-full flex items-center justify-center text-gray-700 dark:text-gray-300"
        key="ride-error-state"
      >
        <div className="flex flex-col items-center gap-4">
          <p>{t("RideDetail.Ride.loadError")}</p>
          <Button
            className="ml-3"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: [queryKey.SINGLE_PASSENGER_RIDE],
              })
            }
            variant="outline"
          >
            {t("RideDetail.common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const handleBookRide = () => {
    if (!rideId) return;
    bookRide({ rideId, seats: seatsToBook });
  };

  const handleSubmitRating = () => {
    if (rating === 0) return;

    submitRating({
      driverId: rideData.driver.id,
      rating,
      review: comment,
      rideId: rideData.id,
    });
  };

  const renderPreference = (
    enabled: boolean,
    icon: React.ReactNode,
    label: string,
    color: string
  ) => {
    return (
      <div
        className={`flex items-center gap-2 p-3 rounded-lg border ${
          enabled
            ? `${color} bg-opacity-10 border-opacity-20`
            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        }`}
      >
        <div
          className={`p-1.5 rounded-full ${
            enabled ? `${color} bg-opacity-20` : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-sm font-medium ${
            enabled
              ? "text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {label}
        </span>
        {enabled ? (
          <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
        ) : (
          <XCircle className="h-4 w-4 text-gray-400 ml-auto" />
        )}
      </div>
    );
  };

  return (
    <div className="w-full  dark:bg-gray-900">
      <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
        {rideData.bookingType !== "MANUAL" && (
          <p className="text-sm text-muted-foreground text-center mt-20">
            {t("RideDetail.manualApprovalNote")}
          </p>
        )}
        {stripePromise && (
          <div className="hidden">
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                payment_data={payment_data}
                setPayment_data={setPayment_data}
                keyToValidate={queryKey.SINGLE_PASSENGER_RIDE}
              />
            </Elements>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Main Ride Information */}
          <div className="flex-1 space-y-6">
            <Card className="dark:bg-gray-900">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold">
                      {rideData.departureLocation.city} →{" "}
                      {rideData.destinationLocation.city}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="capitalize">
                        Booked
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {t("RideDetail.seatsAvailable", {
                          count: rideData.availableSeats,
                        })}
                      </span>
                      <Badge>
                        {t(
                          `RideDetails.status.${rideData.status.toLowerCase()}`
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Trip Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t("RideDetail.departure")}
                    </h3>
                    <p>
                      {new Date(rideData.departureTime).toLocaleDateString(
                        i18n.language,
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(rideData.departureTime).toLocaleTimeString(
                        i18n.language,
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t("RideDetail.duration")}
                    </h3>
                    <p>
                      {t("RideDetail.minutes", {
                        minutes: Math.round(
                          (new Date(rideData.estimatedArrivalTime).getTime() -
                            new Date(rideData.departureTime).getTime()) /
                            (1000 * 60)
                        ),
                      })}
                    </p>
                  </div>
                </div>

                {/* Route Details */}
                <div className="space-y-4">
                  <div className="relative pt-4">
                    <div className="absolute left-0 top-0 h-full flex flex-col items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      <div className="border-l-2 border-dashed h-full border-gray-300 dark:border-gray-600"></div>
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    </div>
                    <div className="ml-5 space-y-6">
                      <div>
                        <p className="font-medium">
                          {rideData.departureLocation.city}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rideData.departureLocation.address}
                        </p>
                      </div>

                      {rideData.stopovers.length > 0 && (
                        <div className="ml-4 space-y-4">
                          {rideData.stopovers.map((stop, i) => (
                            <div
                              key={`stopover-${i}`}
                              className="flex items-start"
                            >
                              <span className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 mr-2"></span>
                              <div>
                                <p className="font-medium">{stop.city}</p>
                                <p className="text-sm text-muted-foreground">
                                  {stop.address}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <p className="font-medium">
                          {rideData.destinationLocation.city}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {rideData.destinationLocation.address}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle & Driver */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-3">
                    {t("RideDetail.vehicleDriver")}
                  </h3>
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        rideData.vehicle.defaultImage?.url ||
                        rideData.vehicle.files?.[0]?.url ||
                        "/placeholder.png"
                      }
                      alt={`${rideData.vehicle.make} ${rideData.vehicle.model}`}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <p className="font-semibold">
                        {rideData.vehicle.make} {rideData.vehicle.model} (
                        {rideData.vehicle.year})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("RideDetail.vehicleDetails", {
                          color: rideData.vehicle.color,
                          plate: rideData.vehicle.plateNumber,
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <img
                          src={rideData.driver.profileImage.url}
                          alt={rideData.driver.name}
                          className="h-6 w-6 rounded-full"
                        />
                        <span className="text-sm">{rideData.driver.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Preferences */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t("RideDetail.preference_s")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {renderPreference(
                      rideData.preferences.pets,
                      <Heart className="h-4 w-4" />,
                      t("RideDetail.preferences.petsAllowed"),
                      "text-green-600"
                    )}
                    {renderPreference(
                      rideData.preferences.smoking,
                      <Wind className="h-4 w-4" />,
                      t("RideDetail.preferences.smokingAllowed"),
                      "text-orange-600"
                    )}
                    {renderPreference(
                      rideData.preferences.airConditioning,
                      <Snowflake className="h-4 w-4" />,
                      t("RideDetail.preferences.airConditioned"),
                      "text-blue-600"
                    )}
                    {renderPreference(
                      rideData.preferences.luggageCount > 0,
                      <Luggage className="h-4 w-4" />,
                      rideData.preferences.luggageCount > 0
                        ? t("RideDetail.preferences.luggageWithCount", {
                            count: rideData.preferences.luggageCount,
                            size: rideData.preferences.luggageSize.toLowerCase(),
                          })
                        : t("RideDetail.preferences.noLuggage"),
                      "text-purple-600"
                    )}
                    {renderPreference(
                      rideData.preferences.bicycleSupport,
                      <Package className="h-4 w-4" />,
                      t("RideDetail.preferences.bicycleSupport"),
                      "text-indigo-600"
                    )}
                    {renderPreference(
                      rideData.preferences.snowTires,
                      <Snowflake className="h-4 w-4" />,
                      t("RideDetail.preferences.snowTires"),
                      "text-cyan-600"
                    )}
                    {renderPreference(
                      rideData.preferences.smoking,
                      <Wind className="h-4 w-4" />,
                      t("RideDetail.preferences.smokingAllowed"),
                      "text-orange-600"
                    )}
                    {renderPreference(
                      rideData.preferences.airConditioning,
                      <Snowflake className="h-4 w-4" />,
                      t("RideDetail.preferences.airConditioned"),
                      "text-blue-600"
                    )}
                    {renderPreference(
                      rideData.preferences.luggageCount > 0,
                      <Luggage className="h-4 w-4" />,
                      rideData.preferences.luggageCount > 0
                        ? t("RideDetail.preferences.luggageWithCount", {
                            count: rideData.preferences.luggageCount,
                            size: rideData.preferences.luggageSize.toLowerCase(),
                          })
                        : t("RideDetail.preferences.noLuggage"),
                      "text-purple-600"
                    )}
                    {renderPreference(
                      rideData.preferences.bicycleSupport,
                      <Package className="h-4 w-4" />,
                      t("RideDetail.preferences.bicycleSupport"),
                      "text-indigo-600"
                    )}
                    {renderPreference(
                      rideData.preferences.snowTires,
                      <Snowflake className="h-4 w-4" />,
                      t("RideDetail.preferences.snowTires"),
                      "text-cyan-600"
                    )}
                  </div>
                </div>

                {/* Additional Ride Details */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Additional Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">Total Seats</span>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {rideData.totalSeats}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Booking Type
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">
                        {rideData.bookingType?.toLowerCase()}
                      </p>
                    </div>
                    {rideData.estimatedArrivalTime && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Estimated Arrival
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(
                            rideData.estimatedArrivalTime
                          ).toLocaleTimeString(i18n.language, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                    {rideData.monitizationType && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Monetization
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white capitalize">
                          {rideData.monitizationType.toLowerCase()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <PassengerDoorToDoorRequest
              ride={rideData}
              bookingId={rideData?.booking?.id}
            />

            {/* Map Section */}
            <Card className="dark:bg-gray-900">
              <CardHeader>
                <h2 className="text-lg font-semibold">
                  {t("RideDetails.routeMap")}
                </h2>
              </CardHeader>
              <CardContent>
                <RideMap
                  mode="view"
                  startPoint={rideData.departureLocation}
                  endPoint={rideData.destinationLocation}
                  stops={rideData.stopovers}
                  height="400px"
                  hideButton={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Booking Panel */}
          <div className="md:w-80 space-y-6">
            {/* Ride Rules */}
            <Card className="dark:bg-gray-900">
              <CardHeader>
                <h2 className="text-lg font-semibold">
                  {t("RideDetail.rulesToFollow")}
                </h2>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="space-y-2 text-sm list-disc pl-5">
                  {[
                    "rules.punctual",
                    "rules.respect",
                    "rules.smoking",
                    "rules.luggage",
                    "rules.courteous",
                  ].map((ruleKey) => (
                    <li key={ruleKey}>{t(`RideDetail.${ruleKey}`)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {rideData.status !== "COMPLETED" ? (
              <>
                {/* Payment */}
                <Card className="sticky top-16 dark:bg-gray-900">
                  <CardHeader>
                    <h2 className="text-lg font-semibold">
                      {t("RideDetail.bookRide")}
                    </h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        {t("RideDetail.numberOfSeats")}
                      </label>
                      <div className="flex items-center gap-2">
                        <Button
                          // variant="outline"
                          size="icon"
                          onClick={() =>
                            setSeatsToBook(Math.max(1, seatsToBook - 1))
                          }
                          disabled={seatsToBook <= 1}
                          aria-label={t("RideDetail.decreaseSeats")}
                        >
                          -
                        </Button>
                        <span className="flex-1 text-center">
                          {seatsToBook}
                        </span>
                        <Button
                          // variant="outline"
                          size="icon"
                          onClick={() =>
                            setSeatsToBook(
                              Math.min(rideData.availableSeats, seatsToBook + 1)
                            )
                          }
                          disabled={seatsToBook >= rideData.availableSeats}
                          aria-label={t("RideDetail.increaseSeats")}
                        >
                          +
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("RideDetail.seatsAvailable", {
                          count: rideData.availableSeats,
                        })}
                      </p>
                    </div>

                    <Separator className="bg-gray-200 dark:bg-gray-700" />

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>{t("RideDetail.pricePerSeat")}:</span>
                        <span>${rideData.contribution?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("RideDetail.seats")}:</span>
                        <span>{seatsToBook}</span>
                      </div>
                      <Separator className="bg-gray-200 dark:bg-gray-700" />
                      <div className="flex justify-between font-semibold">
                        <span>{t("RideDetail.total")}:</span>
                        <span>
                          ${(rideData.contribution * seatsToBook).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleBookRide}
                      disabled={isBooking || rideData.availableSeats <= 0}
                    >
                      {isBooking ? (
                        <>{t("RideDetail.processing")}</>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          {t("RideDetail.bookNow")}
                        </>
                      )}
                    </Button>

                    {rideData.bookingType === "MANUAL" && (
                      <p className="text-sm text-muted-foreground text-center">
                        {t("RideDetail.manualApprovalNote")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Rating */}
                <Card className="sticky top-16 dark:bg-gray-900">
                  <CardHeader>
                    <h2 className="text-lg font-semibold">
                      {t("RideDetail.rateYourDriver")}
                    </h2>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Star Rating */}
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="text-2xl focus:outline-none"
                            aria-label={`Rate ${star} star${
                              star !== 1 ? "s" : ""
                            }`}
                          >
                            {star <= rating ? (
                              <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                            ) : (
                              <Star className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("RideDetail.selectRating")}
                      </p>
                    </div>

                    {/* Comment Field */}
                    <div className="space-y-2">
                      <label
                        htmlFor="comment"
                        className="block text-sm font-medium"
                      >
                        {t("RideDetail.additionalComments")} (
                        {t("RideDetail.optional")})
                      </label>
                      <textarea
                        id="comment"
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                        placeholder={t("RideDetail.commentPlaceholder")}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleSubmitRating()}
                      disabled={isSubmittingRating || rating === 0}
                    >
                      {isSubmittingRating ? (
                        <>{t("RideDetail.submitting")}</>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t("RideDetail.submitRating")}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <ComplaintDialog driverId={rideData.driver.id} rideId={rideData.id} />
        </div>
        <PassengerReviews driverId={rideData.driver.id} />
      </div>
    </div>
  );
};

export default PassengerRideDetails;
