// components/Dashboard/Header.tsx
import { useAuth } from "@/providers/Context/UseAuthContext";
import { Globe, Mail, Palette, User, ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";

export const DashboardHeader = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="overflow-visible">
      <div className="mb-8 bg-white dark:bg-slate-900 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          {/* User Profile Section */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {(user as any).profileImage?.url && (
              <div className="relative">
                <img
                  src={(user as any).profileImage.url}
                  alt={user?.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-cover border-2 border-primary-600 dark:border-primary-400"
                />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white truncate">
                {t("Dashboard.welcomeTitle", { name: user.name ?? user.email })}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1">
                {t(`Dashboard.subtitle.driver`)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Link to="/post-a-ride">
              <Button className="flex items-center bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white dark:text-white">
                <Plus size={16} className="mr-2" />
                {t("DriverDashboard.postRide.button")}
              </Button>
            </Link>

            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <User className="h-4 w-4" />
              {t("Dashboard.profile")}
              <ChevronRight className="h-4 w-4 opacity-70" />
            </Link>
          </div>
        </div>

        {/* User Info Grid */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Info */}
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/20">
                <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("profile.basicInformation.email")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Language Info */}
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/20">
                <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("profile.appPreferences.language")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t(`Languages.${user?.language}`)}
                </p>
              </div>
            </div>

            {/* Theme Info */}
            <div className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/20">
                <Palette className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("profile.appPreferences.theme")}
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t(`Themes.${user?.theme}`)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
