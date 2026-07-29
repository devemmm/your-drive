import React, { useState } from "react";
import { Search, Filter, MapPin, X, Flag } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { AdminRideDetails } from "@/components/DetailsSheet";
import { Ride } from "@/hooks/useRides";
import DropdownSelect from "@/components/ui/DropdownSelect";
import CustomLoader from "@/components/CustomLoader";
import { DownloadButton } from "@/components/admin/DownloadButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import { Car } from "lucide-react";

interface RidesTabProps {
  rides: Ride[];
  pagination: any;
  loading: boolean;
  error: any;
  searchTerm: string;
  rideStatus: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED" | "all";
  rideType: "D2D" | "P2P" | "all";
  onSearchChange: (search: string) => void;
  onStatusChange: (
    status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED" | "all"
  ) => void;
  onTypeChange: (type: "D2D" | "P2P" | "all") => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizes: number[];
}

export const RidesTab: React.FC<RidesTabProps> = ({
  rides,
  pagination,
  loading,
  error,
  searchTerm,
  rideStatus,
  rideType,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizes,
}) => {
  const { t } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState<"" | "CAR" | "MOTORBIKE" | "BUS">("");

  const clearFilters = () => {
    onSearchChange("");
    onStatusChange("all");
    onTypeChange("all");
    setCategoryFilter("");
  };

  // Apply category filter client-side (vehicle category lives on the ride's vehicle)
  const displayedRides = categoryFilter
    ? rides.filter((ride) => (ride as any).vehicle?.category === categoryFilter)
    : rides;

  return (
    <div>
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("AdminDashboard.Rides.title")}
          </CardTitle>
          <CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("AdminDashboard.Rides.description")}
          </CardDescription>
          <div className="mt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                type="text"
                placeholder={t("AdminDashboard.Rides.searchPlaceholder")}
                className="pl-9 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-black dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4">
              <select
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={rideStatus}
                onChange={(e) => onStatusChange(e.target.value as any)}
              >
                <option value="all">
                  {t("AdminDashboard.Rides.statusFilter.all")}
                </option>
                <option value="PUBLISHED">
                  {t("AdminDashboard.Rides.statusFilter.active")}
                </option>
                <option value="COMPLETED">
                  {t("AdminDashboard.Rides.statusFilter.completed")}
                </option>
                <option value="CANCELLED">
                  {t("AdminDashboard.Rides.statusFilter.cancelled")}
                </option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={rideType}
                onChange={(e) => onTypeChange(e.target.value as any)}
              >
                <option value="all">
                  {t("AdminDashboard.Rides.typeFilter.all", "All Types")}
                </option>
                <option value="D2D">
                  {t("AdminDashboard.Rides.typeFilter.d2d", "Door-to-Door")}
                </option>
                <option value="P2P">
                  {t("AdminDashboard.Rides.typeFilter.p2p", "Peer-to-Peer")}
                </option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as "" | "CAR" | "MOTORBIKE" | "BUS")}
              >
                <option value="">All categories</option>
                <option value="CAR">Car</option>
                <option value="MOTORBIKE">Motorbike</option>
                <option value="BUS">Bus</option>
              </select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {t("common.clearFilters")}
              </Button>

              {/* Download Button */}
              <DownloadButton
                type="rides"
                params={{
                  searchTerm: searchTerm || undefined,
                  status: rideStatus === "all" ? undefined : rideStatus,
                  type: rideType === "all" ? undefined : rideType,
                }}
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    "id",
                    "driver",
                    "type",
                    "route",
                    "date",
                    "passengers",
                    "status",
                    "actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400"
                    >
                      {t(`AdminDashboard.Rides.tableHeaders.${header}`)}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("AdminDashboard.Rides.tableHeaders.busRoute", "Bus Route")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-6">
                      <TableSkeleton columns={9} rows={5} />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-red-500 dark:text-red-400">
                      {t("common.error", "Error loading rides")}
                    </td>
                  </tr>
                ) : displayedRides.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8">
                      <EmptyState
                        icon={Car}
                        title={t("AdminDashboard.Rides.noData", "No rides found")}
                        description={t(
                          "AdminDashboard.Rides.noDataDescription",
                          "Try adjusting your search or filter criteria"
                        )}
                      />
                    </td>
                  </tr>
                ) : (
                  displayedRides.map((ride) => {
                    const reportCount = ride._count?.reports ?? 0;
                    return (
                    <tr
                      key={ride?.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        reportCount > 0
                          ? "bg-red-100 dark:bg-red-900/20"
                          : ride.isBlocked
                          ? "bg-red-50 dark:bg-red-900/10"
                          : ride.status === "COMPLETED"
                          ? "bg-green-50 dark:bg-green-900/10"
                          : ride.status === "PUBLISHED"
                          ? "bg-orange-50 dark:bg-orange-900/10"
                          : "bg-violet-50 dark:bg-violet-900/10"
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-2">
                          {ride?.id}
                          {reportCount > 0 ? (
                            <span title={`${reportCount} open report${reportCount > 1 ? "s" : ""}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">
                              <Flag size={10} /> {reportCount}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-200 truncate text-xs">
                        {ride.driver?.email}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-200">
                        {(() => {
                          const rideType = ride?.type || (ride?.isDoorToDoor ? "D2D" : "P2P");
                          return (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              rideType === "D2D"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                                : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400"
                            }`}>
                              {rideType}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-200">
                        <div className="flex items-center text-nowrap">
                          <MapPin
                            size={14}
                            className="text-green-600 dark:text-green-400 mr-1"
                          />
                          {ride.type === "D2D" || ride.isDoorToDoor
                            ? ride.driverStartLocation?.city ||
                              ride.driverStartLocation?.region ||
                              "N/A"
                            : ride.departureLocation?.city || "N/A"}
                          {ride.type === "D2D" || ride.isDoorToDoor
                            ? ride.driverStartLocation?.region
                              ? `, ${ride.driverStartLocation.region}`
                              : ""
                            : ride.departureLocation?.region
                            ? `, ${ride.departureLocation.region}`
                            : ""}
                          <span className="mx-1 text-gray-400">→</span>
                          <MapPin
                            size={14}
                            className="text-red-500 dark:text-red-400 mr-1"
                          />
                          {ride.type === "D2D" || ride.isDoorToDoor
                            ? ride.driverStopLocation?.city ||
                              ride.driverStopLocation?.region ||
                              "N/A"
                            : ride.destinationLocation?.city || "N/A"}
                          {ride.type === "D2D" || ride.isDoorToDoor
                            ? ride.driverStopLocation?.region
                              ? `, ${ride.driverStopLocation.region}`
                              : ""
                            : ride.destinationLocation?.region
                            ? `, ${ride.destinationLocation.region}`
                            : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-200">
                        {new Date(ride.departureTime).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-200">
                        {ride.totalSeats - ride.availableSeats}
                      </td>
                      <td className="py-3 px-4">
                        {ride.isBlocked ? (
                          <span className="text-xs  bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-2 py-1 rounded font-medium  ">
                            {t(
                              "AdminDashboard.Rides.status.blocked",
                              "BLOCKED"
                            )}
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded font-medium ${
                              ride.status === "COMPLETED"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                                : ride.status === "PUBLISHED"
                                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400"
                                : "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-400"
                            }`}
                          >
                            {t(
                              `AdminDashboard.Rides.status.${ride.status.toLowerCase()}`
                            )}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <AdminRideDetails
                          ride={{
                            id: ride.id,
                            status: ride.status,
                            contribution: ride.contribution,
                            departureTime: ride.departureTime,
                            estimatedArrivalTime: ride.estimatedArrivalTime,
                            bookingType: ride.bookingType,
                            totalSeats: ride.totalSeats,
                            availableSeats: ride.availableSeats,
                            departureLocation:
                              ride.type === "D2D" || ride.isDoorToDoor
                                ? ride.driverStartLocation
                                : ride.departureLocation,
                            destinationLocation:
                              ride.type === "D2D" || ride.isDoorToDoor
                                ? ride.driverStopLocation
                                : ride.destinationLocation,
                            driver: {
                              name: ride.driver?.name,
                              email: ride.driver?.email,
                            },
                            vehicle: ride.vehicle,
                            preferences: ride.preferences,
                            stopovers: ride.stopovers,
                            isBlocked: ride.isBlocked,
                          }}
                        />
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-200 text-nowrap text-sm">
                        {ride.route
                          ? `${ride.route.originCity} → ${ride.route.destCity}`
                          : "—"}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center">
            <div className="text-gray-500 dark:text-gray-400">
              {t("AdminDashboard.Rides.pagination.showing", {
                count: Math.min(page * pageSize, pagination?.total || 0),
                total: pagination?.total || 0,
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <DropdownSelect
                  options={pageSizes}
                  value={pageSize}
                  onChange={(val) => {
                    onPageSizeChange(val);
                    onPageChange(1);
                  }}
                  label={t("AdminDashboard.Rides.pagination.itemsPerPage")}
                  className="flex gap-2 items-center"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(page - 1, 1))}
                disabled={page === 1}
                className="dark:border-gray-700 dark:text-gray-200 dark:bg-gray-900 disabled:opacity-50"
              >
                {t("AdminDashboard.Rides.pagination.previous")}
              </Button>
              <div className="text-xs sm:text-base dark:text-gray-400 text-gray-700">
                {t("AdminDashboard.Rides.pagination.pageOf", {
                  current: page,
                  total: pagination?.totalPages || 1,
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onPageChange(
                    page < (pagination?.totalPages || 1) ? page + 1 : page
                  )
                }
                disabled={page >= (pagination?.totalPages || 1)}
                className="dark:border-gray-700 dark:text-gray-200 dark:bg-gray-900 disabled:opacity-50"
              >
                {t("AdminDashboard.Rides.pagination.next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
