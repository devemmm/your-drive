import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useTranslation } from "react-i18next";

interface BarChartComponentProps {
  statsRides?: any[];
  statsTransactions?: any[];
  selectedYear?: number;
}

export function BarChartComponent({
  statsRides,
  statsTransactions,
  selectedYear = new Date().getFullYear(),
}: BarChartComponentProps) {
  const { t, i18n } = useTranslation();

  const processRevenueData = (rides: any[], transactions: any[]) => {
    const monthLabels = Array.from({ length: 12 }, (_, i) =>
      new Date(selectedYear, i, 1).toLocaleString(i18n?.language || "en", {
        month: "short",
      })
    );

    const monthlyData: Record<
      string,
      { serviceFees: number; driverEarnings: number }
    > = {};

    monthLabels.forEach((m) => {
      monthlyData[m] = { serviceFees: 0, driverEarnings: 0 };
    });

    // Process rides for driver earnings
    (rides || []).forEach((ride: any) => {
      const createdAt = ride?.createdAt ? new Date(ride.createdAt) : null;
      if (!createdAt || isNaN(createdAt.getTime())) return;
      
      // Filter by selected year
      if (createdAt.getFullYear() !== selectedYear) return;
      
      const month = monthLabels[createdAt.getMonth()];
      const contribution = ride?.contribution || 0;
      monthlyData[month].driverEarnings += contribution;
      // Assuming 10% service fee
      monthlyData[month].serviceFees += contribution * 0.1;
    });

    // Process transactions for additional revenue data
    (transactions || []).forEach((transaction: any) => {
      const createdAt = transaction?.createdAt
        ? new Date(transaction.createdAt)
        : null;
      if (!createdAt || isNaN(createdAt.getTime())) return;
      
      // Filter by selected year
      if (createdAt.getFullYear() !== selectedYear) return;
      
      const month = monthLabels[createdAt.getMonth()];
      const amount = transaction?.amount || 0;

      // Only count completed transactions
      if (transaction.status === "COMPLETED") {
        // For ride payments, calculate service fee as 10% of the transaction amount
        if (transaction.type === "RIDE_PAYMENT") {
          monthlyData[month].serviceFees += amount * 0.1;
        }
        // For booking fees, the full amount is service fee
        else if (transaction.type === "BOOKING_FEE") {
          monthlyData[month].serviceFees += amount;
        }
        // For platform fees, the full amount is service fee
        else if (transaction.type === "PLATFORM_FEE") {
          monthlyData[month].serviceFees += amount;
        }
      }
    });

    return monthLabels.map((m) => ({
      month: m,
      serviceFees: Math.round(monthlyData[m].serviceFees),
      driverEarnings: Math.round(monthlyData[m].driverEarnings),
    }));
  };

  const revenueData = React.useMemo(
    () => processRevenueData(statsRides || [], statsTransactions || []),
    [statsRides, statsTransactions, selectedYear, i18n?.language]
  );
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-600 dark:text-gray-300">
          {t("AdminDashboard.RevenueBreakdown.title")} {/* Translated title */}
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          {t("AdminDashboard.RevenueBreakdown.description")}{" "}
          {/* Translated description */}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.2}
            />
            <XAxis
              dataKey="month"
              stroke="#6b7280"
              tick={{ fill: "#6b7280" }}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: "#6b7280" }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              formatter={(value, name) => [`$${value}`, name]}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderColor: "#e5e7eb",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                color: "#111827",
              }}
            />
            <Legend
              wrapperStyle={{
                color: "#111827",
                paddingTop: "10px",
              }}
            />
            <Bar
              dataKey="driverEarnings"
              stackId="a"
              fill="#3b82f6" // Blue-500
              name={t("AdminDashboard.RevenueBreakdown.driverEarnings")}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="serviceFees"
              stackId="a"
              fill="#10b981" // Emerald-500
              name={t("AdminDashboard.RevenueBreakdown.serviceFees")}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
