import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function StepThree({
  clsx,
  formErrors,
  handleBack,
  handleNext,
  t,
  rideDetails,
  handleChange,
  preferenceItems,
}) {
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        {t("driver.preferences")}
      </h2>

      {rideDetails.enableD2D && (
        <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded">
          <p>
            {t(
              "createRide.driver.d2dPreferencesNote",
              "For Door-to-Door rides, preferences help passengers understand your vehicle amenities. Some preferences may be less relevant since passengers request specific pickups."
            )}
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 p-8  border border-gray-200/50 dark:border-gray-600/50">
          {/* Preferences Grid - Kangaride Style */}
          <div className="bg-white dark:bg-gray-800  border border-gray-200 dark:border-gray-600 overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-600">
              {preferenceItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <span className="text-lg">{item.icon}</span>
                    </div>
                    <div>
                      <label
                        htmlFor={`preferences.${item.id}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                      >
                        {item.label}
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center">
                    <div className="relative">
                      <input
                        id={`preferences.${item.id}`}
                        name={`preferences.${item.id}`}
                        type="checkbox"
                        className="sr-only"
                        checked={rideDetails.preferences[item.id] || false}
                        onChange={handleChange}
                      />
                      <div
                        className={`block w-14 h-8 rounded-full cursor-pointer transition-colors duration-200 ${
                          rideDetails.preferences[item.id]
                            ? "bg-green-600"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                        onClick={() => {
                          const event = {
                            target: {
                              name: `preferences.${item.id}`,
                              type: "checkbox",
                              checked: !rideDetails.preferences[item.id],
                            },
                          } as any;
                          handleChange(event);
                        }}
                      >
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${
                            rideDetails.preferences[item.id]
                              ? "transform translate-x-6"
                              : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Music preference */}
          <div className="mt-6">
            <label
              htmlFor="preferences.music"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("form.travelPreferences.musicLabel")}
            </label>
            <select
              name="preferences.music"
              id="preferences.music"
              className={clsx(
                "block w-full py-4 px-4 border-2  shadow-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500",
                formErrors["preferences.music"]
                  ? "border-red-500 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              )}
              value={rideDetails.preferences.music || "NOT_AT_ALL"}
              onChange={handleChange}
            >
              <option value="NOT_AT_ALL">
                {t("profile.preferences.musicLevels.choose")}
              </option>
              <option value="LOW">
                {t("profile.preferences.musicLevels.low")}
              </option>
              <option value="MEDIUM">
                {t("profile.preferences.musicLevels.medium")}
              </option>
              <option value="HIGH">
                {t("profile.preferences.musicLevels.high")}
              </option>
              {/* <option value="NOT_AT_ALL">
                {t("profile.preferences.musicLevels.not_at_all")}
              </option> */}
            </select>
            {formErrors["preferences.luggageCount"] && (
              <p className="text-red-500 text-sm mt-1">
                {formErrors["preferences.luggageCount"]}
              </p>
            )}
          </div>

          {/* Luggage Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 items-center">
            {/* Luggage Count */}
            <div>
              <label
                htmlFor="preferences.luggageCount"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("createRide.driver.luggageCount")}
              </label>
              <select
                name="preferences.luggageCount"
                id="preferences.luggageCount"
                className={clsx(
                  "block w-full py-4 px-4 border-2  shadow-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500",
                  formErrors["preferences.luggageCount"]
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                )}
                value={rideDetails.preferences.luggageCount}
                onChange={handleChange}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
              {formErrors["preferences.luggageCount"] && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors["preferences.luggageCount"]}
                </p>
              )}
            </div>

            {/* Luggage Size */}
            <div>
              <label
                htmlFor="preferences.luggageSize"
                className="block mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("createRide.driver.luggageSize")}
              </label>
              <select
                name="preferences.luggageSize"
                id="preferences.luggageSize"
                className={clsx(
                  "block w-full py-4 px-4 border-2  shadow-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500",
                  formErrors["preferences.luggageSize"]
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                )}
                value={rideDetails.preferences.luggageSize}
                onChange={handleChange}
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
              {formErrors["preferences.luggageSize"] && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors["preferences.luggageSize"]}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={handleBack}
          className="px-6 py-4 border-2 border-gray-200 dark:border-gray-600  text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 hover:border-gray-300 dark:hover:border-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">{t("driver.back")}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              rideDetails.preferences.music === "" ||
              rideDetails.preferences.music === undefined
            ) {
              rideDetails.preferences.music = "NOT_AT_ALL";
            }
            handleNext();
          }}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-600 text-white  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105 rounded-lg"
        >
          <span className="text-lg">{t("driver.nextStep")}</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
