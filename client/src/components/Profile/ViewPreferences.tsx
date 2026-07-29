import { useUserPreference } from "@/data";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const ViewPreferences = ({ setCompleteProfile, setCompleteDriver }: any) => {
  const { t } = useTranslation();
  const { data: userPreference, isPending: isPendingUserPreference } =
    useUserPreference();

    // console.log({
    //   userPreference:userPreference.driver
    // })

  if (isPendingUserPreference) {
    return (
      <p>
        {t("profile.common.edit", "Edit")}{" "}
        {t("profile.common.loadingPreferences", "Loading preferences...")}
      </p>
    );
  }

  if (!userPreference) {
    return (
      <p>{t("profile.common.noPreferences", "No preferences available.")}</p>
    );
  }

  const { driver, passenger } = userPreference;

  return (
    <div className="space-y-6">
      {driver && driver.isDriverOnboarded && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("profile.preferences.driverDetails", "Driver Details")}
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      setCompleteDriver(true);
                    }}
                  >
                    {t("profile.common.edit", "Edit")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <Badge>{t("profile.common.edit", "Edit")}</Badge>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Driving Experience */}
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.drivingExperience")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {driver.drivingExperience === "more"
                      ? t("driver_.more")
                      : driver.drivingExperience === "1"
                      ? `${driver.drivingExperience} ${t("driver_.year")}`
                      : `${driver.drivingExperience} ${t("driver_.years")}`}
                  </p>
                </div>
              </div>

              {/* License Number */}
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.licenseNumber")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {driver.licenseNumber || t("profile.common.na", "N/A")}
                  </p>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.phoneNumber", "Phone Number")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {driver.phoneNumber || t("profile.common.na", "N/A")}
                  </p>
                </div>
              </div>

              {/* Phone Verified */}
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.phoneVerified")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {driver.isPhoneVerified
                      ? t("profile.common.yes", "Yes")
                      : t("profile.common.no", "No")}
                  </p>
                </div>
              </div>

              {/* Driver Onboarded */}
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.driverOnboarded")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {driver.isDriverOnboarded
                      ? t("profile.common.yes", "Yes")
                      : t("profile.common.no", "No")}
                  </p>
                </div>
              </div>

              {/* License Image */}
              {driver?.licenseImages?.frontImage?.url && (
                <div className="space-y-2 md:col-span-2">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                      {t("profile.preferences.licenseImage", "License Image")}
                    </p>
                    <div className="flex items-center gap-4">
                      <img
                        src={driver?.licenseImages?.frontImage?.url}
                        alt={t("driver_.license.previewAlt")}
                        className="w-full max-w-xs border border-slate-300 dark:border-slate-700 shadow-lg"
                      />
                      <img
                        src={driver?.licenseImages?.backImage?.url}
                        alt={t("driver_.license.previewAlt")}
                        className="w-full max-w-xs border border-slate-300 dark:border-slate-700 shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {passenger && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("profile.preferences.passengerDetails", "Passenger Details")}
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      setCompleteProfile(true);
                    }}
                  >
                    {t("profile.common.edit", "Edit")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <Badge>{t("profile.common.edit", "Edit")}</Badge>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.emergencyContactName")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {passenger.emergencyContactName || "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.emergencyContactPhone")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {passenger.emergencyContactPhone || "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.referralCode")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {passenger.referralCode || "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t("profile.preferences.passengerOnboarded")}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {passenger.isPassengerOnboarded
                      ? t("common.yes")
                      : t("common.no")}
                  </p>
                </div>
              </div>
            </div>

            {passenger.travelPreferences && (
              <div className="mt-8 space-y-6">
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                    {t("profile.preferences.travelPreferences")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.music")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {t(
                            `profile.preferences.musicLevels.${passenger.travelPreferences.music.toLowerCase()}`
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.pets")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {passenger.travelPreferences.pets
                            ? t("profile.preferences.allowed")
                            : t("profile.preferences.notAllowed")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.smoking")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {passenger.travelPreferences.smoking
                            ? t("profile.preferences.allowed")
                            : t("profile.preferences.notAllowed")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.airConditioning")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {passenger.travelPreferences.airConditioning
                            ? t("profile.preferences.available")
                            : t("profile.preferences.notAvailable")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.snowTires")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {passenger.travelPreferences.snowTires
                            ? t("profile.preferences.available")
                            : t("profile.preferences.notAvailable")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.bicycleSupport")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {passenger.travelPreferences.bicycleSupport
                            ? t("profile.preferences.available")
                            : t("profile.preferences.notAvailable")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.luggage")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {passenger.travelPreferences.luggageSize !== "NONE"
                            ? `${
                                passenger.travelPreferences.luggageCount
                              } × ${passenger.travelPreferences.luggageSize.toLowerCase()}`
                            : t("profile.preferences.notAllowed")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.ladiesOnly")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {passenger.travelPreferences.ladiesOnly
                            ? t("common.yes")
                            : t("common.no")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          {t("profile.preferences.gentsOnly")}
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {passenger.travelPreferences.gentsOnly
                            ? t("common.yes")
                            : t("common.no")}
                        </p>
                      </div>
                    </div>

                    {passenger.travelPreferences.additionalNotes && (
                      <div className="space-y-2 md:col-span-2">
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            {t("profile.preferences.additionalNotes")}
                          </p>
                          <p className="text-slate-900 dark:text-white">
                            {passenger.travelPreferences.additionalNotes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPreferences;
