import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  MapPin,
  User,
  Car,
  DollarSign,
  Eye,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import { useAdminRides } from "@/hooks/useAdminRides";
import { formatCurrency } from "@/lib/currency";

interface RideLike {
  id: number;
  status?: string;
  contribution?: number;
  departureTime?: string | Date;
  estimatedArrivalTime?: string | Date;
  bookingType?: string;
  totalSeats?: number;
  availableSeats?: number;
  departureLocation?: {
    city?: string;
    region?: string;
    locationName?: string;
  } | null;
  destinationLocation?: {
    city?: string;
    region?: string;
    locationName?: string;
  } | null;
  // D2D specific fields
  type?: "D2D" | "P2P";
  isDoorToDoor?: boolean;
  driverStartLocation?: {
    city?: string;
    region?: string;
    locationName?: string;
  } | null;
  driverStopLocation?: {
    city?: string;
    region?: string;
    locationName?: string;
  } | null;
  driver?: { name?: string; email?: string } | null;
  vehicle?: {
    make?: string;
    model?: string;
    year?: number;
    plateNumber?: string;
  } | null;
  preferences?: {
    pets?: boolean;
    airConditioning?: boolean;
    snowTires?: boolean;
    luggageSize?: string;
  } | null;
  stopovers?: Array<{
    id?: number | string;
    locationName?: string;
    city?: string;
  }>;
  isBlocked?: boolean;
}

type Props = { ride: RideLike };

const getStatusBadgeClass = (status?: string) => {
  switch (status) {
    case "PUBLISHED":
    case "ACTIVE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "CANCELLED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "DRAFT":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
};

export function AdminRideDetails({ ride }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showBlockReason, setShowBlockReason] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showCancellationNotes, setShowCancellationNotes] = useState(false);
  const [cancellationNotes, setCancellationNotes] = useState("");

  const {
    blockRide,
    unblockRide,
    reviewRideCancellation,
    isBlocking,
    isUnblocking,
    isReviewing,
  } = useAdminRides();

  const locale = i18n.language?.toLowerCase().startsWith("fr")
    ? "fr-CA"
    : "en-CA";

  const bookedSeats = Math.max(
    0,
    (ride?.totalSeats || 0) - (ride?.availableSeats || 0)
  );

  const handleBlockRide = () => {
    if (!blockReason.trim()) {
      alert(
        t(
          "AdminDashboard.Rides.reasonRequired",
          "Please provide a reason for blocking this ride."
        )
      );
      return;
    }
    blockRide({
      rideId: ride?.id as number,
      reason: blockReason.trim(),
    });
    setBlockReason("");
    setShowBlockReason(false);
  };

  const handleApproveCancellation = () => {
    reviewRideCancellation({
      rideId: ride?.id as number,
      cancellationCountsAgainstAllowance: "YES",
    });
    setCancellationNotes("");
    setShowCancellationNotes(false);
  };

  const handleRejectCancellation = () => {
    reviewRideCancellation({
      rideId: ride?.id as number,
      cancellationCountsAgainstAllowance: "NO",
    });
    setCancellationNotes("");
    setShowCancellationNotes(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="dark:border-gray-700 dark:text-gray-200 dark:bg-gray-900"
        >
          <Eye className="h-4 w-4 mr-1" />
          {t("general.view")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900"
        style={{ zIndex: 9999 }}
      >
        <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-2xl font-bold dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-xl font-semibold">
                {t("AdminDashboard.Rides.details.title", "Ride Details")} #
                {ride?.id}
              </div>
              <div className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {t(
                  "AdminDashboard.Rides.details.subtitle",
                  "Complete ride information and admin controls"
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Ride Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t(
                      "AdminDashboard.Rides.details.rideOverview",
                      "Ride Overview"
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t("AdminDashboard.Rides.details.rideId", "Ride ID")}: #
                    {ride?.id}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge className={getStatusBadgeClass(ride?.status)}>
                  {ride?.status || "UNKNOWN"}
                </Badge>
                {ride.isBlocked && (
                  <div
                    className={`"bg-red-400 border border-red-400 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg px-2 py-1 text-xs font-medium"`}
                  >
                    {t("AdminDashboard.Rides.details.blocked", "BLOCKED")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Driver Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {t(
                    "AdminDashboard.Rides.details.driverInfo",
                    "Driver Information"
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t(
                      "AdminDashboard.Rides.details.driverName",
                      "Driver Name"
                    )}
                  </span>
                  <span className="text-sm font-medium dark:text-white">
                    {ride?.driver?.name || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t("AdminDashboard.Rides.details.driverEmail", "Email")}
                  </span>
                  <span className="text-sm font-medium dark:text-white">
                    {ride?.driver?.email || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Car className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {t(
                    "AdminDashboard.Rides.details.vehicleInfo",
                    "Vehicle Information"
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t(
                      "AdminDashboard.Rides.details.vehicleModel",
                      "Vehicle Model"
                    )}
                  </span>
                  <span className="text-sm font-medium dark:text-white">
                    {ride?.vehicle?.year ? `${ride.vehicle.year} ` : ""}
                    {ride?.vehicle?.make || ""} {ride?.vehicle?.model || ""}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t(
                      "AdminDashboard.Rides.details.plateNumber",
                      "Plate Number"
                    )}
                  </span>
                  <span className="text-sm font-medium dark:text-white">
                    {ride?.vehicle?.plateNumber || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {t(
                    "AdminDashboard.Rides.details.routeInfo",
                    "Route Information"
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t("AdminDashboard.Rides.details.from", "From")}
                  </span>
                  <span className="text-sm font-medium dark:text-white text-right max-w-[200px]">
                    {ride?.type === "D2D" || ride?.isDoorToDoor
                      ? ride?.driverStartLocation?.city ||
                        ride?.driverStartLocation?.locationName ||
                        "-"
                      : ride?.departureLocation?.city ||
                        ride?.departureLocation?.locationName ||
                        "-"}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t("AdminDashboard.Rides.details.to", "To")}
                  </span>
                  <span className="text-sm font-medium dark:text-white text-right max-w-[200px]">
                    {ride?.type === "D2D" || ride?.isDoorToDoor
                      ? ride?.driverStopLocation?.city ||
                        ride?.driverStopLocation?.locationName ||
                        "-"
                      : ride?.destinationLocation?.city ||
                        ride?.destinationLocation?.locationName ||
                        "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {t(
                    "AdminDashboard.Rides.details.bookingInfo",
                    "Booking Information"
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t("AdminDashboard.Rides.details.seats", "Seats")}
                  </span>
                  <span className="text-sm font-medium dark:text-white">
                    {bookedSeats}/{ride?.totalSeats ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t(
                      "AdminDashboard.Rides.details.bookingType",
                      "Booking Type"
                    )}
                  </span>
                  <span className="text-sm font-medium dark:text-white">
                    {ride?.bookingType || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t(
                      "AdminDashboard.Rides.details.contribution",
                      "Contribution"
                    )}
                  </span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    {formatCurrency((ride?.contribution || 0) * 100)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions Section - Only show if ride is not completed or cancelled */}
          {ride?.status !== "COMPLETED" && ride?.status !== "CANCELLED" && (
            <div
              className={` p-6 ${
                ride?.isBlocked != true
                  ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                  : "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800"
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    ride?.isBlocked != true
                      ? "bg-red-100 dark:bg-red-900/30"
                      : "bg-green-100 dark:bg-green-900/30"
                  }`}
                >
                  <Shield
                    className={`h-5 w-5 ${
                      ride?.isBlocked != true
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {t("AdminDashboard.Rides.adminActions", "Admin Actions")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t(
                      "AdminDashboard.Rides.adminActionsDescription",
                      "Manage ride status and permissions"
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ride?.isBlocked !== true && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      onClick={() => setShowBlockReason(true)}
                      disabled={isBlocking}
                    >
                      {isBlocking ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          {t("common.processing", "Processing...")}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          {t("AdminDashboard.Rides.block", "Block Ride")}
                        </div>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t(
                        "AdminDashboard.Rides.blockDescription",
                        "Block ride with reason"
                      )}
                    </p>
                  </div>
                )}

                {/* Unblock Ride - Only show if ride is blocked */}
                {ride?.isBlocked === true && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                      onClick={() =>
                        unblockRide({ rideId: ride?.id as number })
                      }
                      disabled={isUnblocking}
                    >
                      {isUnblocking ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          {t("common.processing", "Processing...")}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          {t("AdminDashboard.Rides.unblock", "Unblock Ride")}
                        </div>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t(
                        "AdminDashboard.Rides.unblockDescription",
                        "Remove ride block"
                      )}
                    </p>
                  </div>
                )}

                {/* Approve Cancellation - Only show if ride is pending cancellation */}
                {ride?.status === "PENDING_CANCELLATION" && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      onClick={() => setShowCancellationNotes(true)}
                      disabled={isReviewing}
                    >
                      {isReviewing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          {t("common.processing", "Processing...")}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          {t(
                            "AdminDashboard.Rides.reviewCancel",
                            "Review Cancellation"
                          )}
                        </div>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {t(
                        "AdminDashboard.Rides.approveDescription",
                        "Review ride cancellation"
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Block Reason Input */}
              {showBlockReason && (
                <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-red-700 dark:text-red-400">
                      {t("AdminDashboard.Rides.blockReason", "Block Reason")} *
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowBlockReason(false);
                        setBlockReason("");
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder={t(
                      "AdminDashboard.Rides.blockReasonPlaceholder",
                      "Enter the reason for blocking this ride..."
                    )}
                    className="mb-3"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBlockRide}
                      disabled={!blockReason.trim() || isBlocking}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isBlocking ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {t("common.processing", "Processing...")}
                        </div>
                      ) : (
                        t("AdminDashboard.Rides.confirmBlock", "Confirm Block")
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBlockReason(false);
                        setBlockReason("");
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancellation Review */}
              {showCancellationNotes && (
                <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      {t(
                        "AdminDashboard.Rides.reviewCancellation",
                        "Review Ride Cancellation"
                      )}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCancellationNotes(false);
                        setCancellationNotes("");
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t(
                      "AdminDashboard.Rides.cancellationReviewDescription",
                      "Decide whether this cancellation should count against the driver's allowance."
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApproveCancellation}
                      disabled={isReviewing}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isReviewing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {t("common.processing", "Processing...")}
                        </div>
                      ) : (
                        t(
                          "AdminDashboard.Rides.approveCancellation",
                          "Approve (Counts Against Allowance)"
                        )
                      )}
                    </Button>
                    <Button
                      onClick={handleRejectCancellation}
                      disabled={isReviewing}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isReviewing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {t("common.processing", "Processing...")}
                        </div>
                      ) : (
                        t(
                          "AdminDashboard.Rides.rejectCancellation",
                          "Approve (Doesn't Count Against Allowance)"
                        )
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCancellationNotes(false);
                        setCancellationNotes("");
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Status Messages */}
              {(isBlocking || isUnblocking || isReviewing) && (
                <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      {isBlocking &&
                        t(
                          "AdminDashboard.Rides.blockingRide",
                          "Blocking ride..."
                        )}
                      {isUnblocking &&
                        t(
                          "AdminDashboard.Rides.unblockingRide",
                          "Unblocking ride..."
                        )}
                      {isReviewing &&
                        t(
                          "AdminDashboard.Rides.reviewingCancellation",
                          "Reviewing cancellation..."
                        )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show message if ride is completed or cancelled */}
          {(ride?.status === "COMPLETED" || ride?.status === "CANCELLED") && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t(
                      "AdminDashboard.Rides.noActionsAvailable",
                      "No Actions Available"
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {ride?.status === "COMPLETED"
                      ? t(
                          "AdminDashboard.Rides.rideCompletedMessage",
                          "This ride has been completed and no further actions are available."
                        )
                      : t(
                          "AdminDashboard.Rides.rideCancelledMessage",
                          "This ride has been cancelled and no further actions are available."
                        )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={() => setOpen(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            {t("common.close", "Close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
