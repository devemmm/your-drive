import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // make sure this exists
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl, queryKey } from "@/data";
import { getToken } from "./getToken";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { useReactItems } from "@/lib/ReactTranslation";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useAuth } from "@/providers/Context/UseAuthContext";
import { CANADIAN_CITIES, PROVINCE_NAMES } from "@/constants";

interface DriverComplaintDialogProps {
  passengerId: string; // passengerId and rideId are both required
  rideId: string;
}

interface Props {
  rideId: number;
}

export const DriverMarkAttendanceDialog = ({ rideId }: Props) => {
  const [open, setOpen] = useState(false);
  const [attendanceCode, setAttendanceCode] = useState("");
  const [multipleCodesMode, setMultipleCodesMode] = useState(false);
  const [codeFields, setCodeFields] = useState<string[]>([""]);
  const { t, currentLanguage, queryClient } = useReactItems();

  // Verify passenger attendance via code
  const { mutate: verifyAttendance, isPending: isVerifying } = useMutation({
    mutationFn: async ({ rideId, code }: { rideId: number; code: string }) => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/rides/${rideId}/make-attendance?lang=${currentLanguage}`,
        { code },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success(
        t(
          "RideDetails.attendance.success",
          "Passenger attendance confirmed successfully!",
        ),
      );
      queryClient.invalidateQueries({
        queryKey: [queryKey.SINGLE_RIDE, rideId],
      });
      setOpen(false);
      setAttendanceCode("");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          t("RideDetails.attendance.error", "Failed to confirm attendance"),
        { className: "custom-error-toast" },
      );
    },
  });

  const handleSubmitCode = () => {
    if (multipleCodesMode) {
      const validCodes = codeFields.filter((code) => code.trim());
      if (validCodes.length > 0) {
        validCodes.forEach((code) => {
          verifyAttendance({ rideId, code: code.trim() });
        });
      }
    } else {
      if (attendanceCode && rideId) {
        verifyAttendance({ rideId, code: attendanceCode.trim() });
      }
    }
  };

  const addCodeField = () => {
    if (codeFields.length < 10) {
      // Limit to 10 codes for practicality
      setCodeFields([...codeFields, ""]);
      // setNumberOfCodes(numberOfCodes + 1);
    }
  };

  const removeCodeField = (index: number) => {
    if (codeFields.length > 1) {
      const newFields = [...codeFields];
      newFields.splice(index, 1);
      setCodeFields(newFields);
      // setNumberOfCodes(numberOfCodes - 1);
    }
  };

  const updateCodeField = (index: number, value: string) => {
    const newFields = [...codeFields];
    newFields[index] = value;
    setCodeFields(newFields);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          disabled={isVerifying}
          className="bg-secondary hover:bg-secondary/80 text-white"
        >
          {isVerifying
            ? t("common_.processing", "Processing...")
            : t("common_.markSeatAttended", "Mark Seat Attended")}
        </Button>
      </DialogTrigger>

      <DialogContent className="dark:bg-gray-900 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("common_.attendance.title", "Enter Attendance Code")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "common_.attendance.description",
              "Ask the passenger for their code to confirm attendance.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 mb-4">
          <Switch
            id="multiple-codes-mode"
            checked={multipleCodesMode}
            onCheckedChange={(checked) => {
              setMultipleCodesMode(checked);
              if (!checked) {
                setCodeFields([""]);
                // setNumberOfCodes(1);
              }
            }}
          />
          <Label htmlFor="multiple-codes-mode">
            {t("common_.multipleCodes", "Multiple Codes")}
          </Label>
        </div>

        {multipleCodesMode ? (
          <div className="py-2 space-y-3">
            {codeFields.map((code, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder={t(
                    "common_.attendance.placeholder",
                    `Code ${index + 1}`,
                  )}
                  value={code}
                  onChange={(e) => updateCodeField(index, e.target.value)}
                  disabled={isVerifying}
                  className="flex-1"
                />
                {codeFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCodeField(index)}
                    disabled={isVerifying}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {codeFields.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addCodeField}
                disabled={isVerifying}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("common_.addCode", "Add Another Code")}
              </Button>
            )}
          </div>
        ) : (
          <div className="py-2">
            <Input
              type="text"
              placeholder={t(
                "common_.attendance.placeholder",
                "Enter code here",
              )}
              value={attendanceCode}
              onChange={(e) => setAttendanceCode(e.target.value)}
              disabled={isVerifying}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isVerifying}
            className="dark:bg-gray-700"
          >
            {t("common_.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmitCode}
            disabled={
              isVerifying ||
              (multipleCodesMode
                ? codeFields.every((code) => !code.trim())
                : !attendanceCode)
            }
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("driverComplain.attendance.submitting", "Submitting...")}
              </>
            ) : (
              t("common_.submit", "Submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ComplaintDialog = ({
  driverId,
  rideId,
}: {
  driverId: string;
  rideId: string;
}) => {
  const [open, setOpen] = useState(false);
  const [complaint, setComplaint] = useState("");

  const { t } = useTranslation();

  // Mutation
  const complaints = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/complaints`,
        {
          rideId,
          userId: driverId,
          reason: complaint,
          reporterType: "PASSENGER",
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Complaint submitted successfully!");
      setComplaint("");
      setOpen(false);
    },
    onError: (error) => {
      const message = (error as any).response.data.message;
      toast.error(message, {
        className: "custom-error-toast",
      });
    },
  });

  const handleSubmit = async () => {
    complaints.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="mt-4 underline border-none underline-offset-4"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {t("passengerComplain.rideComplaint.reportButton")}
        </Button>
      </DialogTrigger>

      <DialogContent className="dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>
            {t("passengerComplain.rideComplaint.title")}
          </DialogTitle>
          <DialogDescription>
            {t("passengerComplain.rideComplaint.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Textarea
            placeholder={t("passengerComplain.rideComplaint.placeholder")}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            rows={4}
            className="w-full resize-none"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={complaints?.isPending}
            className="dark:bg-gray-700"
          >
            {t("passengerComplain.common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={complaints?.isPending || !complaint}
          >
            {complaints?.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("passengerComplain.rideComplaint.submitting")}
              </>
            ) : (
              t("passengerComplain.common.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const DriverComplaintDialog = ({
  passengerId,
  rideId,
}: DriverComplaintDialogProps) => {
  const [open, setOpen] = useState(false);
  const [complaint, setComplaint] = useState("");

  const { t } = useTranslation();

  // Mutation
  const complaints = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/complaints`,
        {
          rideId,
          userId: passengerId,
          reason: complaint,
          reporterType: "DRIVER",
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Complaint submitted successfully!");
      setComplaint("");
      setOpen(false);
    },
    onError: (error) => {
      const message = (error as any).response.data.message;
      toast.error(message, {
        className: "custom-error-toast",
      });
    },
  });

  const handleSubmit = async () => {
    complaints.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="mt-4 underline border-none underline-offset-4"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {t("driverComplain.complaint.reportButton")}
        </Button>
      </DialogTrigger>

      <DialogContent className="dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>{t("driverComplain.complaint.title")}</DialogTitle>
          <DialogDescription>
            {t("driverComplain.complaint.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Textarea
            placeholder={t("driverComplain.complaint.placeholder")}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            rows={4}
            className="w-full resize-none"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={complaints.isPending}
            className="dark:bg-gray-700"
          >
            {t("driverComplain.common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={complaints.isPending || !complaint}
          >
            {complaints.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("driverComplain.complaint.submitting")}
              </>
            ) : (
              t("driverComplain.common.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const InfoDialog = ({
  address,
  setAddress,
  subscribe,
  isCurrentPlan,
  isLoading,
  isFree,
}: {
  address: any;
  setAddress: any;
  subscribe: any;
  isCurrentPlan: boolean;
  isLoading: boolean;
  isFree: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const { t } = useTranslation();
  const { authenticated } = useAuth();

  // Extract provinces
  const PROVINCES = Array.from(
    new Set(CANADIAN_CITIES.map((c) => c.province)),
  ).sort();

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvince = e.target.value;
    setAddress((prev: any) => ({
      ...prev,
      province: newProvince,
      city: "", // reset city only
    }));
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAddress((prev) => ({
      ...prev,
      city: e.target.value,
    }));
  };

  // Filter cities by selected province
  const cities = CANADIAN_CITIES.filter((c) => c.province === address.province);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!authenticated)
              return toast.error(t("common_.notAuthenticated"), {
                className: "custom-error-toast",
              });
            setOpen(true);
          }}
          className={`w-full ${
            isCurrentPlan && !isFree
              ? "bg-muted text-primary hover:text-white border border-primary"
              : ""
          }`}
          disabled={isLoading || (isCurrentPlan && isFree)}
        >
          {isLoading
            ? t("PaymentDialog.Subscription.processing")
            : isCurrentPlan
              ? isFree
                ? t("common_.small.selectPlan")
                : t("common_.small.renew")
              : t("PaymentDialog.Subscription.selectPlan")}
        </Button>
      </DialogTrigger>

      <DialogContent className="dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle>{t("common_.addressTitle")}</DialogTitle>
          <DialogDescription>
            {t("common_.addressDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="street">
              {t("common_.small.street")}
            </label>
            <Input
              id="street"
              name="street"
              placeholder="123 Main St"
              value={address.street}
              onChange={handleChange}
              className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
              htmlFor="province"
            >
              {t("common_.small.province")}
            </label>
            <select
              id="province"
              name="province"
              value={address.province}
              onChange={handleProvinceChange}
              className="w-full border border-gray-300 dark:border-gray-700
               bg-white dark:bg-gray-900
               text-gray-900 dark:text-gray-100
               rounded-md px-3 py-2
               focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">{t("common_.selectProvince")}</option>
              {PROVINCES.map((prov) => (
                <option key={prov} value={prov}>
                  {PROVINCE_NAMES[prov]} ({prov})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
              htmlFor="city"
            >
              {t("common_.small.city")}
            </label>
            <select
              id="city"
              name="city"
              value={address.city}
              onChange={handleCityChange}
              disabled={!address.province}
              className="w-full border border-gray-300 dark:border-gray-700
               bg-white dark:bg-gray-900
               text-gray-900 dark:text-gray-100
               rounded-md px-3 py-2
               focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
               disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{t("common_.selectCity")}</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="postalCode"
            >
              {t("common_.small.postal")}
            </label>
            <Input
              id="postalCode"
              name="postalCode"
              placeholder="M1A 2B3"
              value={address.postalCode}
              onChange={handleChange}
              className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            className="dark:bg-gray-700"
          >
            {t("common_.small.logoutCancel")}
          </Button>
          <Button onClick={subscribe} disabled={isLoading}>
            {isLoading
              ? t("PaymentDialog.Subscription.processing")
              : isCurrentPlan
                ? t("common_.small.renew", "Renew Plan")
                : t("PaymentDialog.Subscription.selectPlan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
