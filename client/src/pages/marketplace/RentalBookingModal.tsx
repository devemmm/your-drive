import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRentalMutations } from "@/hooks/useRentals";
import { differenceInHours, differenceInDays } from "date-fns";
import type { RentalVehicleListing, RentalType } from "@/lib/types";

interface RentalBookingModalProps {
  vehicle: RentalVehicleListing | null;
  open: boolean;
  onClose: () => void;
}

export const RentalBookingModal: React.FC<RentalBookingModalProps> = ({ vehicle, open, onClose }) => {
  const { t } = useTranslation();
  const { createRental, isCreating } = useRentalMutations();
  const [rentalType, setRentalType] = useState<RentalType>("DAILY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickupNotes, setPickupNotes] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  const costBreakdown = useMemo(() => {
    if (!vehicle || !startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return null;
    let rentalCost = 0;
    if (rentalType === "HOURLY" && vehicle.hourlyRate) {
      const hours = differenceInHours(end, start);
      rentalCost = hours * parseFloat(vehicle.hourlyRate);
    } else if (rentalType === "DAILY" && vehicle.dailyRate) {
      const days = Math.max(1, differenceInDays(end, start));
      rentalCost = days * parseFloat(vehicle.dailyRate);
    }
    const deposit = vehicle.securityDeposit ? parseFloat(vehicle.securityDeposit) : 0;
    return { rentalCost: rentalCost.toFixed(2), deposit: deposit.toFixed(2), total: (rentalCost + deposit).toFixed(2) };
  }, [vehicle, startDate, endDate, rentalType]);

  const handleSubmit = () => {
    if (!vehicle || !startDate || !endDate) return;
    createRental(
      { vehicleId: vehicle.id, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), rentalType, pickupNotes: pickupNotes || undefined, returnNotes: returnNotes || undefined },
      { onSuccess: () => { onClose(); setStartDate(""); setEndDate(""); setPickupNotes(""); setReturnNotes(""); } }
    );
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("rental.booking.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-medium">{vehicle.make} {vehicle.model}{vehicle.year ? ` (${vehicle.year})` : ""}</p>
            <p className="text-sm text-muted-foreground">{vehicle.user.name}</p>
          </div>
          <div>
            <Label>{t("rental.booking.rentalType")}</Label>
            <Select value={rentalType} onValueChange={(v) => setRentalType(v as RentalType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vehicle.hourlyRate && <SelectItem value="HOURLY">{t("rental.booking.hourly")} (${vehicle.hourlyRate}/hr)</SelectItem>}
                {vehicle.dailyRate && <SelectItem value="DAILY">{t("rental.booking.daily")} (${vehicle.dailyRate}/day)</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("rental.booking.startDate")}</Label><Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>{t("rental.booking.endDate")}</Label><Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div><Label>{t("rental.booking.pickupNotes")}</Label><Textarea value={pickupNotes} onChange={(e) => setPickupNotes(e.target.value)} placeholder={t("rental.booking.pickupNotes")} rows={2} /></div>
          <div><Label>{t("rental.booking.returnNotes")}</Label><Textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder={t("rental.booking.returnNotes")} rows={2} /></div>
          {costBreakdown && (
            <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
              <p className="font-medium">{t("rental.booking.costBreakdown")}</p>
              <div className="flex justify-between"><span>{t("rental.booking.rentalCost")}</span><span>${costBreakdown.rentalCost}</span></div>
              {parseFloat(costBreakdown.deposit) > 0 && <div className="flex justify-between"><span>{t("rental.booking.securityDeposit")}</span><span>${costBreakdown.deposit}</span></div>}
              <div className="flex justify-between font-medium border-t pt-1"><span>{t("rental.booking.total")}</span><span>${costBreakdown.total}</span></div>
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={isCreating || !startDate || !endDate}>
            {isCreating ? "..." : t("rental.booking.confirmBooking")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
