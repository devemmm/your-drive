import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const DisplayBasics = ({ t, setEditBasicInfo, userData }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("profile.basicInformation.title")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
            onClick={() => setEditBasicInfo(true)}
          >
            {t("common.edit")}
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.basicInformation.firstName")}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {userData.firstName}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.basicInformation.lastName")}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {userData.lastName}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.basicInformation.email")}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {userData.email}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t("profile.basicInformation.phone")}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {userData.phoneNumber ||
                  t("profile.basicInformation.notProvided")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditBasics = ({
  t,
  basicInfo,
  handleBasicChange,
  userData,
  setEditBasicInfo,
  mutateBasic,
  isPendingBasic,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {t("profile.basicInformation.title")}
        </h2>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <Label
              htmlFor="firstName"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              {t("profile.basicInformation.firstName")}
            </Label>
            <Input
              id="firstName"
              name="firstName"
              value={basicInfo.firstName}
              onChange={handleBasicChange}
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="space-y-3">
            <Label
              htmlFor="lastName"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              {t("profile.basicInformation.lastName")}
            </Label>
            <Input
              id="lastName"
              name="lastName"
              value={basicInfo.lastName}
              onChange={handleBasicChange}
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="space-y-3">
            <Label
              htmlFor="email"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              {t("profile.basicInformation.email")}
            </Label>
            <Input
              id="email"
              name="email"
              value={userData.email}
              disabled
              className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
            />
          </div>

          <div className="space-y-3">
            <Label
              htmlFor="phone"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              {t("profile.basicInformation.phoneNumber")}
            </Label>
            <Input
              id="phone"
              name="phoneNumber"
              value={basicInfo.phoneNumber}
              onChange={handleBasicChange}
              placeholder={t("form.emergencyContact.phonePlaceholder")}
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setEditBasicInfo(false)}
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
          >
            {t("common_.cancel")}
          </Button>
          <Button
            onClick={() => {
              mutateBasic({
                firstName: basicInfo.firstName,
                lastName: basicInfo.lastName,
                phoneNumber: basicInfo.phoneNumber,
              });
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
          >
            {isPendingBasic ? t("common_.saving") : t("common_.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
};
