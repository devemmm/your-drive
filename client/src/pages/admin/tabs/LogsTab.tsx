import React, { useState, useEffect } from "react";
import { useAdminLogs } from "@/hooks/useAdminLogs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import CustomLoader from "@/components/CustomLoader";

export const LogsTab: React.FC = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [level, setLevel] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const { data, isLoading } = useAdminLogs({
    page,
    limit: pageSize,
    level: level as any,
    search: search || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const logs = data?.data || [];

  const pagination = data?.pagination || {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
  };

  useEffect(() => {
    setPage(1);
  }, [level, search, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={level || "all"}
          onValueChange={(v) => setLevel(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("common.level") as string} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder={t("common.search") as string}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[240px]"
        />
        <Select
          value={String(pageSize)}
          onValueChange={(v) => setPageSize(parseInt(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder={String(pageSize)} />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50, 100].map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {["timestamp", "level", "message"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-10">
                  <div className="flex items-center justify-center">
                    <CustomLoader />
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-muted-foreground"
                >
                  {t("common.noResults")}
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-muted/50 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs uppercase">
                    {log.level}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium">{log.message}</div>
                    {log.metadata && (
                      <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap break-words">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t("AdminDashboard.Rides.pagination.pageOf", {
            current: pagination.page,
            total: pagination.totalPages,
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
          >
            {t("common.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage(
                pagination.page < pagination.totalPages
                  ? pagination.page + 1
                  : pagination.page
              )
            }
            disabled={pagination.page >= pagination.totalPages}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LogsTab;
