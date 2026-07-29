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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Vehicle, VehicleCategory, useVehicles } from "@/hooks/useVehicles";
import { format } from "date-fns";
import { Search, Eye, Trash2, Edit, ImageIcon, X, Plus, Loader2 } from "lucide-react";
import { DownloadButton } from "@/components/admin/DownloadButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Pagination } from "@/components/ui/pagination";
import CustomLoader from "@/components/CustomLoader";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import { Truck } from "lucide-react";

// ---------------------------------------------------------------------------
// Create-vehicle form (self-contained)
// ---------------------------------------------------------------------------
const EMPTY_VEHICLE_FORM = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  color: "",
  licensePlate: "",
  category: "CAR" as VehicleCategory,
  seatLayout: "",
};

const CreateVehicleForm: React.FC = () => {
  const [form, setForm] = useState(EMPTY_VEHICLE_FORM);
  const [seatLayoutError, setSeatLayoutError] = useState<string | null>(null);
  const { createVehicle, isCreating } = useVehicles();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSeatLayoutError(null);

    let parsedSeatLayout: string[] | null = null;

    if (form.seatLayout.trim()) {
      try {
        const parsed = JSON.parse(form.seatLayout);
        if (!Array.isArray(parsed)) {
          setSeatLayoutError("Seat layout must be a JSON array of seat labels.");
          return;
        }
        parsedSeatLayout = parsed as string[];
      } catch {
        setSeatLayoutError("Invalid JSON — please fix the seat layout or leave it empty.");
        return;
      }
    }

    createVehicle({
      make: form.make,
      model: form.model,
      year: form.year,
      color: form.color,
      licensePlate: form.licensePlate,
      images: [],
      category: form.category,
      seatLayout: parsedSeatLayout,
    });

    setForm(EMPTY_VEHICLE_FORM);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register a vehicle</CardTitle>
        <CardDescription>
          Add a vehicle to the platform. Assign a category; for Bus vehicles you
          can optionally define the seat layout as a JSON array.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="cv-make">Make</Label>
            <Input
              id="cv-make"
              placeholder="e.g. Toyota"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cv-model">Model</Label>
            <Input
              id="cv-model"
              placeholder="e.g. Hiace"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cv-year">Year</Label>
            <Input
              id="cv-year"
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || form.year })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cv-color">Color</Label>
            <Input
              id="cv-color"
              placeholder="e.g. White"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cv-plate">License plate</Label>
            <Input
              id="cv-plate"
              placeholder="e.g. ABC 1234"
              value={form.licensePlate}
              onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cv-category">Category</Label>
            <select
              id="cv-category"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as VehicleCategory, seatLayout: "" })}
            >
              <option value="CAR">Car</option>
              <option value="MOTORBIKE">Motorbike</option>
              <option value="BUS">Bus</option>
            </select>
          </div>

          {form.category === "BUS" && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Seat layout (JSON array of seat labels)</label>
              <textarea
                className="w-full border rounded p-2 font-mono text-sm"
                rows={4}
                placeholder='["1A","1B","2A","2B",...]'
                value={form.seatLayout ?? ""}
                onChange={(e) => setForm({ ...form, seatLayout: e.target.value })}
              />
              {seatLayoutError && (
                <p className="text-xs text-red-500">{seatLayoutError}</p>
              )}
              <p className="text-xs text-gray-500">Leave empty to use simple seat count only.</p>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isCreating} className="flex items-center gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Register vehicle
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const VEHICLE_STATUS_VARIANT: Record<NonNullable<Vehicle["status"]>, "default" | "secondary" | "destructive"> = {
  AVAILABLE: "default",
  MAINTENANCE: "secondary",
  DISABLED: "destructive",
};

interface VehiclesTabProps {
  vehicles: Vehicle[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  error: any;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizes: number[];
  onVehicleAction?: (vehicleId: number, action: "view" | "delete") => void;
}

export const VehiclesTab: React.FC<VehiclesTabProps> = ({
  vehicles,
  pagination,
  loading,
  error,
  searchTerm,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  pageSizes,
  onVehicleAction,
}) => {
  const { t } = useTranslation();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const handleVehicleAction = (
    vehicleId: number,
    action: "view" | "delete"
  ) => {
    onVehicleAction?.(vehicleId, action);
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const clearFilters = () => {
    onSearchChange("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            {t("AdminDashboard.tabs.vehicles")}
          </h2>
          <p className="text-muted-foreground">{t("vehicles.description")}</p>
        </div>
        <TableSkeleton columns={7} rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            {t("AdminDashboard.tabs.vehicles")}
          </h2>
          <p className="text-muted-foreground">{t("vehicles.description")}</p>
        </div>
        <div className="text-center py-8 text-red-500 dark:text-red-400">
          {t("common.error", "Error loading vehicles")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t("AdminDashboard.tabs.vehicles")}
          </h2>
          <p className="text-muted-foreground">{t("vehicles.description")}</p>
        </div>
      </div>

      {/* Create vehicle form */}
      <CreateVehicleForm />

      {/* Search and Clear Filters */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("vehicles.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            {t("common.clearFilters")}
          </Button>

          <DownloadButton
            type="vehicles"
            params={{
              searchTerm: searchTerm || undefined,
            }}
            variant="outline"
            size="sm"
          />
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("vehicles.table.image")}</TableHead>
              <TableHead>{t("vehicles.table.vehicle")}</TableHead>
              <TableHead className="text-nowrap">
                {t("vehicles.table.licensePlate")}
              </TableHead>
              <TableHead>{t("vehicles.table.owner")}</TableHead>
              <TableHead>Spec</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{t("vehicles.table.createdAt")}</TableHead>
              <TableHead>{t("vehicles.table.images")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8">
                  <EmptyState
                    icon={Truck}
                    title={t("vehicles.noVehicles", "No vehicles found")}
                    description={t(
                      "vehicles.noVehiclesDescription",
                      "Try adjusting your search criteria"
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100">
                    {vehicle.defaultImage ? (
                      <img
                        src={vehicle.defaultImage.url}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {vehicle.year} • {vehicle.color}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{vehicle?.plateNumber}</Badge>
                </TableCell>
                <TableCell>
                  {vehicle.user ? (
                    <div>
                      <div className="font-medium">{vehicle.user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {vehicle.user.firstName}&nbsp;{vehicle.user.lastName}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("common.noData")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {vehicle.transmission ? (
                      <Badge variant="outline" className="text-[10px]">{vehicle.transmission}</Badge>
                    ) : null}
                    {vehicle.fuelType ? (
                      <Badge variant="outline" className="text-[10px]">{vehicle.fuelType}</Badge>
                    ) : null}
                    {vehicle.tier ? (
                      <Badge variant="outline" className="text-[10px]">{vehicle.tier}</Badge>
                    ) : null}
                    {!(vehicle.transmission || vehicle.fuelType || vehicle.tier) ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const status = vehicle.status ?? "AVAILABLE";
                    const variant = VEHICLE_STATUS_VARIANT[status];
                    return <Badge variant={variant} className="text-[10px]">{status}</Badge>;
                  })()}
                </TableCell>
                <TableCell>
                  {format(new Date(vehicle?.createdAt), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-nowrap">
                    {vehicle?.files?.length} {t("common.images")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVehicle(vehicle)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>
                            {vehicle.make} {vehicle.model} ({vehicle.year})
                          </DialogTitle>
                          <DialogDescription>
                            {t("vehicles.viewDescription")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Vehicle Details */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">
                                {t("vehicles.details")}
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {t("vehicles.make")}:
                                  </span>
                                  <span>{vehicle.make}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {t("vehicles.model")}:
                                  </span>
                                  <span>{vehicle.model}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {t("vehicles.year")}:
                                  </span>
                                  <span>{vehicle.year}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {t("vehicles.color")}:
                                  </span>
                                  <span>{vehicle.color}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {t("vehicles.licensePlate")}:
                                  </span>
                                  <span>{vehicle?.plateNumber}</span>
                                </div>
                              </div>
                            </div>
                            {vehicle.user && (
                              <div>
                                <h4 className="font-semibold mb-2">
                                  {t("vehicles.owner")}
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      {t("common.name")}:
                                    </span>
                                    <span>{vehicle.user.name}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      {t("common.email")}:
                                    </span>
                                    <span>{vehicle.user.email}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Vehicle Images */}
                          <div>
                            <h4 className="font-semibold mb-2">
                              {t("vehicles.images")} ({vehicle?.files?.length})
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {vehicle?.files?.map((image) => (
                                <div
                                  key={image.id}
                                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                                >
                                  <img
                                    src={image.url}
                                    alt="Vehicle"
                                    className="w-full h-full object-cover"
                                  />
                                  {vehicle?.defaultImageId === image?.id && (
                                    <div className="absolute top-2 left-2">
                                      <Badge
                                        variant="default"
                                        className="text-xs"
                                      >
                                        {t("vehicles.defaultImage")}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("vehicles.deleteConfirmTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("vehicles.deleteConfirmDescription", {
                              vehicle: `${vehicle?.make} ${vehicle?.model}`,
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("common.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleVehicleAction(vehicle?.id, "delete")
                            }
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
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

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(pagination.page - 1)}
                className={
                  pagination.page === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={pagination.page === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(pagination.page + 1)}
                className={
                  pagination.page === pagination.totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
