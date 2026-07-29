import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
// import { useToast } from "@/components/ui/use-toast";
import React, { useState, useMemo } from "react";

import { apiUrl, queryKey } from "@/data";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CreditCard, Minus, Plus, MapPin, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getToken } from "./getToken";
import StripePaymentForm from "./StripePaymentForm";
import { Separator } from "./ui/separator";
import GooglePlacesInput from "./GoogleInput";
import { useJsApiLoader } from "@react-google-maps/api";
import { LIBRARIES } from "./Map";
import { useCreateDoorToDoorPassengerRequest } from "@/hooks/useDoorToDoor";
import { DoorToDoorPlace } from "@/lib/types";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";

interface BookingModalProps {
  // onClick: () => void;
  ride: any;
  booked?: boolean;
}

// Safely load Stripe with error handling
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

const BookingModal: React.FC<BookingModalProps> = ({
  ride,
  booked = false,
}) => {
  // const { toast } = useToast();
  const { t } = useTranslation();
  const [seats, setSeats] = useState(1);
  // const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // const [clientSecret, setClientSecret] = useState<string | null>(null);
  // const [amount, setAmount] = useState<number>(0);
  const [payment_data, setPayment_data] = useState<any>(null);

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const token = getToken();

  // Check if this is a full D2D ride (D2D-only, not just D2D-enabled regular ride)
  const isFullD2DRide = ride?.isDoorToDoor === true;

  // For regular rides with D2D option
  const doorToDoorConfig = useMemo(
    () =>
      !isFullD2DRide
        ? ride?.doorToDoor ?? ride?.door_to_door ?? ride?.d2d ?? null
        : null,
    [ride, isFullD2DRide]
  );
  const isD2DAvailable =
    !isFullD2DRide &&
    doorToDoorConfig?.isEnabled &&
    (doorToDoorConfig?.remainingCapacity ?? 0) > 0;

  // For full D2D rides, get config from ride properties
  const d2dConfig = isFullD2DRide
    ? {
        radiusKm: ride?.detourRadius ?? 5,
        basePrice: ride?.basePrice ?? 0,
        extraKmPrice: ride?.extraKmPrice ?? 0,
        capacity: ride?.d2dCapacity ?? 1,
      }
    : doorToDoorConfig;

  const { isLoaded: googleMapsLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  // For full D2D rides, D2D is always enabled (no toggle)
  const [enableD2D, setEnableD2D] = useState(isFullD2DRide);
  const [pickupInput, setPickupInput] = useState<string>("");
  const [dropoffInput, setDropoffInput] = useState<string>("");
  const [pickupMeta, setPickupMeta] = useState<Partial<DoorToDoorPlace>>({});
  const [dropoffMeta, setDropoffMeta] = useState<Partial<DoorToDoorPlace>>({});
  const [d2dNote, setD2dNote] = useState<string>("");

  const createD2DRequest = useCreateDoorToDoorPassengerRequest();

  const buildAddress = (
    input: string,
    place?: Partial<DoorToDoorPlace>
  ): DoorToDoorPlace => ({
    address: input,
    city: place?.city ?? "",
    region: place?.region ?? "",
    postalCode: place?.postalCode ?? "",
    countryCode: place?.countryCode ?? "CA",
    formattedAddress: input,
    latitude: place?.latitude ?? 0,
    longitude: place?.longitude ?? 0,
  });

  // Booking mutation
  const { mutate: bookRide, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/rides/${ride.id}/book?lang=${currentLanguage}`,
        {
          seats,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return data;
    },
    onSuccess: async (data) => {
      setPayment_data(data.data);

      toast.success(data.message);

      // Create D2D request if enabled and addresses are provided
      if (
        enableD2D &&
        isD2DAvailable &&
        pickupInput &&
        dropoffInput &&
        pickupMeta?.latitude &&
        pickupMeta?.longitude &&
        dropoffMeta?.latitude &&
        dropoffMeta?.longitude
      ) {
        try {
          await createD2DRequest.mutateAsync({
            rideId: ride.id,
            pickupAddress: buildAddress(pickupInput, pickupMeta),
            dropoffAddress: buildAddress(dropoffInput, dropoffMeta),
            note: d2dNote.trim() ? d2dNote.trim() : undefined,
          } as any);
        } catch (error) {
          // D2D request failure shouldn't block the booking
          console.error("Failed to create D2D request:", error);
          toast.error(
            "Booking successful, but door-to-door request failed. You can add it later from your dashboard.",
            {
              className: "custom-error-toast",
            }
          );
        }
      }

      setIsOpen(false);
    },
    onError: (error: any) => {
      console.error("Booking failed:", error);
      toast.error(error.response?.data?.message || t("booking.error"), {
        className: "custom-error-toast",
      });
    },
  });

  const handleBooking = () => {
    bookRide();
  };

  return (
    <>
      {stripePromise && (
        <div className="hidden">
          <Elements stripe={stripePromise}>
            <StripePaymentForm
              payment_data={payment_data}
              setPayment_data={setPayment_data}
              keyToValidate={queryKey.RIDES}
              redirect="/dashboard?redirect_to=requests&t=booked_by_me"
            />
          </Elements>
        </div>
      )}

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            // Reset form when modal closes
            setEnableD2D(false);
            setPickupInput("");
            setDropoffInput("");
            setPickupMeta({});
            setDropoffMeta({});
            setD2dNote("");
            setSeats(1);
            setPayment_data(null);
          }
        }}
      >
        <SheetTrigger asChild>
          <Button className="px-6 py-3 font-medium dark:bg-primary-600 dark:text-white dark:hover:bg-primary-700">
            {booked ? "Book Again" : t("PassengerHome.book")}
          </Button>
        </SheetTrigger>

        <SheetContent
          style={{ zIndex: 9999 }}
          className="w-full sm:max-w-sm overflow-y-auto p-0 pt-20 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                {t("PassengerHome.bookRideTitle")}
              </h2>
            </div>

            {/* Seat Selection - Hidden for full D2D rides */}
            {!isFullD2DRide && (
              <>
                <div className="space-y-2 mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("PassengerHome.number")}
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSeats(Math.max(1, seats - 1))}
                      disabled={seats <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="flex-1 text-center font-medium">
                      {seats}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setSeats(Math.min(ride.availableSeats, seats + 1))
                      }
                      disabled={seats >= ride.availableSeats}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ride.availableSeats} {t("PassengerHome.seatsAvailable")}
                  </p>
                </div>

                <Separator className="mb-6" />
              </>
            )}

            {/* D2D Notice for full D2D rides */}
            {isFullD2DRide && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      {t(
                        "DoorToDoor.dashboard.request.title",
                        "Door-to-Door Service"
                      )}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {t(
                        "DoorToDoor.dashboard.request.within",
                        "Within {{km}} km of departure",
                        { km: d2dConfig?.radiusKm ?? 5 }
                      )}
                    </p>
                    {d2dConfig?.basePrice !== undefined &&
                      d2dConfig.basePrice > 0 && (
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mt-1">
                          Base price: ${d2dConfig.basePrice.toFixed(2)}
                          {d2dConfig.extraKmPrice !== undefined &&
                            d2dConfig.extraKmPrice > 0 &&
                            ` + $${d2dConfig.extraKmPrice.toFixed(
                              2
                            )}/km beyond ${d2dConfig.radiusKm ?? 5}km`}
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Door-to-Door Section - For regular rides with D2D option */}
            {isD2DAvailable && !isFullD2DRide && (
              <div className="mb-6 space-y-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary-600" />
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {t(
                        "DoorToDoor.dashboard.request.title",
                        "Door-to-Door Service"
                      )}
                    </label>
                  </div>
                  <Switch
                    checked={enableD2D}
                    onCheckedChange={setEnableD2D}
                    className="data-[state=checked]:bg-primary-600"
                  />
                </div>

                {enableD2D && (
                  <div className="space-y-4 pt-2">
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <p>
                        {t(
                          "DoorToDoor.dashboard.request.within",
                          "Within {{km}} km of departure",
                          { km: doorToDoorConfig.radiusKm ?? 0 }
                        )}
                      </p>
                      {doorToDoorConfig.basePrice !== undefined &&
                        doorToDoorConfig.basePrice > 0 && (
                          <p className="font-medium text-primary-600 dark:text-primary-400">
                            Base price: ${doorToDoorConfig.basePrice.toFixed(2)}
                            {doorToDoorConfig.extraKmPrice !== undefined &&
                              doorToDoorConfig.extraKmPrice > 0 &&
                              ` + $${doorToDoorConfig.extraKmPrice.toFixed(
                                2
                              )}/km beyond ${doorToDoorConfig.radiusKm ?? 0}km`}
                          </p>
                        )}
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          {t(
                            "DoorToDoor.dashboard.request.pickupAddressLabel",
                            "Pickup Address"
                          )}
                        </label>
                        <GooglePlacesInput
                          value={pickupInput}
                          onChange={(e) => setPickupInput(e.target.value)}
                          onPlaceSelected={(place) => {
                            setPickupMeta({
                              address: place.locationName,
                              formattedAddress: place.locationName,
                              city: place.city,
                              region: place.region,
                              latitude: place.latitude,
                              longitude: place.longitude,
                            });
                            setPickupInput(place.locationName);
                          }}
                          placeholder={t(
                            "DoorToDoor.dashboard.request.pickupPlaceholder",
                            "Enter pickup address"
                          )}
                          googleReady={googleMapsLoaded}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          {t(
                            "DoorToDoor.dashboard.request.dropoffAddressLabel",
                            "Dropoff Address"
                          )}
                        </label>
                        <GooglePlacesInput
                          value={dropoffInput}
                          onChange={(e) => setDropoffInput(e.target.value)}
                          onPlaceSelected={(place) => {
                            setDropoffMeta({
                              address: place.locationName,
                              formattedAddress: place.locationName,
                              city: place.city,
                              region: place.region,
                              latitude: place.latitude,
                              longitude: place.longitude,
                            });
                            setDropoffInput(place.locationName);
                          }}
                          placeholder={t(
                            "DoorToDoor.dashboard.request.dropoffPlaceholder",
                            "Enter dropoff address"
                          )}
                          googleReady={googleMapsLoaded}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Door-to-Door Section - For full D2D rides (always shown) */}
            {isFullD2DRide && (
              <div className="mb-6 space-y-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t(
                      "DoorToDoor.dashboard.request.title",
                      "Door-to-Door Service"
                    )}
                  </label>
                </div>

                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1 mb-4">
                  <p>
                    {t(
                      "DoorToDoor.dashboard.request.within",
                      "Within {{km}} km of departure",
                      { km: d2dConfig?.radiusKm ?? 5 }
                    )}
                  </p>
                  {d2dConfig?.basePrice !== undefined &&
                    d2dConfig.basePrice > 0 && (
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Base price: ${d2dConfig.basePrice.toFixed(2)}
                        {d2dConfig.extraKmPrice !== undefined &&
                          d2dConfig.extraKmPrice > 0 &&
                          ` + $${d2dConfig.extraKmPrice.toFixed(2)}/km beyond ${
                            d2dConfig.radiusKm ?? 5
                          }km`}
                      </p>
                    )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {t(
                        "DoorToDoor.dashboard.request.pickupAddressLabel",
                        "Pickup Address"
                      )}
                    </label>
                    <GooglePlacesInput
                      value={pickupInput}
                      onChange={(e) => setPickupInput(e.target.value)}
                      onPlaceSelected={(place) => {
                        setPickupMeta({
                          address: place.locationName,
                          formattedAddress: place.locationName,
                          city: place.city,
                          region: place.region,
                          latitude: place.latitude,
                          longitude: place.longitude,
                        });
                        setPickupInput(place.locationName);
                      }}
                      placeholder={t(
                        "DoorToDoor.dashboard.request.pickupPlaceholder",
                        "Enter pickup address"
                      )}
                      googleReady={googleMapsLoaded}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {t(
                        "DoorToDoor.dashboard.request.dropoffAddressLabel",
                        "Dropoff Address"
                      )}
                    </label>
                    <GooglePlacesInput
                      value={dropoffInput}
                      onChange={(e) => setDropoffInput(e.target.value)}
                      onPlaceSelected={(place) => {
                        setDropoffMeta({
                          address: place.locationName,
                          formattedAddress: place.locationName,
                          city: place.city,
                          region: place.region,
                          latitude: place.latitude,
                          longitude: place.longitude,
                        });
                        setDropoffInput(place.locationName);
                      }}
                      placeholder={t(
                        "DoorToDoor.dashboard.request.dropoffPlaceholder",
                        "Enter dropoff address"
                      )}
                      googleReady={googleMapsLoaded}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {t(
                        "DoorToDoor.dashboard.request.optionalNote",
                        "Optional Note"
                      )}
                    </label>
                    <Textarea
                      value={d2dNote}
                      onChange={(e) => setD2dNote(e.target.value.slice(0, 240))}
                      rows={2}
                      placeholder={t(
                        "DoorToDoor.dashboard.request.notePlaceholder",
                        "Add any special instructions..."
                      )}
                      className="text-sm resize-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {d2dNote.length}/240 characters
                    </p>
                  </div>

                  {(!pickupMeta?.latitude || !dropoffMeta?.latitude) && (
                    <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {t(
                          "DoorToDoor.dashboard.request.addressWarning",
                          "Please select addresses from the dropdown to ensure accurate location."
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-4 pt-2">
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p>
                  {t(
                    "DoorToDoor.dashboard.request.within",
                    "Within {{km}} km of departure",
                    { km: doorToDoorConfig.radiusKm ?? 0 }
                  )}
                </p>
                {doorToDoorConfig.basePrice !== undefined &&
                  doorToDoorConfig.basePrice > 0 && (
                    <p className="font-medium text-primary-600 dark:text-primary-400">
                      Base price: ${doorToDoorConfig.basePrice.toFixed(2)}
                      {doorToDoorConfig.extraKmPrice !== undefined &&
                        doorToDoorConfig.extraKmPrice > 0 &&
                        ` + $${doorToDoorConfig.extraKmPrice.toFixed(
                          2
                        )}/km beyond ${doorToDoorConfig.radiusKm ?? 0}km`}
                    </p>
                  )}
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {t(
                      "DoorToDoor.dashboard.request.pickupAddressLabel",
                      "Pickup Address"
                    )}
                  </label>
                  <GooglePlacesInput
                    value={pickupInput}
                    onChange={(e) => setPickupInput(e.target.value)}
                    onPlaceSelected={(place) => {
                      setPickupMeta({
                        address: place.locationName,
                        formattedAddress: place.locationName,
                        city: place.city,
                        region: place.region,
                        latitude: place.latitude,
                        longitude: place.longitude,
                      });
                      setPickupInput(place.locationName);
                    }}
                    placeholder={t(
                      "DoorToDoor.dashboard.request.pickupPlaceholder",
                      "Enter pickup address"
                    )}
                    googleReady={googleMapsLoaded}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {t(
                      "DoorToDoor.dashboard.request.dropoffAddressLabel",
                      "Dropoff Address"
                    )}
                  </label>
                  <GooglePlacesInput
                    value={dropoffInput}
                    onChange={(e) => setDropoffInput(e.target.value)}
                    onPlaceSelected={(place) => {
                      setDropoffMeta({
                        address: place.locationName,
                        formattedAddress: place.locationName,
                        city: place.city,
                        region: place.region,
                        latitude: place.latitude,
                        longitude: place.longitude,
                      });
                      setDropoffInput(place.locationName);
                    }}
                    placeholder={t(
                      "DoorToDoor.dashboard.request.dropoffPlaceholder",
                      "Enter dropoff address"
                    )}
                    googleReady={googleMapsLoaded}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {t(
                      "DoorToDoor.dashboard.request.optionalNote",
                      "Optional Note"
                    )}
                  </label>
                  <Textarea
                    value={d2dNote}
                    onChange={(e) => setD2dNote(e.target.value.slice(0, 240))}
                    rows={2}
                    placeholder={t(
                      "DoorToDoor.dashboard.request.notePlaceholder",
                      "Add any special instructions..."
                    )}
                    className="text-sm resize-none"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {d2dNote.length}/240 characters
                  </p>
                </div>

                {(!pickupMeta?.latitude || !dropoffMeta?.latitude) && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {t(
                        "DoorToDoor.dashboard.request.addressWarning",
                        "Please select addresses from the dropdown to ensure accurate location."
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span>
                {isFullD2DRide
                  ? t("PassengerHome.fullRidePrice", "Full Ride Price")
                  : t("PassengerHome.pricePerSeat")}
                :
              </span>
              <span>${ride.contribution?.toFixed(2)}</span>
            </div>
            {!isFullD2DRide && (
              <div className="flex justify-between">
                <span>{t("PassengerHome.seats")}:</span>
                <span>{seats}</span>
              </div>
            )}
            {enableD2D &&
              isD2DAvailable &&
              doorToDoorConfig.basePrice !== undefined &&
              doorToDoorConfig.basePrice > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>
                      {t(
                        "DoorToDoor.dashboard.request.d2dService",
                        "Door-to-Door Service"
                      )}
                      :
                    </span>
                    <span>
                      ${doorToDoorConfig.basePrice.toFixed(2)}
                      {pickupMeta?.latitude &&
                        dropoffMeta?.latitude &&
                        doorToDoorConfig.extraKmPrice !== undefined &&
                        doorToDoorConfig.extraKmPrice > 0 &&
                        " + extra km charges"}
                    </span>
                  </div>
                </>
              )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>{t("PassengerHome.total")}:</span>
              <span>
                $
                {(
                  (isFullD2DRide
                    ? ride.contribution
                    : ride.contribution * seats) +
                  (enableD2D &&
                  isD2DAvailable &&
                  doorToDoorConfig.basePrice !== undefined
                    ? doorToDoorConfig.basePrice
                    : 0)
                ).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Manual Approval Note */}
          {ride.bookingType === "MANUAL" && (
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t("PassengerHome.manualApproval")}
            </p>
          )}

          {/* Stripe Configuration Warning */}
          {!stripePromise && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Payment processing is currently unavailable. Please contact
                support.
              </p>
            </div>
          )}

          {/* Footer Buttons */}
          <SheetFooter className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 dark:text-white dark:border-gray-600"
                onClick={() => setIsOpen(false)}
              >
                {t("PassengerHome.cancel")}
              </Button>
              <Button
                className="flex-1 dark:bg-primary-600 dark:hover:bg-primary-700"
                onClick={handleBooking}
                disabled={
                  isPending ||
                  (!isFullD2DRide && ride.availableSeats <= 0) ||
                  !stripePromise ||
                  ((enableD2D || isFullD2DRide) &&
                    (!pickupInput ||
                      !dropoffInput ||
                      !pickupMeta?.latitude ||
                      !dropoffMeta?.latitude)) ||
                  createD2DRequest.isPending
                }
              >
                {isPending || createD2DRequest.isPending ? (
                  <>{t("PassengerHome.processing")}...</>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t("PassengerHome.bookNow")}
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BookingModal;
