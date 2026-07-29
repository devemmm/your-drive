import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiUrl, queryKey } from "@/data";
import { useReactItems } from "@/lib/ReactTranslation";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { VerifyPhoneDialog } from "../VerifyPhoneForm";
import { getToken } from "../getToken";
import { Input } from "../ui/input";

export const ChangePassword = ({ phone }: any) => {
  const { t, queryClient, currentLanguage } = useReactItems();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  // Show/hide password states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeForm, setActiveForm] = useState<"password" | "phone" | null>(
    null
  );
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [verify, setVerify] = useState(false);

  const [editPhone, setEditPhone] = useState(false);

  // 🧠 Define mutation function directly in file
  const changePassword = async ({
    oldPassword,
    newPassword,
  }: {
    oldPassword: string;
    newPassword: string;
  }) => {
    const token = await getToken();

    const response = await axios.post(
      `${apiUrl}/api/v1/users/change-password`,
      {
        oldPassword,
        newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  };

  // 🔁 Mutation hook
  const { mutate, isPending } = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success(t("profile_.changePassword.success"));
      resetForm();
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

  // 🔁 Mutation hook
  const phoneMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(
        `${apiUrl}/api/v1/users/add-phone?lang=${currentLanguage}`,
        {
          phoneNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: [queryKey.PREFERENCE] });
      await queryClient.invalidateQueries({ queryKey: [queryKey.USER] });
      toast.success(t(data.message));
      if (data.success) setVerify(true);
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

  // 🚀 Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError(t("profile_.changePassword.passwordsDoNotMatch"));
      return;
    }

    setError("");

    mutate({
      oldPassword: currentPassword,
      newPassword,
    });
  };

  const resetForm = () => {
    setError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOpen(false);
    setActiveForm(null);
  };

  // Helper to toggle password visibility per input
  const toggleShow = (field: "current" | "new" | "confirm") => {
    if (field === "current") setShowCurrent((v) => !v);
    if (field === "new") setShowNew((v) => !v);
    if (field === "confirm") setShowConfirm((v) => !v);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    phoneMutation.mutate();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl max-w-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("profile_.changePassword.title")}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t("profile_.changePassword.description")}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Tab Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
          <Button
            variant={activeForm === "password" ? "default" : "outline"}
            onClick={() => setActiveForm("password")}
            className={`w-full sm:w-auto ${
              activeForm === "password"
                ? "bg-primary-600 hover:bg-primary-700 text-white"
                : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-black"
            }`}
          >
            {t("profile_.changePassword.title")}
          </Button>
          <Button
            variant={activeForm === "phone" ? "default" : "outline"}
            onClick={() => setActiveForm("phone")}
            className={`w-full sm:w-auto ${
              activeForm === "phone"
                ? "bg-primary-600 hover:bg-primary-700 text-white"
                : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-black"
            }`}
          >
            {t(`profile_.phone.${phone ? "editPhone" : "addPhone"}`)}
          </Button>
        </div>

        {activeForm === "password" && (
          <motion.form
            key="password-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-4 sm:space-y-6 w-full max-w-2xl"
          >
            {/* Current Password */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("profile_.changePassword.currentPassword")}
              </label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => toggleShow("current")}
                  className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("profile_.changePassword.newPassword")}
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => toggleShow("new")}
                  className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("profile_.changePassword.confirmNewPassword")}
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => toggleShow("confirm")}
                  className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm py-3 px-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="w-full sm:flex-1 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-black"
              >
                {t("profile_.changePassword.reset")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:flex-1 bg-primary-600 hover:bg-primary-700 text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("profile_.changePassword.updating")}
                  </>
                ) : (
                  t("profile_.changePassword.submit")
                )}
              </Button>
            </div>
          </motion.form>
        )}

        {activeForm === "phone" && (
          <motion.div
            key="phone-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {verify ? (
              <VerifyPhoneDialog
                phoneNumber={phoneNumber}
                open={verify}
                onOpenChange={setVerify}
                endProcess={setEditPhone(false)}
              />
            ) : (
              <form
                onSubmit={handlePhoneSubmit}
                className="space-y-4 sm:space-y-6 w-full max-w-2xl"
              >
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t("profile_.phone.enterPhone")}
                  </label>
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t("profile_.phone.placeholderPhone")}
                    disabled={!editPhone}
                    required
                  />
                </div>

                {/* Conditionally render Edit button or full action buttons */}
                {!editPhone ? (
                  <Button
                    type="button"
                    onClick={() => setEditPhone(true)}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    {t("common.edit")}
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditPhone(false);
                      }}
                      disabled={phoneMutation.isPending}
                      className="w-full sm:flex-1 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {t("profile_.phone.cancel")}
                    </Button>
                    <Button
                      disabled={phoneMutation.isPending}
                      type="submit"
                      className="w-full sm:flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    >
                      {phoneMutation.isPending
                        ? phone
                          ? t("profile_.phone.editing")
                          : t("profile_.phone.adding")
                        : phone
                        ? t("profile_.phone.edit")
                        : t("profile_.phone.add")}
                    </Button>
                  </div>
                )}
              </form>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export const DeleteAccount = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const deleteAccount = async () => {
    const token = await getToken();
    const lang = localStorage.getItem("i18nextLng") || "EN";
    const res = await axios.delete(
      `${apiUrl}/api/v1/users/delete-account?lang=${lang}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success(t("profile_.delete.success"));
      setTimeout(() => {
        localStorage.clear();
        window.location.replace("/login");
      }, 1000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || t("profile_.delete.error");
      toast.error(msg, {
        className: "custom-error-toast",
      });
    },
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-600 shadow-xl max-w-full overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-red-300 dark:border-red-600">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
            {t("profile_.delete.title")}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t("profile_.delete.warning")}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("profile_.delete.button")}
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-red-600 dark:text-red-400">
                {t("profile_.delete.confirmTitle")}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                {t("profile_.delete.confirmDescription")}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="border-slate-300 dark:border-slate-700"
                >
                  {t("profile_.delete.cancel")}
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => mutate()}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("profile_.delete.deleting")}
                  </>
                ) : (
                  t("profile_.delete.confirm")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
