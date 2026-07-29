import { useMemo, useState } from "react";
import {
  useCancelDoorToDoorPassengerRequest,
  useDoorToDoorPassenger,
  useDoorToDoorPassengerRequests,
} from "@/hooks/useDoorToDoor";
import { DoorToDoorRequestStatus } from "@/lib/types";
import LoadingIndicator from "@/components/LoadingIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Car, Clock, CreditCard, DollarSign, MapPin, Menu, Navigation, RefreshCcw, Truck, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Separator } from "../ui/separator";
import axios from "axios";
import { useReactItems } from "@/lib/ReactTranslation";
import { apiUrl } from "@/data";
import { getToken } from "../getToken";
import { toast } from "sonner";
import { Elements } from "@stripe/react-stripe-js";
import StripePaymentForm from "../StripePaymentForm";
import { loadStripe } from "@stripe/stripe-js";

const statusGroups = {
  active: ["POSTED", "ACCEPTED"] as DoorToDoorRequestStatus[],
  inactive: ["DECLINED", "CANCELED", "EXPIRED"] as DoorToDoorRequestStatus[],
};

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

const PassengerDoorToDoorDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"active" | "inactive" | "all">("active");

  const [useCoupons, setUseCoupons] = useState(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
const [paymentError, setPaymentError] = useState<string | null>(null);

  const [payment_data, setPayment_data] = useState<any>(null);

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const { currentLanguage } = useReactItems();
  
  const statusLabel: Record<
    DoorToDoorRequestStatus | "POSTED",
    { label: string; className: string }
  > = {
    POSTED: {
      label: t("DoorToDoor.dashboard.passenger.pending"),
      className:
        "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800",
    },
    ACCEPTED: {
      label: t("DoorToDoor.dashboard.passenger.accepted"),
      className:
        "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800",
    },
    DECLINED: {
      label: t("DoorToDoor.dashboard.passenger.declined"),
      className:
        "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800",
    },
    CANCELED: {
      label: t("DoorToDoor.dashboard.passenger.canceled"),
      className:
        "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600",
    },
    EXPIRED: {
      label: t("DoorToDoor.dashboard.passenger.expired"),
      className:
        "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600",
    },
  };

  // Pass user ID to the hook so it fetches only the logged-in user's requests
  const {
    data: requests,
    isLoading,
    isFetching,
    refetch,
  } = useDoorToDoorPassenger(user?.id as any);

  console.log("Passenger requestss:", requests);
  const cancelRequest = useCancelDoorToDoorPassengerRequest();

  // Since API now filters by passengerId, we don't need to filter again by user ID
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    
    // Filter by status only since API already filters by passengerId
    if (filter === "all") return requests;
    const group = statusGroups[filter];
    return requests.filter((request) => group.includes(request.status));
  }, [requests, filter]);

  const userRequests = useMemo(() => {
    // API already returns only user's requests
    return requests || [];
  }, [requests]);

  const activeCount =
    userRequests?.filter((request) =>
      statusGroups.active.includes(request.status)
    ).length ?? 0;
  const inactiveCount = (userRequests?.length ?? 0) - activeCount;

  // const handleMakePayment = (requestId: string) => {};
  const handleViewReceipt = (requestId: string) => {}

  const handleMakePayment = async (requestId: string, useCoupons = false) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const response = await axios.post(
        `${apiUrl}/api/v1/d2d/${requestId}/initialize-payment?lang=${currentLanguage}&useCoupons=${useCoupons}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          }
        }
      );

      const data = response?.data?.data;
      console.log({ data })
      if(data?.baseAmount){
        setPayment_data(data);
      }
      
      // console.log("Payment initialization response:", response.data);
      
      toast.success(response.data.message || "Payment initialized successfully");
      
      return response.data;
    } catch (error: any) {
      console.error("Payment initialization failed:", error);
      setPaymentError(error.message || "Payment failed");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="hidden">
        {stripePromise && (
          <Elements stripe={stripePromise}>
            <StripePaymentForm
              payment_data={payment_data}
              setPayment_data={setPayment_data}
              keyToValidate="passenger-ride-requests"
              rideDetails={{
                departureLocation: {city: selectedRequest?.ride?.driverStartLocation?.city, region: selectedRequest?.ride?.driverStartLocation?.region},
                destinationLocation: {city: selectedRequest?.ride?.driverStopLocation?.city, region: selectedRequest?.ride?.driverStopLocation?.region},
                // departureTime: selectedRequest?.ride?.departureTime,
                totalSeats: selectedRequest?.ride?.availableSeats,
                // availableSeats: rideData.availableSeats,
                // contribution: rideData.contribution,
                // vehicle: rideData.vehicle,
              }}
              seatsToBook={selectedRequest?.ride?.availableSeats}
              redirect="/dashboard?redirect_to=requests&t=booked_by_me"
            />
          </Elements>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t("DoorToDoor.dashboard.passenger.title")}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("DoorToDoor.dashboard.passenger.description")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 dark:border-slate-600 rounded-none"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              {t("DoorToDoor.dashboard.passenger.refresh")}
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 text-sm">
          <button
            className={`px-3 py-1 border text-xs uppercase tracking-wide ${
              filter === "active"
                ? "border-primary-600 text-primary-700 dark:text-primary-300"
                : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
            } rounded-none`}
            onClick={() => setFilter("active")}
          >
            {t("DoorToDoor.dashboard.passenger.active")} ({activeCount})
          </button>
          <button
            className={`px-3 py-1 border text-xs uppercase tracking-wide ${
              filter === "inactive"
                ? "border-primary-600 text-primary-700 dark:text-primary-300"
                : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
            } rounded-none`}
            onClick={() => setFilter("inactive")}
          >
            {t("DoorToDoor.dashboard.passenger.history")} ({inactiveCount})
          </button>
          <button
            className={`px-3 py-1 border text-xs uppercase tracking-wide ${
              filter === "all"
                ? "border-primary-600 text-primary-700 dark:text-primary-300"
                : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
            } rounded-none`}
            onClick={() => setFilter("all")}
          >
            {t("DoorToDoor.dashboard.passenger.all")} ({requests?.length ?? 0})
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="py-12">
              <LoadingIndicator />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-600 dark:text-slate-400 space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 border border-dashed border-slate-300 dark:border-slate-700">
                <Truck className="h-6 w-6 text-slate-400" />
              </div>
              <p>{t("DoorToDoor.dashboard.passenger.noRequests")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("DoorToDoor.dashboard.passenger.noRequestsDescription")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t("DoorToDoor.dashboard.passenger.ride")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t("DoorToDoor.dashboard.passenger.pickup")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t("DoorToDoor.dashboard.passenger.dropoff")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t("DoorToDoor.dashboard.passenger.status")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t("DoorToDoor.dashboard.passenger.submitted")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t("DoorToDoor.dashboard.passenger.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredRequests.map((request: any) => {
                    const status = statusLabel[request.status ?? "POSTED"];
                    return (
                      <tr
                        key={request.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 text-slate-700 dark:text-slate-200">
                            <span className="font-semibold">
                              {request.pickupLocation?.city ?? 
                                t("DoorToDoor.dashboard.passenger.origin")}{" "}
                              →{" "}
                              {request.dropoffLocation?.city ?? 
                                t("DoorToDoor.dashboard.passenger.destination")}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {request.createdAt
                                ? new Date(request.createdAt).toLocaleString()
                                : "Recently created"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {request.pickupLocation?.address ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {request.dropoffLocation?.address ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            // Determine status based on your timestamp fields
                            let statusLabel = "";
                            let statusClassName = "";
                            
                            if (request.confirmedAt) {
                              statusLabel = "Confirmed";
                              statusClassName = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                            } else if (request.declinedAt) {
                              statusLabel = "Declined";
                              statusClassName = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                            } else if (request.canceledAt) {
                              statusLabel = "Canceled";
                              statusClassName = "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
                            } else if (request.acceptedAt) {
                              statusLabel = "Accepted";
                              statusClassName = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
                            } else if (request.completedAt) {
                              statusLabel = "Completed";
                              statusClassName = "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
                            } else {
                              // Default to "Pending" or "Posted" based on your original code
                              statusLabel = "Posted";
                              statusClassName = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
                            }
                            
                            return (
                          <span
                                className={`inline-flex items-center px-2 py-1 text-xs font-semibold uppercase rounded-none ${statusClassName}`}
                          >
                                {statusLabel}
                          </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {request.createdAt
                            ? new Date(request.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <div className="" id={`dropdown-container-${request.id}`}>
                              {/* Dropdown Trigger Button */}
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Toggle dropdown visibility
                                  const dropdown = document.getElementById(`dropdown-menu-${request.id}`);
                                  dropdown.classList.toggle('hidden');
                                }}
                                onBlur={() => {
                                  // Hide dropdown on blur with delay to allow clicking items
                                  setTimeout(() => {
                                    const dropdown = document.getElementById(`dropdown-menu-${request.id}`);
                                    if (dropdown) {
                                      dropdown.classList.add('hidden');
                                    }
                                  }, 200);
                                }}
                              >
                                Actions
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {/* Dropdown Menu */}
                              <div
                                id={`dropdown-menu-${request.id}`}
                                className="absolute right-0 mt-1 w-48 hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg"
                                style={{
                                  zIndex:99999
                                }}
                                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                              >
                                <div className="py-1">
                                  {/* View Ride Button */}
                                    <button
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      onClick={() => {
                                        window.open(`/ride?rideId=${request.ride.id}`);
                                        document.getElementById(`dropdown-menu-${request.id}`).classList.add('hidden');
                                      }}
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                              {t("DoorToDoor.dashboard.passenger.viewRide")}
                                    </button>
                                  
                                  <RideDetailsDialog request={request}>
                                    <button
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      {t("DoorToDoor.dashboard.passenger.viewDetails")}
                                    </button>
                                  </RideDetailsDialog>

                                  {/* Cancel Button - Conditionally shown */}
                                  {!request.confirmedAt && 
                                  !request.canceledAt && 
                                  !request.declinedAt && 
                                  !request.completedAt && (
                                    <button
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                      onClick={() => {
                                  cancelRequest.mutate({
                                    requestId: request.id,
                                          rideId: request.id,
                                        });
                                        document.getElementById(`dropdown-menu-${request.id}`).classList.add('hidden');
                                      }}
                                disabled={cancelRequest.isPending}
                              >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                {t("DoorToDoor.dashboard.passenger.cancel")}
                                    </button>
                                  )}

                                  <div className="border border-dashed border-slate-200 dark:border-slate-700 m-[2px]">
                                    {/* Make Payment Button - Conditionally shown */}
                                    {request.status === "ACCEPTED" && 
                                    !request.completedAt && 
                                    !request.canceledAt && (
                                      <div className="">
                                        {/* Coupon Option */}
                                        <div className="px-4 py-2 flex items-center justify-between">
                                          <label onMouseDown={(e) => e.preventDefault()} htmlFor={`use-coupons-${request.id}`} className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                                            <input
                                              id={`use-coupons-${request.id}`}
                                              type="checkbox"
                                              checked={useCoupons}
                                              onChange={(e) => setUseCoupons(e.target.checked)}
                                              onMouseDown={(e) => e.preventDefault()}  // 👈 KEY LINE
                                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            {t("RideDetail.useCoupon")}
                                          </label>
                                        </div>
                                        
                                        {/* Payment Button */}
                                        <button
                                          className="flex w-full items-center justify-center gap-2 px-4 py-2 text-sm  disabled:opacity-50 disabled:cursor-not-allowed"
                                          onClick={() => {
                                            setSelectedRequest(request);
                                            handleMakePayment(request.id, useCoupons);
                                            document.getElementById(`dropdown-menu-${request.id}`).classList.add('hidden');
                                          }}
                                          disabled={isProcessingPayment}
                                        >
                                          {isProcessingPayment ? (
                                            <>
                                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                              </svg>
                                              {t("DoorToDoor.dashboard.passenger.processing")}
                                            </>
                                          ) : (
                                            <>
                                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                              </svg>
                                              {t("DoorToDoor.dashboard.passenger.makePayment")}
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* View Receipt Button - Show after completion */}
                                  {request.completedAt && (
                                    <button
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      onClick={() => {
                                        handleViewReceipt(request.id);
                                        document.getElementById(`dropdown-menu-${request.id}`).classList.add('hidden');
                                      }}
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      {t("DoorToDoor.dashboard.passenger.viewReceipt")}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PassengerDoorToDoorDashboard;

const RideDetailsDialog = ({ request, children }) => {
  const [open, setOpen] = useState(false);

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  // Get status badge
  const getStatusBadge = () => {
    if (request.confirmedAt) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmed</Badge>;
    } else if (request.declinedAt) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Declined</Badge>;
    } else if (request.canceledAt) {
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Canceled</Badge>;
    } else if (request.acceptedAt) {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Accepted</Badge>;
    } else if (request.completedAt) {
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Completed</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            View Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Ride Request Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about your ride request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Section */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Request Status</h3>
              <p className="text-sm text-gray-500">ID: {request.id}</p>
            </div>
            {getStatusBadge()}
          </div>

          <Separator />

          {/* Ride Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Ride Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Departure:</span>
                </div>
                <p className="text-sm ml-6">
                  {request.ride?.departureTime ? formatDate(request.ride.departureTime) : "N/A"}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Estimated Arrival:</span>
                </div>
                <p className="text-sm ml-6">
                  {request.ride?.estimatedArrivalTime ? formatDate(request.ride.estimatedArrivalTime) : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Locations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pickup Location */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <h4 className="font-medium">Pickup Location</h4>
                </div>
                <div className="space-y-1 ml-5">
                  <p className="font-semibold">{request.pickupLocation?.locationName || "N/A"}</p>
                  <p className="text-sm">{request.pickupLocation?.address || "N/A"}</p>
                  <p className="text-sm text-gray-500">
                    {request.pickupLocation?.city}, {request.pickupLocation?.region} {request.pickupLocation?.country}
                  </p>
                </div>
              </div>

              {/* Dropoff Location */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <h4 className="font-medium">Dropoff Location</h4>
                </div>
                <div className="space-y-1 ml-5">
                  <p className="font-semibold">{request.dropoffLocation?.locationName || "N/A"}</p>
                  <p className="text-sm">{request.dropoffLocation?.address || "N/A"}</p>
                  <p className="text-sm text-gray-500">
                    {request.dropoffLocation?.city}, {request.dropoffLocation?.region} {request.dropoffLocation?.country}
                  </p>
                </div>
              </div>
            </div>

            {/* Distance Information */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="font-medium mb-2">Distance Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Detour Distance</p>
                  <p className="font-medium">{request.detourDistance || 0} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Extra Kilometers</p>
                  <p className="font-medium">{request.extraKms || 0} km</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Driver & Passenger Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Driver Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Driver Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{request.ride?.driver?.firstName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating:</span>
                  <span className="font-medium">
                    {request.ride?.driver?.averageRating || 0} ⭐
                    <span className="text-sm text-gray-500 ml-1">
                      ({request.ride?.driver?.totalRatings || 0} ratings)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">#{request.ride?.vehicleId || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Passenger Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Passenger Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{request.passenger?.firstName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Passenger ID:</span>
                  <span className="font-medium">#{request.passengerId}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Information
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Contribution:</span>
                  <span className="font-bold text-lg">${request.ride?.contribution || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">${request.totalAmount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Extra KM Price:</span>
                  <span className="font-medium">${request.ride?.extraKmPrice || 0}/km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">{request.ride?.contributionCollectionMethod || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Timestamps</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(request.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Accepted:</span>
                  <span className="font-medium">{formatDate(request.acceptedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confirmed:</span>
                  <span className="font-medium">{formatDate(request.confirmedAt)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Updated:</span>
                  <span className="font-medium">{formatDate(request.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium">{formatDate(request.completedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Canceled:</span>
                  <span className="font-medium">{formatDate(request.canceledAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ride Status */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4 className="font-medium mb-2">Ride Status</h4>
            <div className="flex justify-between">
              <span className="text-gray-600">Ride Status:</span>
              <Badge variant="outline">{request.ride?.status || "N/A"}</Badge>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-600">Ride Type:</span>
              <Badge variant="outline">{request.ride?.type || "N/A"}</Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

