import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  FileText,
  BarChart3,
  Users,
  CreditCard,
  Truck,
  Settings,
  MessageSquare,
  MapPin,
  Percent,
  ClipboardList,
  CarFront,
  UserCheck,
  Wallet,
  Bus,
  Route,
  Settings2,
  Flag,
  ShieldCheck,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { useRides } from "@/hooks/useRides";
import { useFeeSettings } from "@/hooks/useFeeSettings";
import { DashboardTab } from "./tabs/DashboardTab";
import { UsersTab } from "./tabs/UsersTab";
import { RidesTab } from "./tabs/RidesTab";
import { VehiclesTab } from "./tabs/VehiclesTab";
import { FeeSettingsTab } from "./tabs/FeeSettingsTab";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CouponRedemptionRulesTab } from "./tabs/CouponRedemptionRulesTab";
import { TransactionsTab } from "./tabs/TransactionsTab";
import { BookingsTab } from "./tabs/BookingsTab";
import { LogsTab } from "./tabs/LogsTab";
import { NoShowsTab } from "./tabs/NoShowsTab";
import { ContactMessagesTab } from "./tabs/ContactMessagesTab";
import { RideRequestsTab } from "./tabs/RideRequestsTab";
import {
  useAllTransactions,
  useAllUsersForStats,
  useAllRidesForStats,
  useAllBookingsForStats,
  useAllVehiclesForStats,
  useNoShowsStats,
} from "@/data";
import { useVehicles } from "@/hooks/useVehicles";
import {
  useAdminUsers,
  useActivateUser,
  useDeactivateUser,
  useSuspendUser,
  useDeleteAdminUser,
} from "@/hooks/useAdminUserManagement";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { D2DSettingsTab } from "./tabs/D2DSettingsTab";
import { CommissionSettingsTab } from "./tabs/CommissionSettingsTab";
import { RentalsTab } from "./tabs/RentalsTab";
import { ChauffeurTab } from "./tabs/ChauffeurTab";
import { DriverWalletsTab } from "./tabs/DriverWalletsTab";
import { BusOperatorsTab } from "./tabs/BusOperatorsTab";
import { BusRoutesTab } from "./tabs/BusRoutesTab";
import { WalletSettingsTab } from "./tabs/WalletSettingsTab";
import { ReportsTab } from "./tabs/ReportsTab";
import { KycReviewTab } from "./tabs/KycReviewTab";
import { PricingSettingsTab } from "./tabs/PricingSettingsTab";

const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "users"
    | "bookings"
    | "rides"
    | "rideRequests"
    | "sub"
    | "transactions"
    | "vehicles"
    | "feeSettings"
    | "couponRules"
    | "logs"
    | "noShows"
    | "contactMessages"
    | "d2dSettings"
    | "commissionSettings"
    | "rentals"
    | "chauffeurServices"
    | "driverWallets"
    | "busOperators"
    | "busRoutes"
    | "walletSettings"
    | "reports"
    | "kyc"
    | "pricing"
  >("dashboard");

  // Search and filter states
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [rideSearchTerm, setRideSearchTerm] = useState("");

  const [feeSettingsSearchTerm, setFeeSettingsSearchTerm] = useState("");
  const [userRole, setUserRole] = useState<"ADMIN" | "USER" | "all">(
    "all"
  );
  const [userStatus, setUserStatus] = useState<
    "ACTIVE" | "INACTIVE" | "SUSPENDED" | "all"
  >("all");

  const [rideStatus, setRideStatus] = useState<
    "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED" | "all"
  >("all");

  const [rideType, setRideType] = useState<"D2D" | "P2P" | "all">("all");

  const [feeSettingsType, setFeeSettingsType] = useState<
    "POSTING" | "BOOKING" | "all"
  >("all");

  const [feeSettingsStatus, setFeeSettingsStatus] = useState<
    "active" | "inactive" | "all"
  >("all");

  const [transactionStatus, setTransactionStatus] = useState<
    "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "ONHOLD" | "REFUNDED" | "PARTIALLY_REFUNDED" | "all"
  >("all");

  // Pagination states for each tab
  const [userPage, setUserPage] = useState(1);
  const [vehiclePage, setVehiclePage] = useState(1);
  const [ridePage, setRidePage] = useState(1);
  const [transactionPage, setTransactionPage] = useState(1);
  const [contactMessagesPage, setContactMessagesPage] = useState(1);
  const [rideRequestsPage, setRideRequestsPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  
  // Year selector for dashboard charts
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Create page size change handlers that reset the respective tab's page to 1
  const handleUserPageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setUserPage(1);
  };

  const handleVehiclePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setVehiclePage(1);
  };

  const handleRidePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setRidePage(1);
  };

  const handleTransactionPageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setTransactionPage(1);
  };

  // Create a conditional page change handler for transactions
  const handleTransactionPageChange = (page: number) => {
    setTransactionPage(page);
  };

  const handleContactMessagesPageChange = (page: number) => {
    setContactMessagesPage(page);
  };

  const handleContactMessagesPageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setContactMessagesPage(1);
  };

  const handleRideRequestsPageChange = (newPage: number) => {
    setRideRequestsPage(newPage);
  };

  const handleRideRequestsPageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setRideRequestsPage(1);
  };

  const { t } = useTranslation();

  const { user } = useAuth();
  
  // Admin user action hooks
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const suspendUser = useSuspendUser();
  const deleteAdminUser = useDeleteAdminUser();

  // Add useRides hook with basic pagination only
  const {
    rides: allRides,
    pagination: ridesPagination,
    loading: ridesLoading,
    error: ridesError,
    refetch: refetchRides,
  } = useRides({
    page: ridePage,
    pageSize,
    status: rideStatus === "all" ? undefined : rideStatus,
    type: rideType === "all" ? undefined : rideType,
    sortBy: "createdAt",
    order: "desc",
  });

  // Separate query for recent rides (most recent 10, regardless of filters)
  const {
    rides: allRecentRides,
    loading: recentRidesLoading,
    error: recentRidesError,
  } = useRides({
    page: 1,
    pageSize: 50, // Fetch more to ensure we get the latest ones
    sortBy: "createdAt",
    order: "desc",
  });

  // Sort client-side to ensure latest first, then take top 10
  const recentRides = useMemo(() => {
    if (!allRecentRides || allRecentRides.length === 0) return [];
    
    // Sort by createdAt descending (most recent first)
    const sorted = [...allRecentRides].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order
    });
    
    return sorted.slice(0, 10); // Take top 10
  }, [allRecentRides]);

  // Use admin users hook with server-side filtering
  const {
    data: adminUsersData,
    isLoading: usersLoading,
    error: usersError,
  } = useAdminUsers({
    page: userPage,
    limit: pageSize,
    roles: userRole !== "all" ? [userRole] : undefined,
    status: userStatus !== "all" ? [userStatus] : undefined,
    search: userSearchTerm || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const allUsers = adminUsersData?.users || [];
  const pagination = adminUsersData
    ? {
        page: adminUsersData.page,
        pageSize: adminUsersData.limit,
        total: adminUsersData.total,
        totalPages: adminUsersData.totalPages,
      }
    : { page: 1, pageSize: 10, total: 0, totalPages: 1 };

  // Add useVehicles hook with basic pagination only
  const {
    vehicles: allVehicles,
    pagination: vehiclesPagination,
    loading: vehiclesLoading,
    error: vehiclesError,
    refetch: refetchVehicles,
  } = useVehicles({
    page: vehiclePage,
    pageSize,
    sortBy: "createdAt",
    order: "desc",
  });

  // Add statistics hooks for dashboard with year filtering
  const startDate = new Date(selectedYear, 0, 1); // January 1st of selected year
  const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999); // December 31st of selected year
  
  const { data: statsUsersData, isLoading: statsUsersLoading } =
    useAllUsersForStats(selectedYear);
  const { data: statsRidesData, isLoading: statsRidesLoading } =
    useAllRidesForStats(selectedYear);
  const { data: statsTransactionsData, isLoading: statsTransactionsLoading } =
    useAllTransactions({
      startDate,
      endDate,
      pageSize: 1000, // Fetch more transactions for stats
    });
  const { data: statsBookingsData, isLoading: statsBookingsLoading } =
    useAllBookingsForStats(selectedYear);
  const { data: statsVehiclesData, isLoading: statsVehiclesLoading } =
    useAllVehiclesForStats(selectedYear);
  const { data: noShowsStatsData, isLoading: noShowsStatsLoading } =
    useNoShowsStats();
  // Add useFeeSettings hook
  const {
    feeSettings: allFeeSettings,
    isLoading: feeSettingsLoading,
    error: feeSettingsError,
    refetch: refetchFeeSettings,
    createFeeSetting,
    updateFeeSetting,
    deleteFeeSetting,
    isCreating: isCreatingFeeSetting,
    isUpdating: isUpdatingFeeSetting,
    isDeleting: isDeletingFeeSetting,
  } = useFeeSettings();

  // Add useCommissionSettings hook
  const {
    commissionSettings,
    isLoading: commissionSettingsLoading,
    error: commissionSettingsError,
    updateCommissionSettings,
    isUpdating: isUpdatingCommissionSettings,
  } = useCommissionSettings();

  // Server-side filtering is now handled by useAdminUsers hook
  // No need for client-side filtering
  const filteredUsers = allUsers;

  // Client-side filtering for vehicles
  const filteredVehicles =
    allVehicles?.filter((vehicle) => {
      const matchesSearch =
        !vehicleSearchTerm ||
        (vehicle.make &&
          vehicle.make
            .toLowerCase()
            .includes(vehicleSearchTerm.toLowerCase())) ||
        (vehicle.model &&
          vehicle.model
            .toLowerCase()
            .includes(vehicleSearchTerm.toLowerCase())) ||
        (vehicle.plateNumber &&
          vehicle.plateNumber
            .toLowerCase()
            .includes(vehicleSearchTerm.toLowerCase())) ||
        (vehicle.user?.name &&
          vehicle.user.name
            .toLowerCase()
            .includes(vehicleSearchTerm.toLowerCase()));

      return matchesSearch;
    }) || [];

  // Client-side filtering for rides (only for search, type is handled server-side)
  const filteredRides =
    allRides
      ?.filter((ride) => {
        const isD2D = ride.type === "D2D" || ride.isDoorToDoor;
        const departureLocation = isD2D
          ? ride.driverStartLocation
          : ride.departureLocation;
        const destinationLocation = isD2D
          ? ride.driverStopLocation
          : ride.destinationLocation;

        const matchesSearch =
          !rideSearchTerm ||
          (ride.driver?.name &&
            ride.driver.name
              .toLowerCase()
              .includes(rideSearchTerm.toLowerCase())) ||
          (departureLocation?.city &&
            departureLocation.city
              .toLowerCase()
              .includes(rideSearchTerm.toLowerCase())) ||
          (destinationLocation?.city &&
            destinationLocation.city
              .toLowerCase()
              .includes(rideSearchTerm.toLowerCase())) ||
          (departureLocation?.region &&
            departureLocation.region
              .toLowerCase()
              .includes(rideSearchTerm.toLowerCase())) ||
          (destinationLocation?.region &&
            destinationLocation.region
              .toLowerCase()
              .includes(rideSearchTerm.toLowerCase()));

        return matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ) || [];

  // Client-side filtering for fee settings
  const filteredFeeSettings =
    allFeeSettings?.filter((feeSetting) => {
      const matchesSearch =
        !feeSettingsSearchTerm ||
        feeSetting.id.toString().includes(feeSettingsSearchTerm) ||
        feeSetting.type
          .toLowerCase()
          .includes(feeSettingsSearchTerm.toLowerCase()) ||
        feeSetting.amount.toString().includes(feeSettingsSearchTerm);

      const matchesType =
        feeSettingsType === "all" || feeSetting.type === feeSettingsType;
      const matchesStatus =
        feeSettingsStatus === "all" ||
        (feeSettingsStatus === "active" && feeSetting.active) ||
        (feeSettingsStatus === "inactive" && !feeSetting.active);

      return matchesSearch && matchesType && matchesStatus;
    }) || [];

  // Calculate user statistics from stats data
  const statsUsers = statsUsersData?.data || [];
  
  // Debug: Log the data structure to understand what we're getting
  if (statsUsers.length > 0 && process.env.NODE_ENV === 'development') {
    console.log('Sample user from stats:', statsUsers[0]);
    console.log('Total users fetched:', statsUsers.length);
    console.log('Pagination info:', statsUsersData?.pagination);
  }
  
  // Fix: Check roles array and handle both isActive and status fields
  // Normalize roles to uppercase for comparison
  const normalizeRole = (role: string) => {
    if (!role) return '';
    return role.toUpperCase();
  };
  
  const isUserActive = (user: any) => {
    // Check both status field and isActive field for compatibility
    if (user.status) {
      return user.status === "ACTIVE";
    }
    if (user.isActive !== undefined) {
      return user.isActive === true;
    }
    // If no status field, assume active by default for counting purposes
    return true;
  };
  
  // Get roles from user - handle multiple formats
  const getUserRoles = (user: any): string[] => {
    if (Array.isArray(user.roles)) {
      return user.roles.map(normalizeRole);
    }
    if (user.role) {
      return [normalizeRole(user.role)];
    }
    // Check if roles is a string that needs parsing
    if (typeof user.roles === 'string') {
      try {
        const parsed = JSON.parse(user.roles);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeRole);
        }
      } catch {
        // If not JSON, treat as comma-separated
        return user.roles.split(',').map((r: string) => normalizeRole(r.trim()));
      }
    }
    return [];
  };
  
  const activeDrivers = statsUsers.filter((user) => {
    const roles = getUserRoles(user);
    return roles.includes("DRIVER") && isUserActive(user);
  }).length;
  
  const activePassengers = statsUsers.filter((user) => {
    const roles = getUserRoles(user);
    return roles.includes("PASSENGER") && isUserActive(user);
  }).length;
  
  // Also calculate total users (all statuses) for display
  const totalUsers = statsUsersData?.pagination?.total || statsUsers.length;

  // Calculate simple statistics from stats data
  const statsRides = statsRidesData?.data || [];
  const statsBookings = statsBookingsData || [];
  const statsVehicles = statsVehiclesData?.data || [];
  // Simple counts from all pages
  const totalRides = statsRides.length;
  const totalVehicles = statsVehicles.length;
  const totalBookings = statsBookings.length;
  const completedRides = statsRides.filter(
    (ride) => ride.status === "COMPLETED"
  ).length;

  // Calculate total earnings from completed rides only
  const totalEarnings = statsRides.reduce((sum, ride) => {
    if (ride.status === "COMPLETED") {
      return sum + (ride.contribution || 0);
    }
    return sum;
  }, 0);

  // Add useTransactions hook with server-side filtering for supported parameters
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useAllTransactions({
    page: transactionPage,
    pageSize,
    status: transactionStatus === "all" ? undefined : transactionStatus,
  });

  // Extract transactions and pagination from the response
  const allTransactions = transactionsData?.data || [];
  const transactionsPagination = transactionsData?.pagination || {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  };

  const handleUserAction = async (
    userId: number,
    action: "view" | "suspend" | "activate" | "delete"
  ) => {
    try {
      if (action === "suspend") {
        // Suspend action is handled by UsersTab with dialog
        // This is just a placeholder - actual suspend is in UsersTab
        return;
      } else if (action === "activate") {
        await activateUser.mutateAsync(userId);
        toast({
          title: t("AdminDashboard.toast.user.activate.title", "User Activated"),
          description: t("AdminDashboard.toast.user.activate.description", "User has been activated successfully"),
        });
      } else if (action === "delete") {
        await deleteAdminUser.mutateAsync(userId);
        toast({
          title: t("AdminDashboard.toast.user.delete.title", "User Deleted"),
          description: t("AdminDashboard.toast.user.delete.description", "User has been deleted successfully"),
        });
      }

      // Refetch users after action
      // Query invalidation is handled by the hooks
    } catch (error: any) {
      console.error("Admin action error:", error);
      toast({
        title: t("common.error", "Error"),
        description: error?.response?.data?.message || error?.message || t("common.errorOccurred", "An error occurred"),
        variant: "destructive",
      });
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as typeof activeTab);
  };

  const tabs = [
    {
      id: "dashboard",
      icon: BarChart3,
      label: t("AdminDashboard.tabs.dashboard"),
    },
    { id: "users", icon: Users, label: t("AdminDashboard.tabs.users") },
    {
      id: "bookings",
      icon: FileText,
      label: t("AdminDashboard.tabs.bookings", "Bookings"),
    },
    { id: "vehicles", icon: Truck, label: t("AdminDashboard.tabs.vehicles") },
    { id: "rentals", icon: CarFront, label: t("AdminDashboard.tabs.rentals") },
    { id: "chauffeurServices", icon: UserCheck, label: t("AdminDashboard.tabs.chauffeurServices") },
    { id: "rides", icon: Car, label: t("AdminDashboard.tabs.rides") },
    {
      id: "rideRequests",
      icon: ClipboardList,
      label: t("AdminDashboard.tabs.rideRequests", "Ride Requests"),
    },
    {
      id: "transactions",
      icon: CreditCard,
      label: t("AdminDashboard.tabs.transactions"),
    },
    {
      id: "feeSettings",
      icon: Settings,
      label: t("AdminDashboard.tabs.feeSettings") || "Fee Settings",
    },
    {
      id: "couponRules",
      icon: Settings,
      label: t("AdminDashboard.tabs.couponRules") || "Coupon Rules",
    },
    {
      id: "logs",
      icon: FileText,
      label: t("AdminDashboard.tabs.logs", "Logs"),
    },
    {
      id: "noShows",
      icon: FileText,
      label: t("AdminDashboard.tabs.noShows", "No Shows"),
    },
    {
      id: "contactMessages",
      icon: MessageSquare,
      label: t("AdminDashboard.tabs.contactMessages", "Contact Messages"),
    },
    {
      id: "d2dSettings",
      icon: MapPin,
      label: t("AdminDashboard.tabs.d2dSettings", "Door-to-Door Settings"),
    },
    {
      id: "commissionSettings",
      icon: Percent,
      label: t("AdminDashboard.tabs.commissionSettings", "Commission Settings"),
    },
    {
      id: "driverWallets",
      icon: Wallet,
      label: t("AdminDashboard.tabs.driverWallets", "Driver Wallets"),
    },
    {
      id: "busOperators",
      icon: Bus,
      label: t("AdminDashboard.tabs.busOperators", "Bus Operators"),
    },
    {
      id: "busRoutes",
      icon: Route,
      label: t("AdminDashboard.tabs.busRoutes", "Bus Routes"),
    },
    {
      id: "walletSettings",
      icon: Settings2,
      label: t("AdminDashboard.tabs.walletSettings", "Wallet Settings"),
    },
    {
      id: "reports",
      icon: Flag,
      label: t("AdminDashboard.tabs.reports", "Reports"),
    },
    {
      id: "kyc",
      icon: ShieldCheck,
      label: t("AdminDashboard.tabs.kyc", "KYC Review"),
    },
    {
      id: "pricing",
      icon: DollarSign,
      label: t("AdminDashboard.tabs.pricing", "Pricing Settings"),
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-white text-foreground pt-16">
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-white border-r border-green-200 dark:border-green-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="h-16 border-b border-green-200 dark:border-green-200 flex items-center px-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("AdminDashboard.header.title", "Admin Panel")}
                </h1>
        </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {tabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
                    activeTab === id
                      ? "bg-green-50 dark:bg-green-50 text-green-900 dark:text-green-900 border-l-2 border-green-600"
                      : "text-gray-600 dark:text-gray-600 hover:bg-green-50 dark:hover:bg-green-50 hover:text-green-900 dark:hover:text-green-900"
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
            </nav>

          {/* Sidebar Footer */}
          <div className="h-16 border-t border-green-200 dark:border-green-200 flex items-center px-6">
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {user?.email || "Admin"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("AdminDashboard.header.role", "Administrator")}
                </p>
              </div>
            </div>
          </div>
          </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-white dark:bg-white border-b border-green-200 dark:border-green-200 flex items-center justify-between px-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {tabs.find(t => t.id === activeTab)?.label || "Dashboard"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t("AdminDashboard.header.subtitle", "Manage your platform")}
              </p>
            </div>
          </header>

          {/* Content Area */}
          <section className="flex-1 overflow-y-auto bg-white dark:bg-white">
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full h-full"
            >
                <TabsContent value="dashboard" className="mt-0 p-6 space-y-6">
                <DashboardTab
                  rides={recentRides || []}
                  ridesLoading={recentRidesLoading || statsRidesLoading}
                  ridesError={recentRidesError || ridesError}
                  completedRides={completedRides}
                  totalEarnings={totalEarnings}
                  serviceFeesCollected={0} // Service fees are no longer calculated here
                  activeDrivers={activeDrivers}
                  activePassengers={activePassengers}
                  totalUsers={totalUsers}
                  users={filteredUsers || []}
                  statsRides={statsRidesData?.data || []}
                  statsTransactions={statsTransactionsData?.data || []}
                  statsUsers={statsUsersData?.data || []}
                  totalRides={totalRides}
                  totalVehicles={totalVehicles}
                  totalBookings={totalBookings}
                  noShowsStats={noShowsStatsData?.data}
                  onTabChange={handleTabChange}
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                />
              </TabsContent>

              <TabsContent value="users" className="p-6 space-y-6">
                <UsersTab
                  users={filteredUsers || []}
                  pagination={pagination}
                  loading={usersLoading}
                  error={usersError}
                  searchTerm={userSearchTerm}
                  userRole={userRole}
                  userStatus={userStatus}
                  onSearchChange={setUserSearchTerm}
                  onRoleChange={setUserRole}
                  onStatusChange={setUserStatus}
                  onPageChange={setUserPage}
                  onUserAction={handleUserAction}
                  isUpdating={activateUser.isPending || deactivateUser.isPending || suspendUser.isPending}
                  isDeleting={deleteAdminUser.isPending}
                />
              </TabsContent>

              <TabsContent value="bookings" className="p-6 space-y-6">
                <BookingsTab />
              </TabsContent>

              <TabsContent value="vehicles" className="mt-0 p-6 space-y-6">
                <VehiclesTab
                  vehicles={filteredVehicles || []}
                  pagination={vehiclesPagination}
                  loading={vehiclesLoading}
                  error={vehiclesError}
                  searchTerm={vehicleSearchTerm}
                  onSearchChange={setVehicleSearchTerm}
                  onPageChange={setVehiclePage}
                  onPageSizeChange={handleVehiclePageSizeChange}
                  pageSizes={[10, 20, 50, 100]}
                />
              </TabsContent>

              <TabsContent value="rides" className="p-6 space-y-6">
                <RidesTab
                  rides={filteredRides || []}
                  pagination={ridesPagination}
                  loading={ridesLoading}
                  error={ridesError}
                  searchTerm={rideSearchTerm}
                  rideStatus={rideStatus}
                  rideType={rideType}
                  onSearchChange={setRideSearchTerm}
                  onStatusChange={setRideStatus}
                  onTypeChange={setRideType}
                  page={ridePage}
                  pageSize={pageSize}
                  onPageChange={setRidePage}
                  onPageSizeChange={handleRidePageSizeChange}
                  pageSizes={[10, 20, 50, 100]}
                />
              </TabsContent>

              <TabsContent value="transactions" className="mt-0 p-6 space-y-6">
                <TransactionsTab
                  transactions={allTransactions}
                  pagination={transactionsPagination}
                  loading={transactionsLoading}
                  error={transactionsError}
                  onPageChange={handleTransactionPageChange}
                  onPageSizeChange={handleTransactionPageSizeChange}
                  pageSizes={[10, 20, 50, 100]}
                  status={transactionStatus}
                  onStatusChange={setTransactionStatus}
                />
              </TabsContent>

              <TabsContent value="feeSettings" className="mt-0 p-6 space-y-6">
                <FeeSettingsTab
                  feeSettings={filteredFeeSettings}
                  loading={feeSettingsLoading}
                  error={feeSettingsError}
                  searchTerm={feeSettingsSearchTerm}
                  feeType={feeSettingsType}
                  feeStatus={feeSettingsStatus}
                  onSearchChange={setFeeSettingsSearchTerm}
                  onTypeChange={setFeeSettingsType}
                  onStatusChange={setFeeSettingsStatus}
                  onCreateFeeSetting={createFeeSetting}
                  onUpdateFeeSetting={updateFeeSetting}
                  onDeleteFeeSetting={deleteFeeSetting}
                  isCreating={isCreatingFeeSetting}
                  isUpdating={isUpdatingFeeSetting}
                  isDeleting={isDeletingFeeSetting}
                />
              </TabsContent>

              <TabsContent value="couponRules" className="mt-0 p-6 space-y-6">
                <CouponRedemptionRulesTab />
              </TabsContent>

              <TabsContent value="logs" className="mt-0 p-6 space-y-6">
                <LogsTab />
              </TabsContent>

              <TabsContent value="noShows" className="mt-0 p-6 space-y-6">
                <NoShowsTab />
              </TabsContent>

              <TabsContent value="contactMessages" className="mt-0 p-6 space-y-6">
                <ContactMessagesTab
                  page={contactMessagesPage}
                  pageSize={pageSize}
                  onPageChange={handleContactMessagesPageChange}
                  onPageSizeChange={handleContactMessagesPageSizeChange}
                  pageSizes={[10, 20, 50, 100]}
                />
              </TabsContent>

              <TabsContent value="d2dSettings" className="mt-0 p-6 space-y-6">
                <D2DSettingsTab />
              </TabsContent>

              <TabsContent value="commissionSettings" className="mt-0 p-6 space-y-6">
                <CommissionSettingsTab
                  commissionSettings={commissionSettings}
                  loading={commissionSettingsLoading}
                  error={commissionSettingsError}
                  onUpdate={updateCommissionSettings}
                  isUpdating={isUpdatingCommissionSettings}
                />
              </TabsContent>

              <TabsContent value="rideRequests" className="mt-0 p-6 space-y-6">
                <RideRequestsTab
                  page={rideRequestsPage}
                  pageSize={pageSize}
                  onPageChange={handleRideRequestsPageChange}
                  onPageSizeChange={handleRideRequestsPageSizeChange}
                  pageSizes={[10, 20, 50, 100]}
                />
              </TabsContent>

              <TabsContent value="rentals" className="p-6 space-y-6">
                <RentalsTab />
              </TabsContent>

              <TabsContent value="chauffeurServices" className="p-6 space-y-6">
                <ChauffeurTab />
              </TabsContent>

              <TabsContent value="driverWallets" className="mt-0 p-6 space-y-6">
                <DriverWalletsTab />
              </TabsContent>

              <TabsContent value="busOperators" className="mt-0 p-6 space-y-6">
                <BusOperatorsTab />
              </TabsContent>

              <TabsContent value="busRoutes" className="mt-0 p-6 space-y-6">
                <BusRoutesTab />
              </TabsContent>

              <TabsContent value="walletSettings" className="mt-0 p-6 space-y-6">
                <WalletSettingsTab />
              </TabsContent>

              <TabsContent value="reports" className="mt-0 p-6 space-y-6">
                <ReportsTab />
              </TabsContent>

              <TabsContent value="kyc" className="mt-0 p-6 space-y-6">
                <KycReviewTab />
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 p-6 space-y-6">
                <PricingSettingsTab />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
