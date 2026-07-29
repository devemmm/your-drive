import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Search, Eye, X, Ban, CheckCircle, Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  useAdminChauffeurServices,
  useAdminChauffeurMutations,
} from "@/hooks/useAdminChauffeur";
import type { ChauffeurService, ChauffeurStatus } from "@/lib/types";
import { UserCheck } from "lucide-react";

const STATUS_FILTERS: Array<{ label: string; value: ChauffeurStatus | "ALL" }> =
  [
    { label: "All", value: "ALL" },
    { label: "Requested", value: "REQUESTED" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Active", value: "ACTIVE" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "Disputed", value: "DISPUTED" },
  ];

const STATUS_BADGE_VARIANTS: Record<
  ChauffeurStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  REQUESTED: "outline",
  ACCEPTED: "secondary",
  DECLINED: "destructive",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  DISPUTED: "destructive",
};

const PAGE_SIZES = [10, 25, 50];

export const ChauffeurTab: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<ChauffeurStatus | "ALL">(
    "ALL"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedService, setSelectedService] =
    useState<ChauffeurService | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<ChauffeurService | null>(
    null
  );
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  const [disputeTarget, setDisputeTarget] =
    useState<ChauffeurService | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const { data, isLoading, error } = useAdminChauffeurServices({
    page,
    pageSize,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const { cancelService, isCancelling, resolveDispute, isResolvingDispute } =
    useAdminChauffeurMutations();

  const services = data?.data ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  };

  const filteredServices = searchTerm
    ? services.filter((s) => {
        const q = searchTerm.toLowerCase();
        return (
          s.passenger?.name?.toLowerCase().includes(q) ||
          s.passenger?.email?.toLowerCase().includes(q) ||
          s.driver?.name?.toLowerCase().includes(q) ||
          s.driver?.email?.toLowerCase().includes(q) ||
          s.vehicle?.make?.toLowerCase().includes(q) ||
          s.vehicle?.model?.toLowerCase().includes(q) ||
          String(s.id).includes(q)
        );
      })
    : services;

  const handleViewService = (service: ChauffeurService) => {
    setSelectedService(service);
    setDetailOpen(true);
  };

  const handleOpenCancel = (service: ChauffeurService) => {
    setCancelTarget(service);
    setCancelReason("");
    setCancelOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    cancelService(
      { serviceId: cancelTarget.id, reason: cancelReason },
      {
        onSuccess: () => {
          setCancelOpen(false);
          setCancelTarget(null);
        },
      }
    );
  };

  const handleOpenResolveDispute = (service: ChauffeurService) => {
    setDisputeTarget(service);
    setDisputeOpen(true);
  };

  const handleConfirmResolveDispute = () => {
    if (!disputeTarget) return;
    resolveDispute(
      { serviceId: disputeTarget.id },
      {
        onSuccess: () => {
          setDisputeOpen(false);
          setDisputeTarget(null);
        },
      }
    );
  };

  const handleStatusFilter = (value: ChauffeurStatus | "ALL") => {
    setStatusFilter(value);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Chauffeur Services</h2>
          <p className="text-muted-foreground">
            Manage all chauffeur service bookings
          </p>
        </div>
        <TableSkeleton columns={7} rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Chauffeur Services</h2>
          <p className="text-muted-foreground">
            Manage all chauffeur service bookings
          </p>
        </div>
        <div className="text-center py-8 text-red-500 dark:text-red-400">
          Error loading chauffeur services
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Chauffeur Services</h2>
        <p className="text-muted-foreground">
          Manage all chauffeur service bookings
        </p>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Search and Clear */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by passenger, driver, vehicle, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchTerm("");
            setStatusFilter("ALL");
            setPage(1);
          }}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Passenger</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8">
                  <EmptyState
                    icon={UserCheck}
                    title="No chauffeur services found"
                    description="Try adjusting your search or filter criteria"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredServices.map((service) => {
                const reportCount = service._count?.reports ?? 0;
                return (
                <TableRow
                  key={service.id}
                  className={reportCount > 0 ? "bg-red-100 dark:bg-red-900/20" : undefined}
                >
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      #{service.id}
                      {reportCount > 0 ? (
                        <span
                          title={`${reportCount} open report${reportCount > 1 ? "s" : ""}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white"
                        >
                          <Flag size={10} /> {reportCount}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {service.passenger?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {service.passenger?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{service.driver?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {service.driver?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {service.vehicle?.make} {service.vehicle?.model}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {service.serviceType}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      {format(new Date(service.startDate), "MMM dd, yyyy")}
                    </div>
                    <div className="text-muted-foreground">
                      {format(new Date(service.endDate), "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    ${service.totalAmount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANTS[service.status]}>
                      {service.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewService(service)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {(service.status === "REQUESTED" ||
                        service.status === "ACCEPTED" ||
                        service.status === "ACTIVE") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCancel(service)}
                          title="Force Cancel"
                        >
                          <Ban className="h-4 w-4 text-red-500" />
                        </Button>
                      )}

                      {service.status === "DISPUTED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResolveDispute(service)}
                          title="Resolve Dispute"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => {
              setPageSize(parseInt(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={s.toString()}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Total: {pagination.total}
          </span>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={
                  page === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {Array.from(
              { length: pagination.totalPages },
              (_, i) => i + 1
            ).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  onClick={() => setPage(p)}
                  isActive={page === p}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                className={
                  page === pagination.totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chauffeur Service #{selectedService?.id}</DialogTitle>
            <DialogDescription>Service booking details</DialogDescription>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Passenger</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{selectedService.passenger?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{selectedService.passenger?.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Driver</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{selectedService.driver?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{selectedService.driver?.email}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Vehicle</h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle:</span>
                  <span>
                    {selectedService.vehicle?.make}{" "}
                    {selectedService.vehicle?.model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Type:</span>
                  <span>{selectedService.serviceType}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Booking</h4>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span>
                    {format(
                      new Date(selectedService.startDate),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date:</span>
                  <span>
                    {format(
                      new Date(selectedService.endDate),
                      "MMM dd, yyyy HH:mm"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">
                    ${selectedService.totalAmount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={STATUS_BADGE_VARIANTS[selectedService.status]}
                  >
                    {selectedService.status}
                  </Badge>
                </div>
              </div>

              {selectedService.pickupLocation && (
                <div className="space-y-1">
                  <h4 className="font-semibold">Pickup Location</h4>
                  <p className="text-muted-foreground">
                    {selectedService.pickupLocation.address ??
                      `${selectedService.pickupLocation.latitude}, ${selectedService.pickupLocation.longitude}`}
                  </p>
                </div>
              )}

              {selectedService.dropoffLocation && (
                <div className="space-y-1">
                  <h4 className="font-semibold">Dropoff Location</h4>
                  <p className="text-muted-foreground">
                    {selectedService.dropoffLocation.address ??
                      `${selectedService.dropoffLocation.latitude}, ${selectedService.dropoffLocation.longitude}`}
                  </p>
                </div>
              )}

              {selectedService.cancellationReason && (
                <div className="space-y-1">
                  <h4 className="font-semibold">Cancellation Reason</h4>
                  <p className="text-muted-foreground">
                    {selectedService.cancellationReason}
                  </p>
                </div>
              )}

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Created:{" "}
                  {format(
                    new Date(selectedService.createdAt),
                    "MMM dd, yyyy HH:mm"
                  )}
                </span>
                <span>
                  Updated:{" "}
                  {format(
                    new Date(selectedService.updatedAt),
                    "MMM dd, yyyy HH:mm"
                  )}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Cancel Chauffeur Service</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to cancel chauffeur service #{cancelTarget?.id}.
              This action cannot be undone. Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter cancellation reason..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCancelling || !cancelReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? "Cancelling..." : "Cancel Service"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resolve Dispute Dialog */}
      <AlertDialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve Dispute</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resolve the dispute for chauffeur service
              #{disputeTarget?.id}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResolveDispute}
              disabled={isResolvingDispute}
            >
              {isResolvingDispute ? "Resolving..." : "Resolve Dispute"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
