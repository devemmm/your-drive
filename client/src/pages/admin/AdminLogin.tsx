import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiUrl } from "@/data";
import { LoginFormData, loginSchema } from "@/lib/zodvalidator";
import Logo from "@/components/logos/Logo2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminLogin: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [show2FAForm, setShow2FAForm] = useState(false);
  const [code, setCode] = useState(["", "", "", ""]);
  const { t } = useTranslation();
  const lang = localStorage.getItem("i18nextLng");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema(t)),
  });

  const email = watch("email");
  const password = watch("password");

  const {
    mutate: loginUser,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (formData: LoginFormData) => {
      const res = await axios.post(`${apiUrl}/api/v1/auth/login?lang=${lang}`, {
        email: formData.email,
        password: formData.password,
        role: "ADMIN",
      });
      return res.data;
    },
    onSuccess: (data) => {
      const token = data.data?.token;

      if (!token && data.success) {
        setShow2FAForm(true);
        return;
      }

      localStorage.setItem("Your-DriveToken", JSON.stringify(token));
      localStorage.setItem("userRole", JSON.stringify("admin"));

      let redirectTo = localStorage.getItem("postLoginRedirect");
      localStorage.removeItem("postLoginRedirect");

      if (!redirectTo) {
        redirectTo = "/admin";
      }

      toast.success(t("login.success"));
      setTimeout(() => {
        window.location.replace(redirectTo);
      }, 1000);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("Login.error"), {
        className: "custom-error-toast",
      });
    },
  });

  const twoFactor = useMutation({
    mutationFn: async () => {
      const codeString = code.join("");
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/auth/verify-2fa?lang=${lang}`,
        {
          email,
          code: codeString,
        }
      );
      return data;
    },
    onSuccess: async (data) => {
      const token = data.data.token;

      localStorage.setItem("Your-DriveToken", JSON.stringify(token));
      localStorage.setItem("userRole", JSON.stringify("admin"));

      let redirectTo = localStorage.getItem("postLoginRedirect");
      localStorage.removeItem("postLoginRedirect");

      if (!redirectTo) {
        redirectTo = "/admin";
      }

      toast.success(t("login.success"));
      setTimeout(() => {
        window.location.replace(redirectTo);
      }, 1000);
    },
    onError: (error) => {
      toast.error((error as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginUser(data);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 4);
    const newCode = [...code];
    pastedData.split("").forEach((char, index) => {
      if (index < 4) {
        newCode[index] = char;
      }
    });
    setCode(newCode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      {show2FAForm ? (
        <div className="w-full max-w-md">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
            <CardHeader className="border-b border-gray-200 dark:border-gray-800 pb-6">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  onClick={() => {
                    setShow2FAForm(false);
                    setCode(["", "", "", ""]);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 dark:bg-primary/20 mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t("adminLogin.2fa", "Two-Factor Authentication")}
                </CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t(
                    "adminLogin.2faDescription",
                    "Enter the 4-digit code sent to your email"
                  )}
                </p>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.join("").length === 4) {
                    twoFactor.mutate();
                  }
                }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("adminLogin.2faTitle", "Verification Code")}
                  </Label>
                  <div
                    className="flex gap-2 justify-center"
                    onPaste={handlePaste}
                  >
                    {code.map((digit, index) => (
                      <Input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                        className="w-12 h-14 text-center text-lg font-semibold border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    ))}
                  </div>
                </div>

                {twoFactor.error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">
                      {(twoFactor.error as any).response?.data?.message ||
                        t("adminLogin.error")}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 font-medium"
                  disabled={twoFactor.isPending || code.join("").length !== 4}
                >
                  {twoFactor.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("adminLogin.verifying", "Verifying...")}
                    </>
                  ) : (
                    t("adminLogin.verify", "Verify Code")
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800 pb-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 dark:bg-primary/20 mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {t("adminLogin.title", "Admin Login")}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("adminLogin.subtitle", "Sign in to access the admin panel")}
              </p>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t("adminLogin.email", "Email")}
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("adminLogin.emailPlaceholder", "admin@example.com")}
                      className="pl-10 h-11 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...register("email")}
                      disabled={isPending}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {t("adminLogin.password", "Password")}
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("adminLogin.passwordPlaceholder", "Enter your password")}
                      className="pl-10 pr-10 h-11 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...register("password")}
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isPending}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    {(error as any).response?.data?.message ?? t("Login.error")}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("adminLogin.signingIn", "Signing in...")}
                  </>
                ) : (
                  t("adminLogin.signIn", "Sign In")
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("adminLogin.secureAccess", "Secure admin access only")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminLogin;
