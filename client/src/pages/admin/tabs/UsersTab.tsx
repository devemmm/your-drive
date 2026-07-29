import React from "react";
import {
  Search,
  Filter,
  ChevronDown,
  User,
  Check,
  BanIcon,
  X,
  Trash,
  Star,
  Eye,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import CustomLoader from "@/components/CustomLoader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DownloadButton } from "@/components/admin/DownloadButton";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import { usePassengerReviewsInfinite } from "@/data";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { toast } from "sonner";

interface UsersTabProps {
  users: any[];
  pagination: any;
  loading: boolean;
  error: any;
  searchTerm: string;
  userRole: "ADMIN" | "USER" | "all";
  userStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "all";
  onSearchChange: (value: string) => void;
  onRoleChange: (role: "ADMIN" | "USER" | "all") => void;
  onStatusChange: (status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "all") => void;
  onPageChange: (page: number) => void;
  onUserAction: (
    userId: number,
    action: "view" | "suspend" | "activate" | "delete"
  ) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

// Suspension Dialog Component
const SuspendUserDialog = ({
  user,
  open,
  onOpenChange,
  onConfirm,
  isSuspending,
}: {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (suspendUntil: number, suspensionReason: string) => void;
  isSuspending: boolean;
}) => {
  const { t } = useTranslation();
  const [suspendUntil, setSuspendUntil] = React.useState<string>("");
  const [suspensionReason, setSuspensionReason] = React.useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendUntil || !suspensionReason.trim()) {
      toast.error("Please fill in all fields", {
        className: "custom-error-toast",
      });
      return;
    }

    const suspendUntilDate = new Date(suspendUntil).getTime();
    onConfirm(suspendUntilDate, suspensionReason.trim());
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSuspendUntil("");
      setSuspensionReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <BanIcon className="h-5 w-5" />
            {t("AdminDashboard.UserManagement.suspendUser", "Suspend User")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "AdminDashboard.UserManagement.suspendUserDesc",
              "Are you sure you want to suspend this user? Please provide the suspension details below."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium dark:text-white">
              {t("AdminDashboard.UserManagement.suspendUntil", "Suspend Until")}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="datetime-local"
                value={suspendUntil}
                onChange={(e) => setSuspendUntil(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium dark:text-white">
              {t(
                "AdminDashboard.UserManagement.suspensionReason",
                "Suspension Reason"
              )}
            </label>
            <textarea
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder={t(
                "AdminDashboard.UserManagement.suspensionReasonPlaceholder",
                "Enter the reason for suspension..."
              )}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 resize-none"
              rows={3}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSuspending}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSuspending}
              className="flex-1"
            >
              {isSuspending ? t("common.suspending") : t("common.suspend")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  pagination,
  loading,
  error,
  searchTerm,
  userRole,
  userStatus,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onPageChange,
  onUserAction,
  isUpdating,
  isDeleting,
}) => {
  const { suspendAccount, activateAccount, isSuspending, isActivating } =
    useAdminUsers();
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = React.useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = React.useState(false);
  const [userToSuspend, setUserToSuspend] = React.useState<any | null>(null);

  // Driver ratings functionality
  const [showRatings, setShowRatings] = React.useState(false);
  const { data: ratingsData, isLoading: ratingsLoading } =
    usePassengerReviewsInfinite(selectedUser?.id?.toString() || "", 10, {
      enabled: !!selectedUser?.id && showRatings,
    });

  const ratings = ratingsData?.pages?.flatMap((page) => page?.data || []) || [];

  const clearFilters = () => {
    onSearchChange("");
    onRoleChange("all");
    onStatusChange("all");
  };

  const handleSuspendClick = (user: any) => {
    setUserToSuspend(user);
    setSuspendDialogOpen(true);
  };

  const handleSuspendConfirm = (
    suspendUntil: number,
    suspensionReason: string
  ) => {
    if (userToSuspend) {
      suspendAccount({
        userId: userToSuspend.id,
        suspendUntil,
        suspensionReason,
      });
      setSuspendDialogOpen(false);
      setUserToSuspend(null);
    }
  };

  return (
    <div>
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("AdminDashboard.UserManagement.title")}
          </CardTitle>
          <CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("AdminDashboard.UserManagement.description")}
          </CardDescription>

          {/* Search and Filters */}
          <div className="mt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                type="text"
                placeholder={t(
                  "AdminDashboard.UserManagement.searchPlaceholder"
                )}
                className="pl-9 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4">
              {/* Role Filter */}
              <Select value={userRole} onValueChange={onRoleChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="ADMIN">{t("common.admin", "Admin")}</SelectItem>
                  <SelectItem value="USER">
                    {t("common.user", "User")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={userStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="ACTIVE">{t("common.active")}</SelectItem>
                  <SelectItem value="INACTIVE">
                    {t("common.inactive")}
                  </SelectItem>
                  <SelectItem value="SUSPENDED">
                    {t("common.suspended")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {t("common.clearFilters")}
              </Button>

              {/* Download Button */}
              <DownloadButton
                type="users"
                params={{
                  searchTerm: searchTerm || undefined,
                  role: userRole === "all" ? undefined : userRole,
                  status: userStatus === "all" ? undefined : userStatus,
                }}
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    t("AdminDashboard.UserManagement.tableHeaders.id"),
                    t("AdminDashboard.UserManagement.tableHeaders.firstName"),
                    t("AdminDashboard.UserManagement.tableHeaders.lastName"),
                    t("AdminDashboard.UserManagement.tableHeaders.email"),
                    t("AdminDashboard.UserManagement.tableHeaders.role"),
                    t("AdminDashboard.UserManagement.tableHeaders.status"),
                    t("AdminDashboard.UserManagement.tableHeaders.registered"),
                    t("AdminDashboard.UserManagement.tableHeaders.actions"),
                  ].map((header) => (
                    <th
                      key={header}
                      className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-6">
                      <TableSkeleton columns={8} rows={5} />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-red-200">
                      {t("common.error", "Error loading users")}
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8">
                      <EmptyState
                        icon={User}
                        title={t("AdminDashboard.UserManagement.noUsers", "No users found")}
                        description={t(
                          "AdminDashboard.UserManagement.noUsersDescription",
                          "Try adjusting your search or filter criteria"
                        )}
                      />
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        user.status != "ACTIVE" ? "bg-red-200" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {user.id}
                      </td>
                      {(() => {
                        const firstName = user?.firstName || "";
                        const lastName = user?.lastName || "";
                        return (
                          <>
                            <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                              {firstName}
                            </td>
                            <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                              {lastName}
                            </td>
                          </>
                        );
                      })()}
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded font-medium ${
                            user.role === "USER"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : user.role === "ADMIN"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                          }`}
                        >
                          {t(`common_.small.user.${user?.role}`)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : user.status === "SUSPENDED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : user.status === "INACTIVE"
                              ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {user.status === "ACTIVE"
                            ? t("common.active", "Active")
                            : user.status === "SUSPENDED"
                            ? t("common.suspended", "Suspended")
                            : user.status === "INACTIVE"
                            ? t("common.inactive", "Inactive")
                            : user.status || t("common.unknown", "Unknown")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : ""}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 items-center">
                          {/* Eye icon for opening modal */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <button
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setIsUserDetailOpen(true);
                                  }}
                                  className="text-gray-700 dark:text-gray-300 hover:text-primary"
                                  disabled={isUpdating || isDeleting}
                                >
                                  <Eye size={16} />
                                </button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center">
                              {t("AdminDashboard.UserManagement.viewTooltip")}
                            </TooltipContent>
                          </Tooltip>

                          {/* Suspend button - shown if user is active */}
                          {user.status == "ACTIVE" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <button
                                    onClick={() => handleSuspendClick(user)}
                                    className="text-gray-700 dark:text-gray-300 hover:text-red-600"
                                    disabled={
                                      isUpdating || isDeleting || isSuspending
                                    }
                                  >
                                    <BanIcon size={16} />
                                  </button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {t(
                                  "AdminDashboard.UserManagement.suspendTooltip"
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Activate/Unsuspend button - shown if user is suspended */}
                          {user.status != "ACTIVE" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <button
                                    onClick={() => activateAccount(user.id)}
                                    className="text-gray-700 dark:text-gray-300 hover:text-green-600"
                                    disabled={
                                      isUpdating || isDeleting || isActivating
                                    }
                                  >
                                    <Check size={16} />
                                  </button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {t(
                                  "AdminDashboard.UserManagement.activateTooltip"
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Delete user button */}
                          <DeleteUserWithConfirm
                            onConfirm={() => onUserAction(user.id, "delete")}
                            disabled={isDeleting || isUpdating}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="text-gray-500 dark:text-gray-400">
              {pagination?.page || pagination?.currentPage || 1} -{" "}
              {pagination?.totalPages || 1}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="dark:bg-gray-700"
                onClick={() =>
                  onPageChange(
                    Math.max(
                      1,
                      (pagination?.page || pagination?.currentPage || 1) - 1
                    )
                  )
                }
                disabled={
                  (pagination?.page || pagination?.currentPage || 1) === 1 ||
                  loading
                }
              >
                {t("AdminDashboard.UserManagement.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="dark:bg-gray-700"
                onClick={() =>
                  onPageChange(
                    (pagination?.page || pagination?.currentPage || 1) + 1
                  )
                }
                disabled={
                  (pagination?.page || pagination?.currentPage || 1) >=
                    (pagination?.totalPages || 1) || loading
                }
              >
                {t("AdminDashboard.UserManagement.next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User profile dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-3xl dark:bg-gray-900">
          <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-2xl font-bold dark:text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </div>
                <div className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  {selectedUser?.email}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {t(
                      "AdminDashboard.UserManagement.personalInfo",
                      "Personal Information"
                    )}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.firstName", "First name")}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedUser?.firstName || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.lastName", "Last name")}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedUser?.lastName || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.email", "Email")}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedUser?.email || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {t(
                      "AdminDashboard.UserManagement.accountInfo",
                      "Account Information"
                    )}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.role", "Role")}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser?.role === "USER"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : selectedUser?.role === "ADMIN"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                        }`}
                      >
                        {t(`common_.small.user.${selectedUser?.role}`) ||
                          "USER"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.status", "Status")}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser?.status === "ACTIVE"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : selectedUser?.status === "SUSPENDED"
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : selectedUser?.status === "INACTIVE"
                          ? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>
                        {selectedUser?.status === "ACTIVE"
                          ? t("common.active", "Active")
                          : selectedUser?.status === "SUSPENDED"
                          ? t("common.suspended", "Suspended")
                          : selectedUser?.status === "INACTIVE"
                          ? t("common.inactive", "Inactive")
                          : selectedUser?.status || t("common.unknown", "Unknown")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common_.small.user.joined", "Joined")}
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedUser?.createdAt
                          ? new Date(
                              selectedUser.createdAt
                            ).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Ratings Section */}
            {selectedUser?.role === "USER" && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-semibold dark:text-white">
                      {t(
                        "AdminDashboard.UserManagement.driverRatings",
                        "Driver Ratings"
                      )}
                    </h3>
                  </div>
                  <Button
                    variant={showRatings ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowRatings(!showRatings)}
                    className="flex items-center gap-2"
                  >
                    <Star className="h-4 w-4" />
                    {showRatings
                      ? t(
                          "AdminDashboard.UserManagement.hideRatings",
                          "Hide Ratings"
                        )
                      : t(
                          "AdminDashboard.UserManagement.showRatings",
                          "Show Ratings"
                        )}
                  </Button>
                </div>

                {showRatings && (
                  <div className="space-y-4">
                    {/* Ratings Summary */}
                    {ratings.length > 0 && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {[...Array(5)].map((_, i) => {
                                const averageRating =
                                  ratings.reduce(
                                    (sum: number, r: any) =>
                                      sum + (r.rating || 0),
                                    0
                                  ) / ratings.length;
                                return (
                                  <Star
                                    key={i}
                                    className={`h-5 w-5 ${
                                      i < Math.round(averageRating)
                                        ? "text-yellow-400 fill-current"
                                        : "text-gray-300"
                                    }`}
                                  />
                                );
                              })}
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {ratings.length > 0
                                  ? (
                                      ratings.reduce(
                                        (sum: number, r: any) =>
                                          sum + (r.rating || 0),
                                        0
                                      ) / ratings.length
                                    ).toFixed(1)
                                  : "0"}
                                <span className="text-lg text-gray-500 dark:text-gray-400">
                                  /5
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {ratings.length}{" "}
                                {t(
                                  "AdminDashboard.UserManagement.ratings",
                                  "ratings"
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {t(
                                "AdminDashboard.UserManagement.averageRating",
                                "Average Rating"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ratingsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-3">
                          <CustomLoader />
                          <span className="text-gray-500 dark:text-gray-400">
                            {t(
                              "AdminDashboard.UserManagement.loadingRatings",
                              "Loading ratings..."
                            )}
                          </span>
                        </div>
                      </div>
                    ) : ratings.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Star className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          {t(
                            "AdminDashboard.UserManagement.noRatingsTitle",
                            "No Ratings Yet"
                          )}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          {t(
                            "AdminDashboard.UserManagement.noRatings",
                            "No ratings found for this driver"
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {ratings.map((rating: any, index: number) => (
                          <div
                            key={index}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < (rating.rating || 0)
                                          ? "text-yellow-400 fill-current"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {rating.rating}/5
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                {rating.createdAt
                                  ? new Date(
                                      rating.createdAt
                                    ).toLocaleDateString()
                                  : ""}
                              </span>
                            </div>
                            {rating.comment && (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                  "{rating.comment}"
                                </p>
                              </div>
                            )}
                            {rating.passenger && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                  <User className="h-3 w-3 text-primary" />
                                </div>
                                <span>
                                  {t("AdminDashboard.UserManagement.by", "by")}{" "}
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {rating.passenger.name}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold dark:text-white">
                  {t("AdminDashboard.UserManagement.actions", "Actions")}
                </h3>
              </div>
              <div className="flex gap-3">
                {/* Suspend button - shown if user is active */}
                {selectedUser?.status == "ACTIVE" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSuspendClick(selectedUser);
                      setProfileOpen(false);
                    }}
                    disabled={isSuspending}
                    className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    <BanIcon size={16} />
                    {isSuspending
                      ? t("common.suspending", "Suspending...")
                      : t("common.suspend", "Suspend")}
                  </Button>
                )}

                {/* Activate/Unsuspend button - shown if user is suspended */}
                {selectedUser?.status != "ACTIVE" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      activateAccount(selectedUser.id);
                      setProfileOpen(false);
                    }}
                    disabled={isActivating}
                    className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                  >
                    <Check size={16} />
                    {isActivating
                      ? t("common.activating", "Activating...")
                      : t("common.activate", "Activate")}
                  </Button>
                )}

                {/* Delete user button */}
                <Button
                  variant="outline"
                  onClick={() => {
                    onUserAction(selectedUser.id, "delete");
                    setProfileOpen(false);
                  }}
                  disabled={isDeleting}
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <Trash size={16} />
                  {isDeleting
                    ? t("common.deleting", "Deleting...")
                    : t("common.delete", "Delete")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <SuspendUserDialog
        user={userToSuspend}
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        onConfirm={handleSuspendConfirm}
        isSuspending={isSuspending}
      />

      {/* User Detail Modal */}
      <UserDetailModal
        userId={selectedUserId}
        open={isUserDetailOpen}
        onOpenChange={setIsUserDetailOpen}
        onAction={(userId, action) => {
          if (action === "suspend") {
            handleSuspendClick({ id: userId });
          } else if (action === "activate") {
            activateAccount(userId);
          }
        }}
      />
    </div>
  );
};

// Delete confirm inline component
const DeleteUserWithConfirm = ({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-red-600 hover:text-red-700"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Trash className="text-red-600" size={16} />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dashboard_.user.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard_.user.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// rides preview removed
