import { useEffect, useMemo, useState } from "react";
import {
  DoorToDoorRide,
  DoorToDoorRequest,
  DoorToDoorRequestStatus,
} from "@/lib/types";
import {
  useAcceptDoorToDoorRequest,
  useDeclineDoorToDoorRequest,
  useDoorToDoorDriverRequests,
  useDoorToDoorDriverRides,
  useStartDoorToDoorRide,
  useCompleteDoorToDoorRide,
  useSaveDoorToDoorSettings,
  usePublishDoorToDoorRide,
  useDeleteDoorToDoorRide,
} from "@/hooks/useDoorToDoor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import LoadingIndicator from "@/components/LoadingIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  CircleDot,
  Lock,
  MapPin,
  RefreshCcw,
  SlidersHorizontal,
  Users,
  XCircle,
  Edit,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

type DoorToDoorRideWithMeta = DoorToDoorRide & {
  ride?: {
    id: number;
    type?: string;
    isDoorToDoor?: boolean;
    departureLocation?: {
      city?: string;
      locationName?: string;
      address?: string;
      region?: string;
    };
    destinationLocation?: {
      city?: string;
      locationName?: string;
      address?: string;
      region?: string;
    };
    driverStartLocation?: {
      city?: string;
      locationName?: string;
      address?: string;
      region?: string;
    };
    driverStopLocation?: {
      city?: string;
      locationName?: string;
      address?: string;
      region?: string;
    };
    departureTime?: string;
    availableSeats?: number;
    totalSeats?: number;
    status?: string;
  };
};

const formatDetour = (detourKm?: number, detourMinutes?: number) => {
  if (!detourKm && !detourMinutes) return "—";
  const distance = detourKm
    ? `${detourKm.toFixed(detourKm > 10 ? 0 : 1)} km`
    : null;
  const time = detourMinutes ? `${Math.round(detourMinutes)} min` : null;
  return [distance, time].filter(Boolean).join(" • ");
};

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "PPpp");
};

const DriverDoorToDoor = () => {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const statusColors: Record<
    DoorToDoorRequestStatus | "POSTED",
    { className: string; label: string }
  > = {
    POSTED: {
      className:
        "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
      label: t("DoorToDoor.dashboard.driver.pendingDriverAction"),
    },
    ACCEPTED: {
      className:
        "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
      label: t("DoorToDoor.dashboard.driver.accepted"),
    },
    DECLINED: {
      className:
        "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
      label: t("DoorToDoor.dashboard.driver.declined"),
    },
    CANCELED: {
      className:
        "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
      label: t("DoorToDoor.dashboard.passenger.canceled"),
    },
    EXPIRED: {
      className:
        "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700",
      label: t("DoorToDoor.dashboard.passenger.expired"),
    },
  };

  const { data: driverRides, isLoading: ridesLoading } =
    useDoorToDoorDriverRides();
  const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [d2dSettings, setD2dSettings] = useState({
    radiusKm: 0,
    capacity: 1,
    notes: "",
  });

  const selectedRide: DoorToDoorRideWithMeta | undefined = useMemo(() => {
    if (!driverRides || driverRides.length === 0) return undefined;
    if (selectedRideId === null) {
      return undefined; // Don't auto-select, show "Select ride" message
    }
    return driverRides.find((ride) => ride.rideId === selectedRideId) as
      | DoorToDoorRideWithMeta
      | undefined;
  }, [driverRides, selectedRideId]);

  const { data: requests, isLoading: requestsLoading } =
    useDoorToDoorDriverRequests(selectedRide?.rideId);

  const acceptRequest = useAcceptDoorToDoorRequest();
  const declineRequest = useDeclineDoorToDoorRequest();
  const startRide = useStartDoorToDoorRide();
  const completeRide = useCompleteDoorToDoorRide();
  const saveD2DSettings = useSaveDoorToDoorSettings();
  const publishD2DRide = usePublishDoorToDoorRide();
  const deleteD2DRide = useDeleteDoorToDoorRide();

  useEffect(() => {
    if (!selectedRide) {
      // Reset settings when no ride is selected
      setD2dSettings({
        radiusKm: 0,
        capacity: 1,
        notes: "",
      });
      setIsEditingSettings(false);
      return;
    }
    // Initialize D2D settings when ride is selected
    setD2dSettings({
      radiusKm: selectedRide.radiusKm || 0,
      capacity: selectedRide.capacity || 1,
      notes: selectedRide.configurationNotes || "",
    });
    setIsEditingSettings(false);
  }, [selectedRide?.id]);

  const handleSelectRide = (ride: DoorToDoorRide) => {
    setSelectedRideId(ride.rideId);
    // window.location.replace(`/`)
  };

  const handleAccept = (request: DoorToDoorRequest) => {
    acceptRequest.mutate({
      requestId: request.id,
      rideId: request.rideId,
    });
  };

  const handleDecline = (request: DoorToDoorRequest) => {
    declineRequest.mutate({
      requestId: request.id,
      rideId: request.rideId,
    });
  };

  const handleStart = (request: DoorToDoorRequest) => {
    startRide.mutate({
      requestId: request.id,
      rideId: request.rideId,
    });
  };

  const handleComplete = (request: DoorToDoorRequest) => {
    completeRide.mutate({
      requestId: request.id,
      rideId: request.rideId,
    });
  };

  const handleSaveSettings = () => {
    if (!selectedRide) return;
    saveD2DSettings.mutate({
      rideId: selectedRide.rideId,
      radiusKm: d2dSettings.radiusKm,
      capacity: d2dSettings.capacity,
      notes: d2dSettings.notes.trim(),
      existingRide: selectedRide.ride, // Pass existing ride data to avoid extra fetch
    });
    setIsEditingSettings(false);
  };

  const handlePublish = () => {
    if (!selectedRide) return;
    publishD2DRide.mutate({ rideId: selectedRide.rideId });
  };

  const handleDelete = () => {
    if (!selectedRide) return;
    deleteD2DRide.mutate(
      { rideId: selectedRide.rideId },
      {
        onSuccess: () => {
          setSelectedRideId(null);
          setDeleteDialogOpen(false);
        },
      }
    );
  };

  if (ridesLoading) {
    return <LoadingIndicator />;
  }

  const pendingRequests =
    requests?.filter((request) => request.status === "POSTED").length ?? 0;

  // Helper function to get ride route display name
  const getRideRouteName = (ride: DoorToDoorRideWithMeta) => {
    const rideData = ride.ride;
    if (!rideData) return t("DoorToDoor.dashboard.driver.unnamedRoute");

    // For D2D rides, use driverStartLocation and driverStopLocation
    const isD2D = rideData.type === "D2D" || rideData.isDoorToDoor === true;

    if (isD2D) {
      const startLocation =
        rideData.driverStartLocation || rideData.departureLocation;
      const stopLocation =
        rideData.driverStopLocation || rideData.destinationLocation;

      const startName =
        startLocation?.city ||
        startLocation?.locationName ||
        startLocation?.address ||
        t("DoorToDoor.dashboard.driver.startingPoint", "Starting Point");

      const stopName =
        stopLocation?.city ||
        stopLocation?.locationName ||
        stopLocation?.address ||
        t("DoorToDoor.dashboard.driver.destinationPoint", "Destination");

      return `${startName} → ${stopName}`;
    } else {
      // For P2P rides, use departureLocation and destinationLocation
      const departureName =
        rideData.departureLocation?.city ||
        rideData.departureLocation?.locationName ||
        rideData.departureLocation?.address ||
        t("DoorToDoor.dashboard.driver.departure", "Departure");

      const destinationName =
        rideData.destinationLocation?.city ||
        rideData.destinationLocation?.locationName ||
        rideData.destinationLocation?.address ||
        t("DoorToDoor.dashboard.driver.destination", "Destination");

      return `${departureName} → ${destinationName}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {t("DoorToDoor.dashboard.driver.title")}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              {t("DoorToDoor.dashboard.driver.description")}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {driverRides && driverRides.length > 0 ? (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side - Ride List */}
              <div className="space-y-4">
                <div className="border border-slate-200 dark:border-slate-700">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t("DoorToDoor.dashboard.driver.yourRides")}
                  </div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {driverRides.map((ride) => {
                      const typedRide = ride as DoorToDoorRideWithMeta;
                      const isSelected = selectedRide?.rideId === ride.rideId;
                      // console.log({
                      //   ride
                      // })
                      return (
                        <button
                          key={ride.id}
                          onClick={() => handleSelectRide(ride)}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            isSelected
                              ? "bg-primary-600 text-white"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-semibold truncate">
                                {getRideRouteName(typedRide)}
                              </span>
                              <span
                                className={`text-xs ${
                                  isSelected
                                    ? "text-white/80"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {typedRide?.ride?.departureTime
                                  ? formatDate(typedRide.ride?.departureTime)
                                  : t(
                                      "DoorToDoor.dashboard.driver.scheduledRide"
                                    )}
                              </span>
                            </div>
                            {ride.locked ? (
                              <Badge
                                variant="outline"
                                className={`flex items-center gap-1 text-xs uppercase flex-shrink-0 ${
                                  isSelected
                                    ? "border-white text-white"
                                    : "border-amber-500 text-amber-600"
                                }`}
                              >
                                <Lock className="h-3 w-3" />
                                {t("DoorToDoor.dashboard.driver.locked")}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className={`text-xs uppercase flex-shrink-0 ${
                                  isSelected
                                    ? "border-white text-white"
                                    : ride.isEnabled
                                    ? "border-emerald-500 text-emerald-600"
                                    : "border-slate-400 text-slate-500"
                                }`}
                              >
                                {ride.isEnabled
                                  ? t("DoorToDoor.dashboard.driver.active")
                                  : t("DoorToDoor.dashboard.driver.disabled")}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side - Ride Details and CRUD Operations */}
              <div className="space-y-4">
                {selectedRide ? (
                  <>
                    {/* D2D Settings and Actions Section */}
                    <div className="border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm uppercase tracking-wide">
                          <Settings className="h-4 w-4" />
                          {t(
                            "DoorToDoor.dashboard.driver.settings",
                            "Settings"
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!isEditingSettings && selectedRide.ride?.status === "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsEditingSettings(true)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              {t("createRide.driver.rideDetails.edit", "Edit")}
                            </Button>
                          )} 
                          {isEditingSettings && selectedRide.ride?.status === "DRAFT" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsEditingSettings(false);
                                  if (selectedRide) {
                                    setD2dSettings({
                                      radiusKm: selectedRide.radiusKm || 0,
                                      capacity: selectedRide.capacity || 1,
                                      notes:
                                        selectedRide.configurationNotes || "",
                                    });
                                  }
                                }}
                              >
                                {t("common_.cancel", "Cancel")}
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveSettings}
                                disabled={
                                  saveD2DSettings.isPending ||
                                  d2dSettings.radiusKm < 0 ||
                                  d2dSettings.capacity < 1
                                }
                                className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white"
                              >
                                <Save className="h-3 w-3" />
                                {saveD2DSettings.isPending
                                  ? t(
                                      "DoorToDoor.dashboard.driver.saving",
                                      "Saving..."
                                    )
                                  : t(
                                      "DoorToDoor.dashboard.driver.saveSettings",
                                      "Save"
                                    )}
                              </Button>
                            </>
                          )}
                          {selectedRide.ride?.status === "DRAFT" && (
                            <Button
                              size="sm"
                              onClick={handlePublish}
                              disabled={publishD2DRide.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {publishD2DRide.isPending
                                ? t("general.publishing", "Publishing...")
                                : t("common_.small.publish", "Publish")}
                            </Button>
                          )}
                          <Dialog
                            open={deleteDialogOpen}
                            onOpenChange={setDeleteDialogOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-3 w-3" />
                                {t("common_.delete", "Delete")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  {t(
                                    "DoorToDoor.dashboard.driver.deleteRide",
                                    "Delete Door-to-Door Ride"
                                  )}
                                </DialogTitle>
                                <DialogDescription>
                                  {t(
                                    "DoorToDoor.dashboard.driver.deleteRideConfirm",
                                    "Are you sure you want to delete this door-to-door ride? This action cannot be undone."
                                  )}
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setDeleteDialogOpen(false)}
                                  disabled={deleteD2DRide.isPending}
                                >
                                  {t("common_.cancel", "Cancel")}
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={handleDelete}
                                  disabled={deleteD2DRide.isPending}
                                >
                                  {deleteD2DRide.isPending
                                    ? t("general.deleting", "Deleting...")
                                    : t("common_.delete", "Delete")}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 justify-between">
                          <Label className="text-slate-600 dark:text-slate-400">
                            {t("DoorToDoor.dashboard.driver.radius", "Radius")}{" "}
                            (km)
                          </Label>
                          {isEditingSettings ? (
                            <Input
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
                              className="w-32"
                            />
                          ) : (
                            <span className="text-slate-900 dark:text-white font-medium">
                              {d2dSettings.radiusKm} km
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 justify-between">
                          <Label className="text-slate-600 dark:text-slate-400">
                            {t(
                              "DoorToDoor.dashboard.driver.maxRequests",
                              "Max Seats"
                            )}
                          </Label>
                          {isEditingSettings ? (
                            <Input
                              type="number"
                              min={1}
                              value={d2dSettings.capacity}
                              onChange={(e) =>
                                setD2dSettings((prev) => ({
                                  ...prev,
                                  capacity: parseInt(e.target.value) || 1,
                                }))
                              }
                              className="w-32"
                            />
                          ) : (
                            <span className="text-slate-900 dark:text-white font-medium">
                              {d2dSettings.capacity}
                            </span>
                          )}
                        </div>

                        <div>
                          <Label className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1 block">
                            {t(
                              "DoorToDoor.dashboard.driver.internalNote",
                              "Internal note (optional)"
                            )}
                          </Label>
                          {isEditingSettings ? (
                            <Textarea
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
                          ) : (
                            <div className="mt-1 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white min-h-[60px]">
                              {d2dSettings.notes || (
                                <span className="text-slate-400 italic">
                                  {t("common_.noNotes", "No notes")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ride Details */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            {t("DoorToDoor.dashboard.driver.status", "Status")}:
                          </span>
                          <Badge
                            className={
                              selectedRide.ride?.status === "PUBLISHED"
                                ? "bg-emerald-500 text-white"
                                : selectedRide.ride?.status === "DRAFT"
                                ? "bg-amber-500 text-white"
                                : "bg-slate-500 text-white"
                            }
                          >
                            {selectedRide.ride?.status || "—"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            {t("DoorToDoor.dashboard.driver.route", "Route")}
                            :
                          </span>
                          <span className="text-slate-900 dark:text-white font-medium text-right max-w-xs truncate">
                            {getRideRouteName(selectedRide)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            {t("DoorToDoor.dashboard.driver.totalRequests", "Total Requests")}:
                          </span>
                          <span className="text-slate-900 dark:text-white font-medium">
                            {selectedRide.totalRequests || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            {t("DoorToDoor.dashboard.driver.remainingCapacity", "Remaining Capacity")}:
                          </span>
                          <span className="text-slate-900 dark:text-white font-medium">
                            {selectedRide.remainingCapacity || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Empty state when no ride is selected
                  <div className="border border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                    <div className="w-16 h-16 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-full flex items-center justify-center mb-4">
                      <MapPin className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {t(
                        "DoorToDoor.dashboard.driver.selectRide",
                        "Select a Ride"
                      )}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm">
                      {t(
                        "DoorToDoor.dashboard.driver.selectRideMessage",
                        "Select a ride from the list to view details and manage requests"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Requests Section */}
            <div className="space-y-4 mt-4">
              <div className="border border-slate-200 dark:border-slate-700">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    <Users className="h-4 w-4" />
                    {t("DoorToDoor.dashboard.driver.requests")}
                    {pendingRequests > 0 && (
                      <Badge className="bg-amber-500 text-white rounded-none">
                        {pendingRequests}{" "}
                        {t("DoorToDoor.dashboard.driver.pending")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <CircleDot className="h-3 w-3 text-amber-500" />
                      {t("DoorToDoor.dashboard.driver.pendingLabel")}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      {t("DoorToDoor.dashboard.driver.accepted")}
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      {t(
                        "DoorToDoor.dashboard.driver.declinedCanceled"
                      )}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {requestsLoading ? (
                    <div className="p-8">
                      <LoadingIndicator />
                    </div>
                  ) : requests && requests.length > 0 ? (
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {t("DoorToDoor.dashboard.driver.passenger")}
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {t(
                              "DoorToDoor.dashboard.driver.pickupDropoff"
                            )}
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {t("DoorToDoor.dashboard.driver.submitted")}
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {t("DoorToDoor.dashboard.driver.detour")}
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {t("DoorToDoor.dashboard.driver.status")}
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {t("DoorToDoor.dashboard.driver.actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                        {requests.map((request) => {
                          const badge =
                            statusColors[
                              request.status as DoorToDoorRequestStatus
                            ] ?? statusColors.POSTED;

                            console.log({ request });
                         return (
                                <tr
                                  key={request.id}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                  {/* PASSENGER */}
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        {request.passenger?.firstName ??
                                          `${t(
                                            "DoorToDoor.dashboard.driver.passengerLabel"
                                          )}${request.passengerId}`}
                                      </span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {t("DoorToDoor.dashboard.driver.bookingLabel")}
                                        {request.id}
                                      </span>
                                    </div>
                                  </td>

                                  {/* PICKUP / DROPOFF */}
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                    <div className="space-y-1 max-w-xs">
                                      <div>
                                        <span className="text-xs uppercase text-slate-500 dark:text-slate-400">
                                          {t("DoorToDoor.dashboard.driver.pickup")}
                                        </span>
                                        <div className="truncate">
                                          {request.pickupLocation?.locationName ??
                                            request.pickupLocation?.city ??
                                            "—"}
                                        </div>
                                      </div>

                                      <div>
                                        <span className="text-xs uppercase text-slate-500 dark:text-slate-400">
                                          {t("DoorToDoor.dashboard.driver.dropoff")}
                                        </span>
                                        <div className="truncate">
                                          {request.dropoffLocation?.locationName ??
                                            request.dropoffLocation?.city ??
                                            "—"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* SUBMITTED */}
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    {formatDate(request.createdAt)}
                                  </td>

                                  {/* DETOUR */}
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    {formatDetour(
                                      request.extraKms ?? 0,
                                      null
                                    )}
                                  </td>

                                  {/* STATUS */}
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium uppercase ${badge.className}`}
                                    >
                                      {badge.label}
                                    </span>
                                  </td>

                                  {/* ACTIONS */}
                                  <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2 flex-nowrap">
                                      {request.status === "POSTED" ? (
                                        <>
                                          <Button
                                            size="sm"
                                            onClick={() => handleAccept(request)}
                                            disabled={
                                              acceptRequest.isPending ||
                                              declineRequest.isPending
                                            }
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                          >
                                            {acceptRequest.isPending
                                              ? t("DoorToDoor.dashboard.driver.accepting")
                                              : t("DoorToDoor.dashboard.driver.accept")}
                                          </Button>

                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={
                                              acceptRequest.isPending ||
                                              declineRequest.isPending
                                            }
                                            onClick={() => handleDecline(request)}
                                            className="border-slate-300 dark:border-slate-600 hover:bg-slate-500 dark:hover:bg-slate-800"
                                          >
                                            {declineRequest.isPending
                                              ? t("DoorToDoor.dashboard.driver.declining")
                                              : t("DoorToDoor.dashboard.driver.decline")}
                                          </Button>
                                        </>
                                      ):(
                                        <span className="text-center w-full pl-20 text-sm text-slate-500 dark:text-slate-400 italic">
                                          {"====="}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-600 dark:text-slate-400 flex flex-col items-center gap-3">
                      <RefreshCcw className="h-8 w-8 text-slate-400" />
                      <p>
                        {t("DoorToDoor.dashboard.driver.noRequests")}
                      </p>
                      <p className="text-xs max-w-sm">
                        {t(
                          "DoorToDoor.dashboard.driver.noRequestsDescription"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedRide?.locked && (
              <div className="border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100 px-4 py-3 flex items-start gap-3 text-sm">
                <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p>{t("DoorToDoor.dashboard.driver.lockedMessage")}</p>
              </div>
            )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
              <div className="w-16 h-16 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-2 max-w-lg">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t("DoorToDoor.dashboard.driver.noRidesTitle")}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("DoorToDoor.dashboard.driver.noRidesDescription")}
                </p>
              </div>
              <Button
                asChild
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                <a href="/post-a-ride">
                  {t("DoorToDoor.dashboard.driver.postRide")}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDoorToDoor;
