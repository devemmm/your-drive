import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { apiUrl, queryKey } from "@/data";
import { useReactItems } from "@/lib/ReactTranslation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import React, { useState } from "react";
import { toast } from "sonner";
import { getToken } from "./getToken";
import { Button } from "./ui/button";

export const VerifyPhoneDialog = ({
  phoneNumber,
  open,
  onOpenChange,
  endProcess,
}: {
  phoneNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endProcess?: any;
}) => {
  const [verificationCode, setVerificationCode] = useState("");
  const { t, queryClient, currentLanguage } = useReactItems();

  const verifyPhoneMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/users/verify-phone?lang=${currentLanguage}`,
        {
          phoneNumber,
          code: verificationCode,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
      await queryClient.invalidateQueries({ queryKey: [queryKey.USER] });
      window.location.replace("/profile");
      toast.success(t(data.message));
      onOpenChange(false); // Close dialog
      setVerificationCode("");
      endProcess();
      if (typeof endProcess === "function") {
        endProcess();
      }
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      if (message) toast.error(message);
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/users/resend-phone-verification`,
        { phoneNumber },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );
      return data;
    },
    onSuccess: async (data) => {
      toast.success(t(data.message));
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message ||
        t("profile_.changePassword.error") ||
        "Something went wrong";
      toast.error(message, {
        className: "custom-error-toast",
      });
    },
  });

  const handlePhoneVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPhoneMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg shadow-lg border-2 border-gray-100 dark:border-gray-700">
        <DialogHeader className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("profile_.phone.verifyPhone")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {t("profile_.phone.verifying_")}{" "}
            <span className="font-semibold dark:text-white">{phoneNumber}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handlePhoneVerify} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="text-base font-medium text-gray-800 dark:text-white">
              {t("profile_.phone.enterCode")}
            </label>
            <input
              type="text"
              className="w-full h-12 px-4 text-base border-2 rounded-lg dark:bg-gray-800 dark:text-white dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder={t("profile_.phone.placeholderCode")}
              required
            />
          </div>

          <DialogFooter className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setVerificationCode("");
                onOpenChange(false);
              }}
              disabled={verifyPhoneMutation.isPending}
            >
              {t("profile_.phone.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={verifyPhoneMutation.isPending}
              className="min-w-48 h-12 text-base"
            >
              {verifyPhoneMutation.isPending
                ? t("profile_.phone.verifying")
                : t("profile_.phone.verify")}
            </Button>
          </DialogFooter>
        </form>

        <div className="flex mt-4 text-sm text-muted-foreground">
          <Button
            variant="link"
            type="button"
            onClick={() => resendCodeMutation.mutate()}
            disabled={resendCodeMutation.isPending}
            className="px-0 text-sm w-fit mx-auto"
          >
            {resendCodeMutation.isPending
              ? t("profile_.phone.resending")
              : t("profile_.phone.resendCode")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
