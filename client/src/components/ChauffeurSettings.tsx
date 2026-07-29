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

interface ChauffeurSettingsProps {
  initialData: {
    isAvailableForChauffeur: boolean;
    chauffeurHourlyRate: string | null;
    chauffeurDailyRate: string | null;
    chauffeurDescription: string | null;
  };
}

export const ChauffeurSettings: React.FC<ChauffeurSettingsProps> = ({ initialData }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAvailable, setIsAvailable] = useState(initialData.isAvailableForChauffeur);
  const [hourlyRate, setHourlyRate] = useState(initialData.chauffeurHourlyRate || "");
  const [dailyRate, setDailyRate] = useState(initialData.chauffeurDailyRate || "");
  const [description, setDescription] = useState(initialData.chauffeurDescription || "");

  useEffect(() => {
    setIsAvailable(initialData.isAvailableForChauffeur);
    setHourlyRate(initialData.chauffeurHourlyRate || "");
    setDailyRate(initialData.chauffeurDailyRate || "");
    setDescription(initialData.chauffeurDescription || "");
  }, [initialData]);

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: async () => {
      return api.put("/api/v1/users/profile", {
        isAvailableForChauffeur: isAvailable,
        chauffeurHourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        chauffeurDailyRate: dailyRate ? parseFloat(dailyRate) : null,
        chauffeurDescription: description || null,
      });
    },
    onSuccess: () => {
      toast.success(t("chauffeur.settings.saved"));
      queryClient.invalidateQueries({ queryKey: [queryKey.USER] });
      queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("chauffeur.settings.saveError"), { className: "custom-error-toast" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t("chauffeur.settings.title")}
          <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
        </CardTitle>
      </CardHeader>
      {isAvailable && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("chauffeur.settings.hourlyRate")}</Label><Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
            <div><Label>{t("chauffeur.settings.dailyRate")}</Label><Input type="number" step="0.01" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} /></div>
          </div>
          <div><Label>{t("chauffeur.settings.description")}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("chauffeur.settings.description")} rows={3} /></div>
          <Button onClick={() => saveSettings()} disabled={isPending}>{isPending ? "..." : t("chauffeur.settings.save")}</Button>
        </CardContent>
      )}
    </Card>
  );
};
