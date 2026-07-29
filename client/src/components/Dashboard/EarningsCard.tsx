import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

export default function EarningsCard() {
  const { t } = useTranslation();

  return (
    <Card className="w-full md:w-[600px] mx-auto  mt-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="border-b border-gray-100 dark:border-gray-700">
        <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300">
          <DollarSign className="text-emerald-600 dark:text-emerald-400" />
          <span>{t("DriverDashboard.earnings.title")}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-5">
          {/* Balance */}
          <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
            <div>
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                {t("DriverDashboard.earnings.balance")}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {t("DriverDashboard.earnings.availableNow")}
              </p>
            </div>
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              $69.00
            </span>
          </div>

          {/* Month Earnings */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">
              {t("DriverDashboard.earnings.month")}
            </span>
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="font-medium">$45.00</span>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">
              {t("DriverDashboard.earnings.total")}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              $127.00
            </span>
          </div>

          {/* Withdraw Button */}
          <Button
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            variant="default"
          >
            <Wallet className="h-4 w-4" />
            {t("DriverDashboard.earnings.withdraw")}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 p-3 border-t border-gray-200 dark:border-gray-700">
        {t("DriverDashboard.earnings.nextPayout")} June 15
      </CardFooter>
    </Card>
  );
}
