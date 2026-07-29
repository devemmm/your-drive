import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSingleTransaction } from "@/data";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatPaymentProvider } from "@/lib/utils";
import {
  User,
  CreditCard,
  Calendar,
  DollarSign,
  Hash,
  MapPin,
  FileText,
  Loader2,
  Car,
  Clock,
} from "lucide-react";

interface TransactionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: number | null;
}

export const TransactionDetailsDialog: React.FC<
  TransactionDetailsDialogProps
> = ({ open, onOpenChange, transactionId }) => {
  const { t } = useTranslation();

  const { data: transaction, isLoading } = useSingleTransaction({
    transactionId: transactionId || 0,
    enabled: !!transactionId && open,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "ONHOLD":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "REFUNDED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "PARTIALLY_REFUNDED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "RIDE_PAYMENT":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "REFUND":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "RIDE_BOOKING":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl dark:bg-gray-900"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-gray-500 dark:text-gray-400">
                {t("common.loading")}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!transaction) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl dark:bg-gray-900"
          style={{ zIndex: 9999 }}
        >
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {t("transactions.notFound")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900"
        style={{ zIndex: 9999 }}
      >
        <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-2xl font-bold dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-xl font-semibold">
                {t("dashboard_.transactions.details.title")} #{transaction.id}
              </div>
              <div className="text-sm font-normal text-gray-500 dark:text-gray-400">
                {t(
                  "dashboard_.transactions.details.subtitle",
                  "Complete transaction information"
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Transaction Overview */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t(
                      "dashboard_.transactions.details.transactionOverview",
                      "Transaction Overview"
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t(
                      "dashboard_.transactions.details.transactionId",
                      "Transaction ID"
                    )}
                    : #{transaction.id}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${transaction.amount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {format(
                    new Date(transaction.createdAt),
                    "MMM dd, yyyy HH:mm"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status and Type Badges */}
          <div className="flex gap-3">
            <Badge
              className={`${getStatusColor(transaction.status)} px-3 py-1`}
            >
              {t(
                `dashboard_.transactions.status.${transaction.status.toLowerCase()}`
              )}
            </Badge>
            <Badge className={`${getTypeColor(transaction.type)} px-3 py-1`}>
              {t(
                `dashboard_.transactions.type.${transaction.type.toLowerCase()}`
              )}
            </Badge>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {t(
                    "dashboard_.transactions.details.userInfo",
                    "User Information"
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-700">
                {transaction.user.profileImage && (
                  <img
                    src={transaction.user.profileImage.url}
                    alt={transaction.user.name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium dark:text-white">
                    {transaction.user.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {transaction.user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {t(
                    "dashboard_.transactions.details.paymentInfo",
                    "Payment Information"
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {t("dashboard_.transactions.details.provider", "Provider")}
                  </span>
                  <span className="text-sm font-medium dark:text-white">
                    {formatPaymentProvider(transaction.paymentProvider, transaction.type === "RIDE_BOOKING" || transaction.type === "BOOKING")}
                  </span>
                </div>
                {transaction.paymentIntentId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t(
                        "dashboard_.transactions.details.paymentIntentId",
                        "Payment Intent ID"
                      )}
                    </span>
                    <span className="text-sm font-medium dark:text-white font-mono">
                      {transaction.paymentIntentId}
                    </span>
                  </div>
                )}
                {transaction.refundId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t(
                        "dashboard_.transactions.details.refundId",
                        "Refund ID"
                      )}
                    </span>
                    <span className="text-sm font-medium dark:text-white font-mono">
                      {transaction.refundId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Ride Information */}
            {transaction.ride && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Car className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold dark:text-white">
                    {t(
                      "dashboard_.transactions.details.rideInfo",
                      "Ride Information"
                    )}
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("dashboard_.transactions.details.rideId", "Ride ID")}
                    </span>
                    <span className="text-sm font-medium dark:text-white">
                      #{transaction.ride.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t(
                        "dashboard_.transactions.details.rideStatus",
                        "Ride Status"
                      )}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {transaction.ride.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t("dashboard_.transactions.details.route", "Route")}
                    </span>
                    <span className="text-sm font-medium dark:text-white text-right max-w-[200px]">
                      {transaction.ride.startLocation} →{" "}
                      {transaction.ride.endLocation}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Information */}
            {transaction.plan && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold dark:text-white">
                    {t(
                      "dashboard_.transactions.details.subscriptionInfo",
                      "Subscription Information"
                    )}
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t(
                        "dashboard_.transactions.details.planName",
                        "Plan Name"
                      )}
                    </span>
                    <span className="text-sm font-medium dark:text-white">
                      {transaction.plan.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t(
                        "dashboard_.transactions.details.planType",
                        "Plan Type"
                      )}
                    </span>
                    <span className="text-sm font-medium dark:text-white">
                      {transaction.plan.type}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          {transaction.metadata &&
            Object.keys(transaction.metadata).length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold dark:text-white">
                    {t(
                      "dashboard_.transactions.details.metadata",
                      "Additional Information"
                    )}
                  </h3>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-gray-700">
                  <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {JSON.stringify(transaction.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            {t("dashboard_.common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
