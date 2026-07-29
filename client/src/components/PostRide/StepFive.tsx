import { ArrowLeft, ArrowRight } from "lucide-react";

export default function StepFive({
  t,
  rideDetails,
  handleBack,
  handleNext,
  DateTime,
  tzlookup,
  vehiclesData,
  authenticated,
  isPendingRideCreate,
  isPendingVehicleCreate,
  vehicleInfo,
  imagePreviews,
  resubmit,
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
            {t("common_.small.Ride")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("common_.small.Review")}
          </p>
        </div>
      </div>

      {/* Location Details Section */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50  p-8 mb-8 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-3">
          {t("common_.small.Trip")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium text-gray-600 dark:text-gray-400 mb-3">
              {t("common_.small.Departure")}
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-1">
              {rideDetails.departure.locationName || "Not specified"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {rideDetails.departure.city}, {rideDetails.departure.region}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-600 dark:text-gray-400 mb-3">
              {t("common_.small.Destination")}
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-1">
              {rideDetails.destination.locationName || "Not specified"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {rideDetails.destination.city}, {rideDetails.destination.region}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("common_.small.Departure_")}
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {rideDetails.departureTime
                  ? new Date(rideDetails.departureTime).toLocaleString()
                  : "Not specified"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("common_.small.Estimated")}
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {rideDetails.estimatedArrivalTime
                  ? DateTime.fromISO(rideDetails.estimatedArrivalTime)
                      .setZone(
                        tzlookup(
                          rideDetails.departure.latitude,
                          rideDetails.departure.longitude
                        )
                      )
                      .toFormat("M/d/yyyy, hh:mm:ss a") // <-- changed format
                  : "Calculating..."}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("common_.small.Available_seats")}
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {rideDetails.availableSeats} seat
                {rideDetails.availableSeats !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle & Preferences Section */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50  p-8 mb-8 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-6 flex items-center gap-3">
          {t("common_.small.Vehicle")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium text-gray-600 dark:text-gray-400 mb-3">
              {t("common_.small.Vehicle_")}
            </h4>
            {(() => {
              const selectedVehicle = vehiclesData?.find(
                (v) => v.id === rideDetails.vehicleId
              );

              if (selectedVehicle) {
                return (
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedVehicle.defaultImage?.url}
                      alt="Vehicle"
                      className="w-12 h-12 object-cover rounded-full border border-gray-300"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {selectedVehicle.make} {selectedVehicle.model}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedVehicle.year} • {selectedVehicle.plateNumber}
                      </p>
                    </div>
                  </div>
                );
              }

              if (vehicleInfo?.make && vehicleInfo?.model) {
                return (
                  <div className="flex items-center gap-3">
                    {imagePreviews?.length > 0 ? (
                      <div className="relative group">
                        <img
                          src={imagePreviews[0]}
                          alt="Vehicle preview"
                          className="h-12 w-12 object-cover rounded-full border border-gray-300"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-full border border-gray-300 text-xs text-gray-500">
                        No Image
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {vehicleInfo.make} {vehicleInfo.model}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {vehicleInfo.year} • {vehicleInfo.plateNumber}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("common_.small.Vehicle_details")}
                </p>
              );
            })()}
          </div>
          <div>
            <h4 className="font-medium text-gray-600 dark:text-gray-400 mb-3">
              {t("common_.small.Preferences")}
            </h4>
            <div className="space-y-1">
              {[
                {
                  id: "smoking",
                  label: t("common_.small.Smoking"),
                },
                { id: "pets", label: t("common_.small.Pets") },
                {
                  id: "airConditioning",
                  label: t("common_.small.Air"),
                },
                {
                  id: "snowTires",
                  label: t("common_.small.Snow"),
                },
                {
                  id: "bicycleSupport",
                  label: t("common_.small.Bicycle"),
                },
                {
                  id: "skiRack",
                  label: t("common_.small.SkiRack"),
                },
                {
                  id: "ladiesOnly",
                  label: t("common_.small.LadiesOnly"),
                },
                {
                  id: "gentsOnly",
                  label: t("common_.small.GentsOnly"),
                },
              ].map((pref) => (
                <p
                  key={pref.id}
                  className="text-sm text-gray-700 dark:text-gray-200"
                >
                  {rideDetails.preferences[pref.id] ? "✓" : "✗"} {pref.label}
                </p>
              ))}

              {/* Non-boolean preferences */}
              {rideDetails.preferences.luggageSize !== "NONE" && (
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {t("common_.small.Luggage")}:{" "}
                  {t(
                    `createRide.driver.luggageSize.${rideDetails.preferences.luggageSize.toLowerCase()}`
                  )}
                </p>
              )}

              {rideDetails.preferences.luggageCount > 0 && (
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {t("common_.small.LuggageCount")}:{" "}
                  {rideDetails.preferences.luggageCount}
                </p>
              )}
              {rideDetails.preferences.music !== "NOT_AT_ALL" && (
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {t("form.travelPreferences.musicLabel")}:{" "}
                  {t(
                    `profile.preferences.musicLevels.${rideDetails.preferences.music.toLowerCase()}`
                  )}
                </p>
              )}

              {rideDetails.preferences.additionalNotes && (
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {t("common_.small.Notes")}:{" "}
                  {rideDetails.preferences.additionalNotes}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("common_.small.Luggage")}
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {rideDetails.preferences.luggageCount} item
                {rideDetails.preferences.luggageCount !== 1 ? "s" : ""}
                {rideDetails.preferences.luggageCount > 0 &&
                  ` (${rideDetails.preferences.luggageSize.toLowerCase()})`}
              </p>
            </div>
            {!rideDetails.enableD2D && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t("common_.small.Stopovers")}
                </label>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {rideDetails.stopovers.length} stop
                  {rideDetails.stopovers.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50  p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          {t("common_.small.Payment")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("common_.small.Price_per_seat")}
            </label>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              ${rideDetails.contribution}
            </p>
          </div>
          {!rideDetails.enableD2D && (
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("common_.small.Booking")}
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {rideDetails.bookingType === "AUTOMATIC"
                  ? "Automatic"
                  : rideDetails.bookingType === "MANUAL"
                  ? "Manual"
                  : "Not specified"}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("common_.small.Payment_Method")}
            </label>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {rideDetails.contributionCollectionMethod === "VIA_PLATFORM"
                ? t("common_.viaPlatform", "Bank Transfer")
                : t(
                    `common_.${
                      rideDetails.paymentMethodDisplay === "VIA_PLATFORM"
                        ? "viaPlatform"
                        : "offPlatform"
                    }`
                  ) || "Not specified"}
            </p>
          </div>
        </div>
      </div>

      {/* Door-to-Door Section */}
      {rideDetails.enableD2D && (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-6 mb-6 border border-primary-200 dark:border-primary-800">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            {t("DoorToDoor.dashboard.request.title", "Door-to-Door Service")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("DoorToDoor.dashboard.driver.radius", "Radius")}
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {rideDetails.d2dRadiusKm || 5} km
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("common_.small.Status")}
              </label>
              <p className="text-sm text-primary-600 dark:text-primary-400 font-semibold">
                {t("common_.small.Enabled", "Enabled")}
              </p>
            </div>
          </div>

          {rideDetails.d2dNotes && (
            <div className="mt-4 pt-4 border-t border-primary-200 dark:border-primary-700">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t("DoorToDoor.dashboard.driver.internalNote", "Internal Note")}
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-200">
                {rideDetails.d2dNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        {!resubmit && (
          <button
            type="button"
            onClick={handleBack}
            className="px-6 py-4 border-2 border-gray-200 dark:border-gray-600  text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 hover:border-gray-300 dark:hover:border-gray-500"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("createRide.driver.back")}</span>
          </button>
        )}

        {authenticated ? (
          <button
            disabled={isPendingRideCreate || isPendingVehicleCreate}
            type="submit"
            className={`px-8 py-4 bg-gradient-to-r from-[#30BFDD] to-[#2aa8c4] hover:from-[#2aa8c4] hover:to-[#30BFDD] text-white  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105 ${
              resubmit && "w-full flex items-center justify-center"
            }`}
          >
            <span>
              {isPendingRideCreate || isPendingVehicleCreate
                ? t("createRide.driver.submitting")
                : t("createRide.driver.submit")}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="px-8 py-4 bg-gradient-to-r from-[#30BFDD] to-[#2aa8c4] hover:from-[#2aa8c4] hover:to-[#30BFDD] text-white  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105"
          >
            <span>{t("createRide.driver.continueToLogin")}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
