import { apiUrl } from "@/data";
import { LoginFormData, loginSchema } from "@/lib/zodvalidator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/providers/Context/UseAuthContext";

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [show2FAForm, setShow2FAForm] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema(t)),
    defaultValues: {},
  });

  const email = watch("email");
  const password = watch("password");
  const lang = localStorage.getItem("i18nextLng");

  const [code, setCode] = useState(undefined);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const resendVerification = async () => {
    try {
      setIsResending(true);
      const email = watch("email");
      if (!email) {
        toast.error(t("Login.enterEmailFirst"), {
          className: "custom-error-toast",
        });
        return;
      }

      const res = await axios.post(
        `${apiUrl}/api/v1/auth/resend-verification?lang=${lang}`,
        { email }
      );

      if (res.data.success) {
        toast.success(t("Login.verificationEmailSent"));
      } else {
        toast.error(t("Login.verificationEmailFailed"), {
          className: "custom-error-toast",
        });
      }
    } catch (error) {
      toast.error(t("Login.verificationEmailFailed"), {
        className: "custom-error-toast",
      });
    } finally {
      setIsResending(false);
    }
  };

  const {
    mutate: loginUser,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (formData: LoginFormData) => {
      const res = await axios.post(`${apiUrl}/api/v1/auth/login?lang=${lang}`, {
        email: formData.email,
        password: formData.password,
      });
      return res.data;
    },
    onSuccess: async (data) => {
      const token = data.data?.token;

      if (!token && data.success) {
        setShow2FAForm(true);
        return;
      }
      const user = data.data.user;
      // login() persists the token + role to localStorage and then does a full-page
      // redirect (to /operator for BUS_OPERATOR, etc). Pass the token so that write
      // happens before the redirect — writing it here (after await) would race the
      // page unload. Do not add navigation after this call; login() owns the redirect.
      if (user && user.role !== "BUS_OPERATOR" && !user.isPassengerOnboarded) {
        localStorage.setItem("postLoginRedirect", "/passenger-onboarding");
      }
      await login(user, token);
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || t("Login.anErrorOccurred"), {
        className: "custom-error-toast",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginUser(data);
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      const isValid = await trigger("email");
      if (isValid && email && isValidEmail(email)) {
        setCurrentStep(1);
      } else if (email && !isValidEmail(email)) {
        toast.error(t("validation.validEmail"), {
          className: "custom-error-toast",
        });
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      setCurrentStep(0);
    }
  };

  const canProceedToNext = () => {
    if (currentStep === 0) return Boolean(email);
    if (currentStep === 1) return Boolean(password);
    return false;
  };

  const handleGoogleLogin = async () => {
    toast.info("Google login is currently unavailable", {
      className: "custom-error-toast",
    });
  };

  const twoFactor = useMutation({
    mutationFn: async () => {
      const { data } = await axios.patch(
        `${apiUrl}/api/v1/auth/verify-2fa?lang=${lang}`,
        {
          email,
          code,
        }
      );

      return data;
    },
    onSuccess: async (data) => {
      const user = data.data.user;
      const token = data.data.token;
      if (user && user.role !== "BUS_OPERATOR" && !user.isPassengerOnboarded) {
        localStorage.setItem("postLoginRedirect", "/passenger-onboarding");
      }
      await login(user, token);
    },
    onError: (error) => {
      console.log(error);
      toast.error((error as any).response.data.message, {
        className: "custom-error-toast",
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4" lang={lang || "en"}>
      <div className="w-full max-w-md">
          {/* Back Button */}
          <Button
            variant="ghost"
          className="group flex items-center space-x-2 text-black hover:text-gray-600 transition-all duration-200 p-0 mb-6 border-0"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>{t("commonAuth.backToHome")}</span>
          </Button>

          {show2FAForm ? (
            /* 2FA Form */
          <div className="space-y-6 border-2 border-green-600 p-8 bg-white">
              <div>
              <h2 className="text-3xl font-black text-black">
                  {t("Login.2fa", "Verify 2 Factor Auth")}
                </h2>
              <p className="mt-2 text-sm text-gray-600">
                  {t(
                    "Login.2faDescription",
                    "Enter the code sent to your email"
                  )}
                </p>
              </div>

            <div className="flex items-center space-x-3 p-4 bg-green-600 border-2 border-green-600">
              <Info className="h-5 w-5 text-white" />
              <p className="text-sm text-white">
                  {t("common_.Login.2faDescription")}
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  twoFactor.mutate();
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="2fa"
                  className="text-sm font-medium text-black"
                  >
                    {t("Login.2faTitle", "Enter code sent to your email")}
                  </Label>
                  <Input
                    id="2fa"
                    type="number"
                    placeholder={t("Login.2fa", "Enter your code")}
                  className="h-12 text-lg border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={twoFactor.isPending}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold transition-all duration-200 border-2 border-green-600"
                >
                  {twoFactor.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            /* Login Form */
          <div className="space-y-6 border-2 border-green-600 p-8 bg-white">
              <div>
              <h2 className="text-4xl font-black text-black mb-2">
                Welcome Back
                </h2>
              <p className="text-gray-600">
                Sign in to continue your journey
                </p>
              </div>

              {/* Progress Indicator */}
            <div className="flex items-center space-x-4 py-4">
                <div
                  className={`flex items-center justify-center w-10 h-10 border-2 ${
                    currentStep >= 0
                    ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <div
                  className={`flex-1 h-0.5 ${
                  currentStep >= 1 ? "bg-green-600" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`flex items-center justify-center w-10 h-10 border-2 ${
                    currentStep >= 1
                    ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  <Lock className="h-5 w-5" />
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <AnimatePresence mode="wait">
                  {currentStep === 0 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label
                          htmlFor="email"
                        className="text-sm font-medium text-black"
                        >
                        Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                        placeholder="Enter your email"
                        className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                          {...register("email")}
                        />
                        {errors.email && (
                          <p className="text-red-500 text-sm">
                            {errors.email.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={!canProceedToNext()}
                      className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold transition-all duration-200 border-2 border-green-600 disabled:opacity-50"
                      >
                      Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </motion.div>
                  )}

                  {currentStep === 1 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                    <div className="flex items-center space-x-3 p-3 bg-green-600 border-2 border-green-600">
                      <Mail className="h-4 w-4 text-white" />
                      <span className="text-sm text-white flex-1">
                          {email}
                        </span>
                        <button
                          type="button"
                          onClick={handleBack}
                        className="text-white hover:text-gray-300 text-sm font-medium"
                        >
                        Change
                        </button>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="password"
                        className="text-sm font-medium text-black"
                        >
                        Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="h-12 pr-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
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

                      <div className="flex justify-end">
                        <Link
                          to="/forgot-password"
                        className="text-sm text-black hover:text-gray-600 font-medium"
                        >
                        Forgot password?
                        </Link>
                      </div>

                      <div className="flex space-x-4">
                        <Button
                          type="button"
                          onClick={handleBack}
                        className="flex-1 h-12 bg-white text-green-600 border-2 border-green-600 hover:bg-green-50 font-bold"
                        >
                          <ArrowLeft className="mr-2 h-5 w-5" />
                        Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={!canProceedToNext() || isPending}
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold border-2 border-green-600"
                        >
                          {isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                            Sign In
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                <div className="p-4 bg-green-600 border-2 border-green-600">
                  <p className="text-sm text-white text-center">
                      {(error as any).response?.data?.message ??
                        t("Login.anErrorOccurred")}
                    </p>
                    {((error as any).response?.data?.message ===
                      "Please verify your email first." ||
                      (error as any).response?.data?.message ===
                        "Veuillez d'abord vérifier votre courriel.") && (
                      <div className="flex justify-between mt-3">
                        <Link
                          to={`/verify-email${
                            email ? `?email=${encodeURIComponent(email)}` : ""
                          }`}
                        className="text-sm text-white font-medium hover:text-gray-300"
                        >
                        Verify Email
                        </Link>
                        <button
                          onClick={resendVerification}
                          disabled={isResending}
                        className="text-sm text-white font-medium hover:text-gray-300 disabled:opacity-50"
                        >
                          {isResending ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin inline" />
                            Sending...
                            </>
                          ) : (
                          "Resend"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-green-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGoogleLogin}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white border-2 border-green-600 font-bold"
              >
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                      <path
                  fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                  fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                  fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                  fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
              Google
              </Button>

              <div className="text-center">
              <span className="text-sm text-gray-600">
                Don't have an account?{" "}
                  <Link
                    to="/register"
                  className="text-green-600 hover:text-green-700 font-medium"
                  >
                  Sign Up
                  </Link>
                </span>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Login;
