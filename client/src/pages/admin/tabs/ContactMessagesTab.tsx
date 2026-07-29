import React, { useState } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Mail,
  Eye,
  Trash,
  Check,
  X,
  MessageSquare,
  User,
  Calendar,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import CustomLoader from "@/components/CustomLoader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useAdminContactMessages } from "@/hooks/useAdminContactMessages";

interface ContactMessagesTabProps {
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizes?: number[];
}

export const ContactMessagesTab: React.FC<ContactMessagesTabProps> = ({
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50, 100],
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [readFilter, setReadFilter] = useState<"all" | "read" | "unread">(
    "all"
  );
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const {
    contactMessages,
    pagination,
    isLoading,
    error,
    deleteContactMessage,
    isDeleting,
    markAsRead,
    isMarkingAsRead,
  } = useAdminContactMessages(page, pageSize);

  const clearFilters = () => {
    setSearchTerm("");
    setReadFilter("all");
  };

  // Filter messages based on search term and read status
  const filteredMessages = contactMessages.filter((message) => {
    const matchesSearch =
      !searchTerm ||
      message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesReadFilter =
      readFilter === "all" ||
      (readFilter === "read" && message.isRead) ||
      (readFilter === "unread" && !message.isRead);

    return matchesSearch && matchesReadFilter;
  });

  const handleViewMessage = (message: any) => {
    setSelectedMessage(message);
    setMessageDialogOpen(true);
    // Mark as read if not already read
    if (!message.isRead) {
      markAsRead(message.id);
    }
  };

  const handleDeleteMessage = (messageId: number) => {
    deleteContactMessage(messageId);
  };

  const handleMarkAsRead = (messageId: number) => {
    markAsRead(messageId);
  };

  return (
    <div>
      <Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("AdminDashboard.ContactMessages.title", "Contact Messages")}
          </CardTitle>
          <CardDescription>
            {t(
              "AdminDashboard.ContactMessages.description",
              "Manage and respond to user contact messages"
            )}
          </CardDescription>

          {/* Search and Filters */}
          <div className="mt-4 space-y-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                type="text"
                placeholder={t(
                  "AdminDashboard.ContactMessages.searchPlaceholder",
                  "Search by name, email, or subject..."
                )}
                className="pl-9 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4">
              {/* Read Status Filter */}
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="read">
                    {t("common.read", "Read")}
                  </SelectItem>
                  <SelectItem value="unread">
                    {t("common.unread", "Unread")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {t("common.clearFilters")}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {[
                    t("AdminDashboard.ContactMessages.tableHeaders.id", "ID"),
                    t(
                      "AdminDashboard.ContactMessages.tableHeaders.name",
                      "Name"
                    ),
                    t(
                      "AdminDashboard.ContactMessages.tableHeaders.email",
                      "Email"
                    ),
                    t(
                      "AdminDashboard.ContactMessages.tableHeaders.subject",
                      "Subject"
                    ),
                    t(
                      "AdminDashboard.ContactMessages.tableHeaders.status",
                      "Status"
                    ),
                    t(
                      "AdminDashboard.ContactMessages.tableHeaders.date",
                      "Date"
                    ),
                    t(
                      "AdminDashboard.ContactMessages.tableHeaders.actions",
                      "Actions"
                    ),
                  ].map((header) => (
                    <th
                      key={header}
                      className="py-3 px-4 text-left font-medium text-gray-500 dark:text-gray-400"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center">
                      <CustomLoader />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-red-500">
                      {t("common.error")}
                    </td>
                  </tr>
                ) : filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-500">
                      {t(
                        "AdminDashboard.ContactMessages.noMessages",
                        "No messages found"
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((message) => (
                    <tr
                      key={message.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        !message.isRead ? "bg-blue-50 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                        {message.id}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {message.name}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {message.email}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <div
                          className="max-w-xs truncate"
                          title={message.subject}
                        >
                          {message.subject}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={message.isRead ? "secondary" : "default"}
                          className={
                            message.isRead
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          }
                        >
                          {message.isRead
                            ? t("common.read", "Read")
                            : t("common.unread", "Unread")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 items-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewMessage(message)}
                                disabled={isDeleting || isMarkingAsRead}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {t(
                                "AdminDashboard.ContactMessages.viewTooltip",
                                "View message"
                              )}
                            </TooltipContent>
                          </Tooltip>

                          {!message.isRead && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMarkAsRead(message.id)}
                                  disabled={isDeleting || isMarkingAsRead}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {t(
                                  "AdminDashboard.ContactMessages.markAsReadTooltip",
                                  "Mark as read"
                                )}
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <DeleteMessageWithConfirm
                            onConfirm={() => handleDeleteMessage(message.id)}
                            disabled={isDeleting || isMarkingAsRead}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="text-gray-500 dark:text-gray-400">
                {t("common.showing", "Showing")}{" "}
                {(pagination.page - 1) * pagination.pageSize + 1} -{" "}
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total
                )}{" "}
                {t("common.of", "of")} {pagination.total}{" "}
                {t("common.messages", "messages")}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="dark:bg-gray-700"
                  onClick={() => onPageChange?.(pagination.page - 1)}
                  disabled={pagination.page === 1 || isLoading}
                >
                  {t("common.previous", "Previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="dark:bg-gray-700"
                  onClick={() => onPageChange?.(pagination.page + 1)}
                  disabled={
                    pagination.page >= pagination.totalPages || isLoading
                  }
                >
                  {t("common.next", "Next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-3xl dark:bg-gray-900">
          <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-2xl font-bold dark:text-white flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {selectedMessage?.subject}
                </div>
                <div className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  {selectedMessage?.email}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Message Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {t(
                      "AdminDashboard.ContactMessages.senderInfo",
                      "Sender Information"
                    )}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.name", "Name")}:
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedMessage?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.email", "Email")}:
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedMessage?.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {t(
                      "AdminDashboard.ContactMessages.messageInfo",
                      "Message Information"
                    )}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.date", "Date")}:
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedMessage?.createdAt
                          ? new Date(
                              selectedMessage.createdAt
                            ).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {t("common.time", "Time")}:
                      </span>
                      <span className="text-sm font-medium dark:text-white">
                        {selectedMessage?.createdAt
                          ? new Date(
                              selectedMessage.createdAt
                            ).toLocaleTimeString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          selectedMessage?.isRead ? "secondary" : "default"
                        }
                        className={
                          selectedMessage?.isRead
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }
                      >
                        {selectedMessage?.isRead
                          ? t("common.read", "Read")
                          : t("common.unread", "Unread")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold dark:text-white mb-4">
                {t("AdminDashboard.ContactMessages.message", "Message")}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedMessage?.message}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Delete confirm inline component
const DeleteMessageWithConfirm = ({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-red-600 hover:text-red-700"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Trash className="text-red-600" size={16} />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "AdminDashboard.ContactMessages.confirmDelete",
                "Delete message?"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "AdminDashboard.ContactMessages.confirmDeleteDesc",
                "This action cannot be undone. The message will be permanently removed."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
