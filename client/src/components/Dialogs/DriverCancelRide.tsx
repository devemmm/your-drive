import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, AlertTriangle, Users } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl, queryKey } from "@/data";
import { getToken } from "../getToken";
import { useReactItems } from "@/lib/ReactTranslation";
import { toast } from "sonner";

function CancelRideDialog({
  rideId,
  hasConfirmedBookings = false,
}: {
  rideId: number;
  hasConfirmedBookings?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { currentLanguage, t, queryClient } = useReactItems();

  const cancelRide = useMutation({
    mutationFn: async () => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/rides/${rideId}/cancel?lang=${currentLanguage}`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: () => {
      toast.success(t("RideCancellationDialog.successMessage"));
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: [queryKey.SINGLE_RIDE, rideId],
      });
    },
    onError: (err) => {
      toast.error(
        (err as any)?.response?.data?.message ||
          t("RideCancellationDialog.errorMessage"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 dark:hover:bg-red-900/20"
        >
          <X className="h-4 w-4 mr-1" />
          {t("RideCancellationDialog.cancelRide")}
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay style={{ zIndex: 99999 }} />
        <DialogContent
          className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white no-scrollbar"
          style={{ zIndex: 99999 }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 ">
              {t("RideCancellationDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
              {hasConfirmedBookings
                ? t("RideCancellationDialog.descriptionWithBookings")
                : t("RideCancellationDialog.description")}
            </DialogDescription>
          </DialogHeader>

          {hasConfirmedBookings && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800  p-4 mb-4">
              <div className="flex items-start gap-3">
                <div>
                  <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                    {t("RideCancellationDialog.warningTitle")}
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {t("RideCancellationDialog.warningMessage")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="py-4 space-y-2">
            <Label htmlFor="reason">
              {t("RideCancellationDialog.reasonLabel")}
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("RideCancellationDialog.reasonPlaceholder")}
              className="text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* 🔔 Policy Note */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-800 dark:text-yellow-200 p-3 my-4">
            <strong>{t("RideCancellationDialog.policyNoticeTitle")}</strong>
            <p>
              {t("RideCancellationDialog.policySummary")}
              <a
                href="/policies"
                target="_blank"
                className="ml-1 text-blue-600 underline"
              >
                {t("RideCancellationDialog.learnMore")}
              </a>
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">
                {t("RideCancellationDialog.close")}
              </Button>
            </DialogClose>
            <Button
              variant="default"
              disabled={cancelRide.isPending || !reason.trim()}
              onClick={() => cancelRide.mutate()}
              className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              {cancelRide.isPending
                ? t("RideCancellationDialog.canceling")
                : t("RideCancellationDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export default CancelRideDialog;
