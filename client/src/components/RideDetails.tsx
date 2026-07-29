import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  apiUrl,
  queryKey,
  useSingleBook,
  useSingleRide,
  useSingleUser,
} from "@/data";
import { useReactItems } from "@/lib/ReactTranslation";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { Autocomplete } from "@react-google-maps/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  Bike,
  Briefcase,
  CheckCircle,
  Edit,
  Mountain,
  Music,
  Package,
  Phone,
  Play,
  Cigarette,
  PawPrint,
  Snowflake,
  UserRound,
  Users,
  Wind,
  XCircle,
  User,
  Star,
  MapPin,
  X,
} from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import tzlookup from "tz-lookup";
import { DriverComplaintDialog, DriverMarkAttendanceDialog } from "./Complaint";
import CustomLoader from "./CustomLoader";
import CancelRideDialog from "./Dialogs/DriverCancelRide";
import EditRideModal from "./Dialogs/EditRideModal";
import { getToken } from "./getToken";
import RideMap from "./Map";
import { Switch } from "./ui/switch";
import { formatTime } from "@/lib/utils";
import { getStatusColor } from "@/utils/statusIcons";
import {
  useSaveDoorToDoorSettings,
  usePublishDoorToDoorRide,
  useDoorToDoorDriverRequests,
  useAcceptDoorToDoorRequest,
  useDeclineDoorToDoorRequest,
  useStartDoorToDoorRide,
  useCompleteDoorToDoorRide,
} from "@/hooks/useDoorToDoor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const RideDetails = () => {
  const [activeTab, setActiveTab] = useState<"details" | "map">("details");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const [useCoupons, setUseCoupons] = useState(false);
  const [selectedPassengerId, setSelectedPassengerId] = useState<string | null>(
    null
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isD2DSettingsOpen, setIsD2DSettingsOpen] = useState(false);
  const [d2dSettings, setD2dSettings] = useState({
    radiusKm: 0,
    capacity: 1,
    notes: "",
  });

  const [currentTime, setCurrentTime] = useState(null);
  const [timeZone, setTimeZone] = useState(null);

  const [searchParams] = useSearchParams();
  const rideIdParam = searchParams.get("rideId");
  const rideId = rideIdParam ? parseInt(rideIdParam, 10) : null;

  const { data: singleRide, isPending } = useSingleRide({
    rideId: rideId,
    enabled: !!rideId,
  });

  const { authenticated, user } = useAuth();

  const { data: bookings } = useSingleBook({
    rideId: rideId || 0,
    enabled: !!rideId,
  });

  const { data: userData } = useSingleUser({
    userId: user?.id,
    enabled: !!user?.id,
  });

  const { currentLanguage, t, queryClient } = useReactItems();

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

  const hasEnoughCoupons = userData?.coupons >= requiredCoupons;
  const couponsPercentage = (userData?.coupons / requiredCoupons) * 100;

  const incomePercentage = couponsPercentage < 100 ? couponsPercentage : 100;
  const rideData = singleRide;

  // D2D helpers
  const isD2D = rideData?.isDoorToDoor || rideData?.type === "D2D";
  const displayDeparture = isD2D
    ? rideData?.driverStartLocation || rideData?.departureLocation
    : rideData?.departureLocation;
  const displayDestination = isD2D
    ? rideData?.driverStopLocation || rideData?.destinationLocation
    : rideData?.destinationLocation;

  const passengerList = useMemo(() => {
    return (
      rideData?.chatThread?.users?.filter(
        (user) => user.id !== rideData?.driverId
      ) || []
    );
  }, [rideData]);

  // Set the selected passenger ID if there is only one passenger
  useEffect(() => {
    if (passengerList.length === 1) {
      setSelectedPassengerId(passengerList[0].id.toString());
    }
  }, [passengerList]);

  useEffect(() => {
    const userTimeZone = DateTime.local().zoneName;
    const startLoc = displayDeparture;

    if (startLoc?.latitude && startLoc?.longitude) {
      const departureTimeZone = tzlookup(startLoc.latitude, startLoc.longitude);
      setTimeZone(departureTimeZone);

      if (rideData?.departureTime) {
        const departureInCity = DateTime.fromISO(rideData.departureTime, {
          zone: departureTimeZone,
        });
        const departureInUserZone = departureInCity.setZone(userTimeZone);
        setCurrentTime(departureInUserZone);
      }
    } else if (rideData?.departureTime && !timeZone) {
      // fallback when coords missing (some D2D records)
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

  // Check if there are any bookings (to determine if editing is allowed)
  const hasAnyBookings = bookings && bookings.length > 0;
  const canEdit = rideData?.status === "DRAFT" && !hasAnyBookings;

  // D2D hooks
  const saveD2DSettings = useSaveDoorToDoorSettings();
  const publishD2DRide = usePublishDoorToDoorRide();
  const { data: d2dRequests } = useDoorToDoorDriverRequests(
    rideData?.isDoorToDoor ? rideId : undefined
  );
  const acceptD2DRequest = useAcceptDoorToDoorRequest();
  const declineD2DRequest = useDeclineDoorToDoorRequest();
  const startD2DRide = useStartDoorToDoorRide();
  const completeD2DRide = useCompleteDoorToDoorRide();

  // Initialize edit data when ride data is loaded
  useEffect(() => {
    if (rideData && !isEditing) {
      setEditData({
        departureTime: rideData.departureTime,
        estimatedArrivalTime: rideData.estimatedArrivalTime,
        availableSeats: rideData.availableSeats,
        totalSeats: rideData.totalSeats,
        contribution: rideData.contribution,
        departureLocation: rideData.departureLocation,
        destinationLocation: rideData.destinationLocation,
        stopovers: rideData.stopovers || [],
        preferences: rideData.preferences,
        bookingType: rideData.bookingType,
        contributionCollectionMethod: rideData.contributionCollectionMethod,
        monitizationType: rideData.monitizationType,
      });

      // Initialize D2D settings if ride is D2D
      if (rideData?.isDoorToDoor) {
        setD2dSettings({
          radiusKm: rideData.detourRadius || rideData.radiusKm || 0,
          capacity: rideData.d2dCapacity || rideData.capacity || 1,
          notes:
            rideData.d2dConfigurationNotes || rideData.configurationNotes || "",
        });
      }
    }
  }, [rideData, isEditing]);

  // Publish a ride
  const { mutate: publishRide, isPending: isPublishing } = useMutation({
    mutationFn: async (rideId: number) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/rides/${rideId}/publish?lang=${currentLanguage}&useCoupons=${useCoupons.toString()}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);

      queryClient.invalidateQueries({
        queryKey: [queryKey.SINGLE_RIDE, rideId],
      });
    },
    onError: (err) => {
      toast.error(
        (err as any).response?.data?.message || "Failed to publish ride",
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  // Start a ride
  const { mutate: startRide, isPending: isStarting } = useMutation({
    mutationFn: async (rideId: number) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/rides/${rideId}/start-ride?lang=${currentLanguage}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success("Your ride has been marked as started");
      queryClient.invalidateQueries({
        queryKey: [queryKey.SINGLE_RIDE, rideId],
      });
    },
    onError: (err) => {
      toast.error((err as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  // End a ride
  const { mutate: endRide, isPending: isEnding } = useMutation({
    mutationFn: async (rideId: number) => {
      const { data } = await axios.put(
        `${apiUrl}/api/v1/rides/${rideId}/complete?lang=${currentLanguage}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      toast.success("Your ride has been marked as completed");
      queryClient.invalidateQueries({
        queryKey: [queryKey.SINGLE_RIDE, rideId],
      });
    },
    onError: (err) => {
      toast.error((err as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLocationChange = (
    type: "departure" | "destination",
    field: string,
    value: string
  ) => {
    setEditData((prev: any) => ({
      ...prev,
      [`${type}Location`]: {
        ...prev[`${type}Location`],
        [field]: value,
      },
    }));
  };

  if (!timeZone || isPending) {
    return (
      <div className="h-96 flex items-center justify-center">
        <CustomLoader />
      </div>
    );
  }

  if (!displayDeparture || !displayDestination || !singleRide?.departureTime) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {t(
              "RideDetails.error.notFound",
              "Ride not found or incomplete data."
            )}
          </p>
        </div>
      </div>
    );
  }
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "PUBLISHED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "ONGOING":
        return <Play className="h-5 w-5 text-blue-500" />;
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "CANCELLED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };
  // Calculate duration in hours and minutes
  const calculateDuration = () => {
    if (!rideData.departureTime || !rideData.estimatedArrivalTime)
      return t("common_.notAvailable", "N/A");

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

  const hasConfirmedBookings = rideData.totalSeats !== rideData.availableSeats;

  const userLocale = currentLanguage === "fr" ? "fr-FR" : "en-US";

  console.log({ rideData });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-primary-500 p-4 text-white">
            <div className="flex-1 ">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {getStatusIcon(rideData.status)}
                <Badge
                  className={`${getStatusColor(rideData.status)} px-3 py-1`}
                >
                  {t(`RideDetails.status.${rideData.status.toLowerCase()}`)}
                </Badge>
                {rideData?.isDoorToDoor && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 px-3 py-1 text-white">
                    <MapPin className="h-3 w-3 mr-1" />
                    {t("DoorToDoor.dashboard.request.title", "Door-to-Door")}
                  </Badge>
                )}
                {canEdit && (
                  <Badge variant="outline" className="text-xs text-white">
                    {t("RideDetails.editable", "Editable (No bookings)")}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight ">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    {window.google?.maps ? (
                      <>
                        <Autocomplete
                          onLoad={() => {}}
                          onPlaceChanged={() => {}}
                          options={{
                            componentRestrictions: { country: "ca" },
                            types: ["geocode", "establishment"],
                          }}
                        >
                          <Input
                            value={editData.departureLocation?.address || ""}
                            placeholder={t(
                              "createRide.driver.rideDetails.departureLocation",
                              "Departure location"
                            )}
                            className="text-2xl lg:text-3xl font-bold"
                          />
                        </Autocomplete>
                        <span>→</span>
                        <Autocomplete
                          onLoad={(autocomplete) => {}}
                          onPlaceChanged={() => {}}
                          options={{
                            componentRestrictions: { country: "ca" },
                            types: ["geocode", "establishment"],
                          }}
                        >
                          <Input
                            value={editData.destinationLocation?.address || ""}
                            placeholder={t(
                              "createRide.driver.rideDetails.destinationLocation",
                              "Destination location"
                            )}
                            className="text-2xl lg:text-3xl font-bold"
                          />
                        </Autocomplete>
                      </>
                    ) : (
                      <>
                        <Input
                          value={editData.departureLocation?.city || ""}
                          onChange={(e) =>
                            handleLocationChange(
                              "departure",
                              "city",
                              e.target.value
                            )
                          }
                          className="text-2xl lg:text-3xl font-bold"
                          placeholder={t(
                            "createRide.driver.rideDetails.departureCity",
                            "Departure city"
                          )}
                        />
                        <span>→</span>
                        <Input
                          value={editData.destinationLocation?.city || ""}
                          onChange={(e) =>
                            handleLocationChange(
                              "destination",
                              "city",
                              e.target.value
                            )
                          }
                          className="text-2xl lg:text-3xl font-bold"
                          placeholder={t(
                            "createRide.driver.rideDetails.destinationCity",
                            "Destination city"
                          )}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <span className="p-4">
                    {rideData.type === "P2P"
                      ? rideData?.departureLocation.city
                      : rideData?.driverStartLocation.city}
                    →{" "}
                    {rideData.type === "P2P"
                      ? rideData?.destinationLocation.address
                      : rideData?.driverStopLocation.address}
                  </span>
                )}
              </h1>
              <div className="text-gray-600 dark:text-gray-300 mt-1 p-4">
                {isEditing ? (
                  <Input
                    type="datetime-local"
                    value={
                      editData.departureTime
                        ? new Date(editData.departureTime)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      handleInputChange("departureTime", e.target.value)
                    }
                    className="w-auto"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-500 font-bold">
                      {formatTime({
                        dateString: rideData.departureTime,
                        timeZone: timeZone,
                        formatTime: userLocale,
                      })}
                    </span>
                    {rideData?.departureTime && currentTime && (
                      <Badge className="ml-2">
                        ({currentTime.toFormat("LLL dd, hh:mm a")}{" "}
                        {t("common_.small.local")})
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {canEdit && (
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 shadow-sm"
                >
                  <Edit className="h-4 w-4" />
                  {t("createRide.driver.rideDetails.edit", "Edit")}{" "}
                  {t("driver.ride", "Ride")}
                </Button>
              )}

              {/* D2D Settings Button - Show for D2D rides when user is driver */}
              {rideData &&
                rideData.isDoorToDoor &&
                authenticated &&
                user?.id === rideData.driverId && (
                  <Dialog
                    open={isD2DSettingsOpen}
                    onOpenChange={setIsD2DSettingsOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        {t(
                          "DoorToDoor.dashboard.driver.settings",
                          "D2D Settings"
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          {t(
                            "DoorToDoor.dashboard.driver.settings",
                            "Door-to-Door Settings"
                          )}
                        </DialogTitle>
                        <DialogDescription>
                          {t(
                            "DoorToDoor.dashboard.driver.description",
                            "Configure pickup and drop-off radius for your rides"
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="radiusKm">
                            {t("DoorToDoor.dashboard.driver.radius", "Radius")}{" "}
                            (km)
                          </Label>
                          <Input
                            id="radiusKm"
                            type="text"
                            inputMode="decimal"
                            value={d2dSettings.radiusKm}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d*$/.test(value)) {
                                setD2dSettings((prev) => ({
                                  ...prev,
                                  radiusKm:
                                    value === "" ? 0 : parseFloat(value) || 0,
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              setD2dSettings((prev) => ({
                                ...prev,
                                radiusKm: Math.max(0, value),
                              }));
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="capacity">
                            {t(
                              "DoorToDoor.dashboard.driver.maxRequests",
                              "Max Seats"
                            )}
                          </Label>
                          <Input
                            id="capacity"
                            type="number"
                            min={1}
                            value={d2dSettings.capacity}
                            onChange={(e) =>
                              setD2dSettings((prev) => ({
                                ...prev,
                                capacity: parseInt(e.target.value) || 1,
                              }))
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">
                            {t(
                              "DoorToDoor.dashboard.driver.internalNote",
                              "Internal note (optional)"
                            )}
                          </Label>
                          <Textarea
                            id="notes"
                            value={d2dSettings.notes}
                            onChange={(e) =>
                              setD2dSettings((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            placeholder={t(
                              "DoorToDoor.dashboard.driver.internalNotePlaceholder",
                              "Reminders for the driver"
                            )}
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            if (rideId) {
                              saveD2DSettings.mutate({
                                rideId,
                                radiusKm: d2dSettings.radiusKm,
                                capacity: d2dSettings.capacity,
                                notes: d2dSettings.notes.trim(),
                              });
                              setIsD2DSettingsOpen(false);
                            }
                          }}
                          disabled={
                            saveD2DSettings.isPending ||
                            d2dSettings.radiusKm < 0 ||
                            d2dSettings.capacity < 1
                          }
                          className="bg-primary-600 hover:bg-primary-700 text-white"
                        >
                          {saveD2DSettings.isPending
                            ? t(
                                "DoorToDoor.dashboard.driver.saving",
                                "Saving..."
                              )
                            : t(
                                "DoorToDoor.dashboard.driver.saveSettings",
                                "Save Settings"
                              )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

              {/* Editing handled via modal */}

              {rideData.status !== "DRAFT" &&
                rideData.status !== "CANCELLED" && (
                  <>
                    <Button
                      onClick={() => startRide(rideId)}
                      disabled={
                        rideData.status === "ONGOING" ||
                        rideData.status === "COMPLETED" ||
                        rideData.status === "DRAFT" ||
                        isEditing
                      }
                      className="bg-black text-white"
                    >
                      {isStarting
                        ? t("general.starting", "Starting...")
                        : t("createRide.driver.startRide", "Start Ride")}
                    </Button>

                    <Button
                      onClick={() => endRide(rideId)}
                      disabled={rideData.status !== "ONGOING" || isEditing}
                      className="bg-secondary hover:bg-secondary/80 text-white"
                    >
                      {isEnding
                        ? t("general.ending", "Ending...")
                        : t("createRide.driver.endRide", "End Ride")}
                    </Button>
                    <DriverMarkAttendanceDialog rideId={rideId} />
                  </>
                )}

              {authenticated && rideData.status === "DRAFT" && (
                <div className="flex flex-col space-y-2 border border-slate-300 dark:border-slate-700 p-2">
                  {rideData?.isDoorToDoor ? (
                    <Button
                      onClick={() => {
                        if (rideId) {
                          publishD2DRide.mutate({ rideId });
                        }
                      }}
                      disabled={
                        publishD2DRide.isPending || isEditing || !rideId
                      }
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {publishD2DRide.isPending
                        ? t("general.publishing", "Publishing...")
                        : t("common_.small.pay")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        if (rideId) {
                          publishRide(rideId);
                        }
                      }}
                      disabled={isPublishing || isEditing || !rideId}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {t("common_.small.pay")}
                    </Button>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="use-coupon-switch"
                        className="text-sm text-slate-600 dark:text-slate-400"
                      >
                        {t("RideDetail.useCoupon")}
                      </label>
                      <Switch
                        id="use-coupon-switch"
                        checked={useCoupons}
                        disabled={!hasEnoughCoupons}
                        onCheckedChange={setUseCoupons}
                        className="bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                      />
                    </div>

                    <p className="text-sm text-slate-200 dark:text-slate-400">
                      {t("RideDetail.useCouponInfo")}
                    </p>

                    <p className="font-semibold text-xs max-w-[250px]">
                      {t("common_.driver_coupons", {
                        percent: incomePercentage,
                      })}
                    </p>

                    {useCoupons && (
                      <p className="text-sm font-medium text-gray-200 dark:text-gray-400">
                        {t("RideDetail.available")}: {userData.coupons}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Overview Chips */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-4">
            <div className="border bg-white dark:bg-gray-900/50  shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-white px-3 py-2 bg-primary-500">
                {t("common_.small.route")}
              </div>
              <div className="mt-1 font-bold text-gray-900 dark:text-white truncate px-4 py-3 text-center">
                {rideData.type === "P2P"
                  ? rideData.departureLocation.city
                  : rideData.driverStartLocation.city}{" "}
                →{" "}
                {rideData.type === "P2P"
                  ? rideData.destinationLocation.city
                  : rideData.driverStopLocation.city}
              </div>
            </div>
            <div className="border bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-white px-3 py-2 bg-primary-500">
                {t("common_.small.date")}
              </div>
              <div className="mt-1 font-bold text-gray-900 dark:text-white px-4">
                {new Date(rideData.departureTime)
                  .toLocaleDateString(userLocale, {
                    timeZone: timeZone,
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .replace(/^([a-zéèêàâîïç])/u, (match) => match.toUpperCase())}
              </div>
            </div>
            <div className="border bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-white px-3 py-2 bg-primary-500">
                {t("common_.small.seats")}
              </div>
              <div className="mt-1 font-bold text-gray-900 dark:text-white px-4 ">
                {rideData.availableSeats}/{rideData.totalSeats}
              </div>
            </div>
            <div className="border bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-white px-3 py-2 bg-primary-500">
                {t("common_.small.price")}
              </div>
              <div className="mt-1 font-bold text-gray-900 dark:text-white px-4 ">
                ${Number(rideData.contribution ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="border bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="text-[10px] uppercase tracking-wide text-white px-3 py-2 bg-primary-500">
                {t("common_.small.attended")}
              </div>
              <div className="mt-1 font-bold text-gray-900 dark:text-white px-4 ">
                {rideData?._count?.bookingSeats ?? 0}/{rideData.totalSeats ?? 0}
              </div>
            </div>
          </div>

          {/* D2D Requests Section */}
          {rideData?.isDoorToDoor &&
            authenticated &&
            user?.id === rideData?.driverId && (
              <div className="mt-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t(
                      "DoorToDoor.dashboard.driver.requests",
                      "Door-to-Door Requests"
                    )}
                  </h3>
                  {d2dRequests && d2dRequests.length > 0 && (
                    <Badge className="bg-amber-500 text-white">
                      {d2dRequests.filter((r) => r.status === "POSTED").length}{" "}
                      {t("DoorToDoor.dashboard.driver.pending", "pending")}
                    </Badge>
                  )}
                </div>

                {d2dRequests && d2dRequests.length > 0 ? (
                  <div className="space-y-3">
                    {d2dRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border border-slate-200 dark:border-slate-700 p-4 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {request.passenger?.name ||
                                `Passenger #${request.passengerId}`}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {new Date(
                                request.submittedAt || ""
                              ).toLocaleString()}
                            </div>
                          </div>
                          <Badge
                            className={
                              request.status === "POSTED"
                                ? "bg-amber-500 text-white"
                                : request.status === "ACCEPTED"
                                ? "bg-emerald-500 text-white"
                                : "bg-red-500 text-white"
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-slate-600 dark:text-slate-400">
                              {t(
                                "DoorToDoor.dashboard.driver.pickup",
                                "Pickup"
                              )}
                              :
                            </span>
                            <div className="text-slate-900 dark:text-white">
                              {request.pickupAddress?.address || "—"}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600 dark:text-slate-400">
                              {t(
                                "DoorToDoor.dashboard.driver.dropoff",
                                "Drop-off"
                              )}
                              :
                            </span>
                            <div className="text-slate-900 dark:text-white">
                              {request.dropoffAddress?.address || "—"}
                            </div>
                          </div>
                          {request.detourKm && (
                            <div className="text-slate-600 dark:text-slate-400">
                              {t(
                                "DoorToDoor.dashboard.driver.detour",
                                "Detour"
                              )}
                              : {request.detourKm.toFixed(1)} km
                              {request.detourMinutes &&
                                ` • ${Math.round(request.detourMinutes)} min`}
                            </div>
                          )}
                          {request.note && (
                            <div className="text-slate-600 dark:text-slate-400 italic border-t border-slate-200 dark:border-slate-700 pt-2">
                              "{request.note}"
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          {request.status === "POSTED" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  acceptD2DRequest.mutate({
                                    requestId: request.id,
                                    rideId: request.rideId,
                                  })
                                }
                                disabled={
                                  acceptD2DRequest.isPending ||
                                  declineD2DRequest.isPending
                                }
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {acceptD2DRequest.isPending
                                  ? t(
                                      "DoorToDoor.dashboard.driver.accepting",
                                      "Accepting..."
                                    )
                                  : t(
                                      "DoorToDoor.dashboard.driver.accept",
                                      "Accept"
                                    )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  declineD2DRequest.mutate({
                                    requestId: request.id,
                                    rideId: request.rideId,
                                  })
                                }
                                disabled={
                                  acceptD2DRequest.isPending ||
                                  declineD2DRequest.isPending
                                }
                              >
                                {declineD2DRequest.isPending
                                  ? t(
                                      "DoorToDoor.dashboard.driver.declining",
                                      "Declining..."
                                    )
                                  : t(
                                      "DoorToDoor.dashboard.driver.decline",
                                      "Decline"
                                    )}
                              </Button>
                            </>
                          )}
                          {request.status === "ACCEPTED" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  startD2DRide.mutate({
                                    requestId: request.id,
                                    rideId: request.rideId,
                                  })
                                }
                                disabled={
                                  startD2DRide.isPending ||
                                  completeD2DRide.isPending
                                }
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {startD2DRide.isPending
                                  ? t(
                                      "DoorToDoor.dashboard.driver.starting",
                                      "Starting..."
                                    )
                                  : t(
                                      "DoorToDoor.dashboard.driver.start",
                                      "Start"
                                    )}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  completeD2DRide.mutate({
                                    requestId: request.id,
                                    rideId: request.rideId,
                                  })
                                }
                                disabled={
                                  startD2DRide.isPending ||
                                  completeD2DRide.isPending
                                }
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {completeD2DRide.isPending
                                  ? t(
                                      "DoorToDoor.dashboard.driver.completing",
                                      "Completing..."
                                    )
                                  : t(
                                      "DoorToDoor.dashboard.driver.complete",
                                      "Complete"
                                    )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p>
                      {t(
                        "DoorToDoor.dashboard.driver.noRequests",
                        "No door-to-door requests yet."
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
          <div className="flex p-2 bg-slate-100 dark:bg-slate-800/50">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                activeTab === "details"
                  ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-primary/20"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
              }`}
            >
              {t("driver.locationDetails", "Ride Details")}
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                activeTab === "map"
                  ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-primary/20"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
              }`}
            >
              {t("RideDetails.routeMap", "Route Map")}
            </button>
          </div>

          <div className="p-6">
            {activeTab === "details" && (
              <div className="space-y-6">
                {/* Route Information */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Departure */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
                    <div className="flex items-center gap-3 mb-4 bg-black py-2 px-4">
                      <div className="w-4 h-4 bg-black shadow-sm"></div>
                      <h3 className="font-bold text-white text-lg">
                        {t("RideDetails.departure", "Departure")}
                      </h3>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2 p-4">
                        {window.google?.maps ? (
                          <Autocomplete
                            onLoad={(autocomplete) => {
                              // Store reference if needed
                            }}
                            onPlaceChanged={() => {
                              // This will be handled by the input's onChange
                            }}
                            options={{
                              componentRestrictions: { country: "rw" },
                              types: ["geocode", "establishment"],
                            }}
                          >
                            <Input
                              value={editData.departureLocation?.address || ""}
                              placeholder={t(
                                "RideDetails.searchDeparture",
                                "Search departure location"
                              )}
                            />
                          </Autocomplete>
                        ) : (
                          <div className="space-y-2 p-4">
                            <Input
                              value={editData.departureLocation?.city || ""}
                              onChange={(e) =>
                                handleLocationChange(
                                  "departure",
                                  "city",
                                  e.target.value
                                )
                              }
                              placeholder={t("common_.city", "City")}
                            />
                            <Input
                              value={editData.departureLocation?.region || ""}
                              onChange={(e) =>
                                handleLocationChange(
                                  "departure",
                                  "region",
                                  e.target.value
                                )
                              }
                              placeholder={t("common_.region", "Region")}
                            />
                            <Textarea
                              value={editData.departureLocation?.address || ""}
                              onChange={(e) =>
                                handleLocationChange(
                                  "departure",
                                  "address",
                                  e.target.value
                                )
                              }
                              placeholder="Address"
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                          {console.log(rideData, "@@@@@ 1210")}
                          {rideData.type === "P2P"
                            ? rideData?.departureLocation.city
                            : rideData?.driverStartLocation.city}
                          ,{" "}
                          {rideData.type === "P2P"
                            ? rideData?.destinationLocation.region
                            : rideData?.driverStopLocation.region}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                          {rideData.type === "P2P"
                            ? rideData?.departureLocation.address
                            : rideData?.driverStopLocation.address}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Stopovers */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
                    <div className="flex items-center gap-3 mb-4 bg-red-500 py-2 px-4">
                      <div className="w-4 h-4 bg-red-900 shadow-sm"></div>
                      <h3 className="font-bold text-white text-lg">
                        {t("RideDetails.stopovers", "Stopovers")}
                      </h3>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2 px-4">
                        {editData.stopovers?.map(
                          (stopover: any, index: number) => (
                            <div key={index} className="flex gap-2">
                              {window.google?.maps ? (
                                <Autocomplete
                                  onLoad={(autocomplete) => {
                                    // Store reference if needed
                                  }}
                                  onPlaceChanged={() => {
                                    // This will be handled by the input's onChange
                                  }}
                                  options={{
                                    componentRestrictions: { country: "rw" },
                                    types: ["geocode", "establishment"],
                                  }}
                                >
                                  <Input
                                    value={stopover.address || ""}
                                    placeholder={t(
                                      "RideDetails.stopover.placeholder",
                                      "Stopover {{index}}",
                                      { index: index + 1 }
                                    )}
                                  />
                                </Autocomplete>
                              ) : (
                                <Input
                                  value={stopover.city || ""}
                                  onChange={(e) => {
                                    const newStopovers = [
                                      ...editData.stopovers,
                                    ];
                                    newStopovers[index] = {
                                      ...stopover,
                                      city: e.target.value,
                                    };
                                    handleInputChange(
                                      "stopovers",
                                      newStopovers
                                    );
                                  }}
                                  placeholder="City"
                                />
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newStopovers =
                                    editData.stopovers.filter(
                                      (_: any, i: number) => i !== index
                                    );
                                  handleInputChange("stopovers", newStopovers);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newStopovers = [
                              ...(editData.stopovers || []),
                              { city: "", region: "", address: "" },
                            ];
                            handleInputChange("stopovers", newStopovers);
                          }}
                        >
                          {t("RideDetails.addStopover", "Add Stopover")}
                        </Button>
                      </div>
                    ) : (
                      <div className="px-4">
                        {rideData.stopovers && rideData.stopovers.length > 0 ? (
                          <div className="space-y-3">
                            {rideData.stopovers.map(
                              (stopover: any, index: number) => (
                                <div
                                  key={index}
                                  className="bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-300/30"
                                >
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {stopover.city}, {stopover.region}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                                    {stopover.address}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-600 dark:text-slate-300 text-sm italic">
                            {t("common_.noStopovers", "No stopovers")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Destination */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
                    <div className="flex items-center gap-3 mb-4 bg-primary-500 py-2 px-4">
                      <div className="w-4 h-4 bg-secondary shadow-sm"></div>
                      <h3 className="font-bold text-white text-lg ">
                        {t("RideDetails.destination", "Destination")}
                      </h3>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2 px-4">
                        {window.google?.maps ? (
                          <Autocomplete
                            onLoad={(autocomplete) => {
                              // Store reference if needed
                            }}
                            onPlaceChanged={() => {
                              // This will be handled by the input's onChange
                            }}
                            options={{
                              componentRestrictions: { country: "rw" },
                              types: ["geocode", "establishment"],
                            }}
                          >
                            <Input
                              value={
                                editData.destinationLocation?.address || ""
                              }
                              placeholder={t(
                                "RideDetails.searchDestination",
                                "Search destination location"
                              )}
                            />
                          </Autocomplete>
                        ) : (
                          <div className="space-y-2 px-4">
                            <Input
                              value={editData.destinationLocation?.city || ""}
                              onChange={(e) =>
                                handleLocationChange(
                                  "destination",
                                  "city",
                                  e.target.value
                                )
                              }
                              placeholder="City"
                            />
                            <Input
                              value={editData.destinationLocation?.region || ""}
                              onChange={(e) =>
                                handleLocationChange(
                                  "destination",
                                  "region",
                                  e.target.value
                                )
                              }
                              placeholder="Region"
                            />
                            <Textarea
                              value={
                                editData.destinationLocation?.address || ""
                              }
                              onChange={(e) =>
                                handleLocationChange(
                                  "destination",
                                  "address",
                                  e.target.value
                                )
                              }
                              placeholder="Address"
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                          {rideData?.type === "P2P"
                            ? rideData?.departureLocation.city
                            : rideData?.driverStartLocation.city}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                          {rideData.type === "P2P"
                            ? rideData.destinationLocation.address
                            : rideData.driverStopLocation.address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modern Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Duration Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                        {" "}
                        <span className="text-2xl font-black">1</span>{" "}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          {t("RideDetails.duration", "Duration")}
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                          {calculateDuration()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Available Seats Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                        {" "}
                        <span className="text-2xl font-black">2</span>{" "}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          {t(
                            "common_.small.Available_seats",
                            "Available Seats"
                          )}
                        </div>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editData.availableSeats || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "availableSeats",
                                parseInt(e.target.value)
                              )
                            }
                            min="1"
                            max={editData.totalSeats || 1}
                            className="text-right w-20 h-8 text-lg font-bold border-0 bg-transparent p-0"
                          />
                        ) : (
                          <div className="text-2xl font-bold text-foreground mt-1">
                            {rideData.availableSeats}/{rideData.totalSeats}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Progress bar for seat availability */}
                    <div className="mt-3">
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{
                            width: `${
                              ((rideData.totalSeats - rideData.availableSeats) /
                                rideData.totalSeats) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 text-center">
                        {rideData.totalSeats - rideData.availableSeats}{" "}
                        {t("common_.small.booked")}
                      </div>
                    </div>
                  </div>

                  {/* Contribution Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                        {" "}
                        <span className="text-2xl font-black">3</span>{" "}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          {t("RideDetails.contribution", "Price per Seat")}
                        </div>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editData.contribution || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "contribution",
                                parseFloat(e.target.value)
                              )
                            }
                            min="0"
                            step="0.01"
                            className="text-right w-24 h-8 text-lg font-bold border-0 bg-transparent p-0"
                          />
                        ) : (
                          <div className="text-2xl font-bold text-foreground mt-1">
                            ${Number(rideData.contribution ?? 0).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Value indicator */}
                    <div className="flex justify-center mt-4">
                      <span className="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {rideData.contribution === 0
                          ? "Free"
                          : rideData.contribution <= 10
                          ? "Budget-friendly"
                          : t("common_.Premium")}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                        {" "}
                        <span className="text-2xl font-black">4</span>{" "}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          {t("RideDetails.paymentMethod", "Payment")}
                        </div>
                        {isEditing ? (
                          <Select
                            value={editData.contributionCollectionMethod || ""}
                            onValueChange={(value) =>
                              handleInputChange(
                                "contributionCollectionMethod",
                                value
                              )
                            }
                          >
                            <SelectTrigger className="w-auto h-8 text-sm border-0 bg-transparent p-0">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="VIA_PLATFORM">
                                {t("common_.small.platform")}
                              </SelectItem>
                              <SelectItem value="DIRECT">Direct</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm font-bold text-foreground mt-1">
                            {t(`passenger.viaplatform`)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment method indicator */}
                    <div className="flex justify-center mt-4">
                      <div
                        className={`w-3 h-3 ${
                          rideData.contributionCollectionMethod ===
                          "VIA_PLATFORM"
                            ? "bg-primary animate-pulse"
                            : "bg-slate-400"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Secondary Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Booking Type Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden p-4 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          {t("createRide.driver.bookingType")}
                        </div>
                        {isEditing ? (
                          <Select
                            value={editData.bookingType || ""}
                            onValueChange={(value) =>
                              handleInputChange("bookingType", value)
                            }
                          >
                            <SelectTrigger className="w-auto h-6 text-sm border-0 bg-transparent p-0 mt-1">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AUTOMATIC">
                                {t("common_.small.auto")}
                              </SelectItem>
                              <SelectItem value="MANUAL">
                                {t("common_.small.manual")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-lg font-bold text-foreground mt-1">
                            {rideData.bookingType}
                          </div>
                        )}
                      </div>
                      <div
                        className={`w-2 h-2 ${
                          rideData.bookingType === "AUTOMATIC"
                            ? "bg-primary"
                            : "bg-slate-400"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Quick Action Card */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden p-4 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            {t("common_.small.action")}
                          </div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                            {t("common_.small.manage")}
                          </div>
                        </div>
                      </div>
                      {rideData.status !== "CANCELLED" && (
                        <CancelRideDialog
                          rideId={rideData.id}
                          hasConfirmedBookings={hasConfirmedBookings}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden hover:shadow-lg  transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6 bg-primary-500">
                    <h3 className="text-xl font-bold text-white py-2 px-4">
                      {t("RideDetails.vehicleInfo", "Vehicle Information")}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("PassengerHome.make")} {t("Register.and")}{" "}
                        {t("PassengerHome.model")}
                      </div>
                      <div className="font-bold text-foreground text-lg">
                        {rideData.vehicle.make} {rideData.vehicle.model}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("driver_.year", "Year")}
                      </div>
                      <div className="font-bold text-foreground text-lg">
                        {rideData.vehicle.year}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("RideDetails.vehicle.color", "Color")}
                      </div>
                      <div className="font-bold text-foreground text-lg">
                        {rideData.vehicle.color}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("DriverDashboard.sheet.plate", "Plate")}
                      </div>
                      <div className="font-bold text-foreground text-lg font-mono">
                        {rideData.vehicle.plateNumber}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                {rideData.preferences && (
                  <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-gray-600/5" />
                    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 mb-6 bg-primary-500 py-2 px-4">
                        <h3 className="text-xl font-bold text-white">
                          {t("RideDetails.preference_s", "Ride Preferences")}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50">
                              <input
                                type="checkbox"
                                id="smoking"
                                checked={editData.preferences?.smoking || false}
                                onChange={(e) =>
                                  handleInputChange("preferences", {
                                    ...editData.preferences,
                                    smoking: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-primary border-input focus:ring-primary"
                              />
                              <Label
                                htmlFor="smoking"
                                className="text-sm font-medium"
                              >
                                {t(
                                  "RideDetails.preferences.smoking",
                                  "Smoking"
                                )}
                              </Label>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50">
                              <input
                                type="checkbox"
                                id="pets"
                                checked={editData.preferences?.pets || false}
                                onChange={(e) =>
                                  handleInputChange("preferences", {
                                    ...editData.preferences,
                                    pets: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-primary border-input focus:ring-primary"
                              />
                              <Label
                                htmlFor="pets"
                                className="text-sm font-medium"
                              >
                                {t("RideDetails.preferences.pets", "Pets")}
                              </Label>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50">
                              <input
                                type="checkbox"
                                id="airConditioning"
                                checked={
                                  editData.preferences?.airConditioning || false
                                }
                                onChange={(e) =>
                                  handleInputChange("preferences", {
                                    ...editData.preferences,
                                    airConditioning: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-primary border-input focus:ring-primary"
                              />
                              <Label
                                htmlFor="airConditioning"
                                className="text-sm font-medium"
                              >
                                {t(
                                  "RideDetails.preferences.airConditioning",
                                  "Air Conditioning"
                                )}
                              </Label>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50">
                              <input
                                type="checkbox"
                                id="bicycleSupport"
                                checked={
                                  editData.preferences?.bicycleSupport || false
                                }
                                onChange={(e) =>
                                  handleInputChange("preferences", {
                                    ...editData.preferences,
                                    bicycleSupport: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-primary border-input focus:ring-primary"
                              />
                              <Label
                                htmlFor="bicycleSupport"
                                className="text-sm font-medium"
                              >
                                {t("common_.small.bicycleSupport")}
                              </Label>
                            </div>
                          </>
                        ) : (
                          <>
                            {[
                              {
                                id: "smoking",
                                enabled: rideData.preferences.smoking,
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
                                enabled: rideData.preferences.pets,
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
                                enabled: rideData.preferences.airConditioning,
                                icon: (
                                  <Wind className="h-5 w-5 text-muted-foreground" />
                                ),
                                label: t("common_.small.air"),
                              },
                              {
                                id: "bicycleSupport",
                                enabled: rideData.preferences.bicycleSupport,
                                icon: (
                                  <Bike className="h-5 w-5 text-muted-foreground" />
                                ), // ✅ Bike icon
                                label: t(
                                  "RideDetails.preferences.bicycleSupport",
                                  "Bicycle Support"
                                ),
                              },
                              {
                                id: "snowTires",
                                enabled: rideData.preferences.snowTires,
                                icon: (
                                  <Snowflake className="h-5 w-5 text-muted-foreground" />
                                ),
                                label: t("common_.small.Snow"),
                              },
                              {
                                id: "skiRack",
                                enabled: rideData.preferences.skiRack,
                                icon: (
                                  <Mountain className="h-5 w-5 text-muted-foreground" />
                                ), // 🎿 Ski rack
                                label: t("common_.small.SkiRack"),
                              },
                              {
                                id: "ladiesOnly",
                                enabled: rideData.preferences.ladiesOnly,
                                icon: (
                                  <UserRound className="h-5 w-5 text-muted-foreground" />
                                ),
                                label: t("common_.small.LadiesOnly"),
                              },
                              {
                                id: "gentsOnly",
                                enabled: rideData.preferences.gentsOnly,
                                icon: (
                                  <Users className="h-5 w-5 text-muted-foreground" />
                                ), // 👥 Male group / alternative
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
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 mt-3 p-4">
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted border border-border">
                          <div className="flex items-center gap-3">
                            <Music className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {t("profile.preferences.music")}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground uppercase">
                            {t(
                              `profile.preferences.musicLevels.${rideData.preferences.music.toLowerCase()}`
                            )}
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
                            {rideData.preferences.luggageCount ?? 0}
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
                            {t(
                              `RideDetails.preferences.luggageSize.${rideData.preferences.luggageSize.toLowerCase()}`
                            ) ?? "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Driver Information */}
                <div className="relative overflow-hidden">
                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/30 dark:border-gray-700/30 pb-4 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-3 mb-6 bg-primary-500 py-2 w-full">
                      <h3 className="text-xl font-bold text-white px-4">
                        {t("RideDetails.driverInfo", "Your Driver")}
                      </h3>
                    </div>{" "}
                    <div className="flex items-center gap-6 px-4">
                      <div className="relative">
                        {rideData.driver.profileImage ? (
                          <img
                            src={rideData.driver.profileImage.url}
                            alt={rideData.driver.name}
                            className="size-24 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="size-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                            <User className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 size-6 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div>
                          <div className="text-xl font-bold text-foreground">
                            {rideData?.driver?.firstName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("common_.small.verify")}
                          </div>
                        </div>

                        <div className="space-y-1">
                          {rideData.driver.phoneNumber && (
                            <div className="flex items-center gap-2 text-lg text-muted-foreground">
                              <Phone className="h-5 w-5" />
                              <span>{rideData.driver.phoneNumber}</span>
                            </div>
                          )}
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

                {/* Ride Management Actions */}
                <div className="bg-red-100 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                    {/* Report Section */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                        {t("common_.small.report")}
                      </h3>

                      {passengerList.length > 1 ? (
                        <div className="space-y-3">
                          <Select
                            onValueChange={(value) =>
                              setSelectedPassengerId(value)
                            }
                            value={selectedPassengerId ?? undefined}
                          >
                            <SelectTrigger className="w-full border border-slate-300 dark:border-slate-600">
                              <SelectValue placeholder="Select a passenger to report" />
                            </SelectTrigger>
                            <SelectContent>
                              {passengerList.map((passenger) => (
                                <SelectItem
                                  key={passenger.id}
                                  value={String(passenger.id)}
                                >
                                  {passenger.firstName} {passenger.lastName} (
                                  {passenger.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selectedPassengerId && (
                            <DriverComplaintDialog
                              passengerId={selectedPassengerId}
                              rideId={rideData.id}
                            />
                          )}
                        </div>
                      ) : passengerList.length === 1 ? (
                        <div className="space-y-3">
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {t("common_.small.reporting")}:{" "}
                            {passengerList[0].firstName}{" "}
                            {passengerList[0].lastName}
                          </div>
                          <DriverComplaintDialog
                            passengerId={String(passengerList[0].id)}
                            rideId={rideData.id}
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {t("common_.small.noPas")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Removed - moved to quick action card above */}
              </div>
            )}

            {activeTab === "map" && (
              <div className="h-96">
                <RideMap
                  startPoint={rideData.departureLocation}
                  endPoint={rideData.destinationLocation}
                  stops={rideData.stopovers}
                  mode="view"
                  hideButton={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {canEdit && rideData && (
        <EditRideModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          ride={rideData}
          timeZone={timeZone}
        />
      )}
    </div>
  );
};

export default RideDetails;
