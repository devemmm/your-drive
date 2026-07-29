import {
  apiUrl,
  queryKey,
  useAllRideRequests,
  useRideRequestMatches,
  useSingleRideRequest,
} from "@/data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  AlertCircle,
  Calendar,
  Calendar1,
  Car,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Eye,
  Filter,
  Loader2,
  Lock,
  MapPin,
  MoveLeftIcon,
  Plus,
  Search,
  Trash2,
  Unlock,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CreateRideRequest from "./CreateRideRequest";
import CustomLoader from "./CustomLoader";
import Pagination from "./Dashboard/Pagination";
import { getToken } from "./getToken";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { convertRideTimes, formatRideDate, formatTime } from "@/lib/utils";
import { t } from "i18next";
import {
  ArrowRight,
  CalendarPlus,
  CalendarSync,
  FileText,
  Flag,
  Info,
  Users,
} from "lucide-react";
import LoadingDots from "./ui/loading-dots";

import { DateTime } from "luxon";
import tzlookup from "tz-lookup";
import { useReactItems } from "@/lib/ReactTranslation";

const RideRequests = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const [originCityFilter, setOriginCityFilter] = useState<string>("");
  const [originProvinceFilter, setOriginProvinceFilter] = useState<string>("");
  const [destinationCityFilter, setDestinationCityFilter] =
    useState<string>("");
  const [destinationProvinceFilter, setDestinationProvinceFilter] =
    useState<string>("");
  const [generalSearch, setGeneralSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [mineOnly, setMineOnly] = useState<boolean>(true);
  const [rideDateString, setRideDateString] = useState("");
  const [rideDateMillis, setRideDateMillis] = useState(null);
  const [showMatches, setshowMatches] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(undefined);
  const [selectedRequest, setSelectedRequest] = useState(undefined);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(generalSearch);
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [generalSearch]);

  const params = new URLSearchParams(window.location.search);
  const new_request = params.get("new_request");

  const filters = {
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    originCity: originCityFilter || undefined,
    originProvince: originProvinceFilter || undefined,
    destinationCity: destinationCityFilter || undefined,
    destinationProvince: destinationProvinceFilter || undefined,
    date: rideDateMillis,
    mineOnly: mineOnly,
  };

  const { data, isLoading, isFetching } = useAllRideRequests(page, 20, filters);

  const rideRequests = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  useEffect(() => {
    if (mineOnly && new_request && rideRequests.length > 0) {
      const newRequest = rideRequests.find(
        (req) => req.id === Number(new_request)
      );
      if (newRequest) setSelectedRequest(newRequest);
    }
  }, [new_request, rideRequests, mineOnly]);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
      case "OUVERT":
        return (
          <Badge variant="default" className="bg-slate-500">
            {t("rideRequests.OPEN", "Open")}
          </Badge>
        );
      case "CLOSED":
      case "FERMÉ":
        return (
          <Badge variant="destructive">
            {t("rideRequests.CLOSED", "Closed")}
          </Badge>
        );
      case "DRAFT":
      case "BROUILLON":
        return (
          <Badge variant="outline">{t("rideRequests.DRAFT", "Draft")}</Badge>
        );
      case "EXPIRED":
      case "EXPIRÉ":
        return (
          <Badge variant="destructive">
            {t("rideRequests.EXPIRED", "Expired")}
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive">
            {status || t("rideRequests.UNKNOWN", "Unknown")}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t("common_.small.notSpecified", "Not specified");
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCreateRideForRequest = (request: any) =>
    navigate(`/post-a-ride?requestId=${request.id}`);

  return (
    <div className="space-y-6">
      {!showMatches && (
        <div className="dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                  {t("rideRequests.title", "Ride Requests")}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {t(
                    "rideRequests.description",
                    "People are looking for these rides. Create a ride to fulfill their requests."
                  )}
                </p>
              </div>
              <CreateRideRequest />
            </div>

            {/* Simplified Filters */}
            <div className="mb-4 mt-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={generalSearch}
                    onChange={(e) => {
                      setGeneralSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder={t(
                      "rideRequests.filters.typeToSearch",
                      "Search locations..."
                    )}
                    className="pl-8 pr-3 py-1.5 w-full border border-slate-200 dark:border-slate-600
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs
                     focus:ring-1 focus:ring-primary-500 focus:border-primary-500
                     transition-all duration-200 rounded"
                  />
                  {generalSearch && (
                    <button
                      onClick={() => setGeneralSearch("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600
                       dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Date */}
                <div className="relative min-w-[140px]">
                  <Calendar1 className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={rideDateString}
                    onChange={(e) => {
                      setRideDateString(e.target.value);
                      const dateMillis = new Date(
                        `${e.target.value}T00:00`
                      ).getTime();
                      setRideDateMillis(dateMillis);
                      setPage(1);
                    }}
                    className="pl-8 pr-3 py-1.5 w-full border border-slate-200 dark:border-slate-600
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs
                     focus:ring-1 focus:ring-primary-500 focus:border-primary-500
                     transition-all duration-200 rounded"
                  />
                </div>

                {/* Status */}
                <div className="relative min-w-[120px]">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="appearance-none pl-3 pr-8 py-1.5 w-full border border-slate-200 dark:border-slate-600
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs
                     focus:ring-1 focus:ring-primary-500 focus:border-primary-500
                     transition-all duration-200 cursor-pointer rounded"
                  >
                    <option value="">
                      {t("rideRequests.filters.all", "All Status")}
                    </option>
                    <option value="OPEN">
                      {t("rideRequests.filters.open", "Open")}
                    </option>
                    <option value="CLOSED">
                      {t("rideRequests.filters.closed", "Closed")}
                    </option>
                    <option value="DRAFT">
                      {t("rideRequests.filters.draft", "Draft")}
                    </option>
                    <option value="EXPIRED">
                      {t("rideRequests.filters.expired", "Expired")}
                    </option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                </div>

                {/* Origin City */}
                <div className="relative min-w-[120px]">
                  <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={originCityFilter}
                    onChange={(e) => {
                      setOriginCityFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder={t(
                      "rideRequests.filters.originCityPlaceholder",
                      "From city"
                    )}
                    className="pl-8 pr-3 py-1.5 w-full border border-slate-200 dark:border-slate-600
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs
                     focus:ring-1 focus:ring-primary-500 focus:border-primary-500
                     transition-all duration-200 rounded"
                  />
                  {originCityFilter && (
                    <button
                      onClick={() => setOriginCityFilter("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600
                       dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Destination City */}
                <div className="relative min-w-[120px]">
                  <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={destinationCityFilter}
                    onChange={(e) => {
                      setDestinationCityFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder={t(
                      "rideRequests.filters.destinationCityPlaceholder",
                      "To city"
                    )}
                    className="pl-8 pr-3 py-1.5 w-full border border-slate-200 dark:border-slate-600
                      bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs
                     focus:ring-1 focus:ring-primary-500 focus:border-primary-500
                     transition-all duration-200 rounded"
                  />
                  {destinationCityFilter && (
                    <button
                      onClick={() => setDestinationCityFilter("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600
                       dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Mine Only Toggle */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="mineOnly"
                    checked={mineOnly}
                    onChange={(e) => {
                      setMineOnly(e.target.checked);
                      setPage(1);
                    }}
                    className="h-3.5 w-3.5 text-primary-600 border-slate-300 focus:ring-1 focus:ring-primary-500 rounded"
                  />
                  <label
                    htmlFor="mineOnly"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {t("rideRequests.filters.mineOnly", "Mine Only")}
                  </label>
                </div>

                {/* Clear All Button */}
                {(generalSearch ||
                  statusFilter ||
                  rideDateString ||
                  originCityFilter ||
                  destinationCityFilter) && (
                  <button
                    onClick={() => {
                      setGeneralSearch("");
                      setStatusFilter("");
                      setOriginCityFilter("");
                      setOriginProvinceFilter("");
                      setDestinationCityFilter("");
                      setDestinationProvinceFilter("");
                      setRideDateMillis(null);
                      setRideDateString("");
                      setPage(1);
                    }}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700
                     dark:hover:text-primary-300 font-medium flex items-center gap-1 px-2 py-1 rounded
                     hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    {t("rideRequests.filters.clearAll", "Clear")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <CustomLoader />
              </div>
            ) : rideRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500">
                  <AlertCircle className="h-full w-full" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-200">
                  {t("rideRequests.noRequestsFound", "No ride requests found")}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t(
                    "rideRequests.noRequestsDescription",
                    "There are no ride requests matching your filters."
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {isFetching && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
                  </div>
                )}

                <div className="space-y-2">
                  {rideRequests.map((request: any) => {
                    const { startInPickupTZ, endInPickupTZ, pickupTimezone } =
                      convertRideTimes({
                        timeWindowStart: request.timeWindowStart,
                        timeWindowEnd: request.timeWindowEnd,
                        pickupLat: request.origin.latitude,
                        pickupLng: request.origin.longitude,
                      });

                    const formatted = formatRideDate(
                      request.date,
                      pickupTimezone
                    );

                    return (
                      <Card
                        key={request.id}
                        className="group hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-900 border dark:border-gray-800 border-primary-200 hover:border-[rgb(26,99,115)] dark:hover:border-[rgb(26,99,115)] overflow-hidden hover:-translate-y-1"
                      >
                        <div className="p-5">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-[rgb(26,99,115)] dark:text-[rgb(102,159,169)]" />
                                <span className="font-bold text-gray-900 dark:text-white text-lg">
                                  {t("rideRequests.request", "Request")} #
                                  {request.id}
                                </span>
                              </div>
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              {request.isOwner &&
                                request?._count?.matches !== undefined && (
                                  <div
                                    onClick={() => {
                                      setSelectedRequestId(request.id);
                                      setshowMatches(true);
                                      window.scrollTo({
                                        top: 10,
                                        behavior: "smooth",
                                      });
                                    }}
                                    className="text-sm text-white dark:text-[rgb(102,159,169)] hover:text-white dark:hover:text-[rgb(26,99,115)] cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[rgb(26,99,115)] dark:hover:border-[rgb(102,159,169)] transition-all"
                                  >
                                    <Users className="h-4 w-4" />
                                    <span>
                                      {request?._count?.matches || 0}{" "}
                                      {t("rideRequests.MatchCount", "matches")}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Route */}
                          <div className="flex items-start gap-4 mb-5">
                            <div className="flex flex-col items-center">
                              <div className="relative">
                                <div className="w-4 h-4 bg-[rgb(26,99,115)] dark:bg-[rgb(102,159,169)] rounded-full"></div>
                                <div className="absolute inset-0 bg-[rgb(26,99,115)] dark:bg-[rgb(102,159,169)] rounded-full blur-sm opacity-30"></div>
                              </div>
                              <div className="w-0.5 h-12 bg-gradient-to-b from-[rgb(26,99,115)]/30 to-[rgb(21,79,92)]/30 dark:from-[rgb(102,159,169)]/30 dark:to-[rgb(26,99,115)]/30 my-2"></div>
                              <div className="relative">
                                <div className="w-4 h-4 bg-[rgb(21,79,92)] dark:bg-[rgb(26,99,115)] rounded-full"></div>
                                <div className="absolute inset-0 bg-[rgb(21,79,92)] dark:bg-[rgb(26,99,115)] rounded-full blur-sm opacity-30"></div>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="space-y-3">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t("rideRequests.origin", "Origin")}
                                  </p>
                                  <p className="font-semibold text-gray-800 dark:text-white">
                                    {request.origin?.locationName ||
                                      request.origin?.address ||
                                      request.origin?.city}
                                  </p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t(
                                      "rideRequests.destination",
                                      "Destination"
                                    )}
                                  </p>
                                  <p className="font-semibold text-gray-800 dark:text-white">
                                    {request.destination?.locationName ||
                                      request.destination?.address ||
                                      request.destination?.city}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-t border-gray-200 dark:border-gray-800 pt-4">
                            {request.date && (
                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg">
                                <Calendar className="h-4 w-4 text-[rgb(26,99,115)] dark:text-[rgb(102,159,169)]" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  {(formatted as any)?.pickup ||
                                    formatDate(request.date)}
                                </span>
                              </div>
                            )}
                            {request.timeWindowStart &&
                              request.timeWindowEnd && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg">
                                  <Clock className="h-4 w-4 text-[rgb(26,99,115)] dark:text-[rgb(102,159,169)]" />
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {startInPickupTZ} - {endInPickupTZ}
                                  </span>
                                </div>
                              )}
                            {request.seats && (
                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg">
                                <Users className="h-4 w-4 text-[rgb(26,99,115)] dark:text-[rgb(102,159,169)]" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  {request.seats}{" "}
                                  {request.seats === 1
                                    ? t("rideRequests.passenger", "seat")
                                    : t("rideRequests.passenger", "seats")}
                                </span>
                              </div>
                            )}
                            {request.rideType && (
                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/20 rounded-lg">
                                <Car className="h-4 w-4 text-[rgb(26,99,115)] dark:text-[rgb(102,159,169)]" />
                                <Badge className="bg-[rgb(102,159,169)]/20 dark:bg-[rgb(26,99,115)]/20 text-[rgb(21,79,92)] dark:text-[rgb(102,159,169)] border border-[rgb(102,159,169)]/30 dark:border-[rgb(26,99,115)]/30 px-2 py-0.5">
                                  {request.rideType}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-gray-50 dark:bg-gray-900/60 px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
                          <RideRequestModal
                            request={{
                              ...request,
                              startInPickupTZ,
                              endInPickupTZ,
                              formattedDate: formatted,
                            }}
                          />
                          {!request.isOwner && request.status === "OPEN" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                handleCreateRideForRequest(request)
                              }
                              className="bg-[rgb(26,99,115)] hover:bg-[rgb(21,79,92)] dark:bg-[rgb(102,159,169)] dark:hover:bg-[rgb(26,99,115)] text-white shadow-lg hover:shadow-[rgb(26,99,115)]/25 dark:hover:shadow-[rgb(102,159,169)]/25 transition-all duration-300 group"
                            >
                              <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
                              {t("rideRequests.createRide", "Create Ride")}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {selectedRequest && (
                  <RideRequestModal
                    request={{
                      ...selectedRequest,
                      ...convertRideTimes({
                        timeWindowStart: selectedRequest.timeWindowStart,
                        timeWindowEnd: selectedRequest.timeWindowEnd,
                        pickupLat: selectedRequest.origin.latitude,
                        pickupLng: selectedRequest.origin.longitude,
                      }),
                      formattedDate: formatRideDate(
                        selectedRequest.date,
                        convertRideTimes({
                          timeWindowStart: selectedRequest.timeWindowStart,
                          timeWindowEnd: selectedRequest.timeWindowEnd,
                          pickupLat: selectedRequest.origin.latitude,
                          pickupLng: selectedRequest.origin.longitude,
                        }).pickupTimezone
                      ),
                    }}
                    openModal={true}
                  />
                )}

                {/* Pagination */}
                <Pagination
                  setPage={setPage}
                  page={page}
                  totalPages={totalPages}
                  t={t}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {showMatches && (
        <RideMatches
          selectedRequestId={selectedRequestId}
          closs={() => {
            setSelectedRequestId(undefined);
            setshowMatches(false);
          }}
        />
      )}
    </div>
  );
};

const RideRequestModal = ({
  request,
  openModal,
}: {
  request: any;
  openModal?: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (openModal) {
      setOpen(true);
    }
  }, [openModal]);

  // Delete Ride Request
  const { mutate: deleteRideRequest, isPending: isDeleting } = useMutation({
    mutationFn: async (requestId: number) => {
      const { data } = await axios.delete(
        `${apiUrl}/api/v1/ride-requests/${requestId}?lang=${currentLanguage}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey.RIDE_REQUESTS] });
      toast.success(
        t(
          "rideRequests.deletedSuccessfully",
          "Ride request deleted successfully"
        )
      );

      navigate("/dashboard?redirect_to=requests");
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          t("rideRequests.deleteError", "Failed to delete ride request"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  // Close Ride Request
  const { mutate: closeRideRequest, isPending: isClosing } = useMutation({
    mutationFn: async (requestId: number) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/ride-requests/${requestId}/close?lang=${currentLanguage}`,
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
      queryClient.invalidateQueries({ queryKey: [queryKey.RIDE_REQUESTS] });
      toast.success(
        t("rideRequests.closedSuccessfully", "Ride request closed successfully")
      );

      navigate("/dashboard?redirect_to=requests");
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          t("rideRequests.closeError", "Failed to close ride request"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  // Open DRAFT Ride Request
  const { mutate: openRideRequest, isPending: isOpening } = useMutation({
    mutationFn: async (requestId: number) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/ride-requests/${requestId}/open?lang=${currentLanguage}`,
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
      queryClient.invalidateQueries({ queryKey: [queryKey.RIDE_REQUESTS] });
      toast.success(
        t("rideRequests.openedSuccessfully", "Ride request opened successfully")
      );

      navigate("/dashboard?redirect_to=requests");
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          t("rideRequests.openError", "Failed to open ride request"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return t("common_.small.notSpecified", "Not specified");
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return (
          <Badge variant="default" className="bg-slate-500">
            {t(`rideRequests.${status}`)}
          </Badge>
        );
      case "CLOSED":
        return <Badge variant="secondary">{t(`rideRequests.${status}`)}</Badge>;
      case "DRAFT":
        return <Badge>{t(`rideRequests.${status}`)}</Badge>;
      default:
        return (
          <Badge>
            {t(`rideRequests.${status}`) ||
              t("rideRequests.status.unknown", "Unknown")}
          </Badge>
        );
    }
  };

  const {
    startInPickupTZ,
    endInPickupTZ,
    startInLocal,
    endInLocal,
    pickupTimezone,
    localTimezone,
  } = convertRideTimes({
    timeWindowStart: request.timeWindowStart,
    timeWindowEnd: request.timeWindowEnd,
    pickupLat: request.origin.latitude,
    pickupLng: request.origin.longitude,
  });

  const formatted = formatRideDate(request.date, pickupTimezone);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {openModal ? null : (
          <Button
            size="sm"
            className="flex-1 border-slate-200 hover:text-white dark:border-slate-700 hover:bg-primary-500 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4 mr-2" />
            {t("rideRequests.viewDetails", "View Details")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden p-0 dark:bg-slate-900 mt-10">
        <div className="overflow-y-auto max-h-[95vh]">
          {/* Header with Gradient Background */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 dark:from-slate-800 dark:to-slate-900 p-6">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2  bg-white/10 backdrop-blur-sm">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <span>
                    {t("rideRequests.requestDetails", "Ride Request")} #
                    {request.id}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-primary-100 dark:text-slate-300 mt-2">
                  {t(
                    "rideRequests.requestDescription",
                    "Complete request details and management"
                  )}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(request.status)}
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className=" hover:bg-white/20 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Route Card - Visual Journey */}
            <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2  bg-primary-50 dark:bg-primary-900/20">
                    <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {t("rideRequests.route", "Route")}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative">
                  {/* Journey Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-primary-300 to-primary-500 dark:from-primary-600 dark:via-primary-400 dark:to-primary-600"></div>

                  {/* Origin */}
                  <div className="flex gap-4 mb-8 relative">
                    <div className="relative z-10">
                      <div className="w-12 h-12  bg-primary-500 dark:bg-primary-600 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                          {t("rideRequests.origin", "Origin")}
                        </span>
                        {request.origin?.city && (
                          <span className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300  text-xs font-medium">
                            {request.origin.city}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                        {request.origin?.locationName ||
                          request.origin?.address ||
                          request.origin?.city ||
                          t("rideRequests.notSpecified", "Not specified")}
                      </h3>
                      {request.origin?.region && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {request.origin.region}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex gap-4 relative">
                    <div className="relative z-10">
                      <div className="w-12 h-12  bg-primary-500 dark:bg-primary-600 flex items-center justify-center">
                        <Flag className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                          {t("rideRequests.destination", "Destination")}
                        </span>
                        {request.destination?.city && (
                          <span className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300  text-xs font-medium">
                            {request.destination.city}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                        {request.destination?.locationName ||
                          request.destination?.address ||
                          request.destination?.city ||
                          t("rideRequests.notSpecified", "Not specified")}
                      </h3>
                      {request.destination?.region && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {request.destination.region}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trip Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trip Schedule Card */}
              <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2  bg-slate-50 dark:bg-slate-900/20">
                      <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      {t("rideRequests.tripSchedule", "Trip Schedule")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Ride Date */}
                  {request.date && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1.5  bg-blue-50 dark:bg-blue-900/20">
                          <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {t("rideRequests.date", "Ride Date")}
                        </p>
                      </div>
                      <div className="pl-8 space-y-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {(formatted as any).pickup}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ({t("rideRequests.PickupTimezone")}:{" "}
                          {pickupTimezone || "Pickup"})
                        </p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {(formatted as any).local}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ({t("rideRequests.LocalTimezone")}:{" "}
                          {Intl.DateTimeFormat().resolvedOptions().timeZone})
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Time Window */}
                  {request.timeWindowStart && request.timeWindowEnd && (
                    <div className="space-y-3 col-span-2">
                      {/* Title */}
                      <div className="flex items-center gap-1.5">
                        <div className="p-1.5  bg-amber-50 dark:bg-amber-900/20">
                          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {t("rideRequests.timeWindow", "Time Window")}
                        </p>
                      </div>

                      {/* Pickup timezone */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 ">
                        <div className="flex items-start gap-3">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {t("rideRequests.PickupTimezone")} (
                              {pickupTimezone})
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {startInPickupTZ}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {endInPickupTZ}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Local timezone */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 ">
                        <div className="flex items-start gap-3">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {t("rideRequests.LocalTimezone")} (
                              {Intl.DateTimeFormat().resolvedOptions().timeZone}
                              )
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {startInLocal}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white">
                                {endInLocal}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passengers */}
                  {request.seats && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 ">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t("rideRequests.passengers", "Passengers")}
                          </p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {request.seats}{" "}
                            {t("common_.small.passenger", "passenger")}
                            {request.seats !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Request Metadata Card */}
              <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2  bg-slate-50 dark:bg-slate-800">
                      <Info className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      {t("rideRequests.requestInfo", "Request Information")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Created At */}
                  {request.createdAt && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 ">
                      <div className="flex items-center gap-3">
                        <CalendarPlus className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t("rideRequests.createdAt", "Created")}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(request.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Updated At */}
                  {request.updatedAt && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 ">
                      <div className="flex items-center gap-3">
                        <CalendarSync className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t("rideRequests.updatedAt", "Last Updated")}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(request.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Notes/Description */}
            {request.notes && (
              <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2  bg-amber-50 dark:bg-amber-900/20">
                      <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      {t("rideRequests.notes", "Additional Notes")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10  border border-amber-100 dark:border-amber-800/30">
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {request.notes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 pb-12">
              {request.status === "DRAFT" && request?.isOwner && (
                <Button
                  variant="default"
                  onClick={() => openRideRequest(request.id)}
                  disabled={isOpening}
                  className="flex-1 bg-primary-600 hover:bg-primary-700"
                >
                  {isOpening ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("rideRequests.opening", "Publishing...")}
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      {t("rideRequests.open", "Publish Request")}
                    </>
                  )}
                </Button>
              )}

              {request?.status === "OPEN" && request?.isOwner && (
                <Button
                  variant="secondary"
                  onClick={() => closeRideRequest(request.id)}
                  disabled={isClosing}
                  className="flex-1 border-slate-300 dark:border-slate-700"
                >
                  {isClosing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("rideRequests.closing", "Closing...")}
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {t("rideRequests.close", "Close Request")}
                    </>
                  )}
                </Button>
              )}

              {!request?.isOwner && (
                <Button
                  variant="default"
                  onClick={() =>
                    navigate(`/post-a-ride?requestId=${request.id}`)
                  }
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("rideRequests.createRide", "Create Ride")}
                </Button>
              )}

              {request?.isOwner && request?.status === "DRAFT" && (
                <CreateRideRequest type="Edit" initialRequest={request} />
              )}

              {request?.isOwner && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (
                      window.confirm(
                        t(
                          "rideRequests.confirmDelete",
                          "Are you sure you want to delete this ride request? This action cannot be undone."
                        )
                      )
                    ) {
                      deleteRideRequest(request.id);
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("rideRequests.deleting", "Deleting...")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("rideRequests.delete", "Delete")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RideMatches = ({
  selectedRequestId,
  closs,
}: {
  selectedRequestId: number;
  closs: () => void;
}) => {
  const [page, settPage] = useState(1);

  const request = useSingleRideRequest({
    requestId: selectedRequestId,
    enabled: !!selectedRequestId,
  });

  const matches = useRideRequestMatches({
    requestId: selectedRequestId,
    page,
    enabled: !!selectedRequestId,
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate match score (placeholder - adjust based on your algorithm)
  const calculateMatchScore = (ride: any) => {
    // This is a placeholder - you should implement your actual match scoring logic
    let score = 0;

    // Time match
    const rideTime = new Date(ride.departureTime).getTime();
    const requestStart = new Date(request.data?.timeWindowStart || 0).getTime();
    const requestEnd = new Date(request.data?.timeWindowEnd || 0).getTime();

    if (rideTime >= requestStart && rideTime <= requestEnd) {
      score += 30;
    }

    // Seat availability
    if (ride.availableSeats >= (request.data?.seats || 0)) {
      score += 25;
    }

    // Route match (simplified)
    score += 25;

    // Preferences match
    const prefsMatch = Object.keys(ride.preferences || {}).filter(
      (key) => ride.preferences[key] === request.data?.travelPreferences?.[key]
    ).length;
    score += prefsMatch * 5;

    return Math.min(score, 100);
  };

  return (
    <div className="space-y-6">
      {(request.isLoading || matches.isLoading) && <LoadingDots />}

      {!request.isLoading && !matches.isLoading && request.data && (
        <div className="space-y-4">
          {/* Header with Back Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={closs}
              variant="outline"
              size="sm"
              className="border-slate-200 dark:border-slate-700"
            >
              <MoveLeftIcon className="h-4 w-4 mr-2" />
              {t("onboarding.passenger.back", "Back")}
            </Button>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("rideRequests.matchesForRequest")} #{selectedRequestId}
            </h2>
          </div>

          {/* Request Summary Card */}
          <Card className="border-2 border-primary-900 dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2  bg-primary-50 dark:bg-primary-900/20">
                    <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                      {t("rideRequests.request")} #{request.data.id}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                      {t("rideRequests.match")}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={
                    request.data.status === "DRAFT"
                      ? "outline"
                      : request.data.status === "OPEN"
                      ? "default"
                      : "secondary"
                  }
                  className={
                    request.data.status === "DRAFT"
                      ? "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                      : request.data.status === "OPEN"
                      ? "bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300"
                      : ""
                  }
                >
                  {request.data.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Route Information */}
              <div className="bg-slate-50 dark:bg-slate-800/50  p-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3  bg-primary-500"></div>
                    <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600 my-1"></div>
                    <div className="w-3 h-3  bg-red-500"></div>
                  </div>
                  <div className="flex-1">
                    <div className="space-y-3">
                      {/* Origin */}
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          {t("onboarding.passenger.from")}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {request.data.origin?.locationName ||
                              request.data.origin?.city}
                          </p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {request.data.origin?.city}
                          </span>
                        </div>
                      </div>

                      {/* Destination */}
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                          {t("onboarding.passenger.to")}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {request.data.destination?.locationName ||
                              request.data.destination?.city}
                          </p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {request.data.destCity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trip Details Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Ride Date */}
                {request.data.date && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {t("rideSearch.form.date")}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white pl-6">
                      {new Date(request.data.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {/* Passengers */}
                {request.data.seats && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {t("passenger.passengers")}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white pl-6">
                      {request.data.seats} passenger
                      {request.data.seats !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {/* Ride Type */}
                {request.data.rideType && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {t("rideRequests.rideType")}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white pl-6">
                      {request.data.rideType}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Matches Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t("rideRequests.potential")}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {matches.data?.pagination?.total || 0}{" "}
                  {t("rideRequests.found")}
                </span>
                {matches.data?.pagination && (
                  <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ">
                    {t("rideRequests.page")} {matches.data.pagination.page} of{" "}
                    {matches.data.pagination.totalPages}
                  </span>
                )}
              </div>
            </div>

            {matches.data?.data && matches.data.data.length > 0 ? (
              <div className="space-y-4 grid lg:grid-cols-2 gap-3">
                {matches.data.data.map((match: any) => {
                  const matchScore = calculateMatchScore(match.ride);
                  return (
                    <MatchDetails
                      key={match.id}
                      match={match}
                      formatDate={formatDate}
                      matchScore={matchScore}
                      request={request}
                    />
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed border-slate-300 dark:border-slate-700">
                <CardContent className="py-12 text-center">
                  <Users className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <h4 className="text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t("rideRequests.noMatch")}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {t("rideRequests.potential", {
                      originCity: request.data.origin?.city,
                      destCity: request.data.destCity,
                    })}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {matches.data?.pagination &&
              matches.data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => settPage(page - 1)}
                    disabled={page === 1}
                  >
                    {t("rideRequests.Previous")}
                  </Button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t("rideRequests.page")} {matches.data.pagination.page} of{" "}
                    {matches.data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => settPage(page + 1)}
                    disabled={page === matches.data.pagination.totalPages}
                  >
                    {t("rideRequests.next")}
                  </Button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RideRequests;

function MatchDetails({
  match,
  formatDate,
  matchScore,
  request,
}: {
  match: any;
  formatDate: any;
  matchScore: number;
  request: any;
}) {
  const [currentTime, setCurrentTime] = useState(null);
  const [timeZone, setTimeZone] = useState(null);

  const { currentLanguage } = useReactItems();

  const rideData = match.ride;
  const userLocale = currentLanguage === "fr" ? "fr-FR" : "en-US";

  const isD2D = rideData?.isDoorToDoor || rideData?.type === "D2D";
  const displayDeparture = isD2D
    ? rideData?.driverStartLocation || rideData?.departureLocation
    : rideData?.departureLocation;

  useEffect(() => {
    // Parse as UTC
    const userTimeZone = DateTime.local().zoneName;
    const startLoc = displayDeparture;

    if (startLoc?.latitude && startLoc?.longitude) {
      // Get timezone of departure location (or driver start for D2D)
      const departureTimeZone = tzlookup(startLoc.latitude, startLoc.longitude);

      setTimeZone(departureTimeZone);

      const departureInCity = DateTime.fromISO(rideData?.departureTime, {
        zone: departureTimeZone,
      });
      const departureInUserZone = departureInCity.setZone(userTimeZone);

      setCurrentTime(departureInUserZone);
    } else if (rideData?.departureTime && !timeZone) {
      // Fallback when coordinates are missing (some D2D records)
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
    displayDeparture,
    rideData,
  ]);

  const handleNavigateToRide = () => {
    if (isD2D) {
      window.location.replace(
        `/ride?rideId=${match.ride.id}&requestId=${request.data?.id}`
      );
    } else {
      window.location.replace(`/ride?rideId=${match.ride.id}`);
    }
  };

  if (!rideData.departureTime || !timeZone || !currentTime)
    return <p>Loading...</p>;

  return (
    <Card
      key={match.id}
      className="border-slate-200 bg-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2  bg-primary-50 dark:bg-primary-900/20">
              <Car className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {t("rideRequests.ride")} #{match.ride.id}
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                {t("rideRequests.on")} {formatDate(match.matchedAt)}
              </CardDescription>
            </div>
          </div>

          {/* Match Score */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t("rideRequests.score")}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700  overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all"
                    style={{ width: `${matchScore}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {matchScore}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            <Calendar className="h-5 w-5" />
          </span>
          <span className="text-sm">
            {formatTime({
              dateString: rideData?.departureTime,
              timeZone: timeZone,
              formatTime: userLocale,
            })}
          </span>
          {rideData?.departureTime && currentTime && (
            <Badge className="border-none text-sm text-white">
              ({currentTime.toFormat("LLL dd, hh:mm a")} local time)
            </Badge>
          )}
        </div>

        {/* Route Information */}
        <div className="bg-slate-50 dark:bg-slate-800/50  p-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <div className="w-2 h-2  bg-primary-500"></div>
              <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-600 my-0.5"></div>
              <div className="w-2 h-2  bg-red-500"></div>
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                {/* Origin */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("rideRequests.from")}
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {match.ride.departureLocation?.locationName ||
                        match.ride.driverStartLocation?.locationName}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {match.ride.departureLocation?.city ||
                      match.ride.driverStartLocation?.city}
                  </span>
                </div>

                {/* Destination */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("rideRequests.to")}
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {match.ride.destinationLocation?.locationName ||
                        match.ride.driverStopLocation?.locationName}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {match.ride.destinationLocation?.city ||
                      match.ride.driverStopLocation?.city}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ride Details Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Available Seats */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t("rideRequests.available")}
              </p>
            </div>
            <div className="flex items-center gap-1 pl-5">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {match.ride.availableSeats} / {match.ride.totalSeats}
              </span>
              {match.ride.availableSeats >= (request.data?.seats || 0) ? (
                <CheckCircle className="h-3.5 w-3.5 text-primary-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              )}
            </div>
          </div>

          {/* Ride Type */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t("rideRequests.type")}
              </p>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white pl-5">
              {match.ride.type}
            </p>
          </div>

          {/* Contribution */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t("rideRequests.contribution")}
              </p>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white pl-5">
              ${match.ride.contribution}
            </p>
          </div>
        </div>

        {/* Driver Information */}
        {match.ride.driver && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {match.ride.driver.profileImage?.url ? (
                  <img
                    src={match.ride.driver.profileImage.url}
                    alt={match.ride.driver.firstName}
                    className="w-10 h-10  object-cover"
                  />
                ) : (
                  <div className="w-10 h-10  bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {match.ride.driver.firstName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {match.ride.driver.rating || t("rideRequests.noRating")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            // variant="outline"
            className="flex-1 hover:bg-primary-500"
            onClick={handleNavigateToRide}
          >
            <Eye className="h-4 w-4 mr-2" />
            {t("rideRequests.view")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
