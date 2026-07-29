import React, { useState } from "react";
import { MapPin, ArrowRight, Calendar } from "lucide-react";
import { RideCompletion } from "@/components/Cards/RideCompletion";
import { BarChartComponent } from "@/components/Cards/Barchart";
import { UserGrowth } from "@/components/Cards/UserGrowth";
import TopRoutes from "@/components/Cards/TopRoutes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CustomLoader from "@/components/CustomLoader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Ride } from "@/hooks/useRides";

interface DashboardTabProps {
  rides: Ride[];
  ridesLoading: boolean;
  ridesError: any;
  completedRides: number;
  totalEarnings: number;
  serviceFeesCollected: number;
  activeDrivers: number;
  activePassengers: number;
  totalUsers?: number;
  users: any[];
  statsRides: any[];
  statsTransactions: any[];
  statsUsers: any[];
  totalRides: number;
  totalVehicles: number;
  totalBookings: number;
  noShowsStats?: {
    totalNoShows: number;
    mostCommonReason: string;
  };
  onTabChange: (tab: string) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  rides,
  ridesLoading,
  ridesError,
  completedRides,
  activeDrivers,
  activePassengers,
  totalUsers,
  statsRides,
  statsTransactions,
  statsUsers,
  totalRides,
  totalVehicles,
  totalBookings,
  noShowsStats,
  onTabChange,
  selectedYear,
  onYearChange,
}) => {
  const { t } = useTranslation();
  
  // Year selector - default to current year, with options from 2025 onwards
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const availableYears = Array.from(
    { length: currentYear - startYear + 1 },
    (_, i) => startYear + i
  ).reverse(); // Most recent year first

  return (
    <div>
      {/* Year Selector */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <label className="text-sm font-medium">
            {t("AdminDashboard.selectYear", "Select Year")}:
          </label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onYearChange(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {/* Total Users Card */}
        <Card className="bg-white dark:bg-white border border-green-200 dark:border-green-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-600 dark:text-gray-400">
                  {t("AdminDashboard.totalUsers")}
                </p>
                <h3 className="text-3xl font-bold text-gray-600 dark:text-white">
                  {totalUsers ?? ((activePassengers || 0) + (activeDrivers || 0))}
                </h3>
                <div className="flex gap-3 mt-2">
                  <div className="text-gray-600 dark:text-gray-400 truncate text-xs">
                    <span className="font-medium text-green-600 dark:text-green-400 truncate">
                      {activeDrivers}{" "}
                    </span>
                    {t("AdminDashboard.drivers")}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 truncate text-xs">
                    <span className="font-medium text-primary-600 dark:text-primary-400">
                      {activePassengers}{" "}
                    </span>{" "}
                    {t("AdminDashboard.passengers")}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Rides Card */}
        <Card className="bg-white dark:bg-white border border-green-200 dark:border-green-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {t("dashboard_.ride.Total")}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalRides}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  <span className="text-green-600 dark:text-green-400">
                    {completedRides}
                  </span>{" "}
                  {t("dashboard_.ride.Completed")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Bookings Card */}
        <Card className="bg-white dark:bg-white border border-green-200 dark:border-green-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {t("dashboard_.booking.totalBookings", "Total Bookings")}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalBookings}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {t("dashboard_.booking.rideBookings")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Vehicles Card */}
        <Card className="bg-white dark:bg-white border border-green-200 dark:border-green-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {t("dashboard_.vehicle.totalVehicles", "Total Vehicles")}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalVehicles}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {t("dashboard_.vehicle.registeredVehicles", "Registered")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total No-Shows Card */}
        <Card className="bg-white dark:bg-white border border-green-200 dark:border-green-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {t("AdminDashboard.totalNoShows", "Total No-Shows")}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {noShowsStats?.totalNoShows || 0}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {t("AdminDashboard.noShowsReported", "Reported")}
                </p>
                {noShowsStats?.mostCommonReason && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("AdminDashboard.mostCommonReason", "Most common:")}{" "}
                    {noShowsStats.mostCommonReason}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 mb-6 gap-4">
        <UserGrowth statsUsers={statsUsers} selectedYear={selectedYear} />
        <RideCompletion statsRides={statsRides} selectedYear={selectedYear} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 mb-6 gap-4">
        <TopRoutes rides={statsRides} loading={ridesLoading} selectedYear={selectedYear} />
        <BarChartComponent
          statsRides={statsRides}
          statsTransactions={statsTransactions}
          selectedYear={selectedYear}
        />
      </div>

      {/* Recent Rides Card */}
      <Card className="lg:col-span-2 mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-800">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
            {t("AdminDashboard.RecentRides.title")}
          </CardTitle>
          <CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("AdminDashboard.RecentRides.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-green-50 dark:bg-green-50">
                <tr>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("AdminDashboard.RecentRides.id")}
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("AdminDashboard.RecentRides.driver")}
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("AdminDashboard.RecentRides.type", "Type")}
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("AdminDashboard.RecentRides.route")}
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("AdminDashboard.RecentRides.date")}
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("AdminDashboard.RecentRides.passengers")}
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400">
                    {t("AdminDashboard.RecentRides.status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {ridesLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10">
                      <div className="flex items-center justify-center">
                        <CustomLoader />
                      </div>
                    </td>
                  </tr>
                ) : ridesError ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-red-500">
                      {t("common.error")}
                    </td>
                  </tr>
                ) : rides.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-500">
                      {t("AdminDashboard.RecentRides.noRides")}
                    </td>
                  </tr>
                ) : (
                  rides?.slice(0, 10).map((ride) => {
                    const rideType = ride?.type || (ride?.isDoorToDoor ? "D2D" : "P2P");
                    return (
                    <tr
                      key={ride?.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300">
                        {ride.id}
                      </td>
                      <td className="py-3 px-4 text-nowrap text-gray-600 dark:text-gray-300">
                        {(() => {
                          const driver = ride?.driver;
                          if (!driver) return "N/A";
                          
                          // Try name first
                          if (driver.name) return driver.name;
                          
                          // Try firstName and lastName combination
                          if (driver.firstName) {
                            return driver.lastName 
                              ? `${driver.firstName} ${driver.lastName}`
                              : driver.firstName;
                          }
                          
                          // Fallback to email
                          if (driver.email) return driver.email;
                          
                          return "N/A";
                        })()}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rideType === "D2D"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                            : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400"
                        }`}>
                          {rideType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center text-nowrap">
                          <MapPin
                            size={14}
                            className="text-green-600 dark:text-green-400 mr-1"
                          />
                          {ride?.type === "D2D" || ride?.isDoorToDoor
                            ? ride?.driverStartLocation?.city ||
                              ride?.driverStartLocation?.region ||
                              "N/A"
                            : ride?.departureLocation?.city || "N/A"}
                          {ride?.type === "D2D" || ride?.isDoorToDoor
                            ? ride?.driverStartLocation?.region
                              ? `, ${ride.driverStartLocation.region}`
                              : ""
                            : ride?.departureLocation?.region
                            ? `, ${ride.departureLocation.region}`
                            : ""}
                          <span className="mx-1 text-gray-400">→</span>
                          <MapPin
                            size={14}
                            className="text-red-500 dark:text-red-400 mr-1"
                          />
                          {ride?.type === "D2D" || ride?.isDoorToDoor
                            ? ride?.driverStopLocation?.city ||
                              ride?.driverStopLocation?.region ||
                              "N/A"
                            : ride?.destinationLocation?.city || "N/A"}
                          {ride?.type === "D2D" || ride?.isDoorToDoor
                            ? ride?.driverStopLocation?.region
                              ? `, ${ride.driverStopLocation.region}`
                              : ""
                            : ride?.destinationLocation?.region
                            ? `, ${ride.destinationLocation.region}`
                            : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {ride?.departureTime
                          ? new Date(ride.departureTime).toLocaleDateString()
                          : ride?.createdAt
                          ? new Date(ride.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {ride?.totalSeats && ride?.availableSeats !== undefined
                          ? ride.totalSeats - ride.availableSeats
                          : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            ride?.status === "COMPLETED"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                              : ride?.status === "PUBLISHED"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                              : ride?.status === "CANCELLED"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                              : "bg-green-50 dark:bg-green-50 text-gray-800 dark:text-gray-800"
                          }`}
                        >
                          {t(
                            `AdminDashboard.Rides.status.${ride?.status?.toLowerCase()}`,
                            ride?.status || "Unknown"
                          )}
                        </span>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t dark:border-gray-700">
            <Button
              variant="outline"
              className="w-full gap-2 text-gray-600 dark:text-gray-600 border-green-300 dark:border-green-300 hover:bg-green-50 dark:hover:bg-green-50 dark:bg-white"
              onClick={() => {
                onTabChange("rides");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {t("AdminDashboard.RecentRides.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
