import {
  Car,
  CarFront,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  MessageCircle,
  DollarSign,
  UserPlus,
  Route,
  UserCheck,
} from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export const NavigationTabs = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
}) => {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect_to") ?? "requests";
  const type = searchParams.get("t");
  const [activeRideId, setActiveRideId] = useState(redirectTo);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 868);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const new_request = params.get("new_request");

  useEffect(() => {
    if (type) {
      navigate(`/dashboard?redirect_to=${activeRideId}?t=${type}`);
    } else if (new_request) {
      navigate(
        `/dashboard?redirect_to=${activeRideId}&new_request=${new_request}`
      );
    } else {
      navigate(`/dashboard?redirect_to=${activeRideId}`);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 868);
      // Auto-collapse on mobile if not already collapsed
      if (window.innerWidth < 868 && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed]);

  const tabs = [
    {
      id: "requests",
      label: t("DriverDashboard.buttons.requests"),
      icon: <ClipboardList size={20} />,
    },
    {
      id: "rides",
      label: t("DriverDashboard.buttons.rides"),
      icon: <CarFront size={20} />,
    },
    {
      id: "door_to_door",
      label: t("DriverDashboard.buttons.doorToDoor", "Door-to-Door"),
      icon: <Route size={20} />,
    },
    {
      id: "vehicles",
      label: t("DriverDashboard.buttons.vehicles"),
      icon: <Car size={20} />,
    },
    {
      id: "chat",
      label: t("DriverDashboard.buttons.chat", "Messages"),
      icon: <MessageCircle size={20} />,
    },
    {
      id: "transactions",
      label: t("DriverDashboard.buttons.transactions"),
      icon: <FileText size={20} />,
    },
    {
      id: "bookings",
      label: t("DriverDashboard.buttons.bookings.label"),
      icon: <CarFront size={20} />,
    },
    {
      id: "my_cards",
      label: t("DriverDashboard.buttons.cards"),
      icon: <ClipboardList size={20} />,
    },
    {
      id: "invite_friends",
      label: t("DriverDashboard.buttons.inviteFriends", "Invite Friends"),
      icon: <UserPlus size={20} />,
    },
    {
      id: "passenger_submitted_reviews",
      label: t("myReviews.passengerSubmittedReviews", "My submitted reviews"),
      icon: <UserCheck size={20} />,
    },
  ];

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`sticky top-20 h-[calc(100vh-5rem)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto transition-all duration-300 ease-in-out no-scrollbar ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="p-4 h-full flex flex-col">
        {/* Header with collapse button */}
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          } mb-6`}
        >
          {!isCollapsed && (
            <h2 className="text-md font-semibold text-slate-900 dark:text-white text-nowrap">
              {t("DriverDashboard.dashboard.title")}
            </h2>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapse}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight size={20} />
                ) : (
                  <ChevronLeft size={20} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isCollapsed ? "Expand" : "Collapse"}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation tabs - scrollable area */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-1">
            {tabs.map(({ id, label, icon }) => (
              <Tooltip key={id} disableHoverableContent>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      navigate(`/dashboard?redirect_to=${id}`);
                      setActiveRideId(id);
                      setActiveTab(id);
                      setIsCollapsed(true);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center transition-colors relative ${
                      activeRideId === id
                        ? "bg-primary-600 dark:bg-primary-700 text-white"
                        : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="flex items-center">
                      {icon}
                      {!isCollapsed && (
                        <span className="ml-3 whitespace-nowrap">{label}</span>
                      )}
                    </span>
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <Badge>{label}</Badge>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
