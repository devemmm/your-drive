import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import CustomLoader from "@/components/CustomLoader";

type RideLike = {
  id: number;
  departureLocation?: { city?: string; region?: string } | null;
  destinationLocation?: { city?: string; region?: string } | null;
  totalSeats?: number;
  availableSeats?: number;
};

export const TopRoutes: React.FC<{
  rides?: RideLike[];
  loading?: boolean;
  selectedYear?: number;
}> = ({ rides, loading, selectedYear = new Date().getFullYear() }) => {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const counter: Record<string, { route: string; bookings: number }> = {};
    (rides ?? []).forEach((r: any) => {
      // Filter by selected year if createdAt is available
      if (r?.createdAt) {
        const createdAt = new Date(r.createdAt);
        if (!isNaN(createdAt.getTime()) && createdAt.getFullYear() !== selectedYear) {
          return;
        }
      }
      
      const from = r?.departureLocation?.city ?? "";
      const to = r?.destinationLocation?.city ?? "";
      if (!from || !to) return;
      const key = `${from}→${to}`;
      const bookedSeats = Math.max(
        0,
        (r?.totalSeats ?? 0) - (r?.availableSeats ?? 0)
      );
      if (!counter[key]) counter[key] = { route: key, bookings: 0 };
      counter[key].bookings += bookedSeats;
    });
    return Object.values(counter)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 7);
  }, [rides, selectedYear]);

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-600 dark:text-gray-300">
          {t("AdminDashboard.TopRoutes.title", "Top booked routes")}
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          {t(
            "AdminDashboard.TopRoutes.description",
            "Most frequently booked city pairs"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <CustomLoader />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 20, right: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                strokeOpacity={0.2}
              />
              <XAxis
                type="number"
                stroke="#6b7280"
                tick={{ fill: "#6b7280" }}
              />
              <YAxis
                type="category"
                dataKey="route"
                stroke="#6b7280"
                tick={{ fill: "#6b7280" }}
                width={120}
              />
              <Tooltip
                contentStyle={{ background: "#fff", borderColor: "#e5e7eb" }}
              />
              <Bar
                dataKey="bookings"
                fill="#1A6373"
                radius={[0, 4, 4, 0]}
                name={t("AdminDashboard.TopRoutes.bookings", "Bookings")}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default TopRoutes;
