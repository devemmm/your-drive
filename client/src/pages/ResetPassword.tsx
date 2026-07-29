import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { apiUrl } from "@/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Key, ArrowLeft, Lock } from "lucide-react";
import { ResetFormData, resetSchema } from "@/lib/zodvalidator";
import { useMutation } from "@tanstack/react-query";
import { ShowCustomToast } from "@/components/LogoutModal";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/logos/Logo2";
import { toast } from "sonner";

const ResetPassword = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const router = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const token = new URLSearchParams(location.search).get("token");
  const phone = new URLSearchParams(location.search).get("phoneNumber");
  const email = new URLSearchParams(location.search).get("email");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema(t)),
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (data: any) => {
      const payload: Record<string, string> = {
        newPassword: data.password,
      };

      if (phone) {
        payload.phone = `+${phone.trim()}`;
        payload.token = data.code;
      } else {
        const tokenToUse = data.token || token;
        if (tokenToUse) {
          payload.token = tokenToUse;
        }
      }

      const lang = localStorage.getItem("i18nextLng") || "en";
      const { data: dbData } = await axios.post(
        `${apiUrl}/api/v1/auth/reset-password/web?lang=${lang}`,
        payload
      );
      return dbData;
    },
    onSuccess: async () => {
      ShowCustomToast(
        toast,
        "Password Reset Successful",
        "You have been logged in successfully."
      );

      setTimeout(() => {
        window.location.replace("/login");
      }, 1000);
    },
    onError: (error: any) => {
      console.error("Reset password error:", error);
      toast.error(
        error.response?.data?.message || t("validation.failedToResetPassword"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const onSubmit = async (data: ResetFormData) => {
    mutate(data);
  };

  if (!token && !phone && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md space-y-8 text-center border-2 border-green-600 p-8">
            <Button
              variant="ghost"
            className="group flex items-center space-x-2 text-black hover:text-gray-600 transition-all duration-200 p-0 mb-8 border-0"
              onClick={() => router("/login")}
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span>{t("commonAuth.backToLogin")}</span>
            </Button>

            <div>
            <h2 className="text-3xl font-black text-black mb-4">
              Invalid Reset Link
              </h2>
            <p className="text-gray-600 mb-8">
              This password reset link is invalid or has expired. Please request a new one.
              </p>

              <Button
                onClick={() => router("/login")}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold transition-all duration-200 border-2 border-green-600"
              >
              Back to Login
              </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-white p-4"
      lang={localStorage.getItem("i18nextLng") || "en"}
    >
      <div className="w-full max-w-md">
          {/* Back Button */}
          <Button
            variant="ghost"
          className="group flex items-center space-x-2 text-black hover:text-gray-600 transition-all duration-200 p-0 mb-6 border-0"
            onClick={() => router("/login")}
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>{t("commonAuth.backToLogin")}</span>
          </Button>

        <div className="space-y-6 border-2 border-green-600 p-8 bg-white">
            <div>
            <h2 className="text-4xl font-black text-black mb-2">
              Set New Password
              </h2>
            <p className="text-gray-600">
              Create a strong password for your account
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 border-2 bg-green-600 border-green-600 text-white">
                <Key className="h-5 w-5" />
              </div>
              <div className="flex-1 h-0.5 bg-green-600" />
              <div className="flex items-center justify-center w-10 h-10 border-2 bg-green-600 border-green-600 text-white">
                <Lock className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Token or Code input */}
              {!token && !phone && (
                <div className="space-y-2">
                  <Label
                    htmlFor="token"
                    className="text-sm font-medium text-black"
                  >
                    {t("common_.small.token")}
                  </Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder={t("ResetPassword.tokenPlaceholder")}
                    className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                    {...register("token")}
                  />
                  {errors.token && (
                    <p className="text-red-500 text-sm">
                      {errors.token?.message}
                    </p>
                  )}
                </div>
              )}

              {phone && (
                <div className="space-y-2">
                  <Label
                    htmlFor="code"
                    className="text-sm font-medium text-black"
                  >
                    {t("ResetPassword.code", "Code")}
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder={t("ResetPassword.codePlaceholder")}
                    className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                    {...register("code")}
                  />
                  {errors.code && (
                    <p className="text-red-500 text-sm">
                      {errors.code.message}
                    </p>
                  )}
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-black"
                >
                  {t("ResetPassword.new")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("ResetPassword.passwordPlaceholder")}
                    className="h-12 pr-12 border-2 border-black focus:border-black focus:ring-2 focus:ring-black/20"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-black"
                >
                  {t("ResetPassword.confirm")}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("ResetPassword.confirmPasswordPlaceholder")}
                    className="h-12 pr-12 border-2 border-black focus:border-black focus:ring-2 focus:ring-black/20"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isPending || submitted}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold transition-all duration-200 border-2 border-green-600"
              >
                {isPending
                  ? t("ResetPassword.resetting")
                  : t("ResetPassword.reset")}
              </Button>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    {(error as any).response?.data?.message ??
                      t("ResetPassword.anErrorOccurred")}
                  </p>
                </div>
              )}
            </form>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                {t("ResetPassword.remember")}{" "}
                <button
                  onClick={() => router("/login")}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  {t("ResetPassword.signIn")}
                </button>
              </span>
            </div>
          </div>
      </div>
    </div>
  );
};

export default ResetPassword;
