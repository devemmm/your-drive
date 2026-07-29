import GooglePlacesInput from "@/components/GoogleInput";
import LoadingIndicator from "@/components/LoadingIndicator";
import { LIBRARIES } from "@/components/Map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/data";
import {
  useCancelDoorToDoorPassengerRequest,
  useCreateDoorToDoorPassengerRequest,
  useDoorToDoorPassengerRequests,
} from "@/hooks/useDoorToDoor";
import {
  DoorToDoorPlace,
  DoorToDoorRequest,
  DoorToDoorRequestStatus,
} from "@/lib/types";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import axios from "axios";
import { AlertTriangle, MapPin, RefreshCcw, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getToken } from "../getToken";

const PassengerDoorToDoorRequest = ({
  ride,
  bookingId,
}: {
  ride: any;
  bookingId?: number;
}) => {
  const searchParams = new URLSearchParams(window.location.search);
  const requestId = searchParams.get("requestId");

  const [requestData, setRequestData] = useState<any>(null);

  const getRequest = async () => {
    if (!requestId) return null;
    const request = await axios.get(`${apiUrl}/api/v1/ride-requests/${requestId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );
    setRequestData(request?.data?.data);
  }

  const { t } = useTranslation();

  const statusMeta: Record<
    DoorToDoorRequestStatus | "POSTED",
    { label: string; className: string; description: string }
  > = {
    POSTED: {
      label: t("DoorToDoor.dashboard.passenger.pending"),
      className:
        "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800",
      description: t("DoorToDoor.dashboard.request.waitingForDriver"),
    },
    ACCEPTED: {
      label: t("DoorToDoor.dashboard.passenger.accepted"),
      className:
        "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800",
      description: t("DoorToDoor.dashboard.request.driverApproved"),
    },
    DECLINED: {
      label: t("DoorToDoor.dashboard.passenger.declined"),
      className:
        "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800",
      description: t("DoorToDoor.dashboard.request.driverDeclined"),
    },
    CANCELED: {
      label: t("DoorToDoor.dashboard.passenger.canceled"),
      className:
        "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600",
      description: t("DoorToDoor.dashboard.request.requestCanceled"),
    },
    EXPIRED: {
      label: t("DoorToDoor.dashboard.passenger.expired"),
      className:
        "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600",
      description: t("DoorToDoor.dashboard.request.requestExpired"),
    },
  };

  interface AddressDraft extends DoorToDoorPlace {
    formattedAddress: string;
  }

  const buildAddress = (
    input: string,
    place?: Partial<DoorToDoorPlace>,
  ): DoorToDoorPlace => ({
    address: input,
    city: place?.city ?? "",
    region: place?.region ?? "",
    locationName: place?.locationName ?? "",
    latitude: place?.latitude ?? 0,
    longitude: place?.longitude ?? 0,
  });

  const isFullD2DRide = ride?.type === "D2D" || ride?.isDoorToDoor;

  // For regular rides, use attached D2D config; for full D2D rides,
  // synthesize a minimal config from the ride itself so the UI is enabled.
  const rawConfig = ride?.doorToDoor ?? ride?.door_to_door ?? ride?.d2d ?? null;
  const doorToDoorConfig =
    isFullD2DRide && ride
      ? {
          isEnabled: true,
          radiusKm:
            rawConfig?.radiusKm ?? ride.detourRadius ?? ride.radiusKm ?? 5,
          remainingCapacity:
            rawConfig?.remainingCapacity ??
            ride.remainingCapacity ??
            ride.availableSeats ??
            1,
        }
      : rawConfig;

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  const { data: passengerRequests, isLoading } =
    useDoorToDoorPassengerRequests();
  const createRequest = useCreateDoorToDoorPassengerRequest();
  const cancelRequest = useCancelDoorToDoorPassengerRequest();

  const existingRequest: DoorToDoorRequest | undefined = useMemo(() => {
    if (!passengerRequests || !ride?.id) return undefined;
    return passengerRequests.find(
      (request) =>
        request.rideId === ride.id &&
        (bookingId ? request.bookingId === bookingId : true),
    );
  }, [passengerRequests, ride?.id, bookingId]);

  const [pickupInput, setPickupInput] = useState<string>(
    existingRequest?.pickup?.formattedAddress ??
      existingRequest?.pickup?.address ??
      "",
  );

  const [dropoffInput, setDropoffInput] = useState<string>(
    existingRequest?.dropoff?.formattedAddress ??
      existingRequest?.dropoff?.address ??
      "",
  );

  const [pickupMeta, setPickupMeta] = useState<Partial<AddressDraft>>(
    existingRequest?.pickup ?? {},
  );

  const [dropoffMeta, setDropoffMeta] = useState<Partial<AddressDraft>>(
    existingRequest?.dropoff ?? {},
  );

  const [note, setNote] = useState(existingRequest?.note ?? "");

  const center = useMemo(() => {
    if (pickupMeta?.latitude && pickupMeta?.longitude) {
      return { lat: pickupMeta.latitude, lng: pickupMeta.longitude };
    }
    if (dropoffMeta?.latitude && dropoffMeta?.longitude) {
      return { lat: dropoffMeta.latitude, lng: dropoffMeta.longitude };
    }
    if (
      ride?.driverStartLocation?.latitude &&
      ride?.driverStartLocation?.longitude
    ) {
      return {
        lat: ride.driverStartLocation.latitude,
        lng: ride.driverStartLocation.longitude,
      };
    }
    if (
      ride?.departureLocation?.latitude &&
      ride?.departureLocation?.longitude
    ) {
      return {
        lat: ride.departureLocation.latitude,
        lng: ride.departureLocation.longitude,
      };
    }
    return { lat: 45.5017, lng: -73.5673 }; // Montreal fallback
  }, [
    pickupMeta,
    dropoffMeta,
    ride?.driverStartLocation,
    ride?.departureLocation,
  ]);

  useEffect(() => {
    if (!existingRequest) return;
    setPickupInput(
      existingRequest.pickup?.formattedAddress ??
        existingRequest.pickup?.address ??
        "",
    );
    setDropoffInput(
      existingRequest.dropoff?.formattedAddress ??
        existingRequest.dropoff?.address ??
        "",
    );
    setPickupMeta(existingRequest.pickup ?? {});
    setDropoffMeta(existingRequest.dropoff ?? {});
    setNote(existingRequest.note ?? "");
  }, [existingRequest?.id]);

  useEffect(() => {
    getRequest();
  }, [requestId])

  useEffect(() => {
    if (requestData) {
      if (requestData.origin) {
        setPickupInput(requestData.origin.address || "");
        setPickupMeta({
          address: requestData.origin.address,
          locationName: requestData.origin.locationName,
          city: requestData.origin.city,
          region: requestData.origin.region,
          latitude: requestData.origin.latitude,
          longitude: requestData.origin.longitude,
        });
      }
      if (requestData.destination) {
        setDropoffInput(requestData.destination.address || "");
        setDropoffMeta({
          address: requestData.destination.address,
          locationName: requestData.destination.locationName,
          city: requestData.destination.city,
          region: requestData.destination.region,
          latitude: requestData.destination.latitude,
          longitude: requestData.destination.longitude,
        });
      }
      if (requestData.description) {
        setNote(requestData.description);
      }
    }
  }, [requestData]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!ride?.id) return;
    if (
      !pickupInput ||
      !dropoffInput ||
      !pickupMeta?.latitude ||
      !pickupMeta?.longitude ||
      !dropoffMeta?.latitude ||
      !dropoffMeta?.longitude
    ) {
      return;
    };

    createRequest.mutate({
      rideId: ride.id,
      pickup: buildAddress(pickupInput, pickupMeta),
      dropoff: buildAddress(dropoffInput, dropoffMeta),
      note: note.trim() ? note.trim() : undefined,
    });
  };

  const handleCancel = () => {
    if (!existingRequest) return;
    cancelRequest.mutate({
      requestId: existingRequest.id,
      rideId: existingRequest.rideId,
    });
  };

  const allowNewRequest =
    !!doorToDoorConfig?.isEnabled &&
    (doorToDoorConfig?.remainingCapacity ?? 0) > 0 &&
    !existingRequest;

  if (!doorToDoorConfig?.isEnabled) {
    return null;
  }

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          {t("DoorToDoor.dashboard.request.title")}
        </h3>
      </div>

      <div className="p-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          <span className="border border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300 px-3 py-1 text-xs font-semibold uppercase rounded-none">
            {t("DoorToDoor.dashboard.request.within", {
              km: doorToDoorConfig.radiusKm ?? 0,
            })}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("DoorToDoor.dashboard.request.onePerBooking")}
          </span>
        </div>

        {isLoading ? (
          <div className="py-8">
            <LoadingIndicator />
          </div>
        ) : existingRequest ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Badge
                className={`w-fit px-3 py-1 text-xs font-semibold uppercase rounded-none ${
                  statusMeta[existingRequest.status ?? "POSTED"].className
                }`}
              >
                {statusMeta[existingRequest.status ?? "POSTED"].label}
              </Badge>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {statusMeta[existingRequest.status ?? "POSTED"].description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">
                  {t("DoorToDoor.dashboard.request.pickupAddress")}
                </div>
                <div>{existingRequest.pickup?.address ?? "—"}</div>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400">
                  {t("DoorToDoor.dashboard.request.dropoffAddress")}
                </div>
                <div>{existingRequest.dropoff?.address ?? "—"}</div>
              </div>
            </div>

            {existingRequest.note && (
              <div className="border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-xs uppercase text-slate-500 dark:text-slate-400 mb-1">
                  {t("DoorToDoor.dashboard.request.yourNote")}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {existingRequest.note}
                </p>
              </div>
            )}

            {existingRequest.status === "POSTED" && (
              <div className="flex items-center justify-between border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  {t("DoorToDoor.dashboard.request.cancelWarning")}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelRequest.isPending}
                  className="border-slate-300 dark:border-slate-600 rounded-none"
                >
                  {t("DoorToDoor.dashboard.request.cancelRequest")}
                </Button>
              </div>
            )}

            {existingRequest.status === "ACCEPTED" && (
              <div className="border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-100">
                {t("DoorToDoor.dashboard.request.itineraryUpdated")}
              </div>
            )}
          </div>
        ) : allowNewRequest ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-slate-500 dark:text-slate-400">
                    {t("DoorToDoor.dashboard.request.pickupAddressLabel")}
                  </label>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4" />
                    <GooglePlacesInput
                      value={pickupInput}
                      onChange={(event) => setPickupInput(event.target.value)}
                      onPlaceSelected={(place) => {
                        setPickupMeta({
                          address: place.locationName,
                          locationName: place.locationName,
                          city: place.city,
                          region: place.region,
                          latitude: place.latitude,
                          longitude: place.longitude,
                        });
                        setPickupInput(place.locationName);
                      }}
                      placeholder={t(
                        "DoorToDoor.dashboard.request.pickupPlaceholder",
                      )}
                      googleReady={isLoaded}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase text-slate-500 dark:text-slate-400">
                    {t("DoorToDoor.dashboard.request.dropoffAddressLabel")}
                  </label>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4" />
                    <GooglePlacesInput
                      value={dropoffInput}
                      onChange={(event) => setDropoffInput(event.target.value)}
                      onPlaceSelected={(place) => {
                        setDropoffMeta({
                          address: place.locationName,
                          locationName: place.locationName,
                          city: place.city,
                          region: place.region,
                          latitude: place.latitude,
                          longitude: place.longitude,
                        });
                        setDropoffInput(place.locationName);
                      }}
                      placeholder={t(
                        "DoorToDoor.dashboard.request.dropoffPlaceholder",
                      )}
                      googleReady={isLoaded}
                    />
                  </div>
                </div>

                {isLoaded && (
                  <div className="h-64 w-full rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={center}
                      zoom={12}
                    >
                      {pickupMeta?.latitude && pickupMeta?.longitude && (
                        <Marker
                          position={{
                            lat: pickupMeta.latitude,
                            lng: pickupMeta.longitude,
                          }}
                          label={t(
                            "DoorToDoor.dashboard.request.pickupShort",
                            "P",
                          )}
                        />
                      )}
                      {dropoffMeta?.latitude && dropoffMeta?.longitude && (
                        <Marker
                          position={{
                            lat: dropoffMeta.latitude,
                            lng: dropoffMeta.longitude,
                          }}
                          label={t(
                            "DoorToDoor.dashboard.request.dropoffShort",
                            "D",
                          )}
                        />
                      )}
                    </GoogleMap>
                  </div>
                )}

                <div className="flex flex-col items-start pt-2 gap-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {t("DoorToDoor.dashboard.request.addressWarning")}
                  </div>

                  <Button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700 text-white rounded-none"
                    disabled={
                      createRequest.isPending ||
                      !pickupMeta?.latitude ||
                      !dropoffMeta?.latitude
                    }
                  >
                    {createRequest.isPending
                      ? t("DoorToDoor.dashboard.request.submitting")
                      : t("DoorToDoor.dashboard.request.submitRequest")}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="border border-slate-200 dark:border-slate-700 px-3 py-4 text-sm text-slate-600 dark:text-slate-300 flex items-start gap-3">
            <RefreshCcw className="h-4 w-4 mt-0.5 text-slate-400" />
            <div>
              {doorToDoorConfig?.remainingCapacity === 0
                ? t("DoorToDoor.dashboard.request.capacityFull")
                : t("DoorToDoor.dashboard.request.alreadyHaveRequest")}
            </div>
          </div>
        )}

        {(pickupInput || dropoffInput) &&
          !allowNewRequest &&
          !existingRequest && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <X className="h-3 w-3" />
              {t("DoorToDoor.dashboard.request.clearForm")}
            </div>
          )}
      </div>
    </div>
  );
};

export default PassengerDoorToDoorRequest;
