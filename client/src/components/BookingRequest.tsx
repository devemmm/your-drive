import { apiUrl, queryKey, useAllBookings, useSingleBook } from "@/data";
import {
  CalendarDays,
  CalendarIcon,
  Car,
  CheckCircle,
  ChevronDown,
  Coins,
  Copy,
  CreditCard,
  Eye,
  Info,
  Loader2,
  MapPin,
  Receipt,
  Settings,
  Star,
  User,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  AcceptBookingDialog,
  CancelBookingDialog,
  DeclineBookingDialog,
} from "@/components/RideDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FaSpinner } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import CustomLoader from "./CustomLoader";
import Pagination from "./Dashboard/Pagination";
import { getToken } from "./getToken";

import {
  formatDescriptiveDate,
  formatDescriptiveDateOnly,
  formatPaymentProvider,
} from "@/lib/utils";
import { useSocket } from "@/providers/SocketProvider";

const statusOptions = [
  "APPROVED",
  "DECLINED",
  "CANCELLED",
  "PENDING",
  "COMPLETED",
  "EXPIRED",
  "DISPUTED",
];

const BookingRequest = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();
  const socket = useSocket();

  const [searchParams] = useSearchParams();
  const type = searchParams.get("t");

  const [page, setPage] = useState(1);
  const [passengerRole, setPassengerRole] = useState(false);

  const [formData, setFormData] = useState({
    status: "",
    bookingRelation: type ? type : "booked_from_my_rides",
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({
    key: "createdAt",
    direction: "descending",
  });

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const { data, isLoading, isFetching, refetch } = useAllBookings(
    page,
    50,
    formData
  );

  const bookings = data?.data ?? []!;
  const totalPages = data?.pagination?.totalPages ?? 1;

  // Sort bookings
  const sortedBookings = React.useMemo(() => {
    if (!sortConfig) return bookings;

    return [...bookings].sort((a, b) => {
      if (
        sortConfig.key === "createdAt" ||
        sortConfig.key === "departureTime"
      ) {
        // Date comparison
        const dateA = new Date(a[sortConfig.key] || a.ride?.[sortConfig.key]);
        const dateB = new Date(b[sortConfig.key] || b.ride?.[sortConfig.key]);
        return sortConfig.direction === "ascending"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      } else if (sortConfig.key === "amount") {
        // Numeric comparison
        const amountA = a.paymentTransaction?.amount || 0;
        const amountB = b.paymentTransaction?.amount || 0;
        return sortConfig.direction === "ascending"
          ? amountA - amountB
          : amountB - amountA;
      } else if (sortConfig.key === "seats") {
        // Numeric comparison for seats
        return sortConfig.direction === "ascending"
          ? a.seats - b.seats
          : b.seats - a.seats;
      } else {
        // String comparison
        const valueA = a[sortConfig.key] || a.ride?.[sortConfig.key] || "";
        const valueB = b[sortConfig.key] || b.ride?.[sortConfig.key] || "";
        if (valueA < valueB) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      }
    });
  }, [bookings, sortConfig]);

  useEffect(() => {
    if (formData.bookingRelation === "booked_from_my_rides") {
      setPassengerRole(false);
    } else {
      setPassengerRole(true);
    }
  }, [formData.bookingRelation]);

  useEffect(() => {
    if (!socket?.socket) return;

    const handleNewBooking = (newBooking) => {
      // Find all queries that start with "bookings"
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: [queryKey.BOOKINGS] });

      queries.forEach((query) => {
        const queryKey = query.queryKey;
        // Only update first page (page === 1)
        if (Array.isArray(queryKey) && queryKey[1] === 1) {
          queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData) {
              return { data: [newBooking], pagination: { total: 1 } };
            }
            return {
              ...oldData,
              data: [newBooking, ...(oldData.data ?? [])].slice(0, 50),
              pagination: {
                ...oldData.pagination,
                total: (oldData.pagination?.total ?? 0) + 1,
              },
            };
          });
        }
      });
    };

    const handleDriverBooking = (updatedBooking) => {
      // Find all queries that start with "bookings"
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: [queryKey.BOOKINGS] });

      queries.forEach((query) => {
        const queryKey = query.queryKey;
        // Only update first page (page === 1)
        if (Array.isArray(queryKey) && queryKey[1] === 1) {
          queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData || !oldData.data) return oldData;
            return {
              ...oldData,
              data: oldData.data.map((b) =>
                b.id === updatedBooking.id ? updatedBooking : b
              ),
            };
          });
        }
      });
    };

    socket.socket.on("passenger_booking", handleDriverBooking);
    socket.socket.on("driver_booking", handleNewBooking);

    return () => {
      socket.socket.off("passenger_booking", handleDriverBooking);
      socket.socket.off("driver_booking", handleNewBooking);
    };
  }, [socket, queryClient]);

  const handleStatusChange = (e) => {
    setFormData({ ...formData, status: e.target.value });
  };

  const handleRelationChange = (e) => {
    const updatedFormData = { ...formData, bookingRelation: e.target.value };
    setFormData(updatedFormData);
    refetch();
  };

  //   Cancel
  const { mutate: cancelBooking, isPending: isCanceling } = useMutation({
    mutationFn: async (dataObject: {
      status: string;
      reason: string;
      bookId: number;
    }) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/bookings/${dataObject.bookId}/status?lang=${currentLanguage}`,
        {
          status: dataObject.status,
          reason: dataObject.reason,
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
      queryClient.invalidateQueries({ queryKey: [queryKey.BOOKINGS] });
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message || "Something went wrong.",
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  // Approve
  const { mutate: approveBooking, isPending: isApproving } = useMutation({
    mutationFn: async (dataObject: { bookId: number }) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/bookings/${dataObject.bookId}/approve?lang=${currentLanguage}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      return data;
    },
    onSuccess: () => {
      toast.success(
        t("DriverDashboard.approveTitle", "Booking approved successfully"),
        {
          className: "custom-success-toast",
        }
      );
      queryClient.invalidateQueries({ queryKey: [queryKey.BOOKINGS] });
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message || "Something went wrong.",
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const handleReject = ({
    message,
    status,
    id,
  }: {
    message: string;
    status: string;
    id: number;
  }) => {
    cancelBooking({
      reason: message,
      status,
      bookId: id,
    });
  };

  const handleAccept = ({ id }: { id: number }) => {
    approveBooking({
      bookId: id,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                {t("booking.DriverDashboard.rideRequests.title")}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {t("booking.DriverDashboard.rideRequests.description")}
              </p>
            </div>
            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {/* Booking Status Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label className="font-medium text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {t("booking.status")}:
                </label>
                <select
                  value={formData.status}
                  onChange={handleStatusChange}
                  className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto"
                >
                  <option value="">{t("common.all")}</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {t(`booking.Status.${status.toUpperCase()}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Booking Relation Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <label className="font-medium text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {t("booking.relation_")}:
                </label>
                <select
                  value={formData.bookingRelation}
                  onChange={handleRelationChange}
                  className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto"
                >
                  <option value="booked_from_my_rides">
                    {t("booking.relation.booked_from_my_rides")}
                  </option>
                  <option value="booked_by_me">
                    {t("booking.relation.booked_by_me")}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Booking Table */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <CustomLoader />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500">
                <CalendarIcon className="h-full w-full" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-200">
                {t("booking.noBookingsFound")}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("booking.noBookingsDescription")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 relative">
              {isFetching && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center z-10">
                  <FaSpinner className="h-6 w-6 text-primary-500 animate-spin" />
                </div>
              )}

              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr className="text-nowrap">
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => requestSort("rideId")}
                    >
                      <div className="flex items-center gap-1">
                        {t("booking.rideId")}
                        {sortConfig?.key === "rideId" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => requestSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        {t("booking.status.title")}
                        {sortConfig?.key === "status" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => requestSort("createdAt")}
                    >
                      <div className="flex items-center gap-1">
                        {t("booking.date")}
                        {sortConfig?.key === "createdAt" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => requestSort("seats")}
                    >
                      <div className="flex items-center gap-1">
                        {t("booking.passenger.seats")}
                        {sortConfig?.key === "seats" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => requestSort("departureLocation.city")}
                    >
                      <div className="flex items-center gap-1">
                        {t("booking.route")}
                        {sortConfig?.key === "departureLocation.city" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("booking.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                  {sortedBookings.map((booking: any) => (
                    <tr
                      key={booking.id}
                      className="text-nowrap hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                        #{booking.rideId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={
                            booking.status === "APPROVED" ||
                            booking.status === "COMPLETED"
                              ? "default"
                              : booking.status === "PENDING"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-xs uppercase"
                        >
                          {t(`booking.status.${booking.status.toLowerCase()}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {formatDescriptiveDateOnly(booking.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {booking.seats}{" "}
                        {booking.seats === 1
                          ? t("common_.small.seat")
                          : t("common_.small.seats")}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center">
                          <div>
                            <div className="text-slate-900 dark:text-white">
                              {booking.ride?.departureLocation.city ||
                                t("unknownLocation")}{" "}
                              - {booking.ride?.destinationLocation.city}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {booking.ride?.departureTime
                                ? formatDescriptiveDate(
                                    booking.ride.departureTime
                                  )
                                : t("unknownDate")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex gap-1 justify-end items-center">
                          {booking.status === "PENDING" &&
                            !passengerRole &&
                            booking.ride?.status === "PUBLISHED" &&
                            booking.ride?.departureTime &&
                            new Date(booking.ride.departureTime) >
                              new Date() && (
                              <>
                                <DeclineBookingDialog
                                  onClick={handleReject}
                                  bookingId={booking.id}
                                  isProcessing={isCanceling}
                                />
                                <AcceptBookingDialog
                                  onClick={handleAccept}
                                  bookingId={booking.id}
                                  isApproving={isApproving}
                                />
                              </>
                            )}

                          {passengerRole ? (
                            <MyBookingModal bookId={booking.id} />
                          ) : (
                            <BookingModal
                              booking={booking}
                              handleReject={handleReject}
                              isCanceling={isCanceling}
                              handleAccept={handleAccept}
                              isApproving={isApproving}
                              isPassenger={passengerRole}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More Button */}
          <Pagination
            setPage={setPage}
            page={page}
            totalPages={totalPages}
            t={t}
          />
        </div>
      </div>
    </div>
  );
};

export default BookingRequest;

const BookingModal = ({
  booking,
  handleReject,
  isCanceling,
  handleAccept,
  isApproving,
  isPassenger = false,
}) => {
  const { t } = useTranslation();

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "DECLINED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "CANCELLED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "PENDING":
        return <Info className="h-5 w-5 text-orange-500" />;
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    return formatDescriptiveDate(dateString);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(booking.id);
    toast.success(t("booking.copiedToClipboard"));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">{t("booking.viewDetails")}</Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-[90vw] h-[97vh] overflow-y-auto dark:bg-gray-900 dark:text-white no-scrollbar lg:px-48"
        style={{ zIndex: 9999 }}
      >
        <div className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {t("booking.bookingDetails")} #{booking.id}
          </DialogTitle>
          <DialogDescription>
            {t("booking.bookingDescription")}
          </DialogDescription>
        </div>

        <div className="space-y-4">
          {/* Booking Status Card */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="p-4 bg-primary-500 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 ">
                  {t(`booking.Status.${booking.status}`)}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-orange-500"
                >
                  {getStatusIcon(booking.status)}
                  {t(`booking.Status.${booking.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              <div>
                <p className="text-sm p-1 bg-primary-200 text-white">
                  {t("booking.createdAt")}
                </p>
                <p className="font-medium">
                  {formatDescriptiveDate(booking.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm p-1 bg-primary-200 text-white">
                  {t("booking.lastUpdated")}
                </p>
                <p className="font-medium">
                  {formatDescriptiveDate(booking.updatedAt)}
                </p>
              </div>
              <div>
                <p className="text-sm p-1 bg-primary-200 text-white">
                  {t("booking.seatsBooked")}
                </p>
                <p className="font-medium">
                  {booking.seats} {t("seat", { count: booking.seats })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          {booking.paymentTransaction && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="p-4 bg-primary-500 text-white">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("booking.paymentInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                <div>
                  <p className="text-sm p-1 bg-primary-200 text-white">
                    {t("booking.amount")}
                  </p>
                  <p className="font-medium">
                    ${booking.paymentTransaction.amount}{" "}
                    {booking.paymentTransaction.currency}
                  </p>
                </div>
                <div>
                  <p className="text-sm p-1 bg-primary-200 text-white">
                    {t("booking.paymentMethod")}
                  </p>
                  <p className="font-medium">
                    {formatPaymentProvider(
                      booking.paymentTransaction.paymentProvider,
                      isPassenger
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm p-1 bg-primary-200 text-white">
                    {t("booking.transactionStatus")}
                  </p>
                  <p className="font-medium flex items-center gap-1">
                    {booking.paymentTransaction.status === "PAID" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    {t(
                      `booking.paymentStatus.${booking.paymentTransaction.status.toLowerCase()}`
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ride Information */}
          {booking.ride && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="p-4 bg-primary-500 text-white">
                <CardTitle className="text-lg flex items-center gap-2">
                  {t("booking.rideInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm bg-primary-200 p-1 text-white">
                      {t("booking.departure")}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {booking.ride.departureLocation.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm p-1 bg-primary-200 text-white">
                      {t("booking.destination")}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {booking.ride.destinationLocation.address}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm p-1 bg-primary-200 text-white">
                      {t("booking.departureTime")}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(booking.ride.departureTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm p-1 bg-primary-200 text-white">
                      {t("booking.estimatedArrival")}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(booking.ride.estimatedArrivalTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm p-1 bg-primary-200 text-white">
                      {t("booking.pricePerSeat")}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      {booking.paymentTransaction?.currency || "CAD"}{" "}
                      {booking.ride.contribution}
                    </p>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm p-1 bg-primary-200 text-white">
                      {t("booking.vehicle")}
                    </p>
                    <p className="font-medium">
                      {booking.ride.vehicle.make} {booking.ride.vehicle.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm p-1 bg-primary-200 text-white">
                      {t("booking.color")}
                    </p>
                    <p className="font-medium">{booking.ride.vehicle.color}</p>
                  </div>
                  <div>
                    <p className="text-sm p-1 bg-primary-200 text-white">
                      {t("booking.plateNumber")}
                    </p>
                    <p className="font-medium">
                      {booking.ride.vehicle.plateNumber}
                    </p>
                  </div>
                </div>

                {/* Stopovers */}
                {booking.ride.stopovers?.length > 0 && (
                  <div>
                    <p className="text-sm p-1 bg-primary-200 text-white">
                      {t("booking.stopovers")}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {booking.ride.stopovers.map((stop, index) => (
                        <Badge key={index} variant="outline">
                          {stop.address || stop.city}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Driver Information */}
          {booking.ride?.driver && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="bg-primary-500 p-4 text-white">
                <CardTitle className="text-lg flex items-center gap-2">
                  {t("booking.driverInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 -full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    {booking.ride.driver.image ? (
                      <img
                        src={booking.ride.driver.image}
                        alt={booking.ride.driver.firstName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-500 dark:text-gray-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {booking.ride.driver.firstName}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {t("booking.rating")}:{" "}
                      {booking.ride.driver.rating || t("booking.noRating")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="pt-4">
          {booking.status === "PENDING" &&
            !isPassenger &&
            booking.ride?.status === "PUBLISHED" &&
            booking.ride?.departureTime &&
            new Date(booking.ride.departureTime) > new Date() && (
              <>
                <DeclineBookingDialog
                  onClick={handleReject}
                  bookingId={booking.id}
                  isProcessing={isCanceling}
                />

                <AcceptBookingDialog
                  onClick={handleAccept}
                  bookingId={booking.id}
                  isApproving={isApproving}
                />
              </>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MyBookingModal = ({ bookId }: { bookId: number }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();

  const { data: booking, isPending } = useSingleBook({
    rideId: bookId,
    enabled: !!bookId,
  });

  //   Cancel by passenger
  const { mutate: passengerCancelBooking, isPending: isPassengerCanceling } =
    useMutation({
      mutationFn: async (dataObject: { reason: string; bookId: number }) => {
        const { data } = await axios.post(
          `${apiUrl}/api/v1/bookings/${dataObject.bookId}/cancel?lang=${currentLanguage}`,
          {
            reason: dataObject.reason,
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
        queryClient.invalidateQueries({ queryKey: [queryKey.SINGLE_BOOK] });
        queryClient.invalidateQueries({ queryKey: [queryKey.BOOKINGS] });
      },
      onError: (error) => {
        toast.error(
          (error as any)?.response?.data?.message || "Something went wrong.",
          {
            className: "custom-error-toast",
          }
        );
      },
    });

  const handlePassengerCancel = ({
    message,
    id,
  }: {
    message: string;
    id: number;
  }) => {
    passengerCancelBooking({
      reason: message,
      bookId: id,
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED":
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "DECLINED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "CANCELLED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "PENDING":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
      case "COMPLETED":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
      case "DECLINED":
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "PENDING":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const formatDate = (dateString) => {
    return formatDescriptiveDate(dateString);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Eye className="h-4 w-4" />
          {t("booking.viewDetails")}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-[90vw] max-h-[95vh] overflow-y-auto dark:bg-gray-900 dark:text-white no-scrollbar"
        style={{ zIndex: 99999 }}
      >
        {isPending ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Chargement...
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left Side: Title & Description */}
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 ">
                      <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    {t("booking.bookingDetails")} #{booking.id}
                  </DialogTitle>

                  <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
                    {t("booking.bookingDescription")}
                  </DialogDescription>
                </div>

                {/* Right Side: Attendance Codes & Badge */}
                <div className="flex items-center  gap-4">
                  {/* Attendance Codes */}
                  {booking?.status === "APPROVED" && (
                    <div className="relative inline-block text-left">
                      {/* Toggle Button */}
                      <button
                        onClick={() => setDropdownOpen((prev) => !prev)}
                        className="text-sm px-4 py-2 border -full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 transition flex items-center gap-1"
                      >
                        {t("booking.showCodes")}
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Dropdown Panel */}
                      {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700  shadow-lg z-50 p-2 space-y-2">
                          {booking?.bookingSeats?.map((b) => (
                            <div
                              key={b.attendanceCode}
                              className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700  px-2 py-1"
                            >
                              <span className="font-mono text-gray-800 dark:text-gray-100">
                                {b.attendanceCode}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    b.attendanceCode
                                  );
                                  toast.success(t("booking.copied"));
                                }}
                                className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                {t("booking.copy")}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Booking Status Badge */}
                  <Badge
                    className={`px-4 py-2 text-sm font-medium border ${getStatusColor(
                      booking.status
                    )}`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(booking.status)}
                      {t(`booking.Status.${booking.status}`)}
                    </div>
                  </Badge>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Booking Info & Payment */}
              <div className="lg:col-span-2 space-y-6">
                {/* Booking Status Card */}
                <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader className="pb-4 bg-primary-500 text-white">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(booking.status)}
                        {t(`booking.Status.${booking.status}`)}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {t("booking.createdAt")}
                        </p>
                        <p className="text-base font-semibold">
                          {formatDate(booking.createdAt)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {t("booking.lastUpdated")}
                        </p>
                        <p className="text-base font-semibold">
                          {formatDate(booking.updatedAt)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {t("booking.seatsBooked")}
                        </p>
                        <p className="text-base font-semibold">
                          {booking.seats} {t("seat", { count: booking.seats })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Information */}
                {booking.paymentTransaction && (
                  <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-4 bg-primary-500 text-white">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 ">
                          <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        {t("booking.paymentInformation")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("booking.amount")}
                          </p>
                          <p className="text-xl text-green-600 dark:text-green-400">
                            ${booking.paymentTransaction.amount}{" "}
                            {booking.paymentTransaction.currency}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("booking.paymentMethod")}
                          </p>
                          <p className="text-base font-semibold">
                            {formatPaymentProvider(
                              booking.paymentTransaction.paymentProvider,
                              true
                            )}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("booking.transactionStatus")}
                          </p>
                          <div className="flex items-center gap-2">
                            {booking.paymentTransaction.status === "PAID" ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="text-base font-semibold">
                              {t(
                                `booking.paymentStatus.${booking.paymentTransaction.status.toLowerCase()}`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Ride Information */}
                {booking.ride && (
                  <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-4 bg-primary-500 text-white">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 ">
                          <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        {t("booking.rideInformation")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-4">
                      {/* Route Information */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("booking.departure")}
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 ">
                              <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                              <p className="font-medium text-sm">
                                {booking.ride.departureLocation.address}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("booking.destination")}
                            </p>
                            <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 ">
                              <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <p className="font-medium text-sm">
                                {booking.ride.destinationLocation.address}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trip Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("booking.departureTime")}
                          </p>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-blue-500" />
                            <p className="font-medium">
                              {formatDate(booking.ride.departureTime)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("booking.estimatedArrival")}
                          </p>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-green-500" />
                            <p className="font-medium">
                              {formatDate(booking.ride.estimatedArrivalTime)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {t("booking.pricePerSeat")}
                          </p>
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-green-500" />
                            <p className=" text-lg">
                              {booking.paymentTransaction?.currency || "CAD"}{" "}
                              {booking.ride.contribution}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Information */}
                      <div className="bg-gray-50 dark:bg-gray-700  p-4">
                        <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
                          {t("driver.vehicleDetails")}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("booking.vehicle")}
                            </p>
                            <p className="font-medium">
                              {booking.ride.vehicle.make}{" "}
                              {booking.ride.vehicle.model}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("booking.color")}
                            </p>
                            <p className="font-medium">
                              {booking.ride.vehicle.color}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {t("booking.plateNumber")}
                            </p>
                            <p className="font-medium font-mono">
                              {booking.ride.vehicle.plateNumber}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stopovers */}
                      {booking.ride.stopovers?.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {t("booking.stopovers")}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {booking.ride.stopovers.map((stop, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="px-3 py-1"
                              >
                                {stop.address || stop.city}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {booking.reason && (
                        <div>
                          <h3 className="p-4 text-lg font-semibold">
                            {t("driver.reason")}
                          </h3>
                          <p className="p-4 bg-primary-100 -2xl dark:text-black dark:bg-gray-400">
                            {booking?.reason}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Driver Info & Actions */}
              <div className="space-y-6">
                {/* Driver Information */}
                {booking.ride?.driver && (
                  <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 ">
                          <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        {t("booking.driverInformation")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 -full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                            {booking.ride.driver.image ? (
                              <img
                                src={booking.ride.driver.image}
                                alt={booking.ride.driver.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-8 w-8 text-gray-500 dark:text-gray-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-lg">
                              {booking.ride.driver.lastName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {booking.ride.driver.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-medium">
                                {booking.ride.driver.rating ||
                                  t("booking.noRating")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 ">
                        <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      {t("booking.actions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(booking?.status === "PENDING" ||
                        booking?.status === "APPROVED") && (
                        <CancelBookingDialog
                          onClick={handlePassengerCancel}
                          bookingId={booking.id}
                          isProcessing={isPassengerCanceling}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={() => window.close()}>
            {t("booking.common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
