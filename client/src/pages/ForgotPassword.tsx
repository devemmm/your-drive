import LoaderIndicator from "@/components/LoadingIndicator";
import { ShowCustomToast } from "@/components/LogoutModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/data";
import { useToast } from "@/hooks/use-toast";
import { ValidationFormData, validationSchema } from "@/lib/zodvalidator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Send,
  Phone,
} from "lucide-react";
import Logo from "@/components/logos/Logo2";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);
  const [smsText, setSmsText] = useState(null);

  const { toast: showToast } = useToast();
  const router = useNavigate();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      localStorage.removeItem("resetMethod");
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ValidationFormData>({
    resolver: zodResolver(validationSchema(t)),
    defaultValues: {
      method: "email",
    },
  });

  const email = watch("email");
  const phone = watch("phone");
  const method = watch("method");

  useEffect(() => {
    if (method === "email") {
      setValue("phone", undefined);
    } else {
      setValue("email", undefined);
    }
  }, [method, setValue]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  };

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (input: { email?: string; phone?: string }) => {
      const lang = localStorage.getItem("i18nextLng") || "en";
      const res = await axios.post(
        `${apiUrl}/api/v1/auth/forgot-password/web?lang=${lang}`,
        input
      );
      return res.data;
    },
    onSuccess: (data, lang) => {
      setSmsText(data.message);
      ShowCustomToast(
        showToast,
        t("ForgetPassword.sent"),
        t("ForgetPassword.check")
      );
      setSubmitted(true);
      localStorage.setItem("resetMethod", method);
    },
    onError: (error: any) => {
      console.error("Forgot password error:", error);
      toast.error(
        error.response?.data?.message || t("validation.failedToSendResetLink"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const onSubmit = (data: ValidationFormData) => {
    const payload: { email?: string; phone?: string } = {};

    if (method === "email") {
      payload.email = data.email;
    } else {
      payload.phone = data.phone;
    }

    mutate(payload);
  };

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
            onClick={() => navigate("/login")}
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>{t("commonAuth.backToLogin")}</span>
          </Button>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="forgot-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              className="space-y-6 border-2 border-green-600 p-8 bg-white"
              >
                <div>
                  <h2 className="text-4xl font-black text-black mb-2">
                    Reset Your Password
                  </h2>
                  <p className="text-gray-600">
                    Enter your email or phone number to receive a reset link
                  </p>
                </div>

                {/* Method Toggle */}
                <div className="flex space-x-2 p-1 bg-white border-2 border-green-600">
                  <button
                    type="button"
                    onClick={() => setValue("method", "email")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      method === "email"
                        ? "bg-green-600 text-white"
                        : "text-gray-600 hover:text-green-600"
                    }`}
                  >
                    {t("ForgetPassword.useEmail")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("method", "phone")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      method === "phone"
                        ? "bg-green-600 text-white"
                        : "text-gray-600 hover:text-green-600"
                    }`}
                  >
                    {t("ForgetPassword.usePhone")}
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {method === "email" ? (
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-black"
                      >
                        {t("ForgetPassword.email")}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@mail.com"
                        className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-sm font-medium text-black"
                      >
                        {t("ForgetPassword.phone")}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t("ForgetPassword.phonePlaceHolder")}
                        className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                        {...register("phone")}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      isPending ||
                      (method === "email" &&
                        (!email || !isValidEmail(email))) ||
                      (method === "phone" && (!phone || !isValidPhone(phone)))
                    }
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold transition-all duration-200 border-2 border-green-600"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {t("ForgetPassword.Sending")}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        {t("ForgetPassword.sendResetLink")}
                      </>
                    )}
                  </Button>

                  {error && (
                    <div className="p-4 bg-red-50 border-2 border-red-200">
                      <p className="text-sm text-red-600 dark:text-red-400 text-center">
                        {(error as any).response?.data?.message ??
                          t("ForgetPassword.anErrorOccurred")}
                      </p>
                    </div>
                  )}
                </form>

                <div className="text-center">
                  <span className="text-sm text-gray-600">
                    {t("ForgetPassword.remember")}{" "}
                    <Link
                      to="/login"
                      className="text-green-600 hover:text-green-700 font-medium"
                    >
                      {t("ForgetPassword.signIn")}
                    </Link>
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-black text-black mb-2">
                    {method === "email"
                      ? t("ForgetPassword.emailSentTitle")
                      : t("ForgetPassword.smsSentTitle")}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {method === "email"
                      ? t("ForgetPassword.checkEmail")
                      : t("ForgetPassword.checkSMS")}
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-400 text-center">
                    {localStorage.getItem("resetMethod") === "email"
                      ? `Check your email (${email}) for the password reset link.`
                      : `${smsText}`}
                  </p>
                </div>

                <div className="flex space-x-4">
                  <Button
                    onClick={() => router("/")}
                    className="flex-1 h-12 bg-white text-green-600 border-2 border-green-600 hover:bg-green-50 font-bold"
                  >
                    {t("common_.small.home")}
                  </Button>
                  {smsText &&
                  localStorage.getItem("resetMethod") === "phone" ? (
                    <Button
                      onClick={() =>
                        router(`/reset-password?phoneNumber=${phone}`)
                      }
                      className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold border-2 border-green-600"
                    >
                      {t("common_.small.change")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router("/login")}
                      className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold border-2 border-green-600"
                    >
                      {t("common_.small.login")}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
  );
};

export default ForgotPassword;
