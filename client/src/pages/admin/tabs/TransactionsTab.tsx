import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Transaction } from "@/hooks/useTransactions";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { formatPaymentProvider } from "@/lib/utils";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { TransactionDetailsDialog } from "../dialogs/TransactionDetailsDialog";
import CustomLoader from "@/components/CustomLoader";
import { DownloadButton } from "@/components/admin/DownloadButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import { CreditCard } from "lucide-react";

interface TransactionsTabProps {
  transactions: Transaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: any;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizes: number[];
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "ONHOLD" | "REFUNDED" | "PARTIALLY_REFUNDED" | "all";
  type?: "RIDE_PAYMENT" | "SUBSCRIPTION" | "REFUND" | "all";
  paymentProvider?: "STRIPE" | "PAYPAL" | "INTERAC" | "all";
  onStatusChange: (
    status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "ONHOLD" | "REFUNDED" | "PARTIALLY_REFUNDED" | "all"
  ) => void;
  onTypeChange?: (
    type: "RIDE_PAYMENT" | "SUBSCRIPTION" | "REFUND" | "all"
  ) => void;
  onPaymentProviderChange?: (
    paymentProvider: "STRIPE" | "PAYPAL" | "INTERAC" | "all"
  ) => void;
  onDateRangeChange?: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
  onAmountRangeChange?: (range: {
    min: number | undefined;
    max: number | undefined;
  }) => void;
  onSearchChange?: (search: string) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  pagination,
  loading,
  error,
  onPageChange,
  onPageSizeChange,
  pageSizes,
  status,
  type,
  paymentProvider,
  onStatusChange,
  onTypeChange,
  onPaymentProviderChange,
  onDateRangeChange,
  onAmountRangeChange,
  onSearchChange,
}) => {
  const { t } = useTranslation();

  const [selectedTransactionId, setSelectedTransactionId] = useState<
    number | null
  >(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const handleViewTransaction = (transactionId: number) => {
    setSelectedTransactionId(transactionId);
    setIsDetailsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 text-green-500";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-500";
      case "FAILED":
        return "bg-red-500/10 text-red-500";
      case "CANCELLED":
        return "bg-gray-500/10 text-gray-500";
      case "ONHOLD":
        return "bg-orange-500/10 text-orange-500";
      case "REFUNDED":
        return "bg-blue-500/10 text-blue-500";
      case "PARTIALLY_REFUNDED":
        return "bg-purple-500/10 text-purple-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "RIDE_PAYMENT":
        return "bg-purple-500/10 text-purple-500";
      case "SUBSCRIPTION":
        return "bg-indigo-500/10 text-indigo-500";
      case "REFUND":
        return "bg-orange-500/10 text-orange-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {t("AdminDashboard.tabs.transactions")}
            </h2>
          </div>
        </div>
        <TableSkeleton columns={7} rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {t("AdminDashboard.tabs.transactions")}
            </h2>
          </div>
        </div>
        <div className="text-center py-8 text-red-500 dark:text-red-400">
          {t("common.error", "Error loading transactions")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Filter Only */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={status}
            onValueChange={(value) => onStatusChange(value as any)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("transactions.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="PENDING">
                {t("AdminDashboard.transactions.status.pending", "Pending")}
              </SelectItem>
              <SelectItem value="PAID">
                {t("AdminDashboard.transactions.status.paid", "Paid")}
              </SelectItem>
              <SelectItem value="FAILED">
                {t("AdminDashboard.transactions.status.failed", "Failed")}
              </SelectItem>
              <SelectItem value="CANCELLED">
                {t("AdminDashboard.transactions.status.cancelled", "Cancelled")}
              </SelectItem>
              <SelectItem value="ONHOLD">
                {t("AdminDashboard.transactions.status.onhold", "On Hold")}
              </SelectItem>
              <SelectItem value="REFUNDED">
                {t("AdminDashboard.transactions.status.refunded", "Refunded")}
              </SelectItem>
              <SelectItem value="PARTIALLY_REFUNDED">
                {t("AdminDashboard.transactions.status.partiallyRefunded", "Partially Refunded")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DownloadButton
          type="transactions"
          params={{
            status: status === "all" ? undefined : status,
          }}
          variant="outline"
          size="sm"
        />
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("AdminDashboard.transactions.table.id")}</TableHead>
              <TableHead>
                {t("AdminDashboard.transactions.table.user")}
              </TableHead>
              <TableHead>
                {t("AdminDashboard.transactions.table.amount")}
              </TableHead>
              <TableHead>
                {t("AdminDashboard.transactions.table.type")}
              </TableHead>
              <TableHead>
                {t("AdminDashboard.transactions.table.status")}
              </TableHead>
              <TableHead>
                {t("AdminDashboard.transactions.table.provider")}
              </TableHead>
              <TableHead>
                {t("AdminDashboard.transactions.table.date")}
              </TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8">
                  <EmptyState
                    icon={CreditCard}
                    title={t("AdminDashboard.transactions.noData", "No transactions found")}
                    description={t(
                      "AdminDashboard.transactions.noDataDescription",
                      "Try adjusting your filter criteria"
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  transaction.status === "PENDING"
                    ? "bg-yellow-50 dark:bg-yellow-900/10"
                    : transaction.status === "PAID"
                    ? "bg-green-50 dark:bg-green-900/10"
                    : transaction.status === "FAILED"
                    ? "bg-red-50 dark:bg-red-900/10"
                    : transaction.status === "CANCELLED"
                    ? "bg-gray-50 dark:bg-gray-900/10"
                    : transaction.status === "ONHOLD"
                    ? "bg-orange-50 dark:bg-orange-900/10"
                    : transaction.status === "REFUNDED"
                    ? "bg-blue-50 dark:bg-blue-900/10"
                    : transaction.status === "PARTIALLY_REFUNDED"
                    ? "bg-purple-50 dark:bg-purple-900/10"
                    : "bg-gray-50 dark:bg-gray-900/10"
                }`}
              >
                <TableCell>#{transaction.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {transaction.user.profileImage && (
                      <img
                        src={transaction.user.profileImage.url}
                        alt={transaction.user.name}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span>{transaction.user.name}</span>
                  </div>
                </TableCell>
                <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={getTypeColor(transaction.type)}>
                    {t(
                      `AdminDashboard.transactions.type.${transaction.type.toLowerCase()}`
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(transaction.status)}>
                    {t(
                      `AdminDashboard.transactions.status.${transaction.status.toLowerCase()}`
                    )}
                  </Badge>
                </TableCell>
                <TableCell>{formatPaymentProvider(transaction.paymentProvider, false)}</TableCell>
                <TableCell>
                  {format(
                    new Date(transaction.createdAt),
                    "MMM dd, yyyy HH:mm"
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewTransaction(transaction.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {t("common.rowsPerPage")}:
          </span>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => {
              onPageSizeChange(parseInt(value));
            }}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Pagination className="select-none">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => {
                  onPageChange(pagination.page - 1);
                }}
                className="gap-1 pl-2.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{t("common.previous")}</span>
              </Button>
            </PaginationItem>

            {(() => {
              const totalPages = pagination.totalPages;
              const currentPage = pagination.page;
              const pages = [];

              // Show first page
              if (totalPages > 0) {
                pages.push(1);
              }

              // Add ellipsis and middle pages if needed
              if (totalPages > 5) {
                if (currentPage > 3) {
                  pages.push("ellipsis-start");
                }

                // Show pages around current page
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);

                for (let i = start; i <= end; i++) {
                  if (!pages.includes(i)) {
                    pages.push(i);
                  }
                }

                if (currentPage < totalPages - 2) {
                  pages.push("ellipsis-end");
                }

                // Show last page
                if (totalPages > 1 && !pages.includes(totalPages)) {
                  pages.push(totalPages);
                }
              } else {
                // Show all pages if 5 or fewer
                for (let i = 2; i <= totalPages; i++) {
                  pages.push(i);
                }
              }

              return pages.map((page, index) => {
                if (typeof page === "string") {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                return (
                  <PaginationItem key={page}>
                    <Button
                      variant={pagination.page === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        onPageChange(page);
                      }}
                      className="min-w-9"
                    >
                      {page}
                    </Button>
                  </PaginationItem>
                );
              });
            })()}

            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => {
                  onPageChange(pagination.page + 1);
                }}
                className="gap-1 pr-2.5"
              >
                <span>{t("common.next")}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Transaction Details Dialog */}
      <TransactionDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        transactionId={selectedTransactionId}
      />
    </div>
  );
};
