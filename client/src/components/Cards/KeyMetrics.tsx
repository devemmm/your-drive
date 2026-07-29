import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UserCheck, MapPin, Star, TrendingUp, Car } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

interface TopListItem {
  name: string;
  value: number;
  change: number;
}

interface EnhancedListCardProps {
  title: string;
  items: TopListItem[];
  icon: React.ReactNode;
  chartType?: "line" | "bar";
  valueSuffix?: string;
}

const EnhancedListCard = ({
  title,
  items,
  icon,
  chartType = "line",
  valueSuffix = "",
}: EnhancedListCardProps) => {
  const { theme } = useTheme();
  return (
    <Card className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md dark:hover:shadow-lg transition-shadow flex flex-col h-fit mt-5">
      <CardHeader className="flex flex-row items-center justify-between pb-1 bg-gray-50/50 dark:bg-gray-700/50 px-4 py-3 rounded-t-lg border-b dark:border-gray-700">
        <CardTitle className="font-semibold text-gray-600 dark:text-gray-300 tracking-wide">
          {title}
        </CardTitle>
        <div className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          {icon}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 px-4 py-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <span
                className={`font-medium ${
                  index < 3
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 w-5 h-5 flex items-center justify-center rounded-full text-xs"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {index + 1}
              </span>
              <span className="truncate max-w-[120px]">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {item.value}
                {valueSuffix}
              </span>
              <span
                className={`font-medium px-2 py-1 rounded-full text-xs ${
                  item.change >= 0
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                }`}
              >
                {item.change >= 0 ? "↑" : "↓"} {Math.abs(item.change)}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="p-0">
        <div className="h-28 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart data={items}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                    fill: theme === "dark" ? "#9ca3af" : "#6b7280",
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                    fill: theme === "dark" ? "#9ca3af" : "#6b7280",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                    borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    color: theme === "dark" ? "#f3f4f6" : "#111827",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={500}
                />
              </LineChart>
            ) : (
              <BarChart data={items}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                    fill: theme === "dark" ? "#9ca3af" : "#6b7280",
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 12,
                    fill: theme === "dark" ? "#9ca3af" : "#6b7280",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
                    borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    color: theme === "dark" ? "#f3f4f6" : "#111827",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  animationDuration={500}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardFooter>
    </Card>
  );
};

export const KeyRidesMetrics = () => {
  const { t } = useTranslation();
  // Sample data - replace with your actual data
  const topDestinations = [
    { name: "New York", value: 128, change: 12 },
    { name: "Los Angeles", value: 95, change: 5 },
    { name: "Chicago", value: 78, change: 18 },
  ];

  const topBookedRides = [
    { name: "Airport Express", value: 56, change: 24 },
    { name: "City Commuter", value: 42, change: 15 },
    { name: "Night Rider", value: 38, change: -5 },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto my-5">
      <EnhancedListCard
        title={t("AdminDashboard.TopDestinations.title")}
        items={topDestinations}
        icon={<MapPin className="h-4 w-4 text-blue-500" />}
        chartType="line"
        valueSuffix={t("AdminDashboard.TopDestinations.suffix")}
      />
      <EnhancedListCard
        title={t("AdminDashboard.TopBookedRide.title")}
        items={topBookedRides}
        icon={<Car className="h-4 w-4 text-yellow-500" />}
        chartType="line"
        valueSuffix={t("AdminDashboard.TopBookedRide.suffix")}
      />
    </div>
  );
};

export const KeyCustomerMetrics = () => {
  const { t } = useTranslation();
  // Sample data - replace with your actual data
  const topBookers = [
    { name: "Sarah Johnson", value: 42, change: 8 },
    { name: "Michael Brown", value: 38, change: 12 },
    { name: "Emma Wilson", value: 35, change: -2 },
  ];

  const newJoinedRiders = [
    { name: "Alex Turner", value: 28, change: 5 },
    { name: "Jamie Lee", value: 25, change: 8 },
    { name: "Taylor Swift", value: 22, change: 12 },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto my-5">
      <EnhancedListCard
        title={t("AdminDashboard.TopBookers.title")}
        items={topBookers}
        icon={<UserCheck className="h-4 w-4 text-purple-500" />}
        chartType="bar"
        valueSuffix={t("AdminDashboard.TopBookers.valueSuffix")}
      />
      <EnhancedListCard
        title={t("AdminDashboard.NewJoinedRiders.title")}
        items={newJoinedRiders}
        icon={<TrendingUp className="h-4 w-4 text-green-500" />}
        chartType="bar"
        valueSuffix={t("AdminDashboard.NewJoinedRiders.valueSuffix")}
      />
    </div>
  );
};
