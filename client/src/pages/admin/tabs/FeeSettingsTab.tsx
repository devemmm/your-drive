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
import { useTranslation } from "react-i18next";
import {
  FeeSetting,
  CreateFeeSettingData,
  UpdateFeeSettingData,
} from "@/hooks/useFeeSettings";
import { format } from "date-fns";
import {
  Search,
  Eye,
  Trash2,
  Edit,
  X,
  Plus,
  DollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { DownloadButton } from "@/components/admin/DownloadButton";
import CustomLoader from "@/components/CustomLoader";
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
import { Label } from "@/components/ui/label";

interface FeeSettingsTabProps {
  feeSettings: FeeSetting[];
  loading: boolean;
  error: any;
  searchTerm: string;
  feeType: "POSTING" | "BOOKING" | "all";
  feeStatus: "active" | "inactive" | "all";
  onSearchChange: (value: string) => void;
  onTypeChange: (type: "POSTING" | "BOOKING" | "all") => void;
  onStatusChange: (status: "active" | "inactive" | "all") => void;
  onCreateFeeSetting: (data: CreateFeeSettingData) => void;
  onUpdateFeeSetting: (id: number, data: UpdateFeeSettingData) => void;
  onDeleteFeeSetting: (id: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export const FeeSettingsTab: React.FC<FeeSettingsTabProps> = ({
  feeSettings,
  loading,
  error,
  searchTerm,
  feeType,
  feeStatus,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onCreateFeeSetting,
  onUpdateFeeSetting,
  onDeleteFeeSetting,
  isCreating,
  isUpdating,
  isDeleting,
}) => {
  const { t } = useTranslation();
  const [selectedFeeSetting, setSelectedFeeSetting] =
    useState<FeeSetting | null>(null);
  const [editingFeeSetting, setEditingFeeSetting] = useState<FeeSetting | null>(
    null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feeSettingToDelete, setFeeSettingToDelete] =
    useState<FeeSetting | null>(null);

  // Form states for create/edit
  const [formData, setFormData] = useState<CreateFeeSettingData>({
    type: "POSTING",
    amount: 0,
    active: false,
  });

  // console.log(feeSettings, "-------------------");

  const clearFilters = () => {
    onSearchChange("");
    onTypeChange("all");
    onStatusChange("all");
  };

  const handleCreate = () => {
    onCreateFeeSetting(formData);
    setCreateDialogOpen(false);
    setFormData({
      type: "POSTING",
      amount: 0,
      active: false,
    });
  };

  const handleEdit = () => {
    if (editingFeeSetting) {
      onUpdateFeeSetting(editingFeeSetting.id, {
        amount: formData.amount,
        active: formData.active,
      });
      setEditDialogOpen(false);
      setEditingFeeSetting(null);
    }
  };

  const handleDelete = () => {
    if (feeSettingToDelete) {
      onDeleteFeeSetting(feeSettingToDelete.id);
      setDeleteDialogOpen(false);
      setFeeSettingToDelete(null);
    }
  };

  const openEditDialog = (feeSetting: FeeSetting) => {
    setEditingFeeSetting(feeSetting);
    setFormData({
      type: feeSetting.type,
      amount: feeSetting.amount,
      active: feeSetting.active,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (feeSetting: FeeSetting) => {
    setFeeSettingToDelete(feeSetting);
    setDeleteDialogOpen(true);
  };

  const formatFeeType = (type: string) => {
    switch (type) {
      case "POSTING":
        return "Posting Fee";
      case "BOOKING":
        return "Booking Fee";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <CustomLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">{t("common.error")}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t("setting.feeSettings.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("setting.feeSettings.description")}
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("setting.feeSettings.add")}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("setting.feeSettings.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Type Filter */}
          <Select value={feeType} onValueChange={onTypeChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue
                placeholder={t("setting.feeSettings.filters.type")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("setting.feeSettings.filters.all")}
              </SelectItem>
              <SelectItem value="POSTING">
                {t("setting.feeSettings.filters.posting")}
              </SelectItem>
              <SelectItem value="BOOKING">
                {t("setting.feeSettings.filters.booking")}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={feeStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue
                placeholder={t("setting.feeSettings.filters.status")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("setting.feeSettings.filters.all")}
              </SelectItem>
              <SelectItem value="active">
                {t("setting.feeSettings.filters.active")}
              </SelectItem>
              <SelectItem value="inactive">
                {t("setting.feeSettings.filters.inactive")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            {t("setting.feeSettings.filters.clear")}
          </Button>

          <DownloadButton
            type="feeSettings"
            params={{
              searchTerm: searchTerm || undefined,
              type: feeType === "all" ? undefined : feeType,
              status: feeStatus === "all" ? undefined : feeStatus,
            }}
            variant="outline"
            size="sm"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {feeSettings.length} {t("setting.feeSettings.totalSettings")}
        </div>
      </div>

      {/* Fee Settings Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("setting.feeSettings.table.type")}</TableHead>
              <TableHead>{t("setting.feeSettings.table.amount")}</TableHead>
              <TableHead>{t("setting.feeSettings.table.status")}</TableHead>
              <TableHead>{t("setting.feeSettings.table.created")}</TableHead>
              <TableHead>{t("setting.feeSettings.table.updated")}</TableHead>
              <TableHead>{t("setting.feeSettings.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeSettings.map((feeSetting) => (
              <TableRow key={feeSetting.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">
                        {formatFeeType(feeSetting.type)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("setting.feeSettings.dialog.view.id")}:{" "}
                        {feeSetting.id}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    ${feeSetting.amount.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={feeSetting.active ? "default" : "secondary"}
                    className="flex items-center gap-1 w-fit"
                  >
                    {feeSetting.active ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {feeSetting.active
                      ? t("setting.feeSettings.badges.active")
                      : t("setting.feeSettings.badges.inactive")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {feeSetting.createdAt &&
                    !isNaN(Date.parse(feeSetting.createdAt))
                      ? format(new Date(feeSetting.createdAt), "MMM dd, yyyy")
                      : "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {feeSetting.createdAt &&
                    !isNaN(Date.parse(feeSetting.createdAt))
                      ? format(new Date(feeSetting.createdAt), "HH:mm")
                      : "N/A"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {feeSetting.updatedAt &&
                    !isNaN(Date.parse(feeSetting.updatedAt))
                      ? format(new Date(feeSetting.updatedAt), "MMM dd, yyyy")
                      : "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {feeSetting.updatedAt &&
                    !isNaN(Date.parse(feeSetting.updatedAt))
                      ? format(new Date(feeSetting.updatedAt), "HH:mm")
                      : "N/A"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFeeSetting(feeSetting)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(feeSetting)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(feeSetting)}
                      disabled={feeSetting.active}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Fee Setting Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("setting.feeSettings.dialog.create.title")}
            </DialogTitle>
            <DialogDescription>
              {t("setting.feeSettings.dialog.create.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">
                {t("setting.feeSettings.dialog.create.typeLabel")}
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "setting.feeSettings.dialog.create.typePlaceholder"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POSTING">
                    {t("setting.feeSettings.dialog.create.Posting")}
                  </SelectItem>
                  <SelectItem value="BOOKING">
                    {t("setting.feeSettings.dialog.create.Booking")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">
                {t("setting.feeSettings.dialog.create.amountLabel")}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder={t(
                  "setting.feeSettings.dialog.create.amountPlaceholder"
                )}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
              />
              <Label htmlFor="active">
                {t("setting.feeSettings.dialog.create.activeLabel")}
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              {t("setting.feeSettings.dialog.create.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && (
                <span className="mr-2">
                  <CustomLoader size="sm" />
                </span>
              )}
              {t("setting.feeSettings.dialog.create.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Fee Setting Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("setting.feeSettings.dialog.edit.title")}
            </DialogTitle>
            <DialogDescription>
              {t("setting.feeSettings.dialog.edit.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-amount">
                {t("setting.feeSettings.dialog.edit.amountLabel")}
              </Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder={t(
                  "setting.feeSettings.dialog.create.amountPlaceholder"
                )}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
              />
              <Label htmlFor="edit-active">
                {t("setting.feeSettings.dialog.edit.activeLabel")}
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("setting.feeSettings.dialog.edit.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating}>
              {isUpdating && (
                <span className="mr-2">
                  <CustomLoader size="sm" />
                </span>
              )}
              {t("setting.feeSettings.dialog.edit.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the fee
              setting.
              {feeSettingToDelete?.active && (
                <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">
                  Warning: You cannot delete an active fee setting. Please
                  deactivate it first.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={feeSettingToDelete?.active}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && (
                <span className="mr-2">
                  <CustomLoader size="sm" />
                </span>
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Fee Setting Dialog */}
      <Dialog
        open={!!selectedFeeSetting}
        onOpenChange={() => setSelectedFeeSetting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("setting.feeSettings.dialog.view.title")}
            </DialogTitle>
          </DialogHeader>
          {selectedFeeSetting && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ID</Label>
                  <p className="font-medium">{selectedFeeSetting.id}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <p className="font-medium">
                    {formatFeeType(selectedFeeSetting.type)}
                  </p>
                </div>
                <div>
                  <Label>{t("setting.feeSettings.dialog.view.amount")}</Label>
                  <p className="font-medium">
                    ${selectedFeeSetting.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label>{t("setting.feeSettings.dialog.view.status")}</Label>
                  <Badge
                    variant={
                      selectedFeeSetting.active ? "default" : "secondary"
                    }
                  >
                    {selectedFeeSetting.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <Label>{t("setting.feeSettings.dialog.view.created")}</Label>
                  <p className="text-sm">
                    {selectedFeeSetting.createdAt &&
                    !isNaN(Date.parse(selectedFeeSetting.createdAt))
                      ? format(new Date(selectedFeeSetting.createdAt), "PPP")
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label>{t("setting.feeSettings.dialog.view.updated")}</Label>
                  <p className="text-sm">
                    {selectedFeeSetting.updatedAt &&
                    !isNaN(Date.parse(selectedFeeSetting.updatedAt))
                      ? format(new Date(selectedFeeSetting.updatedAt), "PPP")
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
