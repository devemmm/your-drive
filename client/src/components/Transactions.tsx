import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  CreditCard,
  User,
  CalendarDays,
  Car,
  Loader2,
  Wallet,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  DollarSign,
  Calculator,
  FileText,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaSpinner } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { AlertDialogHeader } from "./ui/alert-dialog";
import CustomLoader from "./CustomLoader";
import Pagination from "./Dashboard/Pagination";
import { useAllTransactionsPaginated } from "@/data";
import { Link } from "react-router-dom";
import { formatPaymentProvider } from "@/lib/utils";

const Transactions = () => {
  const [filters, setFilters] = useState({
    status: "",
    paymentProvider: "",
    minAmount: undefined,
    maxAmount: undefined,
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const { data, isLoading, isFetching } = useAllTransactionsPaginated(
    page,
    40,
    appliedFilters,
  );

  const { t } = useTranslation();

  const transactions = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const sortedItems = useMemo(() => {
    if (!sortConfig) return transactions; // or bookings, depending on which component you're in

    return [...transactions].sort((a, b) => {
      // Handle different data types appropriately
      if (sortConfig.key === "createdAt" || sortConfig.key === "date") {
        // Date comparison
        const dateA = new Date(a[sortConfig.key]);
        const dateB = new Date(b[sortConfig.key]);
        return sortConfig.direction === "ascending"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      } else if (sortConfig.key === "amount") {
        // Numeric comparison
        const amountA = a.amount || 0;
        const amountB = b.amount || 0;
        return sortConfig.direction === "ascending"
          ? amountA - amountB
          : amountB - amountA;
      } else if (sortConfig.key === "status") {
        // Status comparison (custom order if needed)
        const statusOrder = ["COMPLETED", "PENDING", "FAILED"]; // Adjust as needed
        const indexA = statusOrder.indexOf(a.status);
        const indexB = statusOrder.indexOf(b.status);
        return sortConfig.direction === "ascending"
          ? indexA - indexB
          : indexB - indexA;
      } else {
        // String comparison for other fields
        const valueA = a[sortConfig.key] || "";
        const valueB = b[sortConfig.key] || "";
        if (valueA < valueB) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      }
    });
  }, [transactions, sortConfig]);

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
      case "PAID":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "PENDING":
      case "ONHOLD":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "FAILED":
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <CustomLoader />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 mb-4">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="border rounded-md px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{t("allStatuses")}</option>
              <option value="PENDING">{t("AdminDashboard.transactions.status.pending", "Pending")}</option>
              <option value="PAID">{t("AdminDashboard.transactions.status.paid", "Paid")}</option>
              <option value="FAILED">{t("AdminDashboard.transactions.status.failed", "Failed")}</option>
              <option value="CANCELLED">{t("AdminDashboard.transactions.status.cancelled", "Cancelled")}</option>
              <option value="ONHOLD">{t("AdminDashboard.transactions.status.onhold", "On Hold")}</option>
              <option value="REFUNDED">{t("AdminDashboard.transactions.status.refunded", "Refunded")}</option>
              <option value="PARTIALLY_REFUNDED">{t("AdminDashboard.transactions.status.partiallyRefunded", "Partially Refunded")}</option>
            </select>

            <select
              value={filters.paymentProvider}
              onChange={(e) =>
                setFilters({ ...filters, paymentProvider: e.target.value })
              }
              className="border rounded-md px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{t("allProviders")}</option>
              <option value="STRIPE">Stripe</option>
              <option value="PAYPAL">PayPal</option>
            </select>

            <input
              type="number"
              placeholder={t("minAmount")}
              value={filters.minAmount ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  minAmount: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              className="border rounded-md px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-32"
            />

            <input
              type="number"
              placeholder={t("maxAmount")}
              value={filters.maxAmount ?? ""}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  maxAmount: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              className="border rounded-md px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-32"
            />

            <Button
              variant="outline"
              onClick={() => setAppliedFilters(filters)}
              className="text-sm"
            >
              {t("applyFilters")}
            </Button>
          </div>

          {/* Transactions Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 text-primary-500 mt-[2px] animate-spin" />
              <span className="ml-2 dark:text-gray-300">{t("loading")}</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
                <CreditCard className="h-full w-full" />
              </div>
              <h3 className="mt-2 text-sm font-medium dark:text-gray-200">
                {t("noTransactions")}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("noTransactionsDescription")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border dark:border-gray-700 relative">
              {isFetching && (
                <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 flex items-center justify-center z-10">
                  <FaSpinner className="h-6 w-6 text-primary-500 animate-spin" />
                </div>
              )}

              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 shadow-sm rounded-lg overflow-hidden">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => requestSort("id")}
                    >
                      <div className="flex items-center gap-1">
                        {t("Transaction.transaction")}
                        {sortConfig?.key === "id" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => requestSort("amount")}
                    >
                      <div className="flex items-center gap-1">
                        {t("Transaction.amount_")}
                        {sortConfig?.key === "amount" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => requestSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        {t("Transaction.status_")}
                        {sortConfig?.key === "status" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => requestSort("type")}
                    >
                      <div className="flex items-center gap-1">
                        {t("Transaction.type")}
                        {sortConfig?.key === "type" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => requestSort("paymentProvider")}
                    >
                      <div className="flex items-center gap-1">
                        {t("Transaction.provider")}
                        {sortConfig?.key === "paymentProvider" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => requestSort("createdAt")}
                    >
                      <div className="flex items-center gap-1">
                        {t("Transaction.dat_e")}
                        {sortConfig?.key === "createdAt" && (
                          <span className="text-xs">
                            {sortConfig.direction === "ascending" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t("Transaction.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedItems.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        #{transaction.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                        {transaction.amount} {transaction.currency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <p className={getStatusColor(transaction.status)}>
                          {t(`common_.small.transaction.${transaction.status}`)}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {t(
                          `common_.small.transaction.type.${transaction.type}`,
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatPaymentProvider(transaction.paymentProvider, transaction.type === "BOOKING")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <TransactionModal transaction={transaction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More Button */}
          <Pagination
            setPage={setPage}
            page={page}
            totalPages={totalPages}
            t={t}
          />
        </>
      )}
    </div>
  );
};

export default Transactions;

const TransactionModal = ({ transaction }) => {
  const { t } = useTranslation();

  const getStatusIcon = (status) => {
    switch (status) {
      case "COMPLETED":
      case "PAID":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "FAILED":
      case "CANCELLED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "ONHOLD":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "PENDING":
        return <Loader2 className="h-5 w-5 text-blue-500" />;
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return <Wallet className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          {t("Transaction.viewDetails", "View Details")}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-2xl h-[97vh] overflow-y-auto dark:bg-gray-900 dark:text-white"
        style={{ zIndex: 9999 }}
      >
        <AlertDialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            {t("Transaction.title", "Transaction")} #{transaction.id}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Transaction.description",
              "Detailed information about this transaction",
            )}
          </DialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Status Card */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  {t("Transaction.paymentStatus", "Payment Status")}
                </CardTitle>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getStatusIcon(transaction.status)}
                  {t(`common_.small.transaction.${transaction.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("Transaction.amount", "Amount")}
                </p>
                <p className="font-medium">
                  {transaction.amount} {transaction.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("Transaction.paymentMethod", "Payment Method")}
                </p>
                <p className="font-medium">{formatPaymentProvider(transaction.paymentProvider, transaction.type === "BOOKING")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("Transaction.date", "Transaction Date")}
                </p>
                <p className="font-medium">
                  {formatDate(transaction.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* User Card */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("Transaction.userInfo", "User Information")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full overflow-hidden">
                  <img
                    src={transaction.user.profileImage.url}
                    alt={transaction.user.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium">{transaction.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.user.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {transaction.user.phoneNumber}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ride Info */}
          {transaction.ride && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {t("Transaction.rideInfo", "Ride Information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transaction.ride.destinationLocation && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("Transaction.departure", "Departure")}
                      </p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {transaction.ride.departureLocation.city}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("Transaction.destination", "Destination")}
                      </p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {transaction.ride.destinationLocation.city}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("Transaction.rideDateTime", "Date & Time")}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(transaction.ride.departureTime)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("Transaction.pricePerSeat", "Price")}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {transaction.ride.contribution.toFixed(2)}{" "}
                      {transaction.currency}{" "}
                      {t("Transaction.perSeat", "per seat")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("Transaction.seats", "Seats")}
                    </p>
                    <p className="font-medium">
                      {transaction.ride.availableSeats}/
                      {transaction.ride.totalSeats}{" "}
                      {t("Transaction.available", "available")}
                    </p>
                  </div>
                </div>

                {transaction.ride.stopovers?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("Transaction.stopovers", "Stopovers")}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {transaction.ride.stopovers.map((stop, index) => (
                        <Badge key={index} variant="outline">
                          {stop.city || stop.locationName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Information */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("common_.pDetails", "Payment Details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t("common_.tAmount", "Total Amount")}
                  </p>
                  <p className="font-medium text-xl text-foreground">
                    {transaction.amount.toFixed(2)} {transaction.currency}
                  </p>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="space-y-4">
                <h4 className="font-medium text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  {t("common_.breakDown", "Amount Breakdown")}
                </h4>

                <div className="space-y-3">
                  {/* Platform Amount */}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      {transaction.type === "SUBSCRIPTION"
                        ? t(
                            "Transaction.subscriptionAmount",
                            "Subscription Amount",
                          )
                        : t("common_.platformAmount", "Platform Amount")}
                    </span>
                    <span className="">
                      {transaction.platformAmount.toFixed(2)}{" "}
                      {transaction.currency}
                    </span>
                  </div>

                  {/* Tax Information */}
                  {transaction.tax && (
                    <div className="space-y-3 border-t pt-3">
                      {/* Taxable Amount */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {t("common_.taxableAmount", "Taxable Amount")}
                        </span>
                        <span className="">
                          {transaction.tax.taxableAmount.toFixed(2)}{" "}
                          {transaction.currency}
                        </span>
                      </div>

                      {/* Individual Taxes */}
                      {transaction.tax.taxDetails?.map((taxDetail, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center ml-4"
                        >
                          <span className="text-sm text-muted-foreground">
                            {taxDetail.type} ({taxDetail.percentage}%)
                          </span>
                          <span className="">
                            {taxDetail.value} {transaction.currency}
                          </span>
                        </div>
                      ))}

                      {/* Total Tax */}
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm ">
                          {t("common_.rideContribution", "Ride Contribution")}
                        </span>
                        <span className="">
                          {(
                            transaction?.ride?.contribution *
                            transaction?.booking?.seats
                          ).toFixed(2)}{" "}
                          {transaction.currency}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm ">
                          {t("common_.totalTax", "Total Tax")}
                        </span>
                        <span className="">
                          {transaction.tax.taxAmount.toFixed(2)}{" "}
                          {transaction.currency}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Total Amount */}
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="font-medium text-base">
                      {t("common_.totalToPay", "Total to pay")}
                    </span>
                    <span className="font-bold text-foreground">
                      {transaction.amount.toFixed(2)} {transaction.currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tax Notes */}
              {transaction?.tax &&
                typeof transaction.tax === "object" &&
                transaction.tax.notes && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-medium text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t("common_.taxNote", "Tax Notes")}
                    </h4>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {transaction.tax.notes}
                      </p>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="pt-4">
          <Link to="/contact">
            <Button>{t("Transaction.contact", "Contact Support")}</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
