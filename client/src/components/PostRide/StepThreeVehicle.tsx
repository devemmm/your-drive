import clsx from "clsx";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Car,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

export default function StepThreeVehicle({
  t,
  authenticated,
  addCar,
  vehicleId,
  vehiclesData,
  setRideDetails,
  rideDetails,
  formErrors,
  handleBack,
  handleNext,
  handleVehicleSelect,
  setAddCar,
  RestrictedVehicleMakesSearchable,
  vehicleInfo,
  handleVehicleChange,
  VehicleModelsSearchable,
  VehicleYearSelector,
  setVehicleInfo,
  saveImageToDB,
  setImagePreviews,
  CameraCapture,
  imagePreviews,
  deleteImageFromDB,
}) {
  return (
    <>
      {authenticated &&
        !addCar &&
        (vehicleId ? (
          (() => {
            const selectedVehicle = vehiclesData?.find(
              (vehicle) => vehicle.id == vehicleId
            );

            return selectedVehicle ? (
              <>
                {/* Selected Vehicle Display */}
                <div className="animate-fade-in">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#30BFDD] to-[#2aa8c4]  flex items-center justify-center shadow-lg">
                      <Car className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                        {t("driver.vehicleDetails")}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {t("common_.small.select")}
                      </p>
                    </div>
                  </div>

                  {/* Vehicle Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50  p-8 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <img
                          src={selectedVehicle.defaultImage?.url}
                          alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                          className="w-24 h-24 object-cover  border-2 border-gray-200 dark:border-gray-600 shadow-md"
                        />
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 ">
                          ✓
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                          {selectedVehicle.make} {selectedVehicle.model}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium">
                              {t("driver.Year")}:
                            </span>{" "}
                            {selectedVehicle.year}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("driverPlate")}:
                            </span>{" "}
                            {selectedVehicle.plateNumber}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("common_.small.color")}:
                            </span>{" "}
                            {selectedVehicle.color}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("common_.small.max")}
                            </span>{" "}
                            {selectedVehicle.capacity || "Unknown"}{" "}
                            {t("common_.small.seats")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Available Seats Section */}
                  <div className="mt-8 space-y-4">
                    <div>
                      <label
                        htmlFor="availableSeats"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        {t("driver.availableSeats")}
                      </label>

                      <div className="flex items-center justify-center space-x-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (rideDetails.availableSeats > 1) {
                              setRideDetails((prev) => ({
                                ...prev,
                                availableSeats: prev.availableSeats - 1,
                              }));
                            }
                          }}
                          disabled={rideDetails.availableSeats <= 1}
                          className={clsx(
                            "w-12 h-12  border-2 flex items-center justify-center transition-all duration-300",
                            rideDetails.availableSeats <= 1
                              ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                              : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105"
                          )}
                        >
                          <Minus className="h-5 w-5" />
                        </button>

                        <div className="min-w-[80px] text-center">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {rideDetails.availableSeats}
                          </span>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {rideDetails.availableSeats === 1
                              ? t("common_.small.seat")
                              : t("common_.small.seats")}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (rideDetails.availableSeats < 8) {
                              setRideDetails((prev) => ({
                                ...prev,
                                availableSeats: prev.availableSeats + 1,
                              }));
                            }
                          }}
                          disabled={rideDetails.availableSeats >= 8}
                          className={clsx(
                            "w-12 h-12  border-2 flex items-center justify-center transition-all duration-300",
                            rideDetails.availableSeats >= 8
                              ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                              : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105"
                          )}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>

                      {formErrors["availableSeats"] && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors["availableSeats"]}
                        </p>
                      )}
                    </div>

                    {/* Back Seat Warning */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800  p-4">
                      <div className="flex items-start gap-3 py-2">
                        <div className="w-5 h-5 bg-amber-500  flex items-center justify-center mt-0.5">
                          <span className="text-white text-xs font-bold">
                            !
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                            {t("DriverDashboard.vehicles.backSeatWarning")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between mt-8">
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
                        handleNext();
                      }}
                      className="px-8 py-4 bg-gradient-to-r from-[#30BFDD] to-[#2aa8c4] hover:from-[#2aa8c4] hover:to-[#30BFDD] text-white  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105"
                    >
                      <span className="text-lg">{t("driver.nextStep")}</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20  flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                  {t("common_.small.no_found")}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  {t("driver.selected")}
                </p>
              </div>
            );
          })()
        ) : (
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-[#30BFDD] to-[#2aa8c4]  flex items-center justify-center shadow-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                  {t("driver.vehicleDetails")}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {t("common_.small.choose")}
                </p>
              </div>
            </div>

            {/* Vehicle Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {vehiclesData?.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => handleVehicleSelect(vehicle.id)}
                  className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                    rideDetails.vehicleId == vehicle.id
                      ? "ring-4 ring-[#30BFDD]  ring-opacity-50"
                      : "hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 "
                  }`}
                >
                  <div className="bg-white dark:bg-gray-800  p-6 border-2 border-gray-200 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={vehicle.defaultImage?.url}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-20 h-20 object-cover  border-2 border-gray-200 dark:border-gray-600"
                        />
                        {rideDetails.vehicleId == vehicle.id && (
                          <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold px-2 py-1  shadow-lg">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                          {vehicle.make} {vehicle.model}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {t("driver.Year")}:
                            </span>
                            <span>{vehicle.year}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {t("driverPlate")}:
                            </span>
                            <span className="font-mono">
                              {vehicle.plateNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {t("common_.small.color")}:
                            </span>
                            <span className="capitalize">{vehicle.color}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {t("common_.small.max")}:
                            </span>
                            <span>
                              {vehicle.capacity || "Unknown"}{" "}
                              {t("common_.small.seats")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Vehicle Button */}
            {vehiclesData?.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700  flex items-center justify-center mx-auto mb-4">
                  <Car className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                  {t("common_.small.no_founds")}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t("common_.small.started")}
                </p>
              </div>
            )}

            {/* Available Seats Section */}
            {rideDetails.vehicleId ? (
              <div className="mt-8 space-y-4">
                <div>
                  <label
                    htmlFor="availableSeats"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t("driver.availableSeats")}
                  </label>

                  <div className="flex items-center justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (rideDetails.availableSeats > 1) {
                          setRideDetails((prev) => ({
                            ...prev,
                            availableSeats: prev.availableSeats - 1,
                          }));
                        }
                      }}
                      disabled={rideDetails.availableSeats <= 1}
                      className={clsx(
                        "w-12 h-12  border-2 flex items-center justify-center transition-all duration-300",
                        rideDetails.availableSeats <= 1
                          ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105"
                      )}
                    >
                      <Minus className="h-5 w-5" />
                    </button>

                    <div className="min-w-[80px] text-center">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {rideDetails.availableSeats}
                      </span>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {rideDetails.availableSeats === 1
                          ? t("common_.small.seat")
                          : t("common_.small.seats")}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (rideDetails.availableSeats < 8) {
                          setRideDetails((prev) => ({
                            ...prev,
                            availableSeats: prev.availableSeats + 1,
                          }));
                        }
                      }}
                      disabled={rideDetails.availableSeats >= 8}
                      className={clsx(
                        "w-12 h-12  border-2 flex items-center justify-center transition-all duration-300",
                        rideDetails.availableSeats >= 8
                          ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105"
                      )}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  {formErrors["availableSeats"] && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors["availableSeats"]}
                    </p>
                  )}
                </div>

                {/* Back Seat Warning */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800  p-4">
                  <div className="flex items-start gap-3 py-2">
                    <div className="w-5 h-5 bg-amber-500  flex items-center justify-center mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                        {t("DriverDashboard.vehicles.backSeatWarning")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Navigation */}
            <div className="flex justify-between mt-5">
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-4 border-2 border-gray-200 dark:border-gray-600  text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 hover:border-gray-300 dark:hover:border-gray-500"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-semibold">{t("driver.back")} Here</span>
              </button>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setAddCar(true);
                    // Clear selected vehicle when creating new one
                    setRideDetails((prev) => ({
                      ...prev,
                      vehicleId: null,
                    }));
                  }}
                  className="px-6 py-4 border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white  font-semibold transition-all duration-300 flex items-center gap-3"
                >
                  <span>{t("driver.addVehicle")}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                {rideDetails.vehicleId ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleNext();
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-[#30BFDD] to-[#2aa8c4] hover:from-[#2aa8c4] hover:to-[#30BFDD] text-white  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    <span className="text-lg">{t("driver.nextStep")}</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      {(!authenticated || addCar) && (
        <div className="animate-fade-in">
          {authenticated && (
            <X
              onClick={() => setAddCar(false)}
              className="w-10 h-10 ml-auto bg-transparent  border-2 border-red-600 p-2 text-red-600 font-black cursor-pointer"
            />
          )}
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">
            {t("createRide.driver.vehicleDetailsTitle")}
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="make"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t("createRide.driver.make")}
                </label>
                <RestrictedVehicleMakesSearchable
                  value={vehicleInfo.make}
                  onChange={(val) =>
                    handleVehicleChange({
                      target: { name: "make", value: val },
                    })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="model"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t("createRide.driver.model")}
                </label>
                <VehicleModelsSearchable
                  make={vehicleInfo.make}
                  value={vehicleInfo.model}
                  onChange={(selectedModel) =>
                    setVehicleInfo((prev) => ({
                      ...prev,
                      model: selectedModel,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VehicleYearSelector
                value={vehicleInfo.year}
                onChange={(year) =>
                  setVehicleInfo((prev) => ({ ...prev, year }))
                }
                label={t("createRide.driver.year")}
              />
              <div>
                <label
                  htmlFor="color"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t("createRide.driver.color")}
                </label>
                <input
                  type="text"
                  id="color"
                  name="color"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600  shadow-sm focus:outline-none focus:ring-green-600 focus:border-green-600 bg-white dark:bg-gray-700 dark:text-white"
                  placeholder={t("createRide.driver.exampleColor")}
                  value={vehicleInfo.color}
                  onChange={handleVehicleChange}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="plateNumber"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t("createRide.driver.plateNumber")}
                </label>
                <input
                  type="text"
                  id="plateNumber"
                  name="plateNumber"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600  shadow-sm focus:outline-none focus:ring-green-600 focus:border-green-600 bg-white dark:bg-gray-700 dark:text-white"
                  placeholder={t("createRide.driver.examplePlate")}
                  value={vehicleInfo.plateNumber}
                  onChange={handleVehicleChange}
                  required
                />
              </div>
            </div>

            {/* Available Seats Selection */}
            <div>
              <label
                htmlFor="availableSeats"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t("createRide.driver.availableSeats", "Available Seats")}
              </label>
              <div className="flex items-center justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    if (rideDetails.availableSeats > 1) {
                      setRideDetails((prev) => ({
                        ...prev,
                        availableSeats: prev.availableSeats - 1,
                      }));
                    }
                  }}
                  disabled={rideDetails.availableSeats <= 1}
                  className={clsx(
                    "w-12 h-12  border-2 flex items-center justify-center transition-all duration-300",
                    rideDetails.availableSeats <= 1
                      ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105"
                  )}
                >
                  <Minus className="h-5 w-5" />
                </button>

                <div className="min-w-[80px] text-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {rideDetails.availableSeats || 4}
                  </span>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {(rideDetails.availableSeats || 4) === 1
                      ? t("common_.small.seat")
                      : t("common_.small.seats")}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRideDetails((prev) => ({
                      ...prev,
                      availableSeats: (prev.availableSeats || 4) + 1,
                    }));
                  }}
                  disabled={(rideDetails.availableSeats || 4) >= 8}
                  className={clsx(
                    "w-12 h-12  border-2 flex items-center justify-center transition-all duration-300 border-green-600 text-green-600 hover:bg-green-600 hover:text-white hover:scale-105"
                  )}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Image Upload Section */}
            <div>
              {vehicleInfo.images.length < 4 && (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("createRide.driver.vehicleImages")}
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed ">
                    <div className="flex flex-col items-center gap-4">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <label
                            htmlFor="vehicleImages"
                            className="relative cursor-pointer bg-white dark:bg-gray-800  font-medium text-[#30BFDD] dark:text-[#30BFDD] hover:text-[#2aa8c4] dark:hover:text-[#2aa8c4] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#30BFDD]"
                          >
                            <span>{t("createRide.driver.imageUpload")}</span>
                            <input
                              id="vehicleImages"
                              name="vehicleImages"
                              type="file"
                              multiple
                              accept="image/*"
                              className="sr-only"
                              onChange={async (e) => {
                                if (vehicleInfo.images.length >= 4) {
                                  toast.error(
                                    t("createRide.driver.tooManyImages"),
                                    {
                                      className: "custom-error-toast",
                                    }
                                  );
                                  return;
                                }

                                if (e.target.files) {
                                  const newFiles = Array.from(e.target.files);
                                  const validFiles: File[] = [];
                                  const newPreviews: string[] = [];

                                  for (const file of newFiles) {
                                    const imageUrl = URL.createObjectURL(file);
                                    const img = new Image();

                                    const resolutionCheck =
                                      await new Promise<boolean>((resolve) => {
                                        img.onload = () => {
                                          const isValidResolution = true;
                                          if (!isValidResolution) {
                                            toast.error(
                                              t(
                                                "createRide.driver.lowResolution",
                                                {
                                                  file: file?.name,
                                                  width: img.width,
                                                  height: img.height,
                                                }
                                              ),
                                              {
                                                className: "custom-error-toast",
                                              }
                                            );
                                          }
                                          resolve(isValidResolution);
                                        };
                                        img.onerror = () => {
                                          toast.error(
                                            t(
                                              "createRide.driver.invalidImage",
                                              {
                                                file: file?.name,
                                              }
                                            ),
                                            {
                                              className: "custom-error-toast",
                                            }
                                          );
                                          resolve(false);
                                        };
                                        img.src = imageUrl;
                                      });

                                    if (resolutionCheck) {
                                      validFiles.push(file);
                                      newPreviews.push(imageUrl);
                                      await saveImageToDB(file); // Store only valid files
                                    } else {
                                      URL.revokeObjectURL(imageUrl); // Clean up invalid image preview
                                    }
                                  }

                                  if (validFiles.length > 0) {
                                    setVehicleInfo((prev) => ({
                                      ...prev,
                                      images: [...prev.images, ...validFiles],
                                    }));

                                    setImagePreviews((prev) => [
                                      ...prev,
                                      ...newPreviews,
                                    ]);
                                  }
                                }
                              }}
                            />
                          </label>
                          <p className="pl-1">
                            {t("createRide.driver.dragDrop")}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("createRide.driver.imageType")}
                        </p>
                      </div>

                      {/* Camera photo */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t(
                            "createRide.driver.takePhotoFromCamera",
                            "Take photo from camera"
                          )}
                        </span>
                        <CameraCapture
                          title={t(
                            "createRide.driver.takeVehiclePhoto",
                            "Take Vehicle Photo"
                          )}
                          instructions={t(
                            "createRide.driver.cameraInstructions",
                            "Position your vehicle in the frame and tap the capture button"
                          )}
                          reviewText={t(
                            "createRide.driver.cameraReview",
                            "Review your vehicle photo and choose to use it or retake"
                          )}
                          usePhotoText={t(
                            "createRide.driver.usePhoto",
                            "Use Photo"
                          )}
                          retakeText={t("createRide.driver.retake", "Retake")}
                          loadingText={t(
                            "createRide.driver.cameraLoading",
                            "Starting camera..."
                          )}
                          noCameraText={t(
                            "createRide.driver.noCamera",
                            "No camera detected on this device. Please use the upload option instead."
                          )}
                          accessErrorText={t(
                            "createRide.driver.cameraError",
                            "Unable to access camera. Please check permissions."
                          )}
                          onImageCapture={async (file) => {
                            if (vehicleInfo.images.length >= 4) {
                              toast.error(
                                t("createRide.driver.tooManyImages"),
                                {
                                  className: "custom-error-toast",
                                }
                              );
                              return;
                            }

                            // Check file size
                            if (file.size < 50 * 1024) {
                              toast.error(
                                t("createRide.driver.fileTooSmall", {
                                  file: file?.name,
                                }),
                                {
                                  className: "custom-error-toast",
                                }
                              );
                              return;
                            }

                            // Check resolution
                            const imageUrl = URL.createObjectURL(file);
                            const img = new Image();
                            img.src = imageUrl;

                            img.onload = async () => {
                              const isValid =
                                img.width >= 640 && img.height >= 480;
                              if (!isValid) {
                                toast.error(
                                  t("createRide.driver.lowResolution", {
                                    file: file?.name,
                                    width: img.width,
                                    height: img.height,
                                  }),
                                  {
                                    className: "custom-error-toast",
                                  }
                                );
                                URL.revokeObjectURL(imageUrl);
                                return;
                              }

                              await saveImageToDB(file);

                              setVehicleInfo((prev) => ({
                                ...prev,
                                images: [...prev.images, file],
                              }));

                              setImagePreviews((prev) => [...prev, imageUrl]);
                            };

                            img.onerror = () => {
                              toast.error(
                                t("createRide.driver.invalidImage", {
                                  file: file?.name,
                                }),
                                {
                                  className: "custom-error-toast",
                                }
                              );
                              URL.revokeObjectURL(imageUrl);
                            };
                          }}
                          trigger={
                            <Button
                              variant="outline"
                              size="icon"
                              className=" bg-white dark:bg-gray-700 dark:border-gray-600 h-10 w-10 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                              title={t(
                                "createRide.driver.takeVehiclePhoto",
                                "Take Vehicle Photo"
                              )}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Image Previews */}
              {imagePreviews?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("createRide.driver.imageUploaded")}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {imagePreviews?.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Vehicle preview ${index + 1}`}
                          className="h-40 w-full object-cover  border border-gray-200 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updatedImages = [...vehicleInfo.images];
                            const updatedPreviews = [...imagePreviews];

                            URL.revokeObjectURL(imagePreviews[index]);
                            updatedImages.splice(index, 1);
                            updatedPreviews.splice(index, 1);

                            deleteImageFromDB(index); // Remove from IndexedDB

                            setVehicleInfo((prev) => ({
                              ...prev,
                              images: updatedImages,
                            }));

                            setImagePreviews(updatedPreviews);
                          }}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white  p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-4 border-2 border-gray-200 dark:border-gray-600  text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 hover:border-gray-300 dark:hover:border-gray-500"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("driver.back")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const { make, model, year, color, plateNumber, images } =
                  vehicleInfo;

                if (
                  !make.trim() ||
                  !model.trim() ||
                  !year ||
                  !color.trim() ||
                  !plateNumber.trim()
                ) {
                  toast.error(
                    t("driver.fill", {
                      className: "custom-error-toast",
                    }),
                    { className: "custom-error-toast" }
                  );
                  return;
                }

                if (images.length === 0) {
                  toast.error(t("driver.atLeast,fill"), {
                    className: "custom-error-toast",
                  });
                  return;
                }
                handleNext();
              }}
              className="px-8 py-4 bg-gradient-to-r from-[#30BFDD] to-[#2aa8c4] hover:from-[#2aa8c4] hover:to-[#30BFDD] text-white  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              <span>{t("driver.nextStep")}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
