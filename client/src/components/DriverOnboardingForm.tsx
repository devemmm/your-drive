import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiUrl, queryKey, useUserPreference } from "@/data";
import { useReactItems } from "@/lib/ReactTranslation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Loader2, Verified } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CameraCapture } from "./CameraCapture";
import { getToken } from "./getToken";
import { PhoneInputComponent } from "./inputs/PhoneInput";
import LoadingIndicator from "./LoadingIndicator";
import { Badge } from "./ui/badge";

// Types for license sides
type LicenseSide = "front" | "back";

interface LicenseImage {
  front: string | null;
  back: string | null;
}

const licenseSchema = z.object({
  licenseNumber: z.string().min(5),
  drivingExperience: z.string().optional(),
});

const phoneSchema = z.object({
  phoneNumber: z.string().min(10),
});

const verifySchema = z.object({
  code: z.string().min(4),
});

export default function DriverOnboardingForm({
  update = false,
  setCompleteDriver,
  modifyRideStep
}: {
  update?: boolean;
  setCompleteDriver?: React.Dispatch<React.SetStateAction<boolean>>;
  modifyRideStep?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [licenseImages, setLicenseImages] = useState<LicenseImage>({
    front: null,
    back: null,
  });

  const [currentSide] = useState<LicenseSide>("front");

  const { t, queryClient, currentLanguage } = useReactItems();

  const {
    data: userPreference,
    isPending: isPendingUserPreference,
    refetch,
  } = useUserPreference();

  const licenseForm = useForm({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseNumber: userPreference?.driver?.licenseNumber || "",
      drivingExperience: userPreference?.driver?.drivingExperience || "",
    },
  });

  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
  });

  const verifyForm = useForm({
    resolver: zodResolver(verifySchema),
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (userPreference?.driver) {
      // Only reset once, not on every image update
      if (!licenseForm.getValues("licenseNumber")) {
        licenseForm.setValue(
          "licenseNumber",
          userPreference.driver.licenseNumber || ""
        );
      }

      phoneForm.reset({
        phoneNumber: phone || userPreference.driver.phoneNumber || "",
      });

      if (!licenseForm.getValues("drivingExperience")) {
        licenseForm.setValue(
          "drivingExperience",
          userPreference.driver.drivingExperience || ""
        );
      }

      // Handle existing license images - you might need to adjust this based on your API response structure
      if (userPreference?.driver?.licenseImages?.frontImage?.url) {
        setLicenseImages((prev) => ({
          ...prev,
          front: userPreference?.driver?.licenseImages?.frontImage?.url,
        }));
      }

      if (userPreference?.driver?.licenseImages?.backImage?.url) {
        setLicenseImages((prev) => ({
          ...prev,
          back: userPreference?.driver?.licenseImages?.backImage?.url,
        }));
      }
    }
  }, [userPreference, licenseForm, phoneForm, verifyForm, phone]);

  const uploadImage = useMutation({
    mutationFn: async ({
      formData,
      side,
    }: {
      formData: FormData;
      side: string;
    }) =>
      axios.post(
        `${apiUrl}/api/v1/users/onboarding/driver/license?lang=${currentLanguage}&side=${side}`,
        formData,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      ),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
      await refetch(); // Refetch to update userPreference
    },
    onError: (error) => {
      toast.error((error as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  const submitLicenseDetails = useMutation({
    mutationFn: async (data: z.infer<typeof licenseSchema>) => {
      const { data: response } = await axios.post(
        `${apiUrl}/api/v1/users/onboarding/driver?lang=${currentLanguage}`,
        data,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      return response;
    },
    onSuccess: () => {
      refetch();
      // Phone is now optional - skip to completion step if driver onboarding is complete
      // Otherwise, allow user to optionally add phone or skip to step 3
      if (userPreference?.driver?.isPhoneVerified || !userPreference?.driver?.phoneNumber) {
        setStep(3);
      } else {
        setStep(1);
      }
    },
    onError: (error) => {
      const message =
        (error as any)?.response?.data?.message || "Something went wrong.";
      toast.error(message, {
        className: "custom-error-toast",
      });
    },
  });

  const sendSMS = useMutation({
    mutationFn: async (data: z.infer<typeof phoneSchema>) => {
      setPhone(data.phoneNumber);
      return axios.post(
        `${apiUrl}/api/v1/users/add-phone?lang=${currentLanguage}`,
        data,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
    },
    onSuccess: () => setStep(2),
    onError: (error: any) => {
      toast.error(error.response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  const verifySMS = useMutation({
    mutationFn: async (data: { code: string; phoneNumber: string }) =>
      axios.post(
        `${apiUrl}/api/v1/users/verify-phone?lang=${currentLanguage}`,
        data,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      ),
    onSuccess: async () => {
      refetch();
      await queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
      await queryClient.invalidateQueries({ queryKey: [queryKey.USER] });
      setStep(3);
    },
    onError: (error) => {
      toast.error(
        (error as any)?.response?.data?.message || "Something went wrong.",
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const handleFileChange = (file: File, side: LicenseSide) => {
    const formData = new FormData();
    formData.append("license", file);

    uploadImage.mutate(
      { formData, side },
      {
        onSuccess: (data) => {
          // Update the local state with the new image preview
          const reader = new FileReader();
          reader.onload = (e) => {
            setLicenseImages((prev) => ({
              ...prev,
              [side]: e.target?.result as string,
            }));
          };
          reader.readAsDataURL(file);
        },
      }
    );
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: LicenseSide
  ) => {
    if (!e.target.files?.[0]) return;
    handleFileChange(e.target.files[0], side);
  };

  const handleCameraCapture = (file: File, side: LicenseSide) => {
    handleFileChange(file, side);
  };

  const removeImage = (side: LicenseSide) => {
    setLicenseImages((prev) => ({
      ...prev,
      [side]: null,
    }));
  };

  const areBothSidesUploaded = licenseImages.front && licenseImages.back;

  const steps = [
    t("driver_.license.licenseStepTitle"),
    t("driver_.license.phoneStepTitle"),
    t("driver_.license.verificationStepTitle"),
    "Completed successfully",
  ];

  const progress = ((step + 1) / steps.length) * 100;

  if (isPendingUserPreference) {
    return <LoadingIndicator />;
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {steps[step]}
        </h2>
        {userPreference.driver.phoneNumber ? (
          <div className="mt-4 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-500 dark:bg-primary-300"
              initial={{ width: 0 }}
              animate={{ width: `${100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        ) : (
          <div className="mt-4 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-500 dark:bg-primary-300"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-license"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* License Upload Section */}
            <div className="space-y-6">
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("driver_.license.uploadLabel")}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {t("common_.small.PleaseUpload")}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Front Side */}
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                    {t("common_.small.Front")}
                  </h3>

                  <input
                    id="license-upload-front"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileInputChange(e, "front")}
                    className="hidden"
                  />

                  <div className="flex items-center gap-4 mb-4">
                    <label
                      htmlFor="license-upload-front"
                      className="inline-flex items-center px-4 py-2 cursor-pointer rounded-md bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition"
                    >
                      {t("driver_.license.uploadButton")}
                    </label>

                    <CameraCapture
                      onImageCapture={(file) =>
                        handleCameraCapture(file, "front")
                      }
                      trigger={
                        <Button
                          size="icon"
                          className="rounded-full dark:bg-gray-700 dark:border-gray-600 h-9 w-9 shadow-lg dark:hover:bg-gray-600 transition-all hover:scale-105"
                          title={t("camera.takePhoto", "Take Photo")}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>

                  {licenseImages.front && (
                    <div className="mt-2 relative w-full max-w-64 h-40 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 shadow-lg">
                      <img
                        src={licenseImages.front}
                        alt="Front side of license"
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage("front")}
                        className="absolute top-2 right-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transition"
                        title="Remove front image"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}

                  {uploadImage.isPending && currentSide === "front" && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {t("driver_.license.uploading")}
                    </p>
                  )}
                </div>

                {/* Back Side */}
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                    {t("common_.small.Back")}
                  </h3>

                  <input
                    id="license-upload-back"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileInputChange(e, "back")}
                    className="hidden"
                  />

                  <div className="flex items-center gap-4 mb-4">
                    <label
                      htmlFor="license-upload-back"
                      className="inline-flex items-center px-4 py-2 cursor-pointer rounded-md bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition"
                    >
                      {t("driver_.license.uploadButton")}
                    </label>

                    <CameraCapture
                      onImageCapture={(file) =>
                        handleCameraCapture(file, "back")
                      }
                      trigger={
                        <Button
                          size="icon"
                          className="rounded-full dark:bg-gray-700 dark:border-gray-600 h-9 w-9 shadow-lg dark:hover:bg-gray-600 transition-all hover:scale-105"
                          title={t("camera.takePhoto", "Take Photo")}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>

                  {licenseImages.back && (
                    <div className="mt-2 relative w-full max-w-64 h-40 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 shadow-lg">
                      <img
                        src={licenseImages.back}
                        alt="Back side of license"
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage("back")}
                        className="absolute top-2 right-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transition"
                        title="Remove back image"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}

                  {uploadImage.isPending && currentSide === "back" && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {t("driver_.license.uploading")}
                    </p>
                  )}
                </div>
              </div>

              {!areBothSidesUploaded && (
                <div className="text-center">
                  <Badge
                    variant="secondary"
                    className="text-orange-600 bg-orange-100 hover:bg-orange-200"
                  >
                    {t("common_.small.uploadLicense")}
                  </Badge>
                </div>
              )}
            </div>

            <Form {...licenseForm}>
              <form
                onSubmit={licenseForm.handleSubmit((data) => {
                  submitLicenseDetails.mutate(data);
                })}
              >
                <FormField
                  control={licenseForm.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("driver_.license.numberLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="AB123456"
                          {...field}
                          className="dark:bg-gray-800"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={licenseForm.control}
                  name="drivingExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("driver_.license.experienceLabel")}
                      </FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="dark:bg-gray-800 border rounded px-3 py-2 w-full"
                        >
                          <option value=""> {t("driver_.exp")}</option>
                          {[1, 2, 3, 4, 5].map((year) => (
                            <option key={year} value={year}>
                              {year}{" "}
                              {year === 1
                                ? t("driver_.year")
                                : t("driver_.years")}
                            </option>
                          ))}
                          <option value="more">{t("driver_.more")}</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-4 mt-5">
                  <Button
                    disabled={
                      !areBothSidesUploaded ||
                      !licenseForm.watch("licenseNumber")
                    }
                    type="submit"
                    className="w-32"
                  >
                    {submitLicenseDetails.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("_common.next")
                    )}
                  </Button>
                  {update ||
                    (userPreference?.driver?.licenseImages?.frontImage?.url &&
                      userPreference?.driver?.licenseImages?.backImage?.url &&
                      userPreference?.driver.licenseNumber && (
                        <Button
                          onClick={() => {
                            if (userPreference.driver.isPhoneVerified) {
                              setStep(3);
                            } else {
                              setStep(1);
                            }
                          }}
                          type="button"
                          variant="outline"
                          disabled={
                            !areBothSidesUploaded ||
                            !licenseForm.watch("licenseNumber")
                          }
                          className="w-32 dark:bg-gray-800"
                        >
                          {t("_common.escape")}
                        </Button>
                      ))}
                </div>
              </form>
            </Form>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-phone"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 text-start"
          >
            <Form {...phoneForm}>
              <form
                onSubmit={phoneForm.handleSubmit((data) =>
                  sendSMS.mutate(data)
                )}
              >
                <FormField
                  control={phoneForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("driver_.phone.label")}</FormLabel>
                      <FormControl>
                        {/* <Input
                          placeholder="+1234567890"
                          {...field}
                          className="dark:bg-gray-800"
                        /> */}
                        <PhoneInputComponent
                          phoneNumber={field.value}
                          setPhoneNumber={field.onChange}
                          editPhone={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4 mt-4">
                  <Button type="submit" className="w-32">
                    {sendSMS.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("driver_.phone.sendCode")
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(3)}
                    className="w-32"
                  >
                    {t("_common.skip", "Skip")}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Form {...verifyForm}>
              <form
                onSubmit={verifyForm.handleSubmit((data) =>
                  verifySMS.mutate({
                    code: data.code,
                    phoneNumber: phone || userPreference?.driver?.phoneNumber,
                  })
                )}
              >
                <Badge>
                  {t("driver_.phone.codeSentTo", {
                    phone: phone || userPreference?.driver?.phoneNumber,
                  })}
                </Badge>

                <FormField
                  control={verifyForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{t("driver_.phone.codeLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234"
                          {...field}
                          className="dark:bg-gray-800"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="mt-4 w-32"
                  disabled={verifySMS.isPending}
                >
                  {verifySMS.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("driver_.phone.verify")
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6 py-10">
            {/* Success Message */}
            <div className="flex flex-col items-center gap-3">
              <Verified className="w-10 h-10 text-green-600 dark:text-green-400" />
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
                {t("driver_.success.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t("driver_.success.description")}
              </p>
            </div>

            {/* Action Buttons */}
            {update ? (
              <Button
                variant="outline"
                onClick={() => {
                  setCompleteDriver(false); 
                  modifyRideStep()
                }}
                className="dark:bg-gray-600"
              >
                {t("driver_.phone.goToProfile", "Go to Profile")}
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => {
                    setCompleteDriver(false); 
                    modifyRideStep()
                  }}
                  className="bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
                >
                  {t("driver_.post")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.replace("/dashboard")} // Replace with your actual dashboard route
                  className="dark:bg-gray-700"
                >
                  {t("driver_.dashboard")}
                </Button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-8">
        {step > 0 && !userPreference.driver.isPhoneVerified ? (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="dark:bg-gray-800"
          >
            {t("_common.back")}
          </Button>
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
}
