import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { RentalList } from "./RentalList";
import { ChauffeurList } from "./ChauffeurList";
import { RentalBookingModal } from "./RentalBookingModal";
import { ChauffeurBookingModal } from "./ChauffeurBookingModal";
import BookARide from "@/pages/ride/book";
import type { RentalVehicleListing, ChauffeurDriverListing, VehicleCategory } from "@/lib/types";

type ServiceTab = "rides" | "rentals" | "chauffeur";

const Marketplace: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as ServiceTab) || "rides";

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
    setRentalPage(1);
    setChauffeurPage(1);
  };

  // Rental filters
  const [rentalCity, setRentalCity] = useState("");
  const [rentalCategory, setRentalCategory] = useState<VehicleCategory | "">("");
  const [rentalMinPrice, setRentalMinPrice] = useState("");
  const [rentalMaxPrice, setRentalMaxPrice] = useState("");
  const [rentalPage, setRentalPage] = useState(1);

  // Chauffeur filters
  const [chauffeurMinPrice, setChauffeurMinPrice] = useState("");
  const [chauffeurMaxPrice, setChauffeurMaxPrice] = useState("");
  const [chauffeurPage, setChauffeurPage] = useState(1);

  // Booking modals
  const [selectedRentalVehicle, setSelectedRentalVehicle] = useState<RentalVehicleListing | null>(null);
  const [selectedChauffeurDriver, setSelectedChauffeurDriver] = useState<ChauffeurDriverListing | null>(null);

  const clearRentalFilters = () => {
    setRentalCity("");
    setRentalCategory("");
    setRentalMinPrice("");
    setRentalMaxPrice("");
    setRentalPage(1);
  };

  const clearChauffeurFilters = () => {
    setChauffeurMinPrice("");
    setChauffeurMaxPrice("");
    setChauffeurPage(1);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{t("marketplace.title")}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="rides">{t("marketplace.tabs.rides")}</TabsTrigger>
          <TabsTrigger value="rentals">{t("marketplace.tabs.rentals")}</TabsTrigger>
          <TabsTrigger value="chauffeur">{t("marketplace.tabs.chauffeur")}</TabsTrigger>
        </TabsList>

        <TabsContent value="rides">
          <BookARide />
        </TabsContent>

        <TabsContent value="rentals">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Input placeholder={t("marketplace.filters.location")} value={rentalCity} onChange={(e) => setRentalCity(e.target.value)} className="w-full" />
              </div>
              <div className="w-[150px]">
                <Select value={rentalCategory} onValueChange={(v) => setRentalCategory(v as VehicleCategory | "")}>
                  <SelectTrigger><SelectValue placeholder={t("marketplace.filters.vehicleCategory")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAR">{t("marketplace.filters.car")}</SelectItem>
                    <SelectItem value="MOTORBIKE">{t("marketplace.filters.motorbike")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[120px]">
                <Input type="number" placeholder={t("marketplace.filters.minPrice")} value={rentalMinPrice} onChange={(e) => setRentalMinPrice(e.target.value)} />
              </div>
              <div className="w-[120px]">
                <Input type="number" placeholder={t("marketplace.filters.maxPrice")} value={rentalMaxPrice} onChange={(e) => setRentalMaxPrice(e.target.value)} />
              </div>
              <Button variant="ghost" size="icon" onClick={clearRentalFilters}><X className="h-4 w-4" /></Button>
            </div>
            <RentalList
              filters={{
                city: rentalCity || undefined,
                category: rentalCategory || undefined,
                minDailyRate: rentalMinPrice ? parseFloat(rentalMinPrice) : undefined,
                maxDailyRate: rentalMaxPrice ? parseFloat(rentalMaxPrice) : undefined,
              }}
              onBook={setSelectedRentalVehicle}
              page={rentalPage}
              onPageChange={setRentalPage}
            />
          </div>
        </TabsContent>

        <TabsContent value="chauffeur">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-[120px]">
                <Input type="number" placeholder={t("marketplace.filters.minPrice")} value={chauffeurMinPrice} onChange={(e) => setChauffeurMinPrice(e.target.value)} />
              </div>
              <div className="w-[120px]">
                <Input type="number" placeholder={t("marketplace.filters.maxPrice")} value={chauffeurMaxPrice} onChange={(e) => setChauffeurMaxPrice(e.target.value)} />
              </div>
              <Button variant="ghost" size="icon" onClick={clearChauffeurFilters}><X className="h-4 w-4" /></Button>
            </div>
            <ChauffeurList
              filters={{
                minDailyRate: chauffeurMinPrice ? parseFloat(chauffeurMinPrice) : undefined,
                maxDailyRate: chauffeurMaxPrice ? parseFloat(chauffeurMaxPrice) : undefined,
              }}
              onBook={setSelectedChauffeurDriver}
              page={chauffeurPage}
              onPageChange={setChauffeurPage}
            />
          </div>
        </TabsContent>
      </Tabs>

      <RentalBookingModal vehicle={selectedRentalVehicle} open={!!selectedRentalVehicle} onClose={() => setSelectedRentalVehicle(null)} />
      <ChauffeurBookingModal driver={selectedChauffeurDriver} open={!!selectedChauffeurDriver} onClose={() => setSelectedChauffeurDriver(null)} />
    </div>
  );
};

export default Marketplace;
