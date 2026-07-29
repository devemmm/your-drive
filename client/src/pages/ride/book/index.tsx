import CustomLoader from "@/components/CustomLoader";
import { LIBRARIES } from "@/components/Map";
import SearchComponent from "@/components/SearchComponent";
import { Button } from "@/components/ui/button";
import PaymentCard from "@/components/ui/paymentCard";
import SeatVisualization from "@/components/ui/seat-visualization";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { useJsApiLoader } from "@react-google-maps/api";
import { motion } from "framer-motion";
import {
  AirVentIcon,
  ArrowUpDown,
  Cigarette,
  DogIcon,
  MapPin,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaFemale, FaSnowflake } from "react-icons/fa";
import { FaSackDollar } from "react-icons/fa6";
import { useLocation, useNavigate } from "react-router-dom";

import { useReactItems } from "@/lib/ReactTranslation";

import CreateRideRequest from "@/components/CreateRideRequest";
import { useAllPublicRides } from "@/data";
import RidesAreBelow from "./RidesAreBelow";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const BookARide = () => {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useState({
    departureCity: "",
    destinationCity: "",
    departureTime: "",
    userLatitude: null,
    userLongitude: null,
    radiusKm: undefined,
  });
  const [filters, setFilters] = useState({
    minContribution: undefined,
    maxContribution: undefined,
    doorToDoor: false,
    preferences: {
      smoking: false,
      pets: false,
      airConditioning: false,
      ladiesOnly: false,
      gentsOnly: false,
      bicycleSupport: false,
      snowTires: false,
      luggageSize: "NONE",
      luggageCount: 0,
    },
  });

  const [appliedFilters, setAppliedFilters] = useState({
    ...searchParams,
    ...filters,
    preferences: {
      ...filters.preferences,
    },
  });

  // Debounce search params and filters for real-time search
  const debouncedSearchParams = useDebounce(searchParams, 500);
  const debouncedFilters = useDebounce(filters, 500);

  const navigate = useNavigate();
  const location = useLocation();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { user, authenticated } = useAuth();
  const { currentLanguage } = useReactItems();

  // Build applied filters function
  const buildAppliedFilters = useCallback((searchParams, filters) => {
    const filterObj = {
      ...filters,
      preferences: {
        ...filters.preferences,
      },
    };

    if (searchParams.departureCity) {
      filterObj.departureCity = searchParams.departureCity;
    }
    if (searchParams.destinationCity) {
      filterObj.destinationCity = searchParams.destinationCity;
    }
    if (searchParams.departureTime) {
      filterObj.departureTime = searchParams.departureTime;
    }
    if (searchParams.userLatitude) {
      filterObj.userLatitude = searchParams.userLatitude;
    }
    if (searchParams.userLongitude) {
      filterObj.userLongitude = searchParams.userLongitude;
    }
    if (searchParams.radiusKm) {
      filterObj.radiusKm = searchParams.radiusKm;
    }
    return filterObj;
  }, []);

  // Real-time search effect - update appliedFilters when debounced values change
  useEffect(() => {
    const newAppliedFilters = buildAppliedFilters(
      debouncedSearchParams,
      debouncedFilters
    );
    setAppliedFilters(newAppliedFilters);
  }, [debouncedSearchParams, debouncedFilters, buildAppliedFilters]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const newSearchParams = {
      departureCity: params.get("departureCity") || "",
      destinationCity: params.get("destinationCity") || "",
      departureTime: params.get("departureTime") || "",
      userLatitude: params.get("userLatitude")
        ? parseFloat(params.get("userLatitude"))
        : null,
      userLongitude: params.get("userLongitude")
        ? parseFloat(params.get("userLongitude"))
        : null,
      radiusKm: params.get("radiusKm")
        ? parseFloat(params.get("radiusKm"))
        : undefined,
    };

    const newPreferences = {
      smoking: params.get("preferences.smoking") === "true",
      pets: params.get("preferences.pets") === "true",
      airConditioning: params.get("preferences.airConditioning") === "true",
      ladiesOnly: params.get("preferences.ladiesOnly") === "true",
      gentsOnly: params.get("preferences.gentsOnly") === "true",
      bicycleSupport: params.get("preferences.bicycleSupport") === "true",
      snowTires: params.get("preferences.snowTires") === "true",
      luggageSize: params.get("preferences.luggageSize") || "NONE",
      luggageCount: parseInt(params.get("preferences.luggageCount")) || 0,
    };

    const newFilters = {
      minContribution: params.get("minContribution")
        ? parseFloat(params.get("minContribution"))
        : undefined,
      maxContribution: params.get("maxContribution")
        ? parseFloat(params.get("maxContribution"))
        : undefined,
      doorToDoor: params.get("doorToDoor") === "true",
      preferences: newPreferences,
    };

    setSearchParams(newSearchParams);
    setFilters(newFilters);
    setAppliedFilters({
      ...newSearchParams,
      ...newFilters,
      preferences: newPreferences,
    });
  }, [location.search]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAllPublicRides(appliedFilters);

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages =
    data?.pages?.[0]?.pagination?.totalPages ??
    data?.pages?.[data.pages.length - 1]?.pagination?.totalPages ??
    1;

  const availableRides =
    data?.pages?.[currentPage - 1]?.data ?? data?.pages?.[0]?.data ?? [];

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);
  const suggestedRides =
    data?.pages.flatMap((page) => page?.suggestions ?? []) ?? [];

  // Filter rides: exclude user's own rides, and apply D2D filter if enabled
  const filteredRides = availableRides.filter((ride) => {
    if (ride.driverId === user?.id) return false;

    // Apply D2D filter if enabled - ONLY show D2D rides (type === "D2D")
    if (appliedFilters.doorToDoor) {
      return ride.type === "D2D" || ride.isDoorToDoor === true;
    }
    // When D2D filter is disabled, show all rides (both regular and D2D)
    return true;
  });

  const userLocale = currentLanguage === "fr" ? "fr-FR" : "en-US";

  const groupRidesByDate = (rides: any[]) => {
    const sorted = [...rides].sort(
      (a, b) =>
        new Date(a.departureTime).getTime() -
        new Date(b.departureTime).getTime()
    );
    return sorted.reduce((groups, ride) => {
      const dateKey = new Date(ride.departureTime)
        .toLocaleDateString(userLocale, {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })
        .replace(/^([a-zéèêàâîïç])/u, (match) => match.toUpperCase());
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(ride);
      return groups;
    }, {} as Record<string, any[]>);
  };

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams({
      ...searchParams,
      [name]: value,
    });
  };

  const handleFilterChange = (e) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? e.target.checked : undefined;

    if (name === "minContribution" || name === "maxContribution") {
      setFilters({
        ...filters,
        [name]: value,
      });
      return;
    }

    if (name === "doorToDoor") {
      setFilters({
        ...filters,
        doorToDoor: checked,
      });
      return;
    }

    if (name === "luggageSize" || name === "luggageCount") {
      setFilters({
        ...filters,
        preferences: {
          ...filters.preferences,
          [name]: type === "number" ? parseInt(value) : value,
        },
      });
      return;
    }

    if (name.startsWith("pref-")) {
      const prefKey = name.replace("pref-", "");
      setFilters({
        ...filters,
        preferences: {
          ...filters.preferences,
          [prefKey]: checked,
        },
      });
      return;
    }

    if (Object.keys(filters.preferences).includes(name)) {
      setFilters({
        ...filters,
        preferences: {
          ...filters.preferences,
          [name]: checked,
        },
      });
    }
  };

  const groupedRides = groupRidesByDate(
    authenticated ? filteredRides : availableRides
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4 flex justify-between items-center">
            <Button
              variant="outline"
              className="w-full border-2 border-green-600 bg-white text-green-600 hover:bg-green-600 hover:text-white font-bold"
              onClick={() => setMobileFiltersOpen(true)}
            >
              Filter Rides
            </Button>
          </div>

          {/* Sidebar - Search Form (Desktop) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white sticky top-24 border-2 border-green-600 rounded-lg shadow-lg">
              <SearchComponent
                handleFilterChange={handleFilterChange}
                handleChange={handleChange}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                isLoaded={isLoaded}
                setShowFilters={setShowFilters}
                showFilters={showFilters}
                filters={filters}
                setAppliedFilters={setAppliedFilters}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-1 lg:col-span-3">
            {/* Header */}
            <motion.div
              className="text-left mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-3 leading-tight">
                Available Rides
              </h2>

              <p className="text-lg text-gray-600 text-left max-w-2xl leading-relaxed">
                {searchParams.departureCity
                  ? `From: ${searchParams.departureCity} ${
                      searchParams.destinationCity
                        ? `→ ${searchParams.destinationCity}`
                        : ""
                    }`
                  : "Browse available rides and find your perfect match"}
              </p>
            </motion.div>

            {/* No results with suggestions */}
            {Object.keys(groupedRides).length === 0 && !isLoading && (
              <div className="py-10">
                <div className="text-center border-2 border-green-600 p-12 bg-white dark:bg-gray-800 rounded-lg">
                  <MapPin className="mx-auto h-12 w-12 text-green-600 dark:text-green-500 mb-4" />
                  <p className="text-gray-900 dark:text-white font-bold text-xl mb-2">
                    No rides found
                  </p>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search parameters or check back later
                  </p>
                </div>
                {suggestedRides.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                      {t("rideSearch.suggestionsTitle")}
                    </h3>
                    <div className="space-y-6">
                      {suggestedRides.map((ride: any) => {
                        // Check if this is a D2D ride
                        const isDoorToDoorRide = ride.type === "D2D";
                        // For D2D rides, contribution is already the full ride price
                        const displayPrice = ride.contribution || 0;

                        return (
                          <div
                            key={`sugg-${ride.id}`}
                            onClick={() => navigate(`/ride?rideId=${ride.id}`)}
                            className={`cursor-pointer border hover:shadow-md transition-shadow duration-200 ${
                              isDoorToDoorRide
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                : "bg-white dark:bg-gray-800 shadow-sm hover:bg-green-900/5"
                            } ${
                              ride.availableSeats === 0 ||
                              ride.status === "CLOSED"
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            <div className="p-4">
                              {/* Time and Route */}
                              <div className="grid grid-cols-12 gap-4 mb-4 items-center">
                                {/* Time */}
                                <div className="col-span-2 text-center">
                                  <div className="text-xl font-black text-gray-900 dark:text-white text-uppercase">
                                    {new Date(ride.departureTime)
                                      .toLocaleDateString(userLocale, {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      })
                                      .replace(/^([a-zéèêàâîïç])/u, (match) =>
                                        match.toUpperCase()
                                      )}
                                  </div>
                                </div>

                                {/* Departure Location */}
                                <div className="col-span-3">
                                  <div className="text-lg font-bold text-gray-700 dark:text-gray-300 truncate">
                                    {ride?.departureLocation?.city ||
                                      ride?.driverStartLocation?.city}
                                  </div>
                                  <div className="text-gray-400 text-sm">
                                    {ride?.departureLocation?.locationName ||
                                      ride?.driverStartLocation?.locationName ||
                                      ""}
                                  </div>
                                </div>

                                {/* Arrow */}
                                <div className="col-span-1 flex justify-center">
                                  <ArrowUpDown className="size-8 text-gray-400" />
                                </div>

                                {/* Destination Location */}
                                <div className="col-span-3">
                                  <div className="text-lg font-bold text-gray-700 dark:text-gray-300 truncate">
                                    {ride?.destinationLocation?.city ||
                                      ride?.driverStopLocation?.city}
                                  </div>
                                  <div className="text-gray-400 text-sm">
                                    {ride?.destinationLocation?.locationName ||
                                      ride?.driverStopLocation?.locationName}
                                  </div>
                                </div>

                                {/* Price and Payment Method */}
                                <div className="col-span-3 text-right">
                                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    ${displayPrice.toFixed(2)}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {isDoorToDoorRide
                                      ? t(
                                          "rideSearch.fullRidePrice",
                                          "full ride"
                                        )
                                      : t("rideSearch.perSeat", "per seat")}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {isDoorToDoorRide ? (
                                      <div className="flex items-center justify-end">
                                        <span className="text-xs font-semibold uppercase text-primary-600 dark:text-primary-400">
                                          {t("rideSearch.d2d", "Door-to-Door")}
                                        </span>
                                      </div>
                                    ) : ride.contributionCollectionMethod ===
                                      "VIA_PLATFORM" ? (
                                      <div className="flex items-center justify-end space-x-1">
                                        <PaymentCard className="size-12 " />
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-end space-x-1">
                                        <img
                                          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTXM3jkZbdXmmFTSGrKyQDH4mbiJ6elgU7hg&s"
                                          alt="cash"
                                          className="size-6 rounded-full"
                                        />
                                        <FaSackDollar className="size-6" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Driver Info and Rating */}
                              <div className="flex items-center justify-between">
                                {/* Amenities Icons */}
                                <div className="flex items-center space-x-3">
                                  <div
                                    className="text-gray-400 relative"
                                    title={
                                      ride.preferences.smoking
                                        ? t("driver.allowSmoking")
                                        : t("driver.noSmoking")
                                    }
                                  >
                                    {ride.preferences.smoking ? (
                                      <Cigarette className="size-6 text-green-500" />
                                    ) : (
                                      <div className="relative">
                                        <Cigarette className="size-6 text-red-500" />
                                        <X className="size-4 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    className="text-gray-400 relative"
                                    title={
                                      ride.preferences.pets
                                        ? t("driver.allowPets")
                                        : t("driver.noPets")
                                    }
                                  >
                                    {ride.preferences.pets ? (
                                      <DogIcon className="size-6 text-green-500" />
                                    ) : (
                                      <div className="relative">
                                        <DogIcon className="size-6 text-red-500" />
                                        <X className="size-4 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    className="text-gray-400 relative"
                                    title={
                                      ride.preferences.airConditioning
                                        ? t("driver.airConditioning")
                                        : t("driver.noAirConditioning")
                                    }
                                  >
                                    {ride.preferences.airConditioning ? (
                                      <AirVentIcon className="size-6 text-green-500" />
                                    ) : (
                                      <div className="relative">
                                        <AirVentIcon className="size-6 text-red-500" />
                                        <X className="size-4 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    className="text-gray-400 relative"
                                    title={
                                      ride.preferences.ladiesOnly
                                        ? t("driver.ladiesOnly")
                                        : t("driver.notLadiesOnly")
                                    }
                                  >
                                    {ride.preferences.ladiesOnly ? (
                                      <FaFemale
                                        size="24"
                                        className="text-green-500"
                                      />
                                    ) : (
                                      <div className="relative">
                                        <FaFemale
                                          size="24"
                                          className="text-red-500"
                                        />
                                        <X className="size-4 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    className="text-gray-400 relative"
                                    title={
                                      ride.preferences.snowTires
                                        ? t("driver.snowTires")
                                        : t("driver.noSnowTires")
                                    }
                                  >
                                    {ride.preferences.snowTires ? (
                                      <FaSnowflake
                                        size={24}
                                        className="text-green-500"
                                      />
                                    ) : (
                                      <div className="relative">
                                        <FaSnowflake
                                          size={24}
                                          className="text-red-500"
                                        />
                                        <X className="size-4 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <SeatVisualization
                                    totalSeats={ride?.totalSeats}
                                    availableSeats={ride?.availableSeats}
                                    size="sm"
                                    showCount={true}
                                  />
                                </div>
                              </div>

                              {/* Additional Info */}
                              {Array.isArray(ride.stopovers) &&
                              ride.stopovers.length > 0 ? (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {t("passenger.stops")}:{" "}
                                    {ride.stopovers
                                      .map((stop) => stop.city)
                                      .join(", ")}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-1 ">
                <CustomLoader className="scale-150" />
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedRides).map(([date, rides]) => {
                  const ridesArray = rides as any[];
                  return (
                    <RidesAreBelow
                      key={date}
                      date={date}
                      ridesArray={ridesArray}
                      navigate={navigate}
                      t={t}
                      userLocale={userLocale}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1 || isLoading}
                >
                  {t("common_.previous", "Previous")}
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {t("booking.page", "Page {{page}} of {{total}}", {
                    page: currentPage,
                    total: totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                  onClick={async () => {
                    if (currentPage < (data?.pages?.length ?? 0)) {
                      setCurrentPage((prev) => prev + 1);
                    } else if (hasNextPage && !isFetchingNextPage) {
                      await fetchNextPage();
                      setCurrentPage((prev) => prev + 1);
                    }
                  }}
                  disabled={
                    currentPage >= totalPages || isLoading || isFetchingNextPage
                  }
                >
                  {isFetchingNextPage
                    ? t("booking.loading")
                    : t("common_.next", "Next")}
                </Button>
              </div>
            )}

            {/* Propose Route Button - Always at the bottom */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-center dark:border-gray-700 mx-auto">
              <div className="text-sm flex items-center gap-4 text-gray-600 dark:text-gray-400 mb-3">
                {t("rideSearch.routeNotFound", "Route not found?")}
                <CreateRideRequest />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {mobileFiltersOpen && (
          <div className="fixed top-20 inset-0 z-40 flex ">
            <div
              className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="relative w-full max-w-xs bg-white dark:bg-gray-900 shadow-xl p-6 overflow-y-auto">
              <div className="flex items-center justify-end mb-4">
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-gray-500 font-black hover:text-gray-900 dark:hover:text-white text-4xl"
                >
                  &times;
                </button>
              </div>
              <SearchComponent
                handleFilterChange={handleFilterChange}
                handleChange={handleChange}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                isLoaded={isLoaded}
                setShowFilters={setShowFilters}
                showFilters={showFilters}
                filters={filters}
                setAppliedFilters={setAppliedFilters}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookARide;
