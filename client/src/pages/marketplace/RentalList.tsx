import React from "react";
import { useTranslation } from "react-i18next";
import { RentalCard } from "./RentalCard";
import { useAvailableRentals } from "@/hooks/useRentals";
import { Loader2 } from "lucide-react";
import type { RentalVehicleListing, VehicleCategory } from "@/lib/types";

interface RentalListProps {
  filters: {
    city?: string;
    category?: VehicleCategory | "";
    minDailyRate?: number;
    maxDailyRate?: number;
    startDate?: string;
    endDate?: string;
  };
  onBook: (vehicle: RentalVehicleListing) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export const RentalList: React.FC<RentalListProps> = ({ filters, onBook, page, onPageChange }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useAvailableRentals({ ...filters, page, pageSize: 12 });
  const vehicles = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("marketplace.filters.noResults")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("marketplace.filters.noResultsDescription")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <RentalCard key={vehicle.id} vehicle={vehicle} onBook={onBook} />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="px-3 py-1 rounded border disabled:opacity-50">Previous</button>
          <span className="px-3 py-1">{page} / {pagination.totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= pagination.totalPages} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};
