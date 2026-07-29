import { apiUrl } from "@/data";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  DollarSignIcon,
  Info,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { getToken } from "../getToken";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

// Add this mutation hook (outside your component)
const useGenerateStripeLink = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await axios.get(`${apiUrl}/api/v1/stripe/connect`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      return response.data.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Invalid response format");
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message;
      toast.error(message || "Failed to generate Stripe connection link");
      console.error("Stripe link generation error:", error);
    },
  });
};

export default function StepFour({
  t,
  rideDetails,
  setRideDetails,
  formErrors,
  handleBack,
  handleNext,
  handleSubmit,
  setContributionInput,
  contributionInput,
  handleChange,
  setFormErrors,
  isStripeOnboarded,
  isPendingRideCreate,
}) {
  const { mutate: generateStripeLink, isPending: isGeneratingLink } =
    useGenerateStripeLink();

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
            {t("createRide.driver.rideConfiguration")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("common_.setPrice")}
          </p>
        </div>
      </div>
      <div className="space-y-6">
        {/* Contribution (price per seat) */}
        <div>
          <label
            htmlFor="contribution"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <span className="flex items-center">
              {rideDetails.enableD2D
                ? t("createRide.driver.priceFullRide", "Price for Full Ride")
                : t("createRide.driver.pricePerSeat")}{" "}
              (
              <DollarSignIcon className="w-4 h-4" /> )
            </span>
          </label>
          {rideDetails.enableD2D && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 mt-1">
              {t(
                "createRide.driver.d2dPriceNote",
                "For Door-to-Door rides, this is the total price for the entire ride, not per seat."
              )}
            </p>
          )}
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease price"
              onClick={() => {
                const current = Number(rideDetails.contribution || 0);
                let next = current - 1;
                if (next < 0) next = 0;
                if (next > 0 && next < 1) next = 1;
                next = Number(next.toFixed(2));
                setRideDetails((prev) => ({
                  ...prev,
                  contribution: next,
                }));
                setContributionInput(next.toFixed(2));
              }}
              className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600  bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              −
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                id="contribution"
                name="contribution"
                className={clsx(
                  "block w-full py-4 px-4 pr-16 text-center border-2  bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500",
                  formErrors["contribution"]
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                )}
                value={contributionInput}
                onChange={(e) => {
                  // Allow user to freely type digits and a single dot
                  const raw = e.target.value;
                  if (
                    /^\d*(?:\.)?\d{0,2}$/.test(raw) ||
                    raw === "" ||
                    raw === "."
                  ) {
                    setContributionInput(raw);
                  }
                }}
                onBlur={() => {
                  let val = parseFloat(contributionInput);
                  if (isNaN(val)) val = 0;
                  if (val < 0) val = 0;
                  if (val > 0 && val < 1) val = 1;
                  val = Number(val.toFixed(2));
                  setRideDetails((prev) => ({
                    ...prev,
                    contribution: val,
                  }));
                  setContributionInput(val.toFixed(2));
                }}
                required
              />
              {formErrors["contribution"] && (
                <p className="text-red-500 text-sm mt-1">
                  {formErrors["contribution"]}
                </p>
              )}
              <div className="absolute inset-y-0 right-4 flex items-center text-sm text-gray-500 dark:text-gray-300 pointer-events-none">
                ($)
              </div>
            </div>
            <button
              type="button"
              aria-label="Increase price"
              onClick={() => {
                const current = Number(rideDetails.contribution || 0);
                const next = Number((current + 1).toFixed(2));
                setRideDetails((prev) => ({
                  ...prev,
                  contribution: next,
                }));
                setContributionInput(next.toFixed(2));
              }}
              className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600  bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              +
            </button>
          </div>
        </div>

        {/* Booking Type - Only for Normal Rides */}
        {!rideDetails.enableD2D && (
          <div>
            <label
              htmlFor="bookingType"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t("createRide.driver.bookingType")}
            </label>

            {/* Booking Type Description - Above the select */}
            <div className="mb-3 p-3 bg-green-600 dark:bg-green-600 border-cyan-200 dark:border-cyan-800 ">
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                {t(
                  "createRide.driver.bookingTypeDescription",
                  "Choose whether booking is done automatically without your approval"
                )}
              </p>
            </div>

            <select
              id="bookingType"
              name="bookingType"
              className={clsx(
                "block w-full py-4 px-4 border-2  bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-500",
                formErrors["bookingType"]
                  ? "border-red-500 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              )}
              value={rideDetails.bookingType}
              onChange={handleChange}
            >
              <option value="" disabled selected>
                {t("common_.small.bookingType")}
              </option>
              <option value="AUTOMATIC">
                {t("createRide.driver.bookingTypeAutomatic")}
              </option>
              <option value="MANUAL">
                {t("createRide.driver.bookingTypeManual")}
              </option>
            </select>
            {formErrors["bookingType"] && (
              <p className="text-red-500 text-sm mt-1">
                {formErrors["bookingType"]}
              </p>
            )}
          </div>
        )}

        {/* Door-to-Door Service Configuration - Only show when D2D is selected */}
        {rideDetails.enableD2D && (
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary-600" />
              <label className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {t(
                  "DoorToDoor.dashboard.request.title",
                  "Door-to-Door Configuration"
                )}
              </label>
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 mb-4">
              <p>
                {t(
                  "createRide.driver.d2dConfigurationNote",
                  "Configure your door-to-door service settings. Passengers will be able to request pickups and drop-offs within your specified radius."
                )}
              </p>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="d2dExtraKmPrice"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t(
                      "DoorToDoor.dashboard.driver.extraKmPrice",
                      "Extra KM Price (CAD)"
                    )}
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={
                      typeof rideDetails.d2dExtraKmPrice === "number"
                        ? rideDetails.d2dExtraKmPrice.toString()
                        : rideDetails.d2dExtraKmPrice ?? "0"
                    }
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      // Allow empty string for user to clear and retype
                      if (rawValue === "") {
                        setRideDetails((prev) => ({
                          ...prev,
                          d2dExtraKmPrice: "" as any,
                        }));
                        return;
                      }
                      // Allow typing numbers, decimal point, and multiple digits after decimal
                      if (/^\d*\.?\d*$/.test(rawValue)) {
                        // If it's a valid number format, store it
                        // Allow partial input like "5." or ".5" during typing
                        if (rawValue === "." || rawValue.endsWith(".")) {
                          // Allow trailing decimal point for better UX
                          setRideDetails((prev) => ({
                            ...prev,
                            d2dExtraKmPrice: rawValue as any,
                          }));
                        } else {
                          const numValue = parseFloat(rawValue);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setRideDetails((prev) => ({
                              ...prev,
                              d2dExtraKmPrice: numValue,
                            }));
                          } else {
                            // Allow partial input
                            setRideDetails((prev) => ({
                              ...prev,
                              d2dExtraKmPrice: rawValue as any,
                            }));
                          }
                        }
                      }
                    }}
                    onBlur={() => {
                      // Ensure valid value on blur - convert to number
                      const currentValue = rideDetails.d2dExtraKmPrice;
                      if (
                        currentValue === undefined ||
                        currentValue === null ||
                        currentValue === "" ||
                        (typeof currentValue === "string" &&
                          (currentValue === "" || currentValue === "."))
                      ) {
                        setRideDetails((prev) => ({
                          ...prev,
                          d2dExtraKmPrice: 0,
                        }));
                      } else if (typeof currentValue === "string") {
                        const numValue = parseFloat(currentValue);
                        if (!isNaN(numValue) && numValue >= 0) {
                          setRideDetails((prev) => ({
                            ...prev,
                            d2dExtraKmPrice: numValue,
                          }));
                        } else {
                          setRideDetails((prev) => ({
                            ...prev,
                            d2dExtraKmPrice: 0,
                          }));
                        }
                      } else if (
                        typeof currentValue === "number" &&
                        currentValue < 0
                      ) {
                        setRideDetails((prev) => ({
                          ...prev,
                          d2dExtraKmPrice: 0,
                        }));
                      }
                    }}
                    className="bg-white dark:bg-gray-700"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t(
                      "DoorToDoor.dashboard.driver.extraKmPriceDescription",
                      "Price per extra kilometer beyond the base route"
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  {t(
                    "createRide.driver.d2dDescription",
                    "Allow passengers to request pickup and drop-off at specific addresses within your specified radius. You can manage requests from your dashboard."
                  )}
                </span>
              </div>
              {/* 
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(
                    "DoorToDoor.dashboard.driver.internalNote",
                    "Internal Note (Optional)"
                  )}
                </label>
                <Textarea
                  value={rideDetails.d2dNotes || ""}
                  onChange={(e) => {
                    setRideDetails((prev) => ({
                      ...prev,
                      d2dNotes: e.target.value.slice(0, 500),
                    }));
                  }}
                  rows={3}
                  placeholder={t(
                    "DoorToDoor.dashboard.driver.internalNotePlaceholder",
                    "Reminders for yourself (not visible to passengers)"
                  )}
                  className="bg-white dark:bg-gray-700 resize-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(rideDetails.d2dNotes || "").length}/500{" "}
                  {t("common_.small.characters", "characters")}
                </p>
              </div> */}
            </div>
          </div>
        )}

        {/* Stripe Onboarding Instructions - Show when VIA_PLATFORM is selected */}
        {!isStripeOnboarded && (
          <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400 bg-red-700/15 border border-red-400 rounded-2xl p-4">
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {t(
                "common_.stripeNotAvailableTitle",
                "Complete Your Payment Setup"
              )}
            </p>
            <p>
              {t(
                "common_.stripeNotAvailableDescription",
                "To proceed with this contribution collection method, you need to set up your Stripe Connect account. This secure process takes just a few minutes and is required for payment processing."
              )}
            </p>

            {/* Benefits list */}
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-3">
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 text-black mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t("common_.small.one")}
              </li>
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 text-black mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t("common_.small.two")}
              </li>
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 text-black mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t("common_.small.three")}
              </li>
            </ul>

            {/* Stripe Connect Button */}
            <div className="mt-4">
              <Button
                onClick={() => generateStripeLink()}
                className="w-full  text-primary-900/70 font-semibold py-2.5 bg-red-700/15 hover:bg-red-700/20"
                disabled={isGeneratingLink}
                type="button"
              >
                {isGeneratingLink ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t("common_.small.settingUp")}
                  </>
                ) : (
                  t("common_.small.setup")
                )}
              </Button>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                {t("common_.small.bottomMessage")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={handleBack}
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-4 px-6  hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 flex items-center gap-3 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">{t("createRide.driver.back")}</span>
        </button>
        <button
          onClick={() => {
            const { contribution, bookingType, contributionCollectionMethod } =
              rideDetails;

            // Validate all required fields
            const errors: { [key: string]: string } = {};

            if (
              contribution === null ||
              contribution === undefined ||
              contribution < 0
            ) {
              errors["contribution"] = t(t("common_.small.Price"));
            }
            // Booking type only required for normal rides
            if (
              !rideDetails.enableD2D &&
              (!bookingType || bookingType === "")
            ) {
              errors["bookingType"] = t(t("common_.small.booking"));
            }
            // Contribution collection method only required for normal rides
            if (!rideDetails.enableD2D) {
              if (
                !contributionCollectionMethod ||
                contributionCollectionMethod === ""
              ) {
                errors["contributionCollectionMethod"] = t(
                  "common_.small.Please"
                );
              }
            }

            // Validate D2D fields if D2D is enabled
            if (rideDetails.enableD2D) {
              if (
                !rideDetails.d2dRadiusKm ||
                rideDetails.d2dRadiusKm < 1 ||
                rideDetails.d2dRadiusKm > 25
              ) {
                errors["d2dRadiusKm"] = t(
                  "createRide.driver.d2dRadiusRequired",
                  "Radius must be between 1 and 25 km"
                );
              }
              if (
                rideDetails.d2dExtraKmPrice === undefined ||
                rideDetails.d2dExtraKmPrice < 0
              ) {
                errors["d2dExtraKmPrice"] = t(
                  "createRide.driver.d2dExtraKmPriceRequired",
                  "Extra KM price is required"
                );
              }
            }

            if (Object.keys(errors).length > 0) {
              setFormErrors(errors);
              toast.error(t(t("common_.small.Please_fix")), {
                className: "custom-error-toast",
              });
              return;
            }

            if (
              !rideDetails.enableD2D &&
              rideDetails.contributionCollectionMethod === "VIA_PLATFORM" &&
              !isStripeOnboarded
            ) {
              toast.error(t("common_.changeCollectionMethod"), {
                className: "custom-error-toast",
              });
              return;
            }

            // Call handleSubmit with a synthetic event to prevent form submission issues
            const syntheticEvent = {
              preventDefault: () => {},
            } as React.FormEvent;
            try {
              handleSubmit(syntheticEvent);
            } catch (error) {
              console.error("Error calling handleSubmit:", error);
              toast.error(
                t(
                  "createRide.driver.submissionError",
                  "An error occurred while submitting. Please try again."
                ),
                { className: "custom-error-toast" }
              );
            }
          }}
          type="button"
          disabled={isPendingRideCreate}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-600 text-white px-8 py-4  font-semibold transition-all duration-300 flex items-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105 rounded-lg"
        >
          <span className="text-lg">
            {isPendingRideCreate
              ? t("createRide.driver.submitting", "Creating Ride...")
              : t("createRide.driver.submit", "Create Ride")}
          </span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
