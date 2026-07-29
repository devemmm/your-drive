import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Bike, MapPin, Gauge } from "lucide-react";
import type { RentalVehicleListing } from "@/lib/types";

interface RentalCardProps {
  vehicle: RentalVehicleListing;
  onBook: (vehicle: RentalVehicleListing) => void;
}

export const RentalCard: React.FC<RentalCardProps> = ({ vehicle, onBook }) => {
  const { t } = useTranslation();
  const imageUrl = vehicle.defaultImage?.url || (vehicle.files.length > 0 ? vehicle.files[0].url : null);
  const CategoryIcon = vehicle.category === "MOTORBIKE" ? Bike : Car;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <Badge variant={vehicle.category === "MOTORBIKE" ? "secondary" : "default"} className="absolute top-2 right-2">
          <CategoryIcon className="h-3 w-3 mr-1" />
          {t(`marketplace.filters.${vehicle.category.toLowerCase()}`)}
        </Badge>
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg">{vehicle.make} {vehicle.model}{vehicle.year ? ` (${vehicle.year})` : ""}</h3>
          <p className="text-sm text-muted-foreground">{vehicle.user.name}</p>
        </div>
        <div className="flex gap-3 text-sm">
          {vehicle.hourlyRate && <span className="font-medium">${vehicle.hourlyRate}{t("rental.card.perHour")}</span>}
          {vehicle.dailyRate && <span className="font-medium">${vehicle.dailyRate}{t("rental.card.perDay")}</span>}
        </div>
        {vehicle.securityDeposit && (
          <p className="text-xs text-muted-foreground">{t("rental.card.deposit")}: ${vehicle.securityDeposit}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {vehicle.mileageLimit ? (
            <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{t("rental.card.mileageLimit", { limit: vehicle.mileageLimit })}</span>
          ) : (
            <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{t("rental.card.unlimitedMileage")}</span>
          )}
        </div>
        {vehicle.pickupLocation && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{vehicle.pickupLocation.city}, {vehicle.pickupLocation.region}
          </p>
        )}
        <Button className="w-full" onClick={() => onBook(vehicle)}>{t("rental.card.bookNow")}</Button>
      </CardContent>
    </Card>
  );
};
