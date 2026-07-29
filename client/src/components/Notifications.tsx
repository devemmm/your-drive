import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Bell, Loader2, Check, X } from "lucide-react";
import { apiUrl, useAllNotification, queryKey } from "@/data";
import axios from "axios";
import { getToken } from "./getToken";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useSocket } from "@/providers/SocketProvider";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationBell = ({ show }: { show?: boolean }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const socket = useSocket();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useAllNotification(20);

  const notifications = useMemo(
    () => data?.pages.flatMap((page) => page?.data ?? []) ?? [],
    [data]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Helper function to update notification cache
  const updateNotificationInCache = useCallback(
    (ids: string[] | "all", isRead: boolean) => {
      queryClient.setQueryData([queryKey.NOTIFICATIONS], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.map((notification: Notification) => {
              if (ids === "all" || ids.includes(notification.id)) {
                return { ...notification, isRead };
              }
              return notification;
            }),
          })),
        };
      });
    },
    [queryClient]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Listen for new notifications with optimistic cache update
  useEffect(() => {
    if (!socket.socket) return;

    const handleNotification = (notification) => {
      toast.success(t("common_.newNotification"));

      queryClient.setQueryData(
        [queryKey.NOTIFICATIONS, getToken()],
        (oldData: any) => {
          if (!oldData || !oldData.pages || !oldData.pages[0]) {
            return {
              pages: [
                {
                  data: [notification],
                  pagination: {
                    page: 1,
                    pageSize: 100,
                    total: 1,
                    totalPages: 1,
                  },
                  success: true,
                },
              ],
              pageParams: [1],
            };
          }

          return {
            ...oldData,
            pages: oldData.pages.map((page, index) =>
              index === 0
                ? {
                    ...page,
                    data: [
                      notification,
                      ...(page.data ?? []).filter(
                        (n) => n.id !== notification.id
                      ),
                    ],
                    pagination: {
                      ...page.pagination,
                      total: (page.pagination?.total ?? 0) + 1,
                    },
                  }
                : page
            ),
          };
        }
      );
    };

    socket.socket.on("notification", handleNotification);

    return () => {
      socket.socket.off("notification", handleNotification);
    };
  }, [socket]);

  // Auto-refresh notifications when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const handleReadAll = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);

    if (unreadIds.length === 0) return;

    // Optimistic update
    updateNotificationInCache("all", true);
    setMarkingIds(new Set(unreadIds));

    try {
      await axios.patch(
        `${apiUrl}/api/v1/notifications/read-all`,
        {},
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      toast.success(t("notification.markedAll"));
    } catch (error) {
      // Rollback on error
      updateNotificationInCache("all", false);
      toast.error(t("notification.markAll"), {
        className: "custom-error-toast",
      });
    } finally {
      queryClient.invalidateQueries({ queryKey: [queryKey.NOTIFICATIONS] });
      setMarkingIds(new Set());
    }
  }, [notifications, updateNotificationInCache, t]);

  const handleReadSingle = useCallback(
    async (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId);
      if (!notification || notification.isRead) return;

      // Optimistic update
      updateNotificationInCache([notificationId], true);
      setMarkingIds((prev) => new Set(prev).add(notificationId));

      try {
        await axios.patch(
          `${apiUrl}/api/v1/notifications/${notificationId}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${getToken()}` },
          }
        );
      } catch (error) {
        // Rollback on error
        updateNotificationInCache([notificationId], false);
        toast.error(t("notification.mark"), {
          className: "custom-error-toast",
        });
      } finally {
        queryClient.invalidateQueries({ queryKey: [queryKey.NOTIFICATIONS] });
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(notificationId);
          return next;
        });
      }
    },
    [notifications, updateNotificationInCache, t]
  );

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const isMarkingAll = markingIds.size > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleDropdown}
          className="relative p-2 rounded-full text-gray-600 dark:text-gray-700 bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-colors"
          aria-label={t("common_.small.notification")}
          aria-expanded={isOpen}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute top-0 right-0 h-5 w-5 p-0 flex items-center justify-center text-xs"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </button>
        {show && (
          <button
            onClick={toggleDropdown}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t("common_.small.notification")}
          </button>
        )}
      </div>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 flex flex-col"
          role="dialog"
          aria-label={t("notification.notifications")}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-start">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("notification.notifications")}
              </h3>
              {unreadCount > 0 && (
                <Badge variant="default" className="px-2 py-0.5 text-nowrap">
                  {unreadCount} {t("notification.unread")}
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReadAll}
                disabled={isMarkingAll}
                className="text-xs h-8"
                aria-label={t("notification.readAll")}
              >
                {isMarkingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("notification.readAll")
                )}
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">
                  {t("notification.LoadingNotifications")}
                </p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((note) => {
                  const isMarking = markingIds.has(note.id);
                  return (
                    <div
                      key={note.id}
                      className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                        note.isRead
                          ? "bg-gray-50 dark:bg-gray-800/50"
                          : "bg-white dark:bg-gray-900 font-medium"
                      } hover:bg-gray-100 dark:hover:bg-gray-700/70`}
                      onClick={() => handleReadSingle(note.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleReadSingle(note.id);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-start gap-2">
                            {!note.isRead && (
                              <span
                                className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"
                                aria-label="Unread"
                              />
                            )}
                            <div className="flex-1">
                              <div
                                className={`text-sm ${
                                  note.isRead
                                    ? "text-gray-600 dark:text-gray-400"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {note.title}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {note.message}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            {new Date(note.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        {!note.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReadSingle(note.id);
                            }}
                            disabled={isMarking}
                            aria-label="Mark as read"
                          >
                            {isMarking ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                <Bell className="h-8 w-8 text-gray-400" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("notification.notYet")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t("notification.notify")}
                </p>
              </div>
            )}
          </div>

          {/* Load More button */}
          {hasNextPage && (
            <div className="flex justify-center py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("notification.loading")}
                  </>
                ) : (
                  t("notification.loadMore")
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
