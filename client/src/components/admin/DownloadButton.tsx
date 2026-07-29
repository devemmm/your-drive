import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  downloadService,
  DownloadOptions,
  DownloadParams,
} from "@/services/downloadService";
import { toast } from "sonner";
import CustomLoader from "../CustomLoader";

interface DownloadButtonProps {
  type:
    | "users"
    | "rides"
    | "vehicles"
    | "transactions"
    | "feeSettings"
    | "taxRates"
    | "bookings"
    | "noShows";
  params?: DownloadParams;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  type,
  params = {},
  className = "",
  variant = "outline",
  size = "default",
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState<{
    totalRecords: number;
    estimatedPages: number;
    estimatedTime: string;
  } | null>(null);

  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions>({
    format: "csv",
    filename: `YourDrive_${type}_${new Date().toISOString().split("T")[0]}`,
    includeHeaders: true,
  });

  const formatOptions = [
    {
      value: "csv",
      label: "CSV",
      icon: FileSpreadsheet,
      description: "Comma-separated values",
    },
    {
      value: "xls",
      label: "Excel",
      icon: FileSpreadsheet,
      description: "Microsoft Excel format",
    },
    {
      value: "json",
      label: "JSON",
      icon: FileJson,
      description: "JavaScript Object Notation",
    },
  ];

  const getEndpoint = () => {
    switch (type) {
      case "users":
        return "/api/v1/users";
      case "rides":
        return "/api/v1/rides";
      case "vehicles":
        return "/api/v1/vehicles";
      case "transactions":
        return "/api/v1/transactions";
      case "feeSettings":
        return "/api/v1/settings";
      case "taxRates":
        return "/api/v1/admin/tax-rates";
      case "bookings":
        return "/api/v1/bookings";
      case "noShows":
        return "/api/v1/no-shows/all";
      default:
        return "";
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case "users":
        return t("AdminDashboard.tabs.users");
      case "rides":
        return t("AdminDashboard.tabs.rides");
      case "vehicles":
        return t("AdminDashboard.tabs.vehicles");
      case "transactions":
        return t("AdminDashboard.tabs.transactions");
      case "feeSettings":
        return t("AdminDashboard.tabs.feeSettings");
      case "taxRates":
        return t("AdminDashboard.tabs.taxRates");
      case "bookings":
        return t("AdminDashboard.tabs.bookings");
      case "noShows":
        return t("AdminDashboard.tabs.noShows");
      default:
        return type;
    }
  };

  const loadDownloadStats = async () => {
    try {
      const endpoint = getEndpoint();
      const stats = await downloadService.getDownloadStats(endpoint, params);
      setDownloadStats(stats);
    } catch (error) {
      console.error("Error loading download stats:", error);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      switch (type) {
        case "users":
          await downloadService.downloadUsers(downloadOptions, params);
          break;
        case "rides":
          await downloadService.downloadRides(downloadOptions, params);
          break;
        case "vehicles":
          await downloadService.downloadVehicles(downloadOptions, params);
          break;
        case "transactions":
          await downloadService.downloadTransactions(downloadOptions, params);
          break;
        case "feeSettings":
          await downloadService.downloadFeeSettings(downloadOptions, params);
          break;
        case "taxRates":
          await downloadService.downloadTaxRates(downloadOptions, params);
          break;
        case "bookings":
          await downloadService.downloadBookings(downloadOptions, params);
          break;
        case "noShows":
          await downloadService.downloadNoShows(downloadOptions, params);
          break;
      }

      clearInterval(progressInterval);
      setDownloadProgress(100);

      toast.success(
        t("AdminDashboard.download.success", "Download completed successfully!")
      );

      setTimeout(() => {
        setIsOpen(false);
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(
        t(
          "AdminDashboard.download.error",
          "Download failed. Please try again."
        ),
        {
          className: "custom-error-toast",
        }
      );
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Update filename with current date when dialog opens
      setDownloadOptions((prev) => ({
        ...prev,
        filename: `YourDrive_${type}_${new Date().toISOString().split("T")[0]}`,
      }));
      loadDownloadStats();
    } else {
      setDownloadStats(null);
      setDownloadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-2 ${className}`}
          disabled={isDownloading}
        >
          <Download className="h-4 w-4" />
          {t("AdminDashboard.download.button", "Download")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("AdminDashboard.download.title", "Download {{type}}", {
              type: getTypeLabel(),
            })}
          </DialogTitle>
          <DialogDescription>
            {t(
              "AdminDashboard.download.description",
              "Export all data in your preferred format"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Statistics */}
          {downloadStats && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("AdminDashboard.download.totalRecords", "Total Records")}:
                </span>
                <Badge variant="secondary">
                  {downloadStats.totalRecords.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("AdminDashboard.download.estimatedTime", "Estimated Time")}
                  :
                </span>
                <Badge variant="outline">{downloadStats.estimatedTime}</Badge>
              </div>
            </div>
          )}
          {!downloadStats && (
            <div className="flex items-center justify-center">
              <CustomLoader />
            </div>
          )}
          <Separator />

          {/* Format Selection */}
          <div className="space-y-3">
            <Label>{t("AdminDashboard.download.format", "File Format")}</Label>
            <Select
              value={downloadOptions.format}
              onValueChange={(value: "csv" | "excel" | "json") => {
                setDownloadOptions((prev) => ({
                  ...prev,
                  format: value,
                  filename: `YourDrive_${type}_${
                    new Date().toISOString().split("T")[0]
                  }`,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Include Headers */}
          <div className="flex items-center space-x-2">
            <Switch
              id="includeHeaders"
              checked={downloadOptions.includeHeaders}
              onCheckedChange={(checked) =>
                setDownloadOptions((prev) => ({
                  ...prev,
                  includeHeaders: checked,
                }))
              }
            />
            <Label htmlFor="includeHeaders" className="text-sm">
              {t(
                "AdminDashboard.download.includeHeaders",
                "Include column headers"
              )}
            </Label>
          </div>

          {/* Filename Display */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {t("AdminDashboard.download.filename", "Filename")}
            </Label>
            <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
              {downloadOptions.filename}.{downloadOptions.format}
            </div>
          </div>

          {/* Download Progress */}
          {isDownloading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("AdminDashboard.download.progress", "Downloading...")}
                </span>
                <span className="font-medium">
                  {Math.round(downloadProgress)}%
                </span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isDownloading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("AdminDashboard.download.downloading", "Downloading...")}
                </>
              ) : downloadProgress === 100 ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {t("AdminDashboard.download.completed", "Completed")}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t("AdminDashboard.download.start", "Start Download")}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
