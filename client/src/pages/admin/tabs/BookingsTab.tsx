import React, { useState, useEffect } from "react";
import { useAllBookings, apiUrl, queryKey } from "@/data";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  MapPin,
  Eye,
  User as UserIcon,
  CreditCard,
  Car,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSingleBook } from "@/data";
import CustomLoader from "@/components/CustomLoader";
import { formatCurrency } from "@/lib/currency";
import { DownloadButton } from "@/components/admin/DownloadButton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { getToken } from "@/components/getToken";
import {
  AcceptBookingDialog,
  DeclineBookingDialog,
} from "@/components/RideDialog";

export const BookingsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [status, setStatus] = useState<string>("");
  const [relation, setRelation] = useState<string>("");
  const { data, isLoading } = useAllBookings(page, pageSize, {
    status: status || undefined,
    bookingRelation: relation || undefined,
  });

  const bookings = data?.data?.bookings ?? data?.data ?? [];
  const pagination = data?.data?.pagination ??
    data?.pagination ?? {
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
    };

  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null
  );
  const { data: singleBookingData } = useSingleBook({
    rideId: selectedBookingId || 0,
    enabled: !!selectedBookingId,
  });

  // Approve booking mutation - using standard bookings endpoint (not admin-specific)
  const { mutate: approveBooking, isPending: isApproving } = useMutation({
    mutationFn: async (bookingId: number) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/bookings/${bookingId}?lang=${currentLanguage}`,
        { status: "APPROVED" },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast.success(t("DriverDashboard.approveTitle", "Booking approved successfully"), {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({ queryKey: [queryKey.BOOKINGS] });
      if (selectedBookingId) {
        setSelectedBookingId(null);
        setTimeout(() => setSelectedBookingId(selectedBookingId), 100);
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          t("DriverDashboard.approveDescription", "Failed to approve booking"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  // Decline booking mutation - using standard bookings endpoint
  const { mutate: declineBooking, isPending: isDeclining } = useMutation({
    mutationFn: async ({
      bookingId,
      reason,
    }: {
      bookingId: number;
      reason: string;
    }) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/bookings/${bookingId}?lang=${currentLanguage}`,
        {
          status: "DECLINED",
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast.success(t("DriverDashboard.rejectTitle", "Booking declined successfully"), {
        className: "custom-success-toast",
      });
      queryClient.invalidateQueries({ queryKey: [queryKey.BOOKINGS] });
      if (selectedBookingId) {
        setSelectedBookingId(null);
        setTimeout(() => setSelectedBookingId(selectedBookingId), 100);
      }
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          t("DriverDashboard.rejectDescription", "Failed to decline booking"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const handleApprove = ({ id }: { id: number }) => {
    approveBooking(id);
  };

  const handleDecline = ({
    id,
    message,
    status,
  }: {
    id: number;
    message: string;
    status: string;
  }) => {
    declineBooking({ bookingId: id, reason: message });
  };

  useEffect(() => {
    setPage(1);
  }, [status, relation]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("common.all")}</option>
          <option value="PENDING">{t("general.pending")}</option>
          <option value="APPROVED">{t("general.approved")}</option>
          <option value="CANCELLED">{t("general.cancelled")}</option>
          <option value="COMPLETED">{t("general.completed")}</option>
        </select>
        <select
          className="px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        >
          <option value="">{t("common.all")}</option>
          <option value="DRIVER">Driver</option>
          <option value="PASSENGER">Passenger</option>
        </select>

        <DownloadButton
          type="bookings"
          params={{
            status: status || undefined,
            bookingRelation: relation || undefined,
          }}
          variant="outline"
          size="sm"
        />
      </div>

      <div className="rounded-md border dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {[
                t("booking.id"),
                t("ride.from"),
                t("ride.to"),
                t("booking.status"),
                t("booking.createdAt"),
                t("common.actions"),
              ].map((h) => (
                <th
                  key={h as string}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-10">
                  <div className="flex items-center justify-center">
                    <CustomLoader />
                  </div>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-muted-foreground"
                >
                  {t("booking.noBookingsFound")}
                </td>
              </tr>
            ) : (
              bookings.map((b: any) => (
                <tr
                  key={b.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    b.status === "PENDING"
                      ? "bg-yellow-50 dark:bg-yellow-900/10"
                      : b.status === "APPROVED"
                      ? "bg-green-50 dark:bg-green-900/10"
                      : b.status === "CANCELLED"
                      ? "bg-red-50 dark:bg-red-900/10"
                      : "bg-gray-50 dark:bg-gray-900/10"
                  }`}
                >
                  <td className="px-4 py-3">#{b.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {b.ride?.type === "D2D" || b.ride?.isDoorToDoor
                        ? b.ride?.driverStartLocation?.city ||
                          b.ride?.driverStartLocation?.region ||
                          "N/A"
                        : b.ride?.departureLocation?.city || "N/A"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {b.ride?.type === "D2D" || b.ride?.isDoorToDoor
                        ? b.ride?.driverStopLocation?.city ||
                          b.ride?.driverStopLocation?.region ||
                          "N/A"
                        : b.ride?.destinationLocation?.city || "N/A"}
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      b.status === "PENDING"
                        ? "text-yellow-500 dark:text-yellow-400"
                        : b.status === "APPROVED"
                        ? "text-green-500 dark:text-green-400"
                        : b.status === "CANCELLED"
                        ? "text-red-500 dark:text-red-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {/* {b.status} */}
                    {t(`common_.small.user.paymentTransaction.${b?.status}`)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      {b.status === "PENDING" &&
                        b.ride?.status === "PUBLISHED" &&
                        b.ride?.departureTime &&
                        new Date(b.ride.departureTime) > new Date() && (
                          <>
                            <DeclineBookingDialog
                              onClick={handleDecline}
                              bookingId={b.id}
                              isProcessing={isDeclining}
                            />
                            <AcceptBookingDialog
                              onClick={handleApprove}
                              bookingId={b.id}
                              isApproving={isApproving}
                            />
                          </>
                        )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBookingId(b.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> {t("general.view")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t("AdminDashboard.Rides.pagination.pageOf", {
            current: pagination.page,
            total: pagination.totalPages,
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
          >
            {t("common.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage(
                pagination.page < pagination.totalPages
                  ? pagination.page + 1
                  : pagination.page
              )
            }
            disabled={pagination.page >= pagination.totalPages}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>

      <Dialog
        open={!!selectedBookingId}
        onOpenChange={() => setSelectedBookingId(null)}
      >
        <DialogContent className="max-w-4xl dark:bg-gray-900">
          <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-2xl font-bold dark:text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {t("dashboard_.booking.details", "Booking Details")} #
                  {selectedBookingId}
                </div>
                <div className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  {t("dashboard_.booking.bookingInformation")}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!singleBookingData ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <CustomLoader />
                  <span className="text-gray-500 dark:text-gray-400">
                    {t(
                      "dashboard_.booking.loadingDetails",
                      "Loading booking details..."
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Booking Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {t(
                            "dashboard_.booking.bookingOverview",
                            "Booking Overview"
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {t("dashboard_.booking.bookingId", "Booking ID")}: #
                          {selectedBookingId}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          singleBookingData?.status === "COMPLETED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : singleBookingData?.status === "APPROVED"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : singleBookingData?.status === "CANCELLED"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {/* {singleBookingData?.status || "PENDING"} */}
                        {t(
                          `common_.small.user.paymentTransaction.${singleBookingData?.status}`
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* User Information */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white">
                        {t(
                          "dashboard_.booking.userInformation",
                          "User Information"
                        )}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t("dashboard_.booking.userId", "User ID")}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.userId ?? "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t("dashboard_.booking.seatsBooked", "Seats Booked")}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.seats ?? "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t("dashboard_.booking.createdAt", "Created At")}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.createdAt
                            ? new Date(
                                singleBookingData.createdAt
                              ).toLocaleString()
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white">
                        {t(
                          "dashboard_.booking.paymentInformation",
                          "Payment Information"
                        )}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t(
                            "dashboard_.booking.monetizationType",
                            "Monetization Type"
                          )}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.monitizationType ?? "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t(
                            "dashboard_.booking.transactionId",
                            "Transaction ID"
                          )}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.paymentTransaction?.id
                            ? `#${singleBookingData?.paymentTransaction?.id}`
                            : "N/A"}
                        </span>
                      </div>
                      {singleBookingData?.paymentTransaction?.amount !==
                        undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {t("dashboard_.booking.amount", "Amount")}
                          </span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(
                              (singleBookingData?.paymentTransaction?.amount ?? 0) * 100,
                              singleBookingData?.paymentTransaction?.currency
                            )}
                          </span>
                        </div>
                      )}
                      {singleBookingData?.paymentTransaction?.status && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {t(
                              "dashboard_.booking.paymentStatus",
                              "Payment Status"
                            )}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              singleBookingData?.paymentTransaction?.status ===
                              "COMPLETED"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : singleBookingData?.paymentTransaction
                                    ?.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {t(
                              `common_.small.user.paymentTransaction.${singleBookingData?.paymentTransaction?.status}, ${singleBookingData?.paymentTransaction?.status}`
                            )}
                          </span>
                        </div>
                      )}
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
                          "dashboard_.booking.vehicleInformation",
                          "Vehicle Information"
                        )}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t("dashboard_.booking.plateNumber", "Plate Number")}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.ride?.vehicle?.plateNumber ?? "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t(
                            "dashboard_.booking.vehicleModel",
                            "Vehicle Model"
                          )}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.ride?.vehicle?.make ?? "-"}{" "}
                          {singleBookingData?.ride?.vehicle?.model ?? ""}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t("dashboard_.booking.vehicleColor", "Color")}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.ride?.vehicle?.color ?? "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ride Information */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="text-lg font-semibold dark:text-white">
                        {t(
                          "dashboard_.booking.rideInformation",
                          "Ride Information"
                        )}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t("ride.from", "From")}
                        </span>
                        <span className="text-sm font-medium dark:text-white text-right max-w-[200px]">
                          {(() => {
                            const isD2D =
                              singleBookingData?.ride?.type === "D2D" ||
                              singleBookingData?.ride?.isDoorToDoor;
                            const loc = isD2D
                              ? singleBookingData?.ride?.driverStartLocation
                              : singleBookingData?.ride?.departureLocation;
                            if (!loc) return "-";
                            return (
                              loc?.city ||
                              loc?.locationName ||
                              [loc?.address, loc?.city, loc?.region]
                                .filter(Boolean)
                                .join(", ") ||
                              "-"
                            );
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t("ride.to", "To")}
                        </span>
                        <span className="text-sm font-medium dark:text-white text-right max-w-[200px]">
                          {(() => {
                            const isD2D =
                              singleBookingData?.ride?.type === "D2D" ||
                              singleBookingData?.ride?.isDoorToDoor;
                            const loc = isD2D
                              ? singleBookingData?.ride?.driverStopLocation
                              : singleBookingData?.ride?.destinationLocation;
                            if (!loc) return "-";
                            return (
                              loc?.city ||
                              loc?.locationName ||
                              [loc?.address, loc?.city, loc?.region]
                                .filter(Boolean)
                                .join(", ") ||
                              "-"
                            );
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {t("dashboard_.booking.driverId", "Driver ID")}
                        </span>
                        <span className="text-sm font-medium dark:text-white">
                          {singleBookingData?.ride?.driverId || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons for PENDING bookings */}
          {singleBookingData?.status === "PENDING" &&
            singleBookingData?.ride?.status === "PUBLISHED" &&
            singleBookingData?.ride?.departureTime &&
            new Date(singleBookingData.ride.departureTime) > new Date() && (
              <DialogFooter className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2 w-full justify-end">
                  <DeclineBookingDialog
                    onClick={handleDecline}
                    bookingId={selectedBookingId!}
                    isProcessing={isDeclining}
                  />
                  <AcceptBookingDialog
                    onClick={handleApprove}
                    bookingId={selectedBookingId!}
                    isApproving={isApproving}
                  />
                </div>
              </DialogFooter>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingsTab;
