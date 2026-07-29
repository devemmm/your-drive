// import { useAllRidesInfinite } from "@/data";
import { useAllRidesInfinite, useAllBookings } from "@/data";
import { useToast } from "@/hooks/use-toast";
import { useJsApiLoader } from "@react-google-maps/api";
import { motion } from "framer-motion";
import { MapPin, Plus, Search, Filter, X, Calendar, DollarSign, SlidersHorizontal } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import DriverRideCard from "./DriverRideCard";
import LoadingIndicator from "./LoadingIndicator";
import { LIBRARIES } from "./Map";
import { Button } from "./ui/button";
import GooglePlacesInput from "./GoogleInput";

const DriverRides = () => {
  const [activeTab, setActiveTab] = useState<
    "active" | "upcoming" | "completed" | "all"
  >("active");
  const [driverRide, setDriverRide] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [filters, setFilters] = useState({
    orderBy: "",
    sort: "",
    departureCity: "",
    destinationCity: "",
    status: "",
    rideType: "", // D2D or P2P
    minContribution: undefined,
    maxContribution: undefined,
    departureTime: "", // ISO datetime string
    kind: "posted",
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAllRidesInfinite(12, appliedFilters);

  const rides = data?.pages.flatMap((page) => page?.data ?? []) ?? [];

  // Fetch bookings for booked rides
  const { data: bookingsData } = useAllBookings(
    1,
    100, // Get all bookings to match with rides
    {
      bookingRelation: filters.kind === "booked" ? "booked_by_me" : undefined,
    }
  );

  const bookings = bookingsData?.data?.bookings ?? [];

  // Create a map of rideId -> booking info for quick lookup
  const bookingMap = useMemo(() => {
    const map = new Map();
    bookings.forEach((booking: any) => {
      if (booking.rideId) {
        map.set(booking.rideId, {
          seatsBooked: booking.seats || booking.seatsBooked || 1, // Use 'seats' from API, fallback to 'seatsBooked' for compatibility
          bookingStatus: booking.status,
          bookingId: booking.id,
          paymentAmount: booking.paymentTransaction?.amount,
          paymentStatus: booking.paymentTransaction?.status,
          createdAt: booking.createdAt,
          cancelledAt: booking.cancelledAt,
          reason: booking.reason,
        });
      }
    });
    return map;
  }, [bookings]);

  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    switch (activeTab) {
      case "upcoming":
        setAppliedFilters((prev) => ({
          ...prev,
          status: "PUBLISHED",
        }));
        break;
      case "completed":
        setAppliedFilters((prev) => ({
          ...prev,
          status: "COMPLETED",
        }));
        break;
      case "all":
        setAppliedFilters((prev) => ({
          ...prev,
          status: "",
        }));
        break;
      default:
        setAppliedFilters((prev) => ({
          ...prev,
          status: "",
        }));
        break;
    }
  }, [activeTab]);

  // Filter rides by search term and ride type
  const filteredRides = useMemo(() => {
    let filtered = rides;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((ride) => {
        const departureCity = ride.departureLocation?.city?.toLowerCase() || "";
        const destinationCity = ride.destinationLocation?.city?.toLowerCase() || "";
        const driverName = ride.driver?.name?.toLowerCase() || "";
        return (
          departureCity.includes(searchLower) ||
          destinationCity.includes(searchLower) ||
          driverName.includes(searchLower)
        );
      });
    }
    
    // Filter by ride type (client-side if not applied via API)
    if (appliedFilters.rideType) {
      filtered = filtered.filter((ride) => {
        const rideType = ride.type || (ride.isDoorToDoor ? "D2D" : "P2P");
        return rideType === appliedFilters.rideType;
      });
    }
    
    return filtered;
  }, [rides, searchTerm, appliedFilters.rideType]);

  useEffect(() => {
    if (filters.kind === "posted") {
      setDriverRide(true);
    } else {
      setDriverRide(false);
    }
  }, [filters.kind]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  // console.log({
  //   rides
  // })

  const clearFilters = () => {
    setFilters({
      orderBy: "",
      sort: "",
      departureCity: "",
      destinationCity: "",
      status: "",
      rideType: "",
      minContribution: undefined,
      maxContribution: undefined,
      departureTime: "",
      kind: filters.kind,
    });
    setAppliedFilters({
      orderBy: "",
      sort: "",
      departureCity: "",
      destinationCity: "",
      status: "",
      rideType: "",
      minContribution: undefined,
      maxContribution: undefined,
      departureTime: "",
      kind: filters.kind,
    });
    setSearchTerm("");
  };

  const hasActiveFilters = 
    filters.orderBy || 
    filters.sort || 
    filters.departureCity || 
    filters.destinationCity || 
    filters.status || 
    filters.rideType ||
    filters.minContribution || 
    filters.maxContribution || 
    filters.departureTime ||
    searchTerm;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search and Quick Actions */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t("DriverDashboard.ridesSection.searchPlaceholder", "Search by city, destination, or driver...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t("DriverDashboard.ridesSection.filters", "Filters")}
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary-600 text-white text-xs">
                    {[
                      filters.orderBy,
                      filters.sort,
                      filters.departureCity,
                      filters.destinationCity,
                      filters.status,
                      filters.rideType,
                      filters.minContribution,
                      filters.maxContribution,
                      filters.departureTime,
                    ].filter(Boolean).length}
                  </span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  {t("DriverDashboard.ridesSection.clear", "Clear")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t("FilterPanel.rideStatus")}
                </label>
                <select
                  value={filters.status ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{t("allStatuses", "All Statuses")}</option>
                  <option value="DRAFT">{t("FilterPanel.status.draft", "Draft")}</option>
                  <option value="PUBLISHED">{t("FilterPanel.status.published", "Published")}</option>
                  <option value="ONGOING">{t("FilterPanel.status.ongoing", "Ongoing")}</option>
                  <option value="COMPLETED">{t("FilterPanel.status.completed", "Completed")}</option>
                  <option value="CANCELLED">{t("FilterPanel.status.cancelled", "Cancelled")}</option>
                  <option value="EXPIRED">{t("FilterPanel.status.expired", "Expired")}</option>
                  <option value="BLOCKED">{t("FilterPanel.status.blocked", "Blocked")}</option>
                </select>
              </div>

              {/* Ride Type Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t("DriverDashboard.ridesSection.rideType", "Ride Type")}
                </label>
                <select
                  value={filters.rideType ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, rideType: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{t("common.all", "All Types")}</option>
                  <option value="D2D">{t("DriverDashboard.ridesSection.d2d", "Door-to-Door")}</option>
                  <option value="P2P">{t("DriverDashboard.ridesSection.p2p", "Peer-to-Peer")}</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t("FilterPanel.orderBy")}
                </label>
                <select
                  value={filters.orderBy ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, orderBy: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{t("PassengerHome.selectField", "Select Field")}</option>
                  <option value="departureTime">{t("FilterPanel.departureTime", "Departure Time")}</option>
                  <option value="contribution">{t("FilterPanel.contribution", "Contribution")}</option>
                </select>
              </div>

              {/* Sort Direction */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t("FilterPanel.direction", "Direction")}
                </label>
                <select
                  value={filters.sort ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, sort: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">{t("FilterPanel.SelectOrder", "Select Order")}</option>
                  <option value="asc">{t("ascending", "Ascending")}</option>
                  <option value="desc">{t("descending", "Descending")}</option>
                </select>
              </div>
            </div>

            {/* Advanced Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* Departure City */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t("FilterPanel.departureCity")}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <GooglePlacesInput
                    value={filters.departureCity}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        departureCity: e.target.value,
                      }))
                    }
                    onPlaceSelected={(data) =>
                      setFilters((prev) => ({
                        ...prev,
                        departureCity: data.city || data.locationName,
                      }))
                    }
                    placeholder={t("PassengerHome.fPlaceholder", "Departure city")}
                    googleReady={isLoaded}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Destination City */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t("FilterPanel.destinationCity")}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <GooglePlacesInput
                    value={filters.destinationCity}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        destinationCity: e.target.value,
                      }))
                    }
                    onPlaceSelected={(data) =>
                      setFilters((prev) => ({
                        ...prev,
                        destinationCity: data.city || data.locationName,
                      }))
                    }
                    placeholder={t("PassengerHome.tPlaceholder", "Destination city")}
                    googleReady={isLoaded}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Min Contribution */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t("min", "Min")} {t("FilterPanel.contribution", "Contribution")}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    placeholder={t("min", "Min")}
                    value={filters.minContribution ?? ""}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        minContribution: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Max Contribution */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t("max", "Max")} {t("FilterPanel.contribution", "Contribution")}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    placeholder={t("max", "Max")}
                    value={filters.maxContribution ?? ""}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        maxContribution: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* Date Filter */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                {t("FilterPanel.departureAfter", "Departure After")}
              </label>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={filters.departureTime ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, departureTime: e.target.value })
                  }
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Apply Filters Button */}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  setAppliedFilters(filters);
                  setShowFilters(false);
                }}
                className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white"
              >
                {t("FilterPanel.applyFilters", "Apply Filters")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ride List */}
      <div>
        <div className="mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                    {t("DriverDashboard.ridesSection.title")}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {t("DriverDashboard.ridesSection.description")}
                  </p>
                </div>

                <div className="relative w-full sm:w-48">
                  <select
                    value={filters.kind}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setFilters((prev) => ({
                        ...prev,
                        kind: newValue,
                      }));
                      setAppliedFilters((prev) => ({
                        ...prev,
                        kind: newValue,
                      }));
                    }}
                    className="block w-full px-4 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none"
                  >
                    <option value="booked">
                      {t("DriverDashboard.booked_")}
                    </option>
                    <option value="posted">
                      {t("DriverDashboard.posted")}
                    </option>
                  </select>

                  {/* Dropdown arrow icon */}
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg
                      className="w-5 h-5 text-slate-400 dark:text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="border-b border-slate-200 dark:border-slate-700">
                <div className="flex space-x-1 overflow-x-auto">
                  <button
                    className={`relative px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === "active"
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                    onClick={() => setActiveTab("active")}
                  >
                    {t("DriverDashboard.ridesSection.tabs.active")}
                    {activeTab === "active" && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                  </button>
                  <button
                    className={`relative px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === "upcoming"
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                    onClick={() => setActiveTab("upcoming")}
                  >
                    {t("DriverDashboard.ridesSection.tabs.upcoming")}
                    {activeTab === "upcoming" && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                  </button>
                  <button
                    className={`relative px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === "completed"
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                    onClick={() => setActiveTab("completed")}
                  >
                    {t("DriverDashboard.ridesSection.tabs.completed")}
                    {activeTab === "completed" && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                  </button>
                  <button
                    className={`relative px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === "all"
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                    onClick={() => setActiveTab("all")}
                  >
                    {t("DriverDashboard.ridesSection.tabs.all", "All Rides")}
                    {activeTab === "all" && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {isLoading ? (
                <LoadingIndicator />
              ) : (
                <>
                  {activeTab === "active" && (
                    <>
                      {filteredRides.length === 0 ? (
                        <div className="text-center py-12 space-y-4 flex items-center flex-col">
                          <div className="mx-auto w-24 h-24 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <MapPin className="h-10 w-10 text-slate-400" />
                          </div>
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                            {t("DriverDashboard.noActiveRides")}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {t("DriverDashboard.noActiveRidesDescription")}
                          </p>
                          <Link to="/post-a-ride">
                            <Button className="flex items-center bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white dark:text-white">
                              <Plus size={16} className="mr-2" />
                              {t("DriverDashboard.postRide.button")}
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {rides.filter(Boolean).map((ride) => {
                            return (
                              <DriverRideCard
                                key={ride.id}
                                t={t}
                                ride={ride}
                                navigate={navigate}
                                driverRide={driverRide}
                                bookingInfo={bookingMap.get(ride.id)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "upcoming" && (
                    <>
                      {filteredRides.filter(
                        (ride) => new Date(ride.departureTime) > new Date()
                      ).length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400 flex items-center flex-col">
                          <p>{t("DriverDashboard.noUpcomingRides")}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredRides
                            .filter(
                              (ride) =>
                                new Date(ride.departureTime) > new Date()
                            )
                            .map((ride) => (
                              <DriverRideCard
                                key={ride.id}
                                t={t}
                                ride={ride}
                                navigate={navigate}
                                driverRide={driverRide}
                                bookingInfo={bookingMap.get(ride.id)}
                              />
                            ))}
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "completed" && (
                    <>
                      {filteredRides.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <p>{t("DriverDashboard.noCompletedRides")}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {rides.filter(Boolean).map((ride) => {
                            return (
                              <DriverRideCard
                                key={ride.id}
                                t={t}
                                ride={ride}
                                navigate={navigate}
                                driverRide={driverRide}
                                bookingInfo={bookingMap.get(ride.id)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "all" && (
                    <>
                      {filteredRides.length === 0 ? (
                        <div className="text-center py-12 space-y-4 flex items-center flex-col">
                          <div className="mx-auto w-24 h-24 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <MapPin className="h-10 w-10 text-slate-400" />
                          </div>
                          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                            {t("DriverDashboard.noRides", "No rides found")}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {t("DriverDashboard.noRidesDescription", "Try adjusting your filters or search terms")}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredRides.filter(Boolean).map((ride) => {
                            return (
                              <DriverRideCard
                                key={ride.id}
                                t={t}
                                ride={ride}
                                navigate={navigate}
                                driverRide={driverRide}
                                bookingInfo={bookingMap.get(ride.id)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {hasNextPage && (
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className={`mt-6 px-4 py-2 text-white font-medium transition-colors ${
                        isFetchingNextPage
                          ? "bg-slate-400 cursor-not-allowed"
                          : "bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
                      }`}
                    >
                      {isFetchingNextPage ? "Loading more..." : "Load More"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverRides;
