import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminD2DSettings, useAdminD2DStatistics, useUpdateAdminD2DSettings } from "@/hooks/useDoorToDoor";
import CustomLoader from "@/components/CustomLoader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Save, Edit2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const D2DSettingsTab: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useAdminD2DSettings();
  const { data: statistics, isLoading: statsLoading, error: statsError } = useAdminD2DStatistics();
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateAdminD2DSettings();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  const isLoading = settingsLoading || statsLoading;
  const error = settingsError || statsError;

  // Initialize form data when settings are loaded
  React.useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);

  if (isLoading) {
    return <CustomLoader />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-500">
            {t("AdminDashboard.d2dSettings.error", "Failed to load D2D settings")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("AdminDashboard.d2dSettings.title", "Door-to-Door Settings")}
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              "AdminDashboard.d2dSettings.description",
              "View and manage global door-to-door service settings"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            <div className="space-y-4">
            {/* Statistics Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    {t("AdminDashboard.d2dSettings.totalRides", "Total D2D Rides")}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {statistics?.totalRides ?? 0}
                </div>
              </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    {t("AdminDashboard.d2dSettings.totalRequests", "Total D2D Requests")}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {statistics?.totalRequests ?? 0}
                </div>
              </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    {t("AdminDashboard.d2dSettings.activeRides", "Active D2D Rides")}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {statistics?.activeRides ?? 0}
                </div>
              </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    {t("AdminDashboard.d2dSettings.pendingRequests", "Pending Requests")}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {statistics?.pendingRequests ?? 0}
                </div>
              </div>
            </div>

            {/* Settings Configuration Section */}
            {settings && (
              <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {t("AdminDashboard.d2dSettings.configuration", "Configuration")}
                  </h3>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2"
                    >
                      <Edit2 size={16} />
                      {t("AdminDashboard.d2dSettings.edit", "Edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData(settings);
                        }}
                        disabled={isUpdating}
                      >
                        {t("common.cancel", "Cancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateSettings(formData, {
                            onSuccess: () => {
                              toast({
                                title: t("AdminDashboard.d2dSettings.updateSuccess", "Settings Updated"),
                                description: t("AdminDashboard.d2dSettings.updateSuccessDesc", "D2D settings have been updated successfully."),
                              });
                              setIsEditing(false);
                            },
                            onError: (error: any) => {
                              toast({
                                title: t("AdminDashboard.d2dSettings.updateError", "Update Failed"),
                                description: error?.response?.data?.message || t("AdminDashboard.d2dSettings.updateErrorDesc", "Failed to update D2D settings."),
                                variant: "destructive",
                              });
                            },
                          });
                        }}
                        disabled={isUpdating}
                        className="flex items-center gap-2"
                      >
                        <Save size={16} />
                        {isUpdating 
                          ? t("AdminDashboard.d2dSettings.saving", "Saving...")
                          : t("AdminDashboard.d2dSettings.save", "Save")
                        }
                      </Button>
                    </div>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-4">
                    {formData && typeof formData === 'object' && (
                      <>
                        {Object.keys(formData).map((key) => {
                          if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return null;
                          const value = formData[key];
                          const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
                          const isArray = Array.isArray(value);
                          
                          if (isObject || isArray) {
                            return (
                              <div key={key} className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {key.charAt(0).toUpperCase() + key.slice(1)}
                                </Label>
                                <Textarea
                                  value={JSON.stringify(value, null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      setFormData({ ...formData, [key]: parsed });
                                    } catch {
                                      // Invalid JSON, keep as is
                                    }
                                  }}
                                  className="font-mono text-sm min-h-[100px]"
                                />
                              </div>
                            );
                          }
                          
                          return (
                            <div key={key} className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                              </Label>
                              <Input
                                type={typeof value === 'number' ? 'number' : 'text'}
                                value={value || ''}
                                onChange={(e) => {
                                  const newValue = typeof value === 'number' 
                                    ? parseFloat(e.target.value) || 0
                                    : e.target.value;
                                  setFormData({ ...formData, [key]: newValue });
                                }}
                              />
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {settings.configuration ? (
                      <pre className="text-sm text-slate-600 dark:text-slate-400 overflow-auto">
                        {JSON.stringify(settings.configuration, null, 2)}
                      </pre>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(settings).map(([key, value]) => {
                          if (key === 'configuration' || key === 'id' || key === 'createdAt' || key === 'updatedAt') return null;
                          return (
                            <div key={key} className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {key.charAt(0).toUpperCase() + key.slice(1)}:
                              </span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

