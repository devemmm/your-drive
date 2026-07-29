import React from "react";
import { useTranslation } from "react-i18next";
import { ChauffeurCard } from "./ChauffeurCard";
import { useAvailableDrivers } from "@/hooks/useChauffeur";
import { Loader2 } from "lucide-react";
import type { ChauffeurDriverListing } from "@/lib/types";

interface ChauffeurListProps {
  filters: {
    minHourlyRate?: number;
    maxHourlyRate?: number;
    minDailyRate?: number;
    maxDailyRate?: number;
    startDate?: string;
    endDate?: string;
  };
  onBook: (driver: ChauffeurDriverListing) => void;
  page: number;
  onPageChange: (page: number) => void;
}

export const ChauffeurList: React.FC<ChauffeurListProps> = ({ filters, onBook, page, onPageChange }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useAvailableDrivers({ ...filters, page, pageSize: 12 });
  const drivers = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (drivers.length === 0) {
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
        {drivers.map((driver) => (
          <ChauffeurCard key={driver.id} driver={driver} onBook={onBook} />
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
