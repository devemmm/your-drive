import { useState } from "react";
import { format } from "date-fns";
import { Flag, CheckCircle, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  AdminReport,
  ReportStatus,
  ReportTargetType,
  useAdminReports,
  useUpdateReport,
} from "@/hooks/useReports";

function targetSummary(report: AdminReport): { type: ReportTargetType; id: number; route: string } {
  if (report.ride) {
    return {
      type: "RIDE",
      id: report.ride.id,
      route: `${report.ride.departureLocation?.city ?? "?"} → ${report.ride.destinationLocation?.city ?? "?"}`,
    };
  }
  if (report.chauffeurService) {
    return {
      type: "CHAUFFEUR",
      id: report.chauffeurService.id,
      route: `${report.chauffeurService.pickupLocation?.city ?? "?"} → ${report.chauffeurService.dropoffLocation?.city ?? "?"}`,
    };
  }
  if (report.rental) {
    return {
      type: "RENTAL",
      id: report.rental.id,
      route: `${report.rental.pickupLocation?.city ?? "?"} → ${report.rental.returnLocation?.city ?? "?"}`,
    };
  }
  return { type: "RIDE", id: 0, route: "—" };
}

function statusBadgeVariant(status: ReportStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "OPEN") return "destructive";
  if (status === "REVIEWED") return "default";
  return "secondary";
}

export function ReportsTab() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("OPEN");
  const [targetFilter, setTargetFilter] = useState<ReportTargetType | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useAdminReports({
    page,
    pageSize,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    target: targetFilter === "ALL" ? undefined : targetFilter,
  });
  const update = useUpdateReport();

  const reports = data?.data ?? [];
  const pagination = data?.pagination;

  async function handleAction(id: number, status: "REVIEWED" | "DISMISSED") {
    await update.mutateAsync({ id, status });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-red-600" />
          Trip reports
        </CardTitle>
        <CardDescription>
          Reports filed by users against drivers, passengers, owners, or renters across rides, chauffeur trips, and rentals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as ReportStatus | "ALL"); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="REVIEWED">Reviewed</SelectItem>
              <SelectItem value="DISMISSED">Dismissed</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>

          <Select value={targetFilter} onValueChange={(v) => { setTargetFilter(v as ReportTargetType | "ALL"); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All trip types</SelectItem>
              <SelectItem value="RIDE">Rides</SelectItem>
              <SelectItem value="CHAUFFEUR">Chauffeur</SelectItem>
              <SelectItem value="RENTAL">Rentals</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground ml-auto">
            {pagination?.total ?? 0} total
          </span>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No reports"
            description={statusFilter === "OPEN" ? "Nothing open right now." : "No reports match these filters."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const t = targetSummary(report);
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="font-medium">{t.type} #{t.id}</div>
                      <div className="text-xs text-muted-foreground">{t.route}</div>
                    </TableCell>
                    <TableCell>
                      <div>{report.reporter?.name}</div>
                      <div className="text-xs text-muted-foreground">{report.reporter?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{report.subject?.name}</div>
                      <div className="text-xs text-muted-foreground">{report.subject?.email}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="line-clamp-3 text-sm" title={report.reason}>
                        {report.reason}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(report.createdAt), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {report.status === "OPEN" ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={update.isPending}
                            onClick={() => handleAction(report.id, "REVIEWED")}
                            title="Mark reviewed"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={update.isPending}
                            onClick={() => handleAction(report.id, "DISMISSED")}
                            title="Dismiss"
                          >
                            <XCircle className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {report.reviewedAt ? format(new Date(report.reviewedAt), "MMM dd") : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
