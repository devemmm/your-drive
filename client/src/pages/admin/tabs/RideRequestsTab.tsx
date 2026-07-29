import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAllRideRequests } from "@/data";
import { format } from "date-fns";
import { Search, MapPin, Calendar, User, X } from "lucide-react";
import { DownloadButton } from "@/components/admin/DownloadButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import { FileText } from "lucide-react";
import DropdownSelect from "@/components/ui/DropdownSelect";

interface RideRequestsTabProps {
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizes: number[];
}

export const RideRequestsTab: React.FC<RideRequestsTabProps> = ({
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizes,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [originCityFilter, setOriginCityFilter] = useState("");
  const [destinationCityFilter, setDestinationCityFilter] = useState("");

  const filters = {
    search: searchTerm || undefined,
    status: statusFilter === "all" ? undefined : statusFilter || undefined,
    originCity: originCityFilter || undefined,
    destinationCity: destinationCityFilter || undefined,
    mineOnly: false, // Admin sees all requests
  };

  const { data, isLoading, error } = useAllRideRequests(page, pageSize, filters);

  const rideRequests = data?.data ?? [];
  const pagination = data?.pagination || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return (
          <Badge className="bg-blue-500/10 text-blue-500">
            {t("AdminDashboard.RideRequests.status.open", "Open")}
          </Badge>
        );
      case "CLOSED":
        return (
          <Badge className="bg-gray-500/10 text-gray-500">
            {t("AdminDashboard.RideRequests.status.closed", "Closed")}
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500">
            {t("AdminDashboard.RideRequests.status.draft", "Draft")}
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge className="bg-red-500/10 text-red-500">
            {t("AdminDashboard.RideRequests.status.expired", "Expired")}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/10 text-gray-500">
            {status || t("AdminDashboard.RideRequests.status.unknown", "Unknown")}
          </Badge>
        );
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setOriginCityFilter("");
    setDestinationCityFilter("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {t("AdminDashboard.RideRequests.title", "Ride Requests")}
            </h2>
          </div>
        </div>
        <TableSkeleton columns={7} rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {t("AdminDashboard.RideRequests.title", "Ride Requests")}
            </h2>
          </div>
        </div>
        <div className="text-center py-8 text-red-500 dark:text-red-400">
          {t("common.error", "Error loading ride requests")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t("AdminDashboard.RideRequests.title", "Ride Requests")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "AdminDashboard.RideRequests.description",
              "Manage and monitor ride requests from passengers"
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("AdminDashboard.RideRequests.searchPlaceholder", "Search...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("AdminDashboard.RideRequests.statusFilter", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("common.all", "All")}
            </SelectItem>
            <SelectItem value="OPEN">
              {t("AdminDashboard.RideRequests.status.open", "Open")}
            </SelectItem>
            <SelectItem value="CLOSED">
              {t("AdminDashboard.RideRequests.status.closed", "Closed")}
            </SelectItem>
            <SelectItem value="DRAFT">
              {t("AdminDashboard.RideRequests.status.draft", "Draft")}
            </SelectItem>
            <SelectItem value="EXPIRED">
              {t("AdminDashboard.RideRequests.status.expired", "Expired")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder={t("AdminDashboard.RideRequests.originCity", "Origin City")}
          value={originCityFilter}
          onChange={(e) => setOriginCityFilter(e.target.value)}
          className="w-[150px]"
        />

        <Input
          placeholder={t("AdminDashboard.RideRequests.destinationCity", "Destination City")}
          value={destinationCityFilter}
          onChange={(e) => setDestinationCityFilter(e.target.value)}
          className="w-[150px]"
        />

        <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
          <X className="h-4 w-4" />
          {t("common.clearFilters", "Clear Filters")}
        </Button>

        <DownloadButton
          type="rideRequests"
          params={filters}
          variant="outline"
          size="sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("AdminDashboard.RideRequests.table.id", "ID")}</TableHead>
              <TableHead>{t("AdminDashboard.RideRequests.table.user", "User")}</TableHead>
              <TableHead>{t("AdminDashboard.RideRequests.table.origin", "Origin")}</TableHead>
              <TableHead>{t("AdminDashboard.RideRequests.table.destination", "Destination")}</TableHead>
              <TableHead>{t("AdminDashboard.RideRequests.table.date", "Date")}</TableHead>
              <TableHead>{t("AdminDashboard.RideRequests.table.seats", "Seats")}</TableHead>
              <TableHead>{t("AdminDashboard.RideRequests.table.status", "Status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rideRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8">
                  <EmptyState
                    icon={FileText}
                    title={t("AdminDashboard.RideRequests.noData", "No ride requests found")}
                    description={t(
                      "AdminDashboard.RideRequests.noDataDescription",
                      "Try adjusting your filter criteria"
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rideRequests.map((request: any) => (
                <TableRow key={request.id}>
                  <TableCell>#{request.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {request.user?.profileImage && (
                        <img
                          src={request.user.profileImage.url}
                          alt={request.user.name}
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span>{request.user?.name || request.user?.email || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-green-600" />
                      <span className="text-sm">
                        {request.origin?.city || request.origin?.locationName || "N/A"}
                        {request.origin?.province && `, ${request.origin.province}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-red-500" />
                      <span className="text-sm">
                        {request.destination?.city || request.destination?.locationName || "N/A"}
                        {request.destination?.province && `, ${request.destination.province}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {request.date
                          ? format(new Date(request.date), "MMM dd, yyyy")
                          : "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{request.seats || 1}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {t("common.rowsPerPage", "Rows per page")}:
          </span>
          <DropdownSelect
            options={pageSizes}
            value={pageSize}
            onChange={(val) => {
              onPageSizeChange(val);
              onPageChange(1);
            }}
            label=""
            className="flex gap-2 items-center"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page === 1}
          >
            {t("common.previous", "Previous")}
          </Button>
          <div className="text-sm text-gray-600">
            {t("common.pageOf", "Page {{current}} of {{total}}", {
              current: page,
              total: pagination.totalPages || 1,
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= (pagination.totalPages || 1)}
          >
            {t("common.next", "Next")}
          </Button>
        </div>
      </div>
    </div>
  );
};
