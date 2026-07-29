import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CancelRideDialog({ onClick }: { onClick: () => void }) {
  const [notifyPassengers, setNotifyPassengers] = useState(true);
  const [open, setOpen] = useState(false);

  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-700 dark:bg-white/5"
        >
          {t("DriverDashboard.cancelRide")}
        </Button>
      </DialogTrigger>

      <DialogPortal>
        <DialogOverlay className="dark:bg-black/50" />
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {t("DriverDashboard.cancelRide")}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {t("DriverDashboard.passengerBooked")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-gray-900 dark:text-white">
                {t("DriverDashboard.reasonForCancellation")}
              </Label>
              <Select>
                <SelectTrigger className="dark:bg-gray-700 dark:text-white">
                  <SelectValue
                    placeholder={t("DriverDashboard.selectReason")}
                  />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-700">
                  <SelectItem value="plans">
                    {t("DriverDashboard.changeOfPlans")}
                  </SelectItem>
                  <SelectItem value="vehicle">
                    {t("DriverDashboard.vehicleIssue")}
                  </SelectItem>
                  <SelectItem value="health">
                    {t("DriverDashboard.feelingUnwell")}
                  </SelectItem>
                  <SelectItem value="weather">
                    {t("DriverDashboard.badWeather")}
                  </SelectItem>
                  <SelectItem value="emergency">
                    {t("DriverDashboard.emergency")}
                  </SelectItem>
                  <SelectItem value="other">
                    {t("DriverDashboard.other")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="explanation"
                className="text-gray-900 dark:text-white"
              >
                {t("DriverDashboard.optionalExplanation")}
              </Label>
              <Textarea
                id="explanation"
                placeholder={t("DriverDashboard.writeExplanation")}
                className="dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify"
                checked={notifyPassengers}
                onCheckedChange={() => setNotifyPassengers(!notifyPassengers)}
                className="dark:bg-gray-600 dark:border-gray-500"
              />
              <Label htmlFor="notify" className="text-gray-900 dark:text-white">
                {t("DriverDashboard.notifyPassengers")}
              </Label>
            </div>

            <div className="text-sm text-red-600 text-start bg-red-100 border border-red-300 p-4 rounded-xl space-y-2 dark:bg-red-800 dark:border-red-700 dark:text-red-400">
              <p>{t("DriverDashboard.cancellationWarning")}</p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                className="dark:text-white dark:border-gray-700"
              >
                {t("DriverDashboard.back")}
              </Button>
            </DialogClose>
            <Button
              variant="default"
              onClick={() => {
                onClick();
                setTimeout(() => {
                  setOpen(false);
                }, 2000);
              }}
              className="dark:bg-primary-600 dark:hover:bg-primary-700 dark:text-white"
            >
              {t("DriverDashboard.confirmCancellation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export function AcceptBookingDialog({
  onClick,
  bookingId,
  isApproving,
}: {
  onClick: ({ id }: { id: number }) => void;
  bookingId: number;
  isApproving: boolean;
}) {
  const [open, setOpen] = useState(false);

  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          //   variant="default"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white text-xs"
        >
          {/* <Check className="h-4 w-4 mr-1" /> */}
          {t("booking.accept")}
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay style={{ zIndex: 99999 }} />
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          style={{ zIndex: 99999 }}
        >
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {t("DriverDashboard.approveDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
              {t("DriverDashboard.approveDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                className="text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                {t("DriverDashboard.approveDialog.cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="default"
              onClick={() => {
                onClick({
                  id: bookingId,
                });
                setTimeout(() => {
                  setOpen(false);
                }, 5000);
              }}
              className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-700 dark:hover:bg-green-800"
            >
              {isApproving
                ? t("DriverDashboard.declineDialog.conforming")
                : t("DriverDashboard.approveDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export function DeclineBookingDialog({
  onClick,
  bookingId,
  isProcessing,
}: {
  onClick: ({
    message,
    status,
    id,
  }: {
    message: string;
    status: string;
    id: number;
  }) => void;
  bookingId: number;
  isProcessing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
        >
          {/* <X className="h-4 w-4 mr-1" /> */}
          {t("booking.reject")}
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay style={{ zIndex: 99999 }} />
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          style={{ zIndex: 99999 }}
        >
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {t("DriverDashboard.declineDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
              {t("DriverDashboard.declineDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <Label
              htmlFor="reason"
              className="text-gray-700 dark:text-gray-300"
            >
              {t("DriverDashboard.declineDialog.reasonLabel")}
            </Label>
            <Textarea
              id="reason"
              onChange={(e) => setReason(e.target.value)}
              value={reason}
              placeholder={t("DriverDashboard.declineDialog.reasonPlaceholder")}
              className="text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                className="text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                {t("DriverDashboard.declineDialog.cancel")}
              </Button>
            </DialogClose>
            {/* <DialogClose asChild> */}
            <Button
              variant="default"
              onClick={() => {
                onClick({
                  message: reason,
                  status: "DECLINED",
                  id: bookingId,
                });
                setTimeout(() => setOpen(false), 5000);
              }}
              className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              {isProcessing
                ? t("DriverDashboard.declineDialog.canceling")
                : t("DriverDashboard.declineDialog.confirm")}
            </Button>
            {/* </DialogClose> */}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export function CancelBookingDialog({
  onClick,
  bookingId,
  isProcessing,
}: {
  onClick: ({
    message,
    status,
    id,
  }: {
    message: string;
    status: string;
    id: number;
  }) => void;
  bookingId: number;
  isProcessing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <X className="h-4 w-4 mr-1" />
          {t("DriverDashboard.PassengerDeclineDialog.cancelBooking")}
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay style={{ zIndex: 99999 }} />
        <DialogContent
          className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          style={{ zIndex: 99999 }}
        >
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {t("DriverDashboard.PassengerDeclineDialog.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
              {t("DriverDashboard.PassengerDeclineDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <Label
              htmlFor="reason"
              className="text-gray-700 dark:text-gray-300"
            >
              {t("DriverDashboard.PassengerDeclineDialog.reasonLabel")}
            </Label>
            <Textarea
              id="reason"
              onChange={(e) => setReason(e.target.value)}
              value={reason}
              placeholder={t(
                "DriverDashboard.PassengerDeclineDialog.reasonPlaceholder"
              )}
              className="text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>

          {/* 🔔 Cancellation Policy Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-800 dark:text-yellow-200 rounded p-3 my-4">
            <strong>{t("CancelBookingDialog.policyNoticeTitle")}</strong>
            <p>
              {t("CancelBookingDialog.policySummary")}
              <a
                href="/policies"
                target="_blank"
                className="ml-1 text-blue-600 underline"
              >
                {t("CancelBookingDialog.learnMore")}
              </a>
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                className="text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                {t("DriverDashboard.PassengerDeclineDialog.cancel")}
              </Button>
            </DialogClose>
            {/* <DialogClose asChild> */}
            <Button
              variant="default"
              onClick={() => {
                onClick({
                  message: reason,
                  status: "DECLINED",
                  id: bookingId,
                });
                setTimeout(() => setOpen(false), 5000);
              }}
              className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              {isProcessing
                ? t("DriverDashboard.PassengerDeclineDialog.canceling")
                : t("DriverDashboard.PassengerDeclineDialog.confirm")}
            </Button>
            {/* </DialogClose> */}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
