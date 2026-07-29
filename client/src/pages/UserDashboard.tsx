import BookingRequest from "@/components/BookingRequest";
// import Bookings from "@/components/Bookings";
import RideRequests from "@/components/RideRequests";
import CreateCar from "@/components/Car/CreateCar";
import CardManagement from "@/components/CardManagement";
import { DashboardHeader } from "@/components/Dashboard/Header";
import { NavigationTabs } from "@/components/Dashboard/NavigationTabs";
import DriverRides from "@/components/DriverRides";
import Transactions from "@/components/Transactions";
import { InviteFriends } from "@/components/sections/InviteFriends";
import RideGroupChat from "@/pages/RideGroupChat";
import { Button } from "@/components/ui/button";
import { useAllVehicles, useUserPreference } from "@/data";
import DriverDoorToDoor from "@/components/DoorToDoor/DriverDoorToDoor";
import PassengerDoorToDoorDashboard from "@/components/DoorToDoor/PassengerDoorToDoorDashboard";
import {
  Check,
  DollarSign,
  Eye,
  TrendingUp,
  Wallet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/providers/Context/UseAuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { getToken } from "@/components/getToken";
import { apiUrl, queryKey } from "@/data";
import PassengerSubmittedReviews from "@/components/PassengerSubmittedReviews";

const DashboardPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("redirect_to") ?? "requests";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [active, setActive] = useState("vosTrajets"); // default state

  const { data: vehiclesData, isLoading: isLoadingVehicle } = useAllVehicles();
  const { user } = useAuth();
  const { data: userPreference, refetch: refetchUserPreference } =
    useUserPreference();
  const queryClient = useQueryClient();

  const { t } = useTranslation();
  const navigate = useNavigate();

  // Account completion status - use userPreference for real-time data
  const accountStatus = {
    stripe: userPreference?.driver?.isStripeOnboarded || false,
    driver:
      userPreference?.driver?.isDriverOnboarded ||
      (user as any)?.isDriverOnboarded ||
      false,
    passenger:
      userPreference?.passenger?.isPassengerOnboarded ||
      user?.isPassengerOnboarded ||
      false,
  };

  const allComplete =
    accountStatus.stripe && accountStatus.driver && accountStatus.passenger;

  // Stripe onboarding link generation
  const { mutate: generateStripeLink, isPending: isGeneratingStripeLink } =
    useMutation({
      mutationFn: async () => {
        const response = await axios.get(
          `${apiUrl}/api/v1/stripe/connect?platform=web&redirect_pathname=/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
        return response.data.data;
      },
      onSuccess: (data) => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Invalid response format");
        }
      },
      onError: (error: any) => {
        const message = error?.response?.data?.message;
        // If user is already onboarded, refresh the user preference data
        if (
          message?.includes("already connected") ||
          message?.includes("déjà connecté")
        ) {
          // Invalidate and refetch user preference to get updated status
          queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
          refetchUserPreference();
          toast.success(
            t("DriverDashboard.dashboard.accountStatus.stripe") +
              " " +
              t(
                "DriverDashboard.dashboard.accountStatus.completed",
                "Completed"
              ),
            {
              className: "custom-success-toast",
            }
          );
          return;
        }
        toast.error(
          message ||
            t(
              "common_.stripeNotAvailableDescription",
              "Failed to generate Stripe connection link"
            ),
          {
            className: "custom-error-toast",
          }
        );
        console.error("Stripe link generation error:", error);
      },
    });

  return (
    <div className="container mx-auto py-8 px-2 bg-white dark:bg-white relative min-h-[calc(100vh-5rem)]">
      <div className="flex">
        {/* Navigation Tabs on the left - now positioned relative to container */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
            isCollapsed ? "w-20" : "w-64"
          }`}
        >
          <NavigationTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isCollapsed={isCollapsed}
            setIsCollapsed={setIsCollapsed}
          />
        </div>

        <div
          className={`flex-1 transition-all duration-300 ease-in-out overflow-x-auto ${
            isCollapsed ? "ml-0" : "ml-0"
          } pl-4 md:pl-8`}
        >
          <DashboardHeader activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Account Status Alert - Only show if not all complete */}
          {!allComplete && (
            <div className="mb-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-400 p-4 rounded-r-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                        {t("DriverDashboard.dashboard.accountStatus.title")}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {t(
                          "DriverDashboard.dashboard.accountStatus.incomplete"
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
                      {t("DriverDashboard.dashboard.accountStatus.description")}
                    </p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {!accountStatus.stripe && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {t(
                              "DriverDashboard.dashboard.accountStatus.stripe"
                            )}
                            :{" "}
                            {t(
                              "DriverDashboard.dashboard.accountStatus.pending"
                            )}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateStripeLink()}
                            disabled={isGeneratingStripeLink}
                            className="h-7 text-xs bg-primary hover:bg-primary/90 text-white border-primary"
                          >
                            {isGeneratingStripeLink ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                {t("common_.small.settingUp", "Setting up...")}
                              </>
                            ) : (
                              t("common_.small.setup", "Complete Setup")
                            )}
                          </Button>
                        </div>
                      )}
                      {!accountStatus.driver && (
                        <Badge variant="destructive" className="text-xs">
                          {t("DriverDashboard.dashboard.accountStatus.driver")}:{" "}
                          {t("DriverDashboard.dashboard.accountStatus.pending")}
                        </Badge>
                      )}
                      {!accountStatus.passenger && (
                        <Badge variant="destructive" className="text-xs">
                          {t(
                            "DriverDashboard.dashboard.accountStatus.passenger"
                          )}
                          :{" "}
                          {t("DriverDashboard.dashboard.accountStatus.pending")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="">
            {/* Ride Requests - New API */}
            {activeTab === "requests" && <RideRequests />}

            {/* Your rides */}
            {activeTab === "rides" && <DriverRides />}

            {activeTab === "door_to_door" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActive("vosTrajets")}
                    className={`px-4 py-2 rounded ${
                      active === "vosTrajets"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {t("DoorToDoor.dashboard.driver.vos")}
                  </button>
                  <button
                    onClick={() => setActive("mesDemandes")}
                    className={`px-4 py-2 rounded ${
                      active === "mesDemandes"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {t("DoorToDoor.dashboard.driver.mesDemandes")}
                  </button>

                  {/* Optional: show which one is active */}
                  <div className="ml-4 text-sm text-gray-600 dark:text-gray-300">
                    {active === "mesDemandes"
                      ? t("DoorToDoor.dashboard.driver.mesDemandes")
                      : t("DoorToDoor.dashboard.driver.vos")}
                  </div>
                </div>
                {active === "vosTrajets" && <DriverDoorToDoor />}
                {active === "mesDemandes" && <PassengerDoorToDoorDashboard />}
              </div>
            )}

            {/* Chat */}
            {activeTab === "chat" && <RideGroupChat />}

            {/* Bookings */}
            {activeTab === "bookings" && <BookingRequest />}
            {/* {activeTab === "bookings" && <Bookings />} */}

            {activeTab === "my_cards" && <CardManagement />}

            {/* vehicles */}
            {activeTab === "vehicles" && (
              <div className="min-h-48 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                    {t("DriverDashboard.vehicles.title")}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {t("DriverDashboard.vehicles.description")}
                  </p>
                </div>
                <div className="p-0">
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {vehiclesData?.map((vehicle: any) => (
                      <div
                        key={vehicle.id}
                        className="p-4 sm:p-6 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() =>
                          navigate(`/vehicle?vehicleId=${vehicle.id}`)
                        }
                      >
                        {/* Vehicle Image - Sharp corners */}
                        <div className="shrink-0">
                          <img
                            src={
                              (vehicle as any).defaultImage?.url ||
                              vehicle.files?.[0]?.url ||
                              "/placeholder.png"
                            }
                            alt={`${vehicle.make} ${vehicle.model}`}
                            className="w-16 h-16 object-cover border border-slate-200 dark:border-slate-600"
                          />
                        </div>

                        {/* Vehicle Details */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </div>

                          <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {vehicle.color} • {vehicle.plateNumber}
                          </div>

                          {vehicle.verified && (
                            <div className="flex items-center mt-2">
                              <Check
                                size={14}
                                className="text-green-500 mr-1"
                              />
                              <span className="text-xs text-green-600 dark:text-green-400">
                                {t("DriverDashboard.vehicles.verified")}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700">
                    <CreateCar uploadImages={false} vehicleId="" />
                  </div>
                </div>
              </div>
            )}

            {/* Earnings Card - Enhanced */}
            {activeTab === "amountGenerated" && (
              <div className="w-full md:w-[600px] mx-auto mt-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="text-primary-600 dark:text-primary-400" />
                    <span>{t("DriverDashboard.earnings.title")}</span>
                  </h3>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Balance */}
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">
                          {t("DriverDashboard.earnings.balance")}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {t("DriverDashboard.earnings.availableNow")}
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                        $69.00
                      </span>
                    </div>

                    {/* Month Earnings */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">
                        {t("DriverDashboard.earnings.month")}
                      </span>
                      <div className="flex items-center text-primary-600 dark:text-primary-400">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        <span className="font-medium">$45.00</span>
                      </div>
                    </div>

                    {/* Total Earnings */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">
                        {t("DriverDashboard.earnings.total")}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        $127.00
                      </span>
                    </div>

                    {/* Withdraw Button */}
                    <Button
                      className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white py-3 transition-colors duration-200 flex items-center justify-center gap-2"
                      variant="default"
                    >
                      <Wallet className="h-4 w-4" />
                      {t("DriverDashboard.earnings.withdraw")}
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700">
                  {t("DriverDashboard.earnings.nextPayout")} June 15
                </div>
              </div>
            )}

            {activeTab === "transactions" && <Transactions />}

            {activeTab === "invite_friends" && <InviteFriends />}

            {activeTab === "passenger_submitted_reviews" && (
              <PassengerSubmittedReviews />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
