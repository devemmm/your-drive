import {
  Info,
  Shield,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Menu,
  Eye,
  Trash2,
  Car,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ProfileNav = ({ setActiveSection, activeSection }) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const profileTabs = [
    {
      id: "preferences",
      label: t("profile.tabs.preferences"),
      icon: <UserCog size={20} />,
    },
    {
      id: "basicInfo",
      label: t("profile.tabs.basicInfo"),
      icon: <Info size={20} />,
    },
    {
      id: "security",
      label: t("profile.tabs.security"),
      icon: <Shield size={20} />,
    },
    {
      id: "viewPreferences",
      label: t("profile.tabs.viewPreferences"),
      icon: <Eye size={20} />,
    },
    {
      id: "chauffeur",
      label: t("chauffeur.settings.title"),
      icon: <Car size={20} />,
    },
    {
      id: "deleteAccount",
      label: t("profile.tabs.deleteAccount"),
      icon: <Trash2 size={20} />,
    },
  ];

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !isCollapsed) setIsCollapsed(true);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div
      className={`sticky top-24 h-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out shadow-xl ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex flex-col">
        {/* Header Section */}
        <div className="relative bg-primary-600 dark:bg-primary-700 p-4">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />

          <div
            className={`relative flex items-center ${
              isCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!isCollapsed && (
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t("profile.tabs.title", "Profile")}
              </h2>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleCollapse}
                  className="p-2 hover:bg-white/10 text-white transition-all"
                  aria-label={
                    isCollapsed ? "Expand sidebar" : "Collapse sidebar"
                  }
                >
                  {isCollapsed ? (
                    <ChevronRight size={20} />
                  ) : (
                    <ChevronLeft size={20} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>{isCollapsed ? "Expand" : "Collapse"}</span>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-2">
          {profileTabs.map(({ id, label, icon }) => {
            const isActive = activeSection === id;

            return (
              <Tooltip key={id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setActiveSection(id);
                      if (isMobile) setIsCollapsed(true);
                    }}
                    className={`group relative w-full overflow-hidden transition-all duration-300 ${
                      isCollapsed ? "h-14" : "h-14"
                    } ${
                      isActive
                        ? "shadow-lg scale-105"
                        : "hover:scale-102 hover:shadow-md"
                    }`}
                  >
                    {/* Background */}
                    <div
                      className={`absolute inset-0 ${
                        isActive
                          ? "bg-primary-600 dark:bg-primary-700"
                          : "bg-transparent group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                      } transition-colors duration-300`}
                    />

                    {/* Active Indicator Bar */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
                    )}

                    {/* Content */}
                    <div
                      className={`relative flex items-center h-full ${
                        isCollapsed ? "justify-center px-2" : "px-4 gap-4"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center ${
                          isActive
                            ? "text-white"
                            : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                        } transition-colors`}
                      >
                        {icon}
                      </div>

                      {!isCollapsed && (
                        <span
                          className={`font-semibold text-sm transition-colors ${
                            isActive
                              ? "text-white"
                              : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                          }`}
                        >
                          {label}
                        </span>
                      )}
                    </div>

                    {/* Border */}
                    <div
                      className={`absolute inset-0 border ${
                        isActive
                          ? "border-transparent"
                          : "border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600"
                      }`}
                    />
                  </button>
                </TooltipTrigger>

                {isCollapsed && (
                  <TooltipContent
                    side="right"
                    className="border-slate-200 dark:border-slate-700"
                  >
                    <span className="font-medium">{label}</span>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        {/* Footer Section */}
        <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"></div>
      </div>
    </div>
  );
};

export default ProfileNav;
