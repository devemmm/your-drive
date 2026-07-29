import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
import { useAllUsersForStats } from "@/data";
import React from "react";

interface UserGrowthProps {
  statsUsers?: any[];
  selectedYear?: number;
}

export function UserGrowth({ statsUsers, selectedYear = new Date().getFullYear() }: UserGrowthProps) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useAllUsersForStats();
  const users = statsUsers || data?.data || [];
  const loading = isLoading && !statsUsers;

  const processUserDataForChart = (userData: any[]) => {
    // Localized month labels for selected year
    const monthLabels = Array.from({ length: 12 }, (_, i) =>
      new Date(selectedYear, i, 1).toLocaleString(i18n?.language || "en", {
        month: "short",
      })
    );

    const monthlyData: Record<string, { Admins: number; Users: number }> = {};

    monthLabels.forEach((m) => {
      monthlyData[m] = { Admins: 0, Users: 0 };
    });

    (userData || []).forEach((u: any) => {
      const createdAt = u?.createdAt ? new Date(u.createdAt) : null;
      if (!createdAt || isNaN(createdAt.getTime())) return;
      
      // Filter by selected year
      if (createdAt.getFullYear() !== selectedYear) return;
      
      const month = monthLabels[createdAt.getMonth()];
      const roles: string[] = Array.isArray(u?.roles)
        ? u.roles
        : [u?.role].filter(Boolean);
      const isAdmin = roles?.some((r) => String(r).toUpperCase() === "ADMIN");
      const isUser = roles?.some(
        (r) =>
          String(r).toUpperCase() === "USER" ||
          String(r).toUpperCase() === "PASSENGER" ||
          String(r).toUpperCase() === "DRIVER"
      );

      if (isAdmin) monthlyData[month].Admins += 1;
      if (isUser) monthlyData[month].Users += 1;
      if (!isAdmin && !isUser) monthlyData[month].Users += 1; // fallback count to Users
    });

    return monthLabels.map((m) => ({
      month: m,
      Admins: monthlyData[m].Admins,
      Users: monthlyData[m].Users,
    }));
  };

  const userGrowthData = React.useMemo(
    () => processUserDataForChart(users),
    [users, selectedYear, i18n?.language]
  );

  if (loading) {
    return (
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-600 dark:text-gray-300">
            {t("AdminDashboard.UserGrowth.title")}
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            {t("AdminDashboard.UserGrowth.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center dark:text-gray-400">
          Loading user data...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-600 dark:text-gray-300">
          {t("AdminDashboard.UserGrowth.title")}
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          {t("AdminDashboard.UserGrowth.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={userGrowthData}>
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
            <YAxis stroke="#6b7280" tick={{ fill: "#6b7280" }} />
            <Tooltip
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
              }}
            />
            <Line
              type="monotone"
              dataKey="Admins"
              stroke="#3b82f6"
              strokeWidth={2}
              activeDot={{ r: 6 }}
              name={t("AdminDashboard.UserGrowth.admins", "Admins")}
            />
            <Line
              type="monotone"
              dataKey="Users"
              stroke="#10b981"
              strokeWidth={2}
              activeDot={{ r: 6 }}
              name={t("AdminDashboard.UserGrowth.users", "Users")}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
