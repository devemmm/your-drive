import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CommissionSettings,
  UpdateCommissionSettingsData,
} from "@/hooks/useCommissionSettings";
import { Loader2, Save, Percent } from "lucide-react";
import CustomLoader from "@/components/CustomLoader";

interface CommissionSettingsTabProps {
  commissionSettings: CommissionSettings;
  loading: boolean;
  error: any;
  onUpdate: (data: UpdateCommissionSettingsData) => void;
  isUpdating: boolean;
}

export const CommissionSettingsTab: React.FC<CommissionSettingsTabProps> = ({
  commissionSettings,
  loading,
  error,
  onUpdate,
  isUpdating,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<UpdateCommissionSettingsData>({
    driverCommissionRate: commissionSettings?.driverCommissionRate ?? 0,
    platformCommissionRate: commissionSettings?.platformCommissionRate ?? 0,
  });

  // Update form data when commissionSettings changes
  useEffect(() => {
    if (commissionSettings) {
      setFormData({
        driverCommissionRate: commissionSettings.driverCommissionRate ?? 0,
        platformCommissionRate: commissionSettings.platformCommissionRate ?? 0,
      });
    }
  }, [commissionSettings]);

  const handleSave = () => {
    onUpdate(formData);
  };

  const handleInputChange = (field: keyof UpdateCommissionSettingsData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <CustomLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 dark:text-red-400">
        {t(
          "AdminDashboard.CommissionSettings.loadError",
          "Failed to load commission settings"
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">
          {t(
            "AdminDashboard.CommissionSettings.title",
            "Commission Settings"
          )}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t(
            "AdminDashboard.CommissionSettings.description",
            "Configure commission rates for drivers and platform"
          )}
        </p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            {t(
              "AdminDashboard.CommissionSettings.cardTitle",
              "Commission Rates"
            )}
          </CardTitle>
          <CardDescription>
            {t(
              "AdminDashboard.CommissionSettings.cardDescription",
              "Set the percentage rates for driver and platform commissions. Rates should be between 0 and 100."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Driver Commission Rate */}
            <div className="space-y-2">
              <Label htmlFor="driverCommissionRate">
                {t(
                  "AdminDashboard.CommissionSettings.driverCommissionRate",
                  "Driver Commission Rate (%)"
                )}
              </Label>
              <div className="relative">
                <Input
                  id="driverCommissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.driverCommissionRate ?? 0}
                  onChange={handleInputChange("driverCommissionRate")}
                  className="pr-8"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "AdminDashboard.CommissionSettings.driverCommissionRateHelp",
                  "Percentage of revenue that goes to drivers"
                )}
              </p>
            </div>

            {/* Platform Commission Rate */}
            <div className="space-y-2">
              <Label htmlFor="platformCommissionRate">
                {t(
                  "AdminDashboard.CommissionSettings.platformCommissionRate",
                  "Platform Commission Rate (%)"
                )}
              </Label>
              <div className="relative">
                <Input
                  id="platformCommissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.platformCommissionRate ?? 0}
                  onChange={handleInputChange("platformCommissionRate")}
                  className="pr-8"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "AdminDashboard.CommissionSettings.platformCommissionRateHelp",
                  "Percentage of revenue that goes to the platform"
                )}
              </p>
            </div>
          </div>

          {/* Total Display */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t(
                  "AdminDashboard.CommissionSettings.total",
                  "Total Commission Rate"
                )}
                :
              </span>
              <span className="text-lg font-bold">
                {(
                  (formData.driverCommissionRate ?? 0) +
                  (formData.platformCommissionRate ?? 0)
                ).toFixed(2)}
                %
              </span>
            </div>
            {(formData.driverCommissionRate ?? 0) +
              (formData.platformCommissionRate ?? 0) >
              100 && (
              <p className="text-sm text-red-500 mt-2">
                {t(
                  "AdminDashboard.CommissionSettings.totalExceedsWarning",
                  "Warning: Total commission rate exceeds 100%"
                )}
              </p>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isUpdating} size="lg">
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.saving", "Saving...")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("common.save", "Save Changes")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
