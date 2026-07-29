import React, { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl, queryKey, useUserPreference } from "@/data";
import { getToken } from "../getToken";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoadingIndicator from "../LoadingIndicator";

export const UserPreferencesForm = ({
  setCompleteProfile,
}: {
  setCompleteProfile: Dispatch<SetStateAction<boolean>>;
}) => {
  const [step, setStep] = useState(0);

  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  //   Mutation
  const { mutate: updatePreference, isPending } = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/users/onboarding/passenger?lang=EN`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryKey.USER] });
      await queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
      setCompleteProfile(false);
      navigate("/profile");
    },
  });

  // --- Schema ---
  const formSchema = z.object({
    travelPreferences: z.object({
      smoking: z.boolean(),
      pets: z.boolean(),
      music: z.enum(["low", "medium", "high"]),
    }),
    emergencyContactName: z.string().min(2, t("form.nameVal")),
    emergencyContactPhone: z.string().min(10, t("form.phoneVal")),
    frequentRoutes: z.string().optional(),
    referralCode: z.string().optional(),
  });

  type FormData = z.infer<typeof formSchema>;

  const { data: userPreference, isPending: isPendingUserPreference } =
    useUserPreference();

  const defaultValues = userPreference
    ? {
        travelPreferences: userPreference.passenger?.travelPreferences,
        emergencyContactName:
          userPreference.passenger?.emergencyContactName ?? "",
        emergencyContactPhone:
          userPreference.passenger?.emergencyContactPhone ?? "",
        frequentRoutes: userPreference.passenger?.frequentRoutes ?? "",
        referralCode: userPreference.passenger?.referralCode ?? "",
      }
    : undefined;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const nextStep = async () => {
    const stepFields: Record<number, (keyof FormData)[]> = {
      0: ["travelPreferences"],
      1: ["emergencyContactName", "emergencyContactPhone"],
      2: ["frequentRoutes", "referralCode"], // optional fields, can still trigger if needed
    };

    const fieldsToValidate = stepFields[step];

    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      setStep((s) => Math.min(s + 1, 2));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = (data: FormData) => {
    if (step < 2) return;
    updatePreference(data);
  };

  if (isPendingUserPreference) {
    <LoadingIndicator />;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="max-w-2xl mx-auto"
        >
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="p-8 space-y-6"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("form.travelPreferences.title")}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    {t("form.travelPreferences.description")}
                  </p>
                  <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-600"
                      initial={{ width: "0%" }}
                      animate={{ width: "33%" }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="travelPreferences.smoking"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <FormControl>
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="smoking"
                            className="sr-only peer"
                            ref={field.ref}
                            name={field.name}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            checked={field.value}
                          />
                          <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-all flex items-center justify-center">
                            <Check
                              className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100"
                              strokeWidth={3}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormLabel
                        htmlFor="smoking"
                        className="text-slate-700 dark:text-slate-300 cursor-pointer mb-0 font-medium"
                      >
                        {t("form.travelPreferences.smokingLabel")}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="travelPreferences.pets"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <FormControl>
                        <div className="relative">
                          <input
                            type="checkbox"
                            id="pets"
                            className="sr-only peer"
                            ref={field.ref}
                            name={field.name}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            checked={field.value}
                          />
                          <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-all flex items-center justify-center">
                            <Check
                              className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100"
                              strokeWidth={3}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormLabel
                        htmlFor="pets"
                        className="text-slate-700 dark:text-slate-300 cursor-pointer mb-0 font-medium"
                      >
                        {t("form.travelPreferences.petsLabel")}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="travelPreferences.music"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                        {t("form.travelPreferences.musicLabel")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <select
                            {...field}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                          >
                            <option value="low">{t("form.options.low")}</option>
                            <option value="medium">
                              {t("form.options.medium")}
                            </option>
                            <option value="high">
                              {t("form.options.high")}
                            </option>
                          </select>
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <svg
                              className="w-5 h-5 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="p-8 space-y-6"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("form.emergencyContact.title")}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    {t("form.emergencyContact.description")}
                  </p>
                  <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-600"
                      initial={{ width: "33%" }}
                      animate={{ width: "66%" }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                        {t("form.emergencyContact.nameLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "form.emergencyContact.namePlaceholder"
                          )}
                          {...field}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                        {t("form.emergencyContact.phoneLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "form.emergencyContact.phonePlaceholder"
                          )}
                          {...field}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="p-8 space-y-6"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("form.additionalInfo.title")}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    {t("form.additionalInfo.description")}
                  </p>
                  <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary-600"
                      initial={{ width: "66%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="frequentRoutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                        {t("form.additionalInfo.routesLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "form.additionalInfo.routesPlaceholder"
                          )}
                          {...field}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referralCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 font-medium">
                        {t("form.additionalInfo.referralLabel")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            "form.additionalInfo.referralPlaceholder"
                          )}
                          {...field}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 dark:text-red-400 text-sm mt-1" />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Buttons */}
          <div className="p-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="px-6 py-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                >
                  {t("form.buttons.back")}
                </Button>
              ) : (
                <div></div>
              )}

              {step < 2 ? (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={nextStep}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                >
                  {t("form.buttons.next")}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={form.handleSubmit(onSubmit)}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                >
                  {isPending ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    t("form.buttons.submit")
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default UserPreferencesForm;
