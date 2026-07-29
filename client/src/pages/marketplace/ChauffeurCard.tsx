import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Car, Bike } from "lucide-react";
import type { ChauffeurDriverListing } from "@/lib/types";

interface ChauffeurCardProps {
  driver: ChauffeurDriverListing;
  onBook: (driver: ChauffeurDriverListing) => void;
}

export const ChauffeurCard: React.FC<ChauffeurCardProps> = ({ driver, onBook }) => {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {driver.profileImage?.url ? (
              <img src={driver.profileImage.url} alt={driver.name} className="w-full h-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{driver.name}</h3>
          </div>
        </div>
        {driver.chauffeurDescription && (
          <p className="text-sm text-muted-foreground line-clamp-2">{driver.chauffeurDescription}</p>
        )}
        <div className="flex gap-3 text-sm">
          {driver.chauffeurHourlyRate && <span className="font-medium">${driver.chauffeurHourlyRate}{t("chauffeur.card.perHour")}</span>}
          {driver.chauffeurDailyRate && <span className="font-medium">${driver.chauffeurDailyRate}{t("chauffeur.card.perDay")}</span>}
        </div>
        {driver.vehicles.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{t("chauffeur.card.vehicles")}</p>
            <div className="flex flex-wrap gap-1">
              {driver.vehicles.map((v) => (
                <Badge key={v.id} variant="outline" className="text-xs">
                  {v.category === "MOTORBIKE" ? <Bike className="h-3 w-3 mr-1" /> : <Car className="h-3 w-3 mr-1" />}
                  {v.make} {v.model}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <Button className="w-full" onClick={() => onBook(driver)}>{t("chauffeur.card.bookNow")}</Button>
      </CardContent>
    </Card>
  );
};
