import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompletePassengerOnboarding, useUserPreference } from "@/data";
import { getRouteId } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Car,
  Cigarette,
  Loader2,
  MapPin,
  MapPinHouse,
  PawPrint,
  Phone,
  Snowflake,
  Star,
  User,
  UserRound,
  Users,
  Wind,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PhoneInputComponent } from "./inputs/PhoneInput";
import { VerifyPhoneDialog } from "./VerifyPhoneForm";
import GooglePlacesInput from "./GoogleInput";
import { useJsApiLoader } from "@react-google-maps/api";
import { LIBRARIES } from "./Map";

interface PassengerOnboardingFormProps {
  onComplete?: () => void;
}

const PassengerOnboardingForm: React.FC<PassengerOnboardingFormProps> = ({
  onComplete,
}) => {
  const { data: userPreference, isPending: isPendingUserPreference } =
    useUserPreference();

  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    travelPreferences: {
      smoking: false,
      pets: false,
      airConditioning: false,
      bicycleSupport: false,
      snowTires: false,
      ladiesOnly: false,
      gentsOnly: false,
      skydiving: false, // ✅ NEW
      music: "LOW",
    },
    frequentRoutes: [] as { from: string; to: string }[],
    emergencyContactName: "",
    emergencyContactPhone: "",
    phoneNumber: "", // ✅ NEW
    referralCode: "",
  });

  const [verify, setVerify] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customRoutes, setCustomRoutes] = useState<
    { from: string; to: string }[]
  >([]);

  const [termsAccepted, setTermsAccepted] = useState(
    userPreference.termsAccepted
  );

  const handleAddCustomRoute = () => {
    if (!customFrom || !customTo) return;
    if (customFrom.toLowerCase() === customTo.toLowerCase())
      return toast.error("Departure and destination cannot be the same.", {
        className: "custom-error-toast",
      });

    const newRoute = { from: customFrom.trim(), to: customTo.trim() };
    const routeId = getRouteId(newRoute);

    // Prevent duplicates
    const alreadyExists = customRoutes.some((r) => getRouteId(r) === routeId);

    if (!alreadyExists) {
      setCustomRoutes((prev) => [...prev, newRoute]);
    }

    setCustomFrom("");
    setCustomTo("");
  };

  const handleRemoveCustomRoute = (routeIdToRemove: string) => {
    setCustomRoutes((prev) => {
      const updated = prev.filter((r) => getRouteId(r) !== routeIdToRemove);
      return updated;
    });
  };

  useEffect(() => {
    if (userPreference?.passenger) {
      const passenger = userPreference.passenger;

      const allRoutes = passenger.frequentRoutes || [];

      // Identify custom routes by checking if they are NOT in the predefined list
      const predefinedRouteIds = frequentRoutes.map(getRouteId);
      const custom = allRoutes.filter(
        (r) => !predefinedRouteIds.includes(getRouteId(r))
      );

      setCustomRoutes(custom); // <-- you must have this state defined

      setFormData((prev) => ({
        ...prev,
        travelPreferences: {
          smoking: passenger.travelPreferences?.smoking || false,
          pets: passenger.travelPreferences?.pets || false,
          airConditioning:
            passenger.travelPreferences?.airConditioning || false,
          bicycleSupport: passenger.travelPreferences?.bicycleSupport || false,
          snowTires: passenger.travelPreferences?.snowTires || false,
          ladiesOnly: passenger.travelPreferences?.ladiesOnly || false,
          gentsOnly: passenger.travelPreferences?.gentsOnly || false,
          skydiving: passenger.travelPreferences?.skydiving || false,
          music: passenger.travelPreferences?.music || "LOW",
        },
        frequentRoutes: allRoutes.filter((r) =>
          predefinedRouteIds.includes(getRouteId(r))
        ),
        emergencyContactName: passenger.emergencyContactName || "",
        emergencyContactPhone: passenger.emergencyContactPhone || "",
        phoneNumber: passenger.phoneNumber || "",
        referralCode: null,
      }));
    }
  }, [userPreference]);

  // Preferences
  useEffect(() => {
    if (
      formData.travelPreferences.ladiesOnly &&
      formData.travelPreferences.gentsOnly
    ) {
      setFormData((prev) => ({
        ...prev,
        travelPreferences: {
          ...prev.travelPreferences,
          gentsOnly: false,
        },
      }));
    }
  }, [formData.travelPreferences.ladiesOnly]);

  useEffect(() => {
    if (
      formData.travelPreferences.gentsOnly &&
      formData.travelPreferences.ladiesOnly
    ) {
      setFormData((prev) => ({
        ...prev,
        travelPreferences: {
          ...prev.travelPreferences,
          ladiesOnly: false,
        },
      }));
    }
  }, [formData.travelPreferences.gentsOnly]);

  // Scroll top
  useEffect(() => {
    window.scrollTo({ top: 100, behavior: "smooth" });
  }, [step]);

  const { mutate: completeOnboarding, isPending } =
    useCompletePassengerOnboarding();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    libraries: LIBRARIES,
  });

  const travelPreferences = [
    {
      id: "smoking",
      label: t("driver.smoking", "Smoking allowed"),
      icon: <Cigarette className="h-7 w-7 text-muted-foreground" />,
      description: t(
        "driver.smokingDescription",
        "Smoking is permitted during the ride"
      ),
    },
    {
      id: "pets",
      label: t("driver.pets", "Pets welcome"),
      icon: <PawPrint className="h-7 w-7 text-muted-foreground" />,
      description: t(
        "driver.petsDescription",
        "Pets are welcome in the vehicle"
      ),
    },
    {
      id: "airConditioning",
      label: t("driver.airConditioning", "Air conditioning"),
      icon: <Wind className="h-7 w-7 text-muted-foreground" />,
      description: t(
        "driver.airConditioningDescription",
        "Vehicle has air conditioning"
      ),
    },
    {
      id: "bicycleSupport",
      label: t("driver.bicycleSupport", "Bicycle support"),
      icon: <Bike className="h-7 w-7 text-muted-foreground" />,
      description: t(
        "driver.bicycleSupportDescription",
        "Can transport bicycles"
      ),
    },
    {
      id: "snowTires",
      label: t("driver.snowTires", "Snow tires"),
      icon: <Snowflake className="h-7 w-7 text-muted-foreground" />,
      description: t(
        "driver.snowTiresDescription",
        "Vehicle equipped with snow tires"
      ),
    },
    {
      id: "ladiesOnly",
      label: t("driver.ladiesOnly", "Ladies only"),
      icon: <UserRound className="h-7 w-7 text-muted-foreground" />,
      description: t(
        "driver.ladiesOnlyDescription",
        "Prefer female passengers only"
      ),
    },
    {
      id: "gentsOnly",
      label: t("driver.gentsOnly", "Gents only"),
      icon: <Users className="h-7 w-7 text-muted-foreground" />,
      description: t(
        "driver.gentsOnlyDescription",
        "Prefer male passengers only"
      ),
    },
  ];

  const frequentRoutes = [
    { from: "Montreal", to: "Toronto" },
    { from: "Montreal", to: "Ottawa" },
    { from: "Montreal", to: "Quebec City" },
    { from: "Toronto", to: "Ottawa" },
    { from: "Toronto", to: "Quebec City" },
    { from: "Vancouver", to: "Calgary" },
    { from: "Edmonton", to: "Calgary" },
  ];

  const handlePreferenceChange = (preferenceId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      travelPreferences: {
        ...prev.travelPreferences,
        [preferenceId]: checked,
      },
    }));
  };

  const handleRouteChange = (routeId: string, checked: boolean) => {
    const selectedRoute = frequentRoutes.find((r) => getRouteId(r) === routeId);
    if (!selectedRoute) return;

    setFormData((prev) => {
      const alreadySelected = prev.frequentRoutes.some(
        (r) => getRouteId(r) === routeId
      );

      let updatedRoutes;
      if (checked && !alreadySelected) {
        updatedRoutes = [...prev.frequentRoutes, selectedRoute];
      } else if (!checked && alreadySelected) {
        updatedRoutes = prev.frequentRoutes.filter(
          (r) => getRouteId(r) !== routeId
        );
      } else {
        updatedRoutes = prev.frequentRoutes;
      }

      return { ...prev, frequentRoutes: updatedRoutes };
    });
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    const onboardingData = {
      travelPreferences: formData.travelPreferences,
      frequentRoutes: [], // Remove frequent routes
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone || undefined, // Make optional
      ...(formData.phoneNumber && formData.phoneNumber.trim() && { phoneNumber: formData.phoneNumber }),
      ...(formData.referralCode && { referralCode: formData.referralCode }),
      termsAccepted,
    };

    completeOnboarding(onboardingData, {
      onSuccess: (data) => {
        toast.success(data.message);
        onComplete?.();
        if (!userPreference.driver.isPhoneVerified) {
          setVerify(true);
          return;
        }
        window.location.replace("/profile");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message, {
          className: "custom-error-toast",
        });
      },
    });
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t("onboarding.passenger.step1.title")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
          {t("onboarding.passenger.step1.description")}
        </p>
      </div>

      <Card className="border-2 border-gray-100 dark:border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Car className="h-6 w-6 text-primary" />
            {t("onboarding.passenger.step1.preferences")}
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400">
            Select your preferences to find rides that match your comfort level
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {travelPreferences.map((preference, index) => (
              <motion.div
                key={preference.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">{preference.icon}</span>
                  <div className="flex-1">
                    <Label
                      htmlFor={preference.id}
                      className="text-base font-medium cursor-pointer"
                    >
                      {preference.label}
                    </Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {preference.description}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    id={preference.id}
                    type="checkbox"
                    className="sr-only"
                    checked={
                      (formData.travelPreferences as any)[
                        preference.id as keyof typeof formData.travelPreferences
                      ] || false
                    }
                    onChange={(e) =>
                      handlePreferenceChange(preference.id, e.target.checked)
                    }
                  />
                  <div
                    className={`block w-14 h-8 rounded-full cursor-pointer transition-all duration-200 ${
                      formData.travelPreferences[
                        preference.id as keyof typeof formData.travelPreferences
                      ]
                        ? "bg-primary dark:bg-primary"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    onClick={() => {
                      const current =
                        formData.travelPreferences[
                          preference.id as keyof typeof formData.travelPreferences
                        ] || false;
                      handlePreferenceChange(preference.id, !current);
                    }}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-200 ${
                        formData.travelPreferences[
                          preference.id as keyof typeof formData.travelPreferences
                        ]
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.1 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t("onboarding.passenger.step3.title")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
          {t("onboarding.passenger.step3.description")}
        </p>
      </motion.div>

      <Card className="border-2 border-gray-100 dark:border-gray-700 shadow-lg py-10">
        <CardContent className="space-y-8 pt-4">
          {/* User Contact & Music Preferences Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 4 * 0.1 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {t("onboarding.passenger.step3.personalPreferences")}
            </h3>

            <div className="border-[1px] border-gray-300 p-4 rounded-lg flex flex-col items-start gap-6">
              {/* User Phone Number */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 5 * 0.1 }}
                className="space-y-2 w-full"
              >
                <Label htmlFor="phoneNumber" className="text-base font-medium">
                  <Phone className="h-4 w-4 inline mr-2" />
                  {t("onboarding.passenger.step3.userPhone")}
                </Label>
                <PhoneInputComponent
                  phoneNumber={formData.phoneNumber || ""}
                  setPhoneNumber={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      phoneNumber: value,
                    }));
                  }}
                  editPhone={true}
                />
              </motion.div>

              {/* Music Preference Dropdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 6 * 0.1 }}
                className="space-y-2 w-full"
              >
                <Label
                  htmlFor="musicPreference"
                  className="text-base font-medium"
                >
                  🎵 {t("onboarding.passenger.step3.musicPreference")}
                </Label>
                <select
                  id="musicPreference"
                  value={formData.travelPreferences.music}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      travelPreferences: {
                        ...prev.travelPreferences,
                        music: e.target.value,
                      },
                    }))
                  }
                  className="w-full px-4 py-3 border-2 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="LOW">
                    {t("onboarding.passenger.step3.music.low")}
                  </option>
                  <option value="MEDIUM">
                    {t("onboarding.passenger.step3.music.medium")}
                  </option>
                  <option value="HIGH">
                    {t("onboarding.passenger.step3.music.high")}
                  </option>
                  <option value="NOT_AT_ALL">
                    {t("onboarding.passenger.step3.music.none")}
                  </option>
                </select>
              </motion.div>
            </div>
          </motion.div>

          {/* Emergency Contact Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 * 0.1 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {t("onboarding.passenger.step3.emergencyInfo")}
            </h3>

            <div className="border-[1px] border-gray-300 p-4 rounded-lg flex flex-col items-start gap-6">
              {/* Emergency Contact Name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2 * 0.1 }}
                className="space-y-2 w-full"
              >
                <Label
                  htmlFor="emergencyContactName"
                  className="text-base font-medium"
                >
                  <User className="h-4 w-4 inline mr-2" />
                  {t("onboarding.passenger.step3.name")}
                </Label>
                <Input
                  id="emergencyContactName"
                  type="text"
                  placeholder="Enter full name"
                  value={formData.emergencyContactName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      emergencyContactName: e.target.value,
                    }))
                  }
                  className="h-12 text-lg border-2 focus:border-primary focus:ring-2 focus:ring-primary"
                />
              </motion.div>

              {/* Emergency Contact Phone - Optional */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3 * 0.1 }}
                className="space-y-2 w-full"
              >
                <Label
                  htmlFor="emergencyContactPhone"
                  className="text-base font-medium"
                >
                  <Phone className="h-4 w-4 inline mr-2" />
                  {t("onboarding.passenger.step3.phone")} (
                  {t("common.optional", "Optional")})
                </Label>
                <PhoneInputComponent
                  phoneNumber={formData.emergencyContactPhone || ""}
                  setPhoneNumber={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      emergencyContactPhone: value,
                    }));
                  }}
                  editPhone={true}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("onboarding.passenger.step3.format")}: +1234567890
                </p>
              </motion.div>
            </div>
          </motion.div>

          {!userPreference.passenger.isPassengerOnboarded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 7 * 0.1 }}
              className="space-y-2 w-full"
            >
              <Label htmlFor="referralCode" className="text-base font-medium">
                🏷️ {t("onboarding.passenger.step3.referralCode")}
              </Label>
              <Input
                id="referralCode"
                type="text"
                placeholder={t(
                  "onboarding.passenger.step3.referralCodePlaceholder"
                )}
                value={formData.referralCode || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    referralCode: e.target.value,
                  }))
                }
                className="h-12 text-lg border-2 focus:border-primary focus:ring-2 focus:ring-primary"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("onboarding.passenger.step3.optional")}
              </p>
            </motion.div>
          )}

          {!userPreference.termsAccepted && (
            <>
              {/* Terms */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4 pt-4"
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeToTerms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) =>
                      setTermsAccepted(checked as boolean)
                    }
                  />
                  <div className="text-sm leading-relaxed">
                    <Label htmlFor="agreeToTerms" className="font-normal">
                      {t("Register.agree")}{" "}
                      <a
                        href="/terms-of-service"
                        target="_blank"
                        className="text-[#1A6373] hover:text-[#0f4b54] dark:text-[#30BFDD] dark:hover:text-[#2aa8c4] hover:underline"
                      >
                        {t("Register.terms")}
                      </a>{" "}
                      {t("Register.and")}{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        className="text-[#1A6373] hover:text-[#0f4b54] dark:text-[#30BFDD] dark:hover:text-[#2aa8c4] hover:underline"
                      >
                        {t("Register.policy")}
                      </a>
                    </Label>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Step {step} of 2
        </span>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {Math.round((step / 2) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <motion.div
          className="bg-primary dark:bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(step / 2) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderProgressBar()}

      <AnimatePresence mode="wait">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </AnimatePresence>

      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-2 px-6 py-3"
        >
          <ArrowLeft className="h-4 w-4" />

          {t("onboarding.passenger.back")}
        </Button>

        {step < 2 ? (
          <Button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
          >
            {t("onboarding.passenger.next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isPending || !termsAccepted}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />

                {t("onboarding.passenger.comp")}
              </>
            ) : (
              <>
                <Star className="h-4 w-4" />

                {t("onboarding.passenger.set")}
              </>
            )}
          </Button>
        )}
      </div>

      <VerifyPhoneDialog
        phoneNumber={formData.phoneNumber}
        open={verify}
        onOpenChange={setVerify}
      />
    </div>
  );
};

export default PassengerOnboardingForm;
