import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import LoaderIndicator from "@/components/LoadingIndicator";
import { ShowCustomToast } from "@/components/LogoutModal";
import { apiUrl } from "@/data";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";
import Logo from "@/components/logos/Logo2";
import {
  ArrowLeft,
  Mail,
  Sparkles,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { AccountManager } from "@/utils/accountManager";
import CustomLoader from "@/components/CustomLoader";
import { useAuth } from "@/providers/Context/UseAuthContext";

const OtpInput = ({
  setValid,
  setCode,
}: {
  setValid: React.Dispatch<React.SetStateAction<boolean>>;
  setCode: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const length = 4;
  const [otp, setOtp] = useState(Array(length).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.split("");
    const newOtp = [...otp];

    for (let i = 0; i < digits.length && index + i < length; i++) {
      newOtp[index + i] = digits[i];
    }

    setOtp(newOtp);

    const nextIndex = Math.min(index + digits.length, length - 1);
    setTimeout(() => {
      inputsRef.current[nextIndex]?.focus();
    }, 0);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    const isComplete = otp.every((digit) => digit !== "");
    setValid(isComplete);
    setCode(otp);
  }, [otp, setValid, setCode]);

  return (
    <div className="flex gap-3 justify-center">
      {otp.map((digit, i) => (
        <motion.div
          key={i}
          whileHover={{ scale: 1.05 }}
          whileFocus={{ scale: 1.05 }}
        >
          <Input
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            autoFocus={i === 0}
            onChange={(e) => handleChange(i, e.target.value)}
            onPaste={(e) => handlePaste(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            ref={(el) => (inputsRef.current[i] = el)}
            className="w-14 h-14 text-center text-2xl font-bold border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all duration-200"
          />
        </motion.div>
      ))}
    </div>
  );
};

const VerifyUserEmail = () => {
  const { toast: uiToast } = useToast();
  const { t } = useTranslation();
  const { login } = useAuth();
  const [valid, setValid] = useState(false);
  const [otp, setOtp] = useState<number[]>([]);
  const [email, setEmail] = useState<string>("");
  const [emailEditable, setEmailEditable] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lang = localStorage.getItem("i18nextLng");

  // Get email from multiple sources
  useEffect(() => {
    // Priority order: URL params -> localStorage -> empty for user input
    const urlEmail = searchParams.get("email");
    const storedEmail = (() => {
      try {
        const stored = localStorage.getItem("email");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return localStorage.getItem("email"); // Fallback for non-JSON values
      }
    })();

    if (urlEmail) {
      setEmail(urlEmail);
      setEmailEditable(false);
    } else if (storedEmail) {
      setEmail(storedEmail);
      setEmailEditable(false);
    } else {
      setEmailEditable(true);
    }
  }, [searchParams]);

  const { mutate: verifyEmail, isPending: isVerifying } = useMutation({
    mutationFn: async (formData: { code: number[] }) => {
      if (!email) {
        throw new Error(t("validation.emailRequired"));
      }

      const res = await axios.post(`${apiUrl}/api/v1/auth/verify-email`, {
        email,
        code: formData.code.join(""),
      });
      return res.data;
    },
    onSuccess: async (data) => {
      ShowCustomToast(
        uiToast,
        t("VerifyEmail.toastTitle"),
        t("VerifyEmail.toastDesc")
      );
      localStorage.removeItem("email");

      // Store authentication data
      if (data.data?.token) {
        localStorage.setItem("Your-DriveToken", JSON.stringify(data.data.token));
      }

      if (data.data?.user?.role) {
        localStorage.setItem("userRole", JSON.stringify(data.data.user.role));
      }

      // Create user object for login
      const userData = {
        email: data.data?.user?.email || email,
        name: data.data?.user?.name || "User",
        role: data.data?.user?.role || "PASSENGER",
        id: data.data?.user?.id || data.data?.user?._id,
        theme: data.data?.user?.theme || "light",
        language: data.data?.user?.language || "en",
        profileImage: data.data?.user?.profileImage || { url: "" },
        isPassengerOnboarded: data.data?.user?.isPassengerOnboarded || false,
      };

      // Route non-operators who still need onboarding there; login() reads
      // postLoginRedirect and owns the (single) post-login navigation, so we don't
      // add a competing navigate() after it.
      if (userData && userData.role !== "BUS_OPERATOR" && !userData.isPassengerOnboarded) {
        localStorage.setItem("postLoginRedirect", "/passenger-onboarding");
      }
      await login(userData, data.data?.token);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("validation.verificationFailed"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const { mutate: resendCode, isPending: isResendingCode } = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error(t("validation.emailRequired"));
      }

      const res = await axios.post(
        `${apiUrl}/api/v1/auth/resend-verification?lang=${lang}`,
        { email }
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Verification code sent successfully!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || t("validation.failedToResendCode"),
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const handleVerify = () => {
    if (!email) {
      toast.error(t("validation.enterEmailAddress"), {
        className: "custom-error-toast",
      });
      return;
    }
    verifyEmail({ code: otp });
  };

  const handleResendCode = () => {
    if (!email) {
      toast.error(t("validation.enterEmailAddress"), {
        className: "custom-error-toast",
      });
      return;
    }
    resendCode();
  };

  const emailMasked = email ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "";

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-white p-4"
      lang={lang || "en"}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            className="group flex items-center space-x-2 text-black hover:text-gray-600 transition-all duration-200 border-0"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>{t("commonAuth.backToLogin")}</span>
          </Button>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white border-2 border-green-600 p-8 relative overflow-hidden"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-black text-black mb-2">
              Verify Your Email
            </h1>
            <p className="text-gray-600 flex items-center justify-center space-x-2">
              <Sparkles className="h-4 w-4 text-black" />
              <span>Check your email for the verification code</span>
            </p>
          </motion.div>

          {/* Email Display/Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            {emailEditable ? (
              <div className="space-y-3">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-black flex items-center space-x-2"
                >
                  <Mail className="h-4 w-4 text-black" />
                  <span>Email Address</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("VerifyEmail.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all duration-200"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 bg-green-600 border-2 border-green-600">
                <div className="flex items-center space-x-3 text-white">
                  <Mail className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">
                      Verification code sent to:
                    </p>
                    <p className="text-xs text-gray-300">
                      {emailMasked}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEmailEditable(true)}
                    className="text-xs text-white hover:text-gray-300 border-0"
                  >
                    {t("commonAuth.change")}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* OTP Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-6 mb-8"
          >
            <div className="text-center">
              <Label className="text-sm font-medium text-black">
                {t("commonAuth.enterVerificationCode")}
              </Label>
            </div>

            <OtpInput setValid={setValid} setCode={setOtp} />
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-4 mb-6"
          >
            <Button
              onClick={handleVerify}
              disabled={!valid || !email || isVerifying}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold transition-all duration-200 border-2 border-green-600 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <CustomLoader className="mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify Email
                </>
              )}
            </Button>

            <div className="flex items-center justify-center space-x-4 text-sm">
              <span className="text-gray-600">
                {t("commonAuth.didntReceiveCode")}
              </span>
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={!email || isResendingCode}
                className="h-auto p-0 text-black hover:text-gray-600 font-medium transition-colors hover:underline border-0"
              >
                {isResendingCode ? (
                  <>
                    <CustomLoader className="mr-1 h-3 w-3" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    {t("commonAuth.resendCode")}
                  </>
                )}
              </Button>
            </div>
          </motion.div>

        </motion.div>
      </motion.div>
    </div>
  );
};

export default VerifyUserEmail;
