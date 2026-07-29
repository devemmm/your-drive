import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useTheme } from "@/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { useRides } from "@/hooks/useRides";
import React from "react";

interface RideCompletionProps {
  statsRides?: any[];
  selectedYear?: number;
}

export function RideCompletion({ statsRides, selectedYear = new Date().getFullYear() }: RideCompletionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { rides, loading } = useRides();
  const allRides = statsRides || rides || [];
  const isLoading = loading && !statsRides;

  const processRideDataForChart = (allRides) => {
    // Filter rides by selected year
    const filteredRides = allRides.filter((ride: any) => {
      const createdAt = ride?.createdAt ? new Date(ride.createdAt) : null;
      if (!createdAt || isNaN(createdAt.getTime())) return false;
      return createdAt.getFullYear() === selectedYear;
    });
    
    const completedRides = filteredRides.filter(
      (ride) => ride.status === "COMPLETED"
    ).length;
    const cancelledRides = filteredRides.filter(
      (ride) => ride.status === "CANCELLED"
    ).length;
    const totalRides = completedRides + cancelledRides;

    if (totalRides === 0) {
      return null;
    }

    const completedPercentage = (completedRides / totalRides) * 100;
    const cancelledPercentage = (cancelledRides / totalRides) * 100;

    return [
      {
        name: t("AdminDashboard.RideCompletionRate.completed"),
        value: parseFloat(completedPercentage.toFixed(2)),
      },
      {
        name: t("AdminDashboard.RideCompletionRate.cancelled"),
        value: parseFloat(cancelledPercentage.toFixed(2)),
      },
    ];
  };

  const rideData = React.useMemo(
    () => processRideDataForChart(allRides),
    [allRides, selectedYear, t]
  );

  const renderCustomLabel = ({ name, percent }) =>
    `${name}: ${(percent * 100).toFixed(0)}%`;

  if (isLoading) {
    return (
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-600 dark:text-gray-300">
            {t("AdminDashboard.RideCompletionRate.title")}
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            {t("AdminDashboard.RideCompletionRate.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center dark:text-gray-400">
          Loading ride data...
        </CardContent>
      </Card>
    );
  }

  if (!rideData) {
    return (
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-600 dark:text-gray-300">
            {t("AdminDashboard.RideCompletionRate.title")}
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            {t("AdminDashboard.RideCompletionRate.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center dark:text-gray-400">
          No ride data available to display.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-600 dark:text-gray-300">
          {t("AdminDashboard.RideCompletionRate.title")}
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          {t("AdminDashboard.RideCompletionRate.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rideData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {rideData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? "#3b82f6" : "#10b981"}
                  stroke={theme === "dark" ? "#1f2937" : "#ffffff"}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value}%`, `${name}`]}
              contentStyle={{
                backgroundColor: theme === "dark" ? "#ffffff" : "#ffffff",
                borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                borderRadius: "0.5rem",
                color: theme === "dark" ? "#f3f4f6" : "#111827",
              }}
            />
            <Legend
              wrapperStyle={{
                color: theme === "dark" ? "#f3f4f6" : "#111827",
                paddingTop: "20px",
              }}
              formatter={(value) => (
                <span className="text-sm dark:text-gray-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
