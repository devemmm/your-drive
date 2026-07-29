import { Button } from "./ui/button";
import GooglePlacesInput from "./GoogleInput";
import { MapPinHouse, StopCircle } from "lucide-react";

interface FilterProps {
  t: any;
  setFilters: any;
  filters: any;
  isLoaded: boolean;
  setAppliedFilters: any;
  show?: boolean;
}

const RideFilter = ({
  t,
  setFilters,
  filters,
  isLoaded,
  setAppliedFilters,
  show = true,
}: FilterProps) => {
  return (
    <div className="lg:col-span-1">
      <div
        className={`bg-white dark:bg-gray-800 px-10 py-10 rounded-xl border border-gray-100 dark:border-gray-700 shadow-md sticky text-sm ${
          show ? "-top-[5rem]" : "top-[10rem]"
        }`}
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          {t("FilterPanel.filterRides")}
        </h3>

        <div className="space-y-5">
          {/* Sorting */}
          <div className="space-y-2">
            <h4 className=" font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              {t("FilterPanel.sorting")}
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block  text-gray-500 dark:text-gray-400 mb-1">
                  {t("FilterPanel.orderBy")}
                </label>
                <select
                  value={filters.orderBy ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, orderBy: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="">{t("PassengerHome.selectField")}</option>
                  <option value="departureTime">
                    {t("FilterPanel.departureTime")}
                  </option>
                  <option value="contribution">
                    {t("FilterPanel.contribution")}
                  </option>
                </select>
              </div>
              <div>
                <label className="block  text-gray-500 dark:text-gray-400 mb-1">
                  {t("FilterPanel.direction")}
                </label>
                <select
                  value={filters.sort ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, sort: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="">{t("FilterPanel.SelectOrder")}</option>
                  <option value="asc">{t("ascending")}</option>
                  <option value="desc">{t("descending")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Filters */}
          <div className="space-y-2">
            <h4 className=" font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              {t("FilterPanel.locations")}
            </h4>
            <div className="space-y-2">
              <div>
                <label className="block  text-gray-500 dark:text-gray-400 mb-1">
                  {t("FilterPanel.departureCity")}
                </label>
                <div className="flex items-center  py-2 relative w-full">
                  <MapPinHouse className="h-6 w-6 text-gray-400" />
                  <div className="flex-1">
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
                      placeholder={t("PassengerHome.fPlaceholder")}
                      googleReady={isLoaded}
                      className="text-sm border-gray-200 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block  text-gray-500 dark:text-gray-400 mb-1">
                  {t("FilterPanel.destinationCity")}
                </label>
                <div className="flex items-center  py-2 relative w-full">
                  <StopCircle className="h-6 w-6 text-gray-400" />
                  <div className="flex-1">
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
                      placeholder={t("PassengerHome.fPlaceholder")}
                      googleReady={isLoaded}
                      className="text-sm border-gray-200 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="block  font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              {t("FilterPanel.rideStatus")}
            </label>
            <select
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="">{t("allStatuses")}</option>
              <option value="DRAFT">{t("FilterPanel.status.draft")}</option>
              <option value="PUBLISHED">
                {t("FilterPanel.status.published")}
              </option>
              <option value="ONGOING">{t("FilterPanel.status.ongoing")}</option>
              <option value="COMPLETED">
                {t("FilterPanel.status.completed")}
              </option>
              <option value="CANCELLED">
                {t("FilterPanel.status.cancelled")}
              </option>
              <option value="EXPIRED">{t("FilterPanel.status.expired")}</option>
            </select>
          </div>

          {show && (
            <>
              {/* Contribution Range */}
              <div className="space-y-2">
                <h4 className=" font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  {t("FilterPanel.contributionRange")}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block  text-gray-500 dark:text-gray-400 mb-1">
                      {t("min")}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        placeholder={t("min")}
                        value={filters.minContribution ?? ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            minContribution: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block  text-gray-500 dark:text-gray-400 mb-1">
                      {t("max")}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        placeholder={t("max")}
                        value={filters.maxContribution ?? ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            maxContribution: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <label className="block  font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  {t("FilterPanel.departureAfter")}
                </label>
                <input
                  type="date"
                  value={filters.departureTime ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, departureTime: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
              </div>
            </>
          )}

          {/* Apply Button */}
          <Button
            variant="outline"
            onClick={() => {
              window.scrollTo({ top: 220, behavior: "smooth" });
              setAppliedFilters(filters);
            }}
            className="w-full mt-4 py-2.5 text-primary hover:bg-primary-600 dark:bg-primary-600 hover:text-white dark:text-white  rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {t("FilterPanel.applyFilters")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RideFilter;
