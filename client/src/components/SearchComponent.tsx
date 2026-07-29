import {
  Calendar,
  CircleDashed,
  Filter,
  MapPin,
  MapPinCheck,
  MapPinHouse,
  StopCircle,
  X,
  ArrowUpDown,
  PlusCircle,
  MinusCircle,
} from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import GooglePlacesInput from "./GoogleInput";
import { Switch } from "./ui/switch";

interface SearchComponentProps {
  handleSearch?: () => void;
  home?: boolean;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleFilterChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  searchParams: any;
  setSearchParams: any;
  isLoaded: boolean;
  setShowFilters: any;
  showFilters: any;
  filters: any;
  setAppliedFilters: any;
}

const SearchComponent = ({
  handleSearch,
  home = false,
  handleChange,
  handleFilterChange,
  searchParams,
  setSearchParams,
  isLoaded,
  setShowFilters,
  showFilters,
  filters,
  setAppliedFilters,
}: SearchComponentProps) => {
  const { t } = useTranslation();
  const isSearchDisabled =
    !searchParams.departureCity &&
    !searchParams.destinationCity &&
    !searchParams.departureTime;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-800 p-8 w-full max-w-md mx-auto flex flex-col items-stretch">
      <form onSubmit={(e) => e.preventDefault()}>
        {/* Inputs */}
        <div className="flex flex-col gap-0">
          {/* Departure */}
          <div className="flex items-center  py-2 relative">
            <MapPinHouse className="h-6 w-6 text-gray-400 mr-3" />
            <GooglePlacesInput
              value={searchParams.departureCity}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  departureCity: e.target.value,
                }))
              }
              onPlaceSelected={(data) => {
                setSearchParams((prev) => ({
                  ...prev,
                  departureCity: data.city,
                }));
              }}
              placeholder={t("driver.startingPoint") || "Departure"}
              googleReady={isLoaded}
              className="flex-1 bg-transparent border-none outline-none text-lg placeholder-gray-400"
            />
            {searchParams.departureCity && (
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-600"
                onClick={() =>
                  setSearchParams((prev) => ({ ...prev, departureCity: "" }))
                }
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Destination */}
          <div className="flex items-center py-2 relative">
            <StopCircle className="h-6 w-6 text-gray-400 mr-3" />
            <GooglePlacesInput
              value={searchParams.destinationCity}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  destinationCity: e.target.value,
                }))
              }
              onPlaceSelected={(data) =>
                setSearchParams((prev) => ({
                  ...prev,
                  destinationCity: data.city,
                }))
              }
              placeholder={t("driver.destination") || "Destination"}
              googleReady={isLoaded}
              className="flex-1 bg-transparent border-none outline-none text-lg placeholder-gray-400"
            />
            {searchParams.destinationCity && (
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-600"
                onClick={() =>
                  setSearchParams((prev) => ({ ...prev, destinationCity: "" }))
                }
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Date */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 py-2 relative">
            <Calendar className="h-6 w-6 text-gray-400 mr-3" />
            <input
              type="date"
              id="departureTime"
              name="departureTime"
              className="flex-1 bg-transparent border-none outline-none text-lg placeholder-gray-400 dark:text-white"
              value={searchParams.departureTime}
              onChange={handleChange}
              placeholder={"Date"}
            />
            {searchParams.departureTime && (
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-600"
                onClick={() =>
                  setSearchParams((prev) => ({ ...prev, departureTime: "" }))
                }
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Door to Door Filter - Switch */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-4 relative">
            <label
              htmlFor="doorToDoor"
              className="flex-1 text-lg font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              {t("rideSearch.doorToDoorOnly", "Door-to-Door Only")}
            </label>
            <Switch
              id="doorToDoor"
              checked={filters.doorToDoor || false}
              onCheckedChange={(checked) => {
                handleFilterChange({
                  target: {
                    name: "doorToDoor",
                    type: "checkbox",
                    checked: checked,
                  },
                } as any);
              }}
            />
          </div>
        </div>
        {/* Filter Link */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-primary font-medium mt-6 mb-4 hover:underline focus:outline-none"
        >
          {showFilters ? (
            <MinusCircle className="h-5 w-5 mr-2" />
          ) : (
            <PlusCircle className="h-5 w-5 mr-2" />
          )}
          <span className="text-lg">
            {showFilters
              ? t("passenger.hideFilters") || "Hide filters"
              : t("passenger.filterResults")}
          </span>
        </button>
        {/* Search Button - Only show for home page or when real-time search is disabled */}
        {home && (
          <button
            type="submit"
            disabled={isSearchDisabled}
            onClick={(e) => {
              e.preventDefault();
              if (home && handleSearch) {
                handleSearch();
              }
            }}
            className={`w-full mt-2 py-3 rounded-xl text-lg font-bold transition-colors ${
              isSearchDisabled
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/80"
            }`}
          >
            {t("passenger.search") || "Search"}
          </button>
        )}
      </form>
      {/* Filters Section */}
      {showFilters && (
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
            {t("passenger.filters")}
          </h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("PassengerHome.priceRange")}
              </h4>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="minContribution"
                    className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                  >
                    {t("PassengerHome.min")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">
                        $
                      </span>
                    </div>
                    <input
                      type="number"
                      id="minContribution"
                      name="minContribution"
                      min="0"
                      className="block w-full pl-6 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 dark:text-white"
                      placeholder={t("PassengerHome.min")}
                      value={filters.minContribution || 0}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="maxContribution"
                    className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                  >
                    {t("PassengerHome.max")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400">
                        $
                      </span>
                    </div>
                    <input
                      type="number"
                      id="maxContribution"
                      name="maxContribution"
                      min="0"
                      className="block w-full pl-6 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 dark:text-white"
                      placeholder={t("PassengerHome.max")}
                      value={filters.maxContribution || 0}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("DriverDashboard.luggage")}
              </h4>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="luggageSize"
                    className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                  >
                    {t("createRide.driver.luggageSize")}
                  </label>
                  <select
                    id="luggageSize"
                    name="luggageSize"
                    className="block w-full pl-3 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 dark:text-white"
                    value={filters.preferences.luggageSize}
                    onChange={handleFilterChange}
                  >
                    <option value="NONE">
                      {t("createRide.driver.luggageSize.none")}
                    </option>
                    <option value="SMALL">
                      {t("createRide.driver.luggageSize.small")}
                    </option>
                    <option value="MEDIUM">
                      {t("createRide.driver.luggageSize.medium")}
                    </option>
                    <option value="LARGE">
                      {t("createRide.driver.luggageSize.large")}
                    </option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="luggageCount"
                    className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                  >
                    {t("createRide.driver.luggageCount")}
                  </label>
                  <input
                    type="number"
                    id="luggageCount"
                    name="luggageCount"
                    min="0"
                    max="10"
                    className="block w-full pl-3 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 dark:text-white"
                    value={filters.preferences.luggageCount}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm  font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("passenger.preferences")}
              </h4>
              <div className="space-y-2 ">
                <div className="flex items-center">
                  <input
                    id="pref-smoking"
                    name="pref-smoking"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    checked={filters.preferences.smoking}
                    onChange={handleFilterChange}
                  />
                  <label
                    htmlFor="pref-smoking"
                    className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                  >
                    {t("driver.allowSmoking")}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="pref-pets"
                    name="pref-pets"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    checked={filters.preferences.pets}
                    onChange={handleFilterChange}
                  />
                  <label
                    htmlFor="pref-pets"
                    className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                  >
                    {t("driver.allowPets")}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="pref-airConditioning"
                    name="pref-airConditioning"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    checked={filters.preferences.airConditioning}
                    onChange={handleFilterChange}
                  />
                  <label
                    htmlFor="pref-airConditioning"
                    className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                  >
                    {t("driver.airConditioning")}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="pref-ladiesOnly"
                    name="pref-ladiesOnly"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    checked={filters.preferences.ladiesOnly}
                    onChange={handleFilterChange}
                  />
                  <label
                    htmlFor="pref-ladiesOnly"
                    className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                  >
                    {t("createRide.driver.ladiesOnly")}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="pref-gentsOnly"
                    name="pref-gentsOnly"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    checked={filters.preferences.gentsOnly}
                    onChange={handleFilterChange}
                  />
                  <label
                    htmlFor="pref-gentsOnly"
                    className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                  >
                    {t("createRide.driver.gentsOnly")}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="pref-bicycleSupport"
                    name="pref-bicycleSupport"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    checked={filters.preferences.bicycleSupport}
                    onChange={handleFilterChange}
                  />
                  <label
                    htmlFor="pref-bicycleSupport"
                    className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                  >
                    {t("createRide.driver.bicycleSupport")}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="pref-snowTires"
                    name="pref-snowTires"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    checked={filters.preferences.snowTires}
                    onChange={handleFilterChange}
                  />
                  <label
                    htmlFor="pref-snowTires"
                    className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                  >
                    {t("driver.snowTires")}
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("passenger.rideType") || "Ride Type"}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="doorToDoor"
                    name="doorToDoor"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    checked={filters.doorToDoor || false}
                    onChange={handleFilterChange}
                  />
                  <label
                    htmlFor="doorToDoor"
                    className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                  >
                    {t(
                      "DoorToDoor.dashboard.request.title",
                      "Door-to-Door Service"
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
