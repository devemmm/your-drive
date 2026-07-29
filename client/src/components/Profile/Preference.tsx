import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import ThemeToggle from "../ThemeToggle";
import { Checkbox } from "../ui/checkbox";

export const DisplayPreference = ({
  t,
  setEditPreferences,
  userPreference,
  theme,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("profile.appPreferences.title")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
            onClick={() => setEditPreferences(true)}
          >
            {t("common.edit")}
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.appPreferences.language")}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {userPreference?.common?.language === "EN"
                  ? t("profile.languages.en")
                  : t("profile.languages.fr")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.appPreferences.theme")}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {t(`profile.theme.${theme}`)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.onboarding.2FA")}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {userPreference?.common?.twoFactorEnabled
                  ? t("common.enabled")
                  : t("common.disabled")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.onboarding.notificationPreference")}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {t(
                  `profile.onboarding.notificationOptions.${userPreference?.common?.notificationPref}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditPreference = ({
  t,
  preference,
  setPreference,
  setEditPreferences,
  mutatePreference,
  isPendingPreference,
  languages,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {t("profile.appPreferences.title")}
        </h2>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Language Selector */}
          <div className="space-y-3">
            <Label
              htmlFor="language"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              {t("profile.appPreferences.language")}
            </Label>
            <Select
              value={preference?.language}
              onValueChange={(value) =>
                setPreference({
                  ...preference,
                  language: value,
                })
              }
            >
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue
                  placeholder={t("profile.appPreferences.selectLanguage")}
                />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                {languages.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="text-slate-900 dark:text-white"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme Toggle */}
          <div className="space-y-3">
            <Label
              htmlFor="theme"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              {t("profile.appPreferences.theme")}
            </Label>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <ThemeToggle />
            </div>
          </div>

          {/* 2FA Checkbox */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("profile.onboarding.2FA")}
            </Label>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="twoFactor"
                  checked={preference.twoFactorEnabled}
                  onCheckedChange={(checked) =>
                    setPreference({
                      ...preference,
                      twoFactorEnabled: !!checked,
                    })
                  }
                />
                <label
                  htmlFor="twoFactor"
                  className="text-sm font-medium leading-none text-slate-700 dark:text-slate-300"
                >
                  {t("profile.onboarding.2FA")}
                </label>
              </div>
            </div>
          </div>

          {/* Notification Preference */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("profile.onboarding.notificationPreference")}
            </Label>
            <Select
              value={preference.notificationPref.toLowerCase()}
              onValueChange={(value) =>
                setPreference({
                  ...preference,
                  notificationPref: value,
                })
              }
            >
              <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectValue
                  placeholder={t("profile.onboarding.selectNotification")}
                />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                <SelectItem
                  value="email"
                  className="text-slate-900 dark:text-white"
                >
                  {t("profile.onboarding.emailNotify")}
                </SelectItem>
                <SelectItem
                  value="sms"
                  className="text-slate-900 dark:text-white"
                >
                  {t("profile.onboarding.smsNotify")}
                </SelectItem>
                <SelectItem
                  value="in_app"
                  className="text-slate-900 dark:text-white"
                >
                  {t("profile.onboarding.NoNotification")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setEditPreferences(false)}
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
          >
            {t("common_.cancel")}
          </Button>
          <Button
            onClick={() => {
              mutatePreference({
                language: preference.language,
                theme: preference.theme,
                notificationPref: preference.notificationPref,
                twoFactorEnabled: preference.twoFactorEnabled,
              });
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
          >
            {isPendingPreference
              ? t("common_.saving")
              : t("common_.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
};
