import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKey } from "@/data";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FuelPolicy } from "@/lib/types";

interface RentalSettingsProps {
  vehicleId: number;
  initialData: {
    isAvailableForRental: boolean;
    hourlyRate: string | null;
    dailyRate: string | null;
    securityDeposit: string | null;
    rentalDescription: string | null;
    mileageLimit: number | null;
    fuelPolicy: FuelPolicy;
  };
}

export const RentalSettings: React.FC<RentalSettingsProps> = ({ vehicleId, initialData }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAvailable, setIsAvailable] = useState(initialData.isAvailableForRental);
  const [hourlyRate, setHourlyRate] = useState(initialData.hourlyRate || "");
  const [dailyRate, setDailyRate] = useState(initialData.dailyRate || "");
  const [securityDeposit, setSecurityDeposit] = useState(initialData.securityDeposit || "");
  const [description, setDescription] = useState(initialData.rentalDescription || "");
  const [mileageLimit, setMileageLimit] = useState(initialData.mileageLimit?.toString() || "");
  const [fuelPolicy, setFuelPolicy] = useState<FuelPolicy>(initialData.fuelPolicy || "FULL_TO_FULL");

  useEffect(() => {
    setIsAvailable(initialData.isAvailableForRental);
    setHourlyRate(initialData.hourlyRate || "");
    setDailyRate(initialData.dailyRate || "");
    setSecurityDeposit(initialData.securityDeposit || "");
    setDescription(initialData.rentalDescription || "");
    setMileageLimit(initialData.mileageLimit?.toString() || "");
    setFuelPolicy(initialData.fuelPolicy || "FULL_TO_FULL");
  }, [initialData]);

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: async () => {
      return api.put(`/api/v1/vehicles/${vehicleId}`, {
        isAvailableForRental: isAvailable,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : null,
        rentalDescription: description || null,
        mileageLimit: mileageLimit ? parseInt(mileageLimit) : null,
        fuelPolicy,
      });
    },
    onSuccess: () => {
      toast.success(t("rental.settings.saved"));
      queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLE] });
      queryClient.invalidateQueries({ queryKey: [queryKey.VEHICLES] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("rental.settings.saveError"), { className: "custom-error-toast" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t("rental.settings.title")}
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </CardTitle>
      </CardHeader>
      {isAvailable && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("rental.settings.hourlyRate")}</Label><Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
            <div><Label>{t("rental.settings.dailyRate")}</Label><Input type="number" step="0.01" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} /></div>
          </div>
          <div><Label>{t("rental.settings.securityDeposit")}</Label><Input type="number" step="0.01" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} /></div>
          <div><Label>{t("rental.settings.description")}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("rental.settings.mileageLimit")}</Label><Input type="number" value={mileageLimit} onChange={(e) => setMileageLimit(e.target.value)} /></div>
            <div>
              <Label>{t("rental.settings.fuelPolicy")}</Label>
              <Select value={fuelPolicy} onValueChange={(v) => setFuelPolicy(v as FuelPolicy)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TO_FULL">{t("rental.settings.fuelPolicies.FULL_TO_FULL")}</SelectItem>
                  <SelectItem value="SAME_LEVEL">{t("rental.settings.fuelPolicies.SAME_LEVEL")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => saveSettings()} disabled={isPending}>{isPending ? "..." : t("rental.settings.save")}</Button>
        </CardContent>
      )}
    </Card>
  );
};
