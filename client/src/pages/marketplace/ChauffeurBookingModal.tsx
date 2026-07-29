import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Bike } from "lucide-react";
import { useChauffeurMutations } from "@/hooks/useChauffeur";
import { differenceInHours, differenceInDays } from "date-fns";
import type { ChauffeurDriverListing, ChauffeurServiceType } from "@/lib/types";

interface ChauffeurBookingModalProps {
  driver: ChauffeurDriverListing | null;
  open: boolean;
  onClose: () => void;
}

export const ChauffeurBookingModal: React.FC<ChauffeurBookingModalProps> = ({ driver, open, onClose }) => {
  const { t } = useTranslation();
  const { createService, isCreating } = useChauffeurMutations();
  const [serviceType, setServiceType] = useState<ChauffeurServiceType>("DAILY");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [dropoffNotes, setDropoffNotes] = useState("");

  const costBreakdown = useMemo(() => {
    if (!driver || !startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return null;
    let cost = 0;
    if (serviceType === "HOURLY" && driver.chauffeurHourlyRate) {
      const hours = differenceInHours(end, start);
      cost = hours * parseFloat(driver.chauffeurHourlyRate);
    } else if (serviceType === "DAILY" && driver.chauffeurDailyRate) {
      const days = Math.max(1, differenceInDays(end, start));
      cost = days * parseFloat(driver.chauffeurDailyRate);
    }
    return { total: cost.toFixed(2) };
  }, [driver, startDate, endDate, serviceType]);

  const handleSubmit = () => {
    if (!driver || !selectedVehicleId || !startDate || !endDate) return;
    createService(
      { vehicleId: selectedVehicleId, driverId: driver.id, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), serviceType, pickupNotes: pickupNotes || undefined, dropoffNotes: dropoffNotes || undefined },
      { onSuccess: () => { onClose(); setStartDate(""); setEndDate(""); setPickupNotes(""); setDropoffNotes(""); setSelectedVehicleId(null); } }
    );
  };

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("chauffeur.booking.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-medium">{driver.name}</p>
            {driver.chauffeurDescription && <p className="text-sm text-muted-foreground">{driver.chauffeurDescription}</p>}
          </div>
          <div>
            <Label>{t("chauffeur.booking.serviceType")}</Label>
            <Select value={serviceType} onValueChange={(v) => setServiceType(v as ChauffeurServiceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {driver.chauffeurHourlyRate && <SelectItem value="HOURLY">{t("chauffeur.booking.hourly")} (${driver.chauffeurHourlyRate}/hr)</SelectItem>}
                {driver.chauffeurDailyRate && <SelectItem value="DAILY">{t("chauffeur.booking.daily")} (${driver.chauffeurDailyRate}/day)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {driver.vehicles.length > 0 && (
            <div>
              <Label>{t("chauffeur.booking.selectVehicle")}</Label>
              <Select value={selectedVehicleId?.toString() || ""} onValueChange={(v) => setSelectedVehicleId(parseInt(v))}>
                <SelectTrigger><SelectValue placeholder={t("chauffeur.booking.selectVehicle")} /></SelectTrigger>
                <SelectContent>
                  {driver.vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      <span className="flex items-center gap-1">
                        {v.category === "MOTORBIKE" ? <Bike className="h-3 w-3" /> : <Car className="h-3 w-3" />}
                        {v.make} {v.model}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("chauffeur.booking.startDate")}</Label><Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>{t("chauffeur.booking.endDate")}</Label><Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div><Label>{t("chauffeur.booking.pickupNotes")}</Label><Textarea value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)} rows={2} /></div>
          <div><Label>{t("chauffeur.booking.dropoffNotes")}</Label><Textarea value={dropoffNotes} onChange={(e) => setDropoffNotes(e.target.value)} rows={2} /></div>
          {costBreakdown && (
            <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
              <p className="font-medium">{t("chauffeur.booking.costBreakdown")}</p>
              <div className="flex justify-between font-medium"><span>{t("chauffeur.booking.total")}</span><span>${costBreakdown.total}</span></div>
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={isCreating || !startDate || !endDate || !selectedVehicleId}>
            {isCreating ? "..." : t("chauffeur.booking.confirmBooking")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
