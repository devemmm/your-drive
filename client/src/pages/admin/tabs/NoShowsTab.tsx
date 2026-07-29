import React, { useState, useEffect } from "react";
import { useAllNoShows, useConfirmNoShow, useRejectNoShow } from "@/data";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  User,
  Car,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Clock,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CustomLoader from "@/components/CustomLoader";
import { DownloadButton } from "@/components/admin/DownloadButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NoShow {
  id: number;
  userId: number;
  rideId: number;
  reason: string;
  reportedById: number;
  createdAt: string;
  status?: string;
  reviewNotes?: string;
  user?: {
    name: string;
    email: string;
    profileImage?: {
      url: string;
    };
  };
  ride?: {
    id: number;
    departureLocation?: {
      city: string;
    };
    destinationLocation?: {
      city: string;
    };
    status: string;
    departureTime?: string;
  };
  reportedBy?: {
    name: string;
    email: string;
  };
}

export const NoShowsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedNoShow, setSelectedNoShow] = useState<NoShow | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  const [rejectReason, setRejectReason] = useState("");

  const currentLang = i18n.language?.toUpperCase().startsWith("FR")
    ? "FR"
    : "EN";

  const { data, isLoading, refetch } = useAllNoShows(
    page,
    pageSize,
    currentLang
  );
  const { mutate: confirmNoShow, isPending: isConfirming } = useConfirmNoShow();
  const { mutate: rejectNoShow, isPending: isRejecting } = useRejectNoShow();

  const noShows = data?.data?.noShows ?? data?.data ?? [];
  const pagination = data?.data?.pagination ??
    data?.pagination ?? {
      page: 1,
      pageSize,
      total: 0,
      totalPages: 1,
    };

  useEffect(() => {
    setPage(1);
  }, [pageSize, statusFilter]);

  const handleViewDetails = (noShow: NoShow) => {
    setSelectedNoShow(noShow);
    setShowDetailsDialog(true);
  };

  const handleConfirm = (noShow: NoShow) => {
    setSelectedNoShow(noShow);
    setReviewNotes("");
    setShowConfirmDialog(true);
  };

  const handleReject = (noShow: NoShow) => {
    setSelectedNoShow(noShow);
    setShowRejectDialog(true);
  };

  const confirmNoShowAction = () => {
    if (selectedNoShow && reviewNotes.trim()) {
      confirmNoShow(
        { id: selectedNoShow.id, reviewNotes: reviewNotes.trim() },
        {
          onSuccess: () => {
            setShowConfirmDialog(false);
            setSelectedNoShow(null);
            setReviewNotes("");
            refetch();
          },
        }
      );
    }
  };

  const rejectNoShowAction = () => {
    if (selectedNoShow) {
      rejectNoShow(
        { id: selectedNoShow.id, reviewNotes: rejectReason },
        {
          onSuccess: () => {
            setShowRejectDialog(false);
            setSelectedNoShow(null);
            refetch();
          },
        }
      );
    }
  };

  const filteredNoShows = noShows.filter((noShow: NoShow) => {
    if (!searchTerm) return true;
    if (statusFilter !== "all" && noShow.status !== statusFilter) return false;

    const searchLower = searchTerm.toLowerCase();
    const isD2D = noShow.ride?.type === "D2D" || noShow.ride?.isDoorToDoor;
    const departureLocation = isD2D
      ? noShow.ride?.driverStartLocation
      : noShow.ride?.departureLocation;
    const destinationLocation = isD2D
      ? noShow.ride?.driverStopLocation
      : noShow.ride?.destinationLocation;

    return (
      noShow.reason.toLowerCase().includes(searchLower) ||
      noShow.user?.name?.toLowerCase().includes(searchLower) ||
      noShow.user?.email?.toLowerCase().includes(searchLower) ||
      noShow.reportedBy?.name?.toLowerCase().includes(searchLower) ||
      noShow.reportedBy?.email?.toLowerCase().includes(searchLower) ||
      departureLocation?.city?.toLowerCase().includes(searchLower) ||
      destinationLocation?.city?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Confirmed
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      currentLang === "FR" ? "fr-CA" : "en-CA",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">
            {t("AdminDashboard.NoShows.title", "No-Show Management")}
          </h2>
          <p className="text-muted-foreground">
            {t(
              "AdminDashboard.NoShows.description",
              "Review and manage reported no-shows"
            )}
          </p>
        </div>
        <DownloadButton type="noShows" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("AdminDashboard.NoShows.filters", "Filters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("AdminDashboard.NoShows.search", "Search")}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t(
                    "AdminDashboard.NoShows.searchPlaceholder",
                    "Search no-shows..."
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("AdminDashboard.NoShows.status", "Status")}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("AdminDashboard.NoShows.allStatuses", "All Statuses")}
                  </SelectItem>
                  <SelectItem value="PENDING">
                    {t("AdminDashboard.NoShows.pending", "Pending")}
                  </SelectItem>
                  <SelectItem value="CONFIRMED">
                    {t("AdminDashboard.NoShows.confirmed", "Confirmed")}
                  </SelectItem>
                  <SelectItem value="REJECTED">
                    {t("AdminDashboard.NoShows.rejected", "Rejected")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("AdminDashboard.NoShows.pageSize", "Page Size")}</Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No-Shows Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-nowrap">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("AdminDashboard.NoShows.table.id", "ID")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("AdminDashboard.NoShows.table.user", "User")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("AdminDashboard.NoShows.table.ride", "Ride")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("AdminDashboard.NoShows.table.reason", "Reason")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t(
                      "AdminDashboard.NoShows.table.reportedBy",
                      "Reported By"
                    )}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("AdminDashboard.NoShows.table.status", "Status")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("AdminDashboard.NoShows.table.createdAt", "Created At")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {t("AdminDashboard.NoShows.table.actions", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10">
                      <div className="flex items-center justify-center">
                        <CustomLoader />
                      </div>
                    </td>
                  </tr>
                ) : filteredNoShows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-muted-foreground"
                    >
                      {t(
                        "AdminDashboard.NoShows.noNoShowsFound",
                        "No no-shows found"
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredNoShows.map((noShow: NoShow) => (
                    <tr key={noShow.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">#{noShow.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              {noShow.user?.email || "Email not available"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">
                            {noShow.ride?.type === "D2D" ||
                            noShow.ride?.isDoorToDoor
                              ? noShow.ride?.driverStartLocation?.city ||
                                noShow.ride?.driverStartLocation?.region ||
                                "N/A"
                              : noShow.ride?.departureLocation?.city ||
                                "N/A"}{" "}
                            →{" "}
                            {noShow.ride?.type === "D2D" ||
                            noShow.ride?.isDoorToDoor
                              ? noShow.ride?.driverStopLocation?.city ||
                                noShow.ride?.driverStopLocation?.region ||
                                "N/A"
                              : noShow.ride?.destinationLocation?.city || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate" title={noShow.reason}>
                          {noShow.reason}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            {noShow.reportedBy?.name ||
                              `User #${noShow.reportedById}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {noShow.reportedBy?.email || "Email not available"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(noShow.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {formatDate(noShow.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(noShow)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(!noShow.status || noShow.status === "PENDING") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => handleConfirm(noShow)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleReject(noShow)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t("AdminDashboard.NoShows.pagination.showing", "Showing")}{" "}
                {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, pagination.total)}{" "}
                {t("AdminDashboard.NoShows.pagination.of", "of")}{" "}
                {pagination.total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  {t("AdminDashboard.NoShows.pagination.previous", "Previous")}
                </Button>
                <span className="text-sm">
                  {t("AdminDashboard.NoShows.pagination.page", "Page")} {page}{" "}
                  {t("AdminDashboard.NoShows.pagination.of", "of")}{" "}
                  {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  {t("AdminDashboard.NoShows.pagination.next", "Next")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t("AdminDashboard.NoShows.details.title", "No-Show Details")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "AdminDashboard.NoShows.details.subtitle",
                "Complete no-show information and review"
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedNoShow && (
            <div className="space-y-6">
              {/* No-Show Overview */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t(
                          "AdminDashboard.NoShows.details.noShowOverview",
                          "No-Show Overview"
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t(
                          "AdminDashboard.NoShows.details.noShowId",
                          "No-Show ID"
                        )}
                        : #{selectedNoShow.id}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(selectedNoShow.status)}
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Information */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white">
                      {t(
                        "AdminDashboard.NoShows.details.userInfo",
                        "User Information"
                      )}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("AdminDashboard.NoShows.details.userId", "User ID")}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        #{selectedNoShow.userId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t(
                          "AdminDashboard.NoShows.details.userName",
                          "User Name"
                        )}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {(selectedNoShow as any).user?.firstName ||
                          "Not available"}{" "}
                        {(selectedNoShow as any).user?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t(
                          "AdminDashboard.NoShows.details.userEmail",
                          "User Email"
                        )}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedNoShow.user?.email || "Not available"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ride Information */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white">
                      {t(
                        "AdminDashboard.NoShows.details.rideInfo",
                        "Ride Information"
                      )}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("AdminDashboard.NoShows.details.rideId", "Ride ID")}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        #{selectedNoShow.rideId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t(
                          "AdminDashboard.NoShows.details.rideStatus",
                          "Ride Status"
                        )}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedNoShow.ride?.status || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("AdminDashboard.NoShows.details.route", "Route")}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedNoShow.ride?.type === "D2D" ||
                        selectedNoShow.ride?.isDoorToDoor
                          ? selectedNoShow.ride?.driverStartLocation?.city ||
                            selectedNoShow.ride?.driverStartLocation?.region ||
                            "N/A"
                          : selectedNoShow.ride?.departureLocation?.city ||
                            "N/A"}{" "}
                        →{" "}
                        {selectedNoShow.ride?.type === "D2D" ||
                        selectedNoShow.ride?.isDoorToDoor
                          ? selectedNoShow.ride?.driverStopLocation?.city ||
                            selectedNoShow.ride?.driverStopLocation?.region ||
                            "N/A"
                          : selectedNoShow.ride?.destinationLocation?.city ||
                            "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason and Reporter Information */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white">
                      {t(
                        "AdminDashboard.NoShows.details.reasonInfo",
                        "Reason Information"
                      )}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("AdminDashboard.NoShows.details.reason", "Reason")}:
                      </span>
                      <p className="text-sm font-medium dark:text-white mt-1">
                        {selectedNoShow.reason}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t(
                          "AdminDashboard.NoShows.details.createdAt",
                          "Reported At"
                        )}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {formatDate(selectedNoShow.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white">
                      {t(
                        "AdminDashboard.NoShows.details.reportedByInfo",
                        "Reported By"
                      )}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t(
                          "AdminDashboard.NoShows.details.reportedById",
                          "Reporter ID"
                        )}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        #{selectedNoShow.reportedById}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t(
                          "AdminDashboard.NoShows.details.reporterName",
                          "Reporter Name"
                        )}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {(selectedNoShow as any).reportedBy?.firstName ||
                          "Not available"}{" "}
                        {(selectedNoShow as any).reportedBy?.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t(
                          "AdminDashboard.NoShows.details.reporterEmail",
                          "Reporter Email"
                        )}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedNoShow.reportedBy?.email || "Not available"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {t("AdminDashboard.NoShows.confirm.title", "Confirm No-Show")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "AdminDashboard.NoShows.confirm.description",
                "This will confirm the no-show report. Please provide review notes."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewNotes">
                {t(
                  "AdminDashboard.NoShows.confirm.reviewNotes",
                  "Review Notes"
                )}{" "}
                *
              </Label>
              <Textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={t(
                  "AdminDashboard.NoShows.confirm.notesPlaceholder",
                  "Enter your review notes..."
                )}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isConfirming}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={confirmNoShowAction}
              disabled={!reviewNotes.trim() || isConfirming}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t("common.processing", "Processing...")}
                </div>
              ) : (
                t("AdminDashboard.NoShows.confirm.confirm", "Confirm No-Show")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              {t("AdminDashboard.NoShows.reject.title", "Reject No-Show")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "AdminDashboard.NoShows.reject.description",
                "This will reject the no-show report. Are you sure?"
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Reason Textarea */}
          <div className="mt-4">
            <label
              htmlFor="rejectReason"
              className="block text-sm font-medium text-gray-700"
            >
              {t("AdminDashboard.NoShows.reasonLabel")}
            </label>
            <textarea
              id="rejectReason"
              rows={4}
              className="mt-2 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-red-500 focus:ring-red-500"
              placeholder={t("AdminDashboard.NoShows.reasonPlaceholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isRejecting}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => rejectNoShowAction()}
              disabled={isRejecting || !rejectReason.trim()}
              variant="destructive"
            >
              {isRejecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t("common.processing", "Processing...")}
                </div>
              ) : (
                t("AdminDashboard.NoShows.reject.reject", "Reject No-Show")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NoShowsTab;
