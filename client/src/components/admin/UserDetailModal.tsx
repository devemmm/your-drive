import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminUser } from "@/hooks/useAdminUserManagement";
import {
  useDeactivateUser,
  useDeleteAdminUser,
  useVerifyUserEmail,
  useVerifyUserPhone,
  useUpdateUserRole,
  useUserRoles,
} from "@/hooks/useAdminUserManagement";
import { useTranslation } from "react-i18next";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  Car,
  Star,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
  Ban,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import LoadingSkeleton from "./LoadingSkeleton";
import { format } from "date-fns";

interface UserDetailModalProps {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (userId: number, action: string) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  userId,
  open,
  onOpenChange,
  onAction,
}) => {
  const { t } = useTranslation();
  const { data: user, isLoading, error } = useAdminUser(userId || 0);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // User management hooks
  const deactivateUser = useDeactivateUser();
  const deleteUser = useDeleteAdminUser();
  const verifyEmail = useVerifyUserEmail();
  const verifyPhone = useVerifyUserPhone();
  const updateRole = useUpdateUserRole();
  const { data: availableRoles } = useUserRoles();

  if (!userId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("AdminDashboard.UserManagement.userDetails", "User Details")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "AdminDashboard.UserManagement.userDetailsDescription",
              "View and manage user information"
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingSkeleton rows={5} showHeader={false} />
        ) : error ? (
          <div className="p-4 text-center text-red-600 dark:text-red-400">
            {t("common.errorLoading", "Error loading user data")}
          </div>
        ) : user ? (
          <>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">
                {t("common.overview", "Overview")}
              </TabsTrigger>
              <TabsTrigger value="statistics">
                {t("common.statistics", "Statistics")}
              </TabsTrigger>
              <TabsTrigger value="settings">
                {t("common.settings", "Settings")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("common.basicInformation", "Basic Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("common.name", "Name")}
                        </p>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("common.email", "Email")}
                        </p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("common.phone", "Phone")}
                        </p>
                        <p className="font-medium">{user.phoneNumber || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("common.memberSince", "Member Since")}
                        </p>
                        <p className="font-medium">
                          {format(new Date(user.createdAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        user.status === "ACTIVE"
                          ? "default"
                          : user.status === "SUSPENDED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {user.status}
                    </Badge>
                    {user.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))}
                    {user.isEmailVerified && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {t("common.emailVerified", "Email Verified")}
                      </Badge>
                    )}
                    {user.isPhoneVerified && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {t("common.phoneVerified", "Phone Verified")}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Onboarding Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("common.onboardingStatus", "Onboarding Status")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>{t("common.passengerOnboarded", "Passenger")}</span>
                      {user.isPassengerOnboarded ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("common.driverOnboarded", "Driver")}</span>
                      {user.isDriverOnboarded ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("common.userStatistics", "User Statistics")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.statistics ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("common.totalRides", "Total Rides")}
                          </p>
                          <p className="font-medium">
                            {user.statistics.totalRides || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("common.completedRides", "Completed")}
                          </p>
                          <p className="font-medium">
                            {user.statistics.completedRides || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("common.cancelledRides", "Cancelled")}
                          </p>
                          <p className="font-medium">
                            {user.statistics.cancelledRides || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("common.totalEarnings", "Total Earnings")}
                          </p>
                          <p className="font-medium">
                            ${user.statistics.totalEarnings?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("common.averageRating", "Average Rating")}
                          </p>
                          <p className="font-medium">
                            {user.statistics.averageRating?.toFixed(1) || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("common.lastActive", "Last Active")}
                          </p>
                          <p className="font-medium">
                            {user.statistics.lastActive
                              ? format(
                                  new Date(user.statistics.lastActive),
                                  "MMM dd, yyyy HH:mm"
                                )
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("common.noStatistics", "No statistics available")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("common.userSettings", "User Settings")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.preferences && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>{t("common.language", "Language")}</span>
                        <Badge variant="outline">
                          {user.preferences.language || "EN"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t("common.notifications", "Notifications")}</span>
                        <Badge
                          variant={user.preferences.notifications ? "default" : "secondary"}
                        >
                          {user.preferences.notifications
                            ? t("common.enabled", "Enabled")
                            : t("common.disabled", "Disabled")}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Action Buttons */}
          <div className="space-y-4 mt-4 pt-4 border-t">
            {/* Role Management */}
            {availableRoles && availableRoles.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("AdminDashboard.UserManagement.changeRole", "Change Role")}
                </label>
                <div className="flex gap-2">
                  <Select
                    value={selectedRoleId?.toString() || ""}
                    onValueChange={(value) => setSelectedRoleId(parseInt(value))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("AdminDashboard.UserManagement.selectRole", "Select Role")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedRoleId && userId) {
                        updateRole.mutate(
                          { userId: userId, roleId: selectedRoleId },
                          {
                            onSuccess: () => {
                              toast.success(t("AdminDashboard.UserManagement.roleUpdated", "Role updated successfully"));
                            },
                            onError: (error: any) => {
                              toast.error(
                                error?.response?.data?.message ||
                                  t("AdminDashboard.UserManagement.roleUpdateError", "Failed to update role")
                              );
                            },
                          }
                        );
                      }
                    }}
                    disabled={!selectedRoleId || updateRole.isPending}
                  >
                    {updateRole.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("common.update", "Update")
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Verification Actions */}
            <div className="flex flex-wrap gap-2">
              {!user.isEmailVerified && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (userId) {
                      verifyEmail.mutate(userId, {
                        onSuccess: () => {
                          toast.success(t("AdminDashboard.UserManagement.emailVerified", "Email verified"));
                        },
                        onError: (error: any) => {
                          toast.error(
                            error?.response?.data?.message ||
                              t("AdminDashboard.UserManagement.emailVerifyError", "Failed to verify email")
                          );
                        },
                      });
                    }
                  }}
                  disabled={verifyEmail.isPending}
                >
                  {verifyEmail.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {t("AdminDashboard.UserManagement.verifyEmail", "Verify Email")}
                </Button>
              )}

              {!user.isPhoneVerified && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (userId) {
                      verifyPhone.mutate(userId, {
                        onSuccess: () => {
                          toast.success(t("AdminDashboard.UserManagement.phoneVerified", "Phone verified"));
                        },
                        onError: (error: any) => {
                          toast.error(
                            error?.response?.data?.message ||
                              t("AdminDashboard.UserManagement.phoneVerifyError", "Failed to verify phone")
                          );
                        },
                      });
                    }
                  }}
                  disabled={verifyPhone.isPending}
                >
                  {verifyPhone.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Phone className="h-4 w-4 mr-2" />
                  )}
                  {t("AdminDashboard.UserManagement.verifyPhone", "Verify Phone")}
                </Button>
              )}
            </div>

            {/* Status Actions */}
            <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.close", "Close")}
            </Button>
            {onAction && (
              <>
                {user.status === "ACTIVE" ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeactivateDialogOpen(true);
                        }}
                        disabled={deactivateUser.isPending}
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        {deactivateUser.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Ban className="h-4 w-4 mr-2" />
                        )}
                        {t("common.deactivate", "Deactivate")}
                      </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onAction(user.id, "suspend");
                    }}
                  >
                    {t("common.suspend", "Suspend")}
                  </Button>
                    </>
                ) : (
                  <Button
                    onClick={() => {
                      onAction(user.id, "activate");
                    }}
                  >
                    {t("common.activate", "Activate")}
                  </Button>
                )}
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={deleteUser.isPending}
                  >
                    {deleteUser.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {t("common.delete", "Delete")}
                  </Button>
              </>
            )}
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("AdminDashboard.UserManagement.deleteConfirm", "Delete User")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    "AdminDashboard.UserManagement.deleteConfirmDescription",
                    "Are you sure you want to delete this user? This action cannot be undone."
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("common.cancel", "Cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (userId) {
                      deleteUser.mutate(userId, {
                        onSuccess: () => {
                          toast.success(t("AdminDashboard.UserManagement.userDeleted", "User deleted successfully"));
                          setDeleteDialogOpen(false);
                          onOpenChange(false);
                        },
                        onError: (error: any) => {
                          toast.error(
                            error?.response?.data?.message ||
                              t("AdminDashboard.UserManagement.deleteError", "Failed to delete user")
                          );
                        },
                      });
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {t("common.delete", "Delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Deactivate Confirmation Dialog */}
          <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("AdminDashboard.UserManagement.deactivateConfirm", "Deactivate User")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    "AdminDashboard.UserManagement.deactivateConfirmDescription",
                    "Are you sure you want to deactivate this user? They will not be able to access their account."
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("common.cancel", "Cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (userId) {
                      deactivateUser.mutate(userId, {
                        onSuccess: () => {
                          toast.success(t("AdminDashboard.UserManagement.userDeactivated", "User deactivated successfully"));
                          setDeactivateDialogOpen(false);
                          onOpenChange(false);
                        },
                        onError: (error: any) => {
                          toast.error(
                            error?.response?.data?.message ||
                              t("AdminDashboard.UserManagement.deactivateError", "Failed to deactivate user")
                          );
                        },
                      });
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {t("common.deactivate", "Deactivate")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailModal;
