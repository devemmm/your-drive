import Logo from "@/components/logos/Logo2";
import { apiUrl } from "@/data";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import CustomLoader from "@/components/CustomLoader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [referralCode, setReferralCode] = useState<string | null>(() =>
    localStorage.getItem("Code")
  );

  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("referralCode");
    if (code) {
      setReferralCode(code);
      localStorage.setItem("Code", code);
    }
  }, [searchParams]);

  const step1Schema = z.object({
    email: z.string().email(t("validation.validEmail")),
    firstName: z.string().min(2, t("validation.firstNameMinLength")),
    lastName: z.string().min(2, t("validation.lastNameMinLength")),
  });

  const step2BaseSchema = z.object({
    password: z.string().min(4, t("validation.passwordMinLength")),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: t("validation.agreeToTerms"),
    }),
    subscribeToUpdates: z.boolean().optional(),
  });

  const combinedSchema = step1Schema
    .merge(step2BaseSchema)
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordsDontMatch"),
      path: ["confirmPassword"],
    });

  type FormData = z.infer<typeof combinedSchema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(combinedSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
      subscribeToUpdates: false,
    },
  });

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const email = watch("email");
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const agreeToTerms = watch("agreeToTerms");

  const {
    mutate: registerUser,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (data: FormData) => {
      const param = new URLSearchParams({
        ...(referralCode && { referralCode }),
      });
      const response = await axios.post(
        `${apiUrl}/api/v1/auth/register?${param.toString()}`,
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          agreeToTerms: data.agreeToTerms,
          subscribeToUpdates: data.subscribeToUpdates,
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setCurrentStep(2);
      toast.success(
        "Account created successfully! Please check your email to verify your account."
      );

      localStorage.removeItem("Code");
      localStorage.setItem("email", JSON.stringify(watch("email")));

      setTimeout(() => {
        navigate("/verify-email", {
          replace: true,
        });
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Registration error:", error);
      toast.error(
        error.response?.data?.message ||
          "Registration failed. Please try again.",
        { className: "custom-error-toast" }
      );
    },
  });

  const onSubmit = (data: FormData) => {
    registerUser(data);
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      const isValid = await trigger(["email", "firstName", "lastName"]);
      if (isValid && email && isValidEmail(email) && firstName && lastName) {
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
    if (currentStep === 0)
      return (
        email &&
        firstName &&
        lastName &&
        !errors.email &&
        !errors.firstName &&
        !errors.lastName &&
        isValidEmail(email)
      );
    if (currentStep === 1)
      return (
        password &&
        confirmPassword &&
        agreeToTerms &&
        !errors.password &&
        !errors.confirmPassword &&
        !errors.agreeToTerms
      );
    return false;
  };

  const handleGoogleRegister = async () => {
    toast.info("Google registration is currently unavailable", {
      className: "custom-error-toast",
    });
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
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>{t("commonAuth.backToHome")}</span>
          </Button>

        <div className="space-y-6 border-2 border-green-600 p-8 bg-white">
            <div>
            <h2 className="text-4xl font-black text-black mb-2">
              Create Account
              </h2>
            <p className="text-gray-600">
              Join thousands of travelers on YourDrive
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
                {/* Step 1: Email and Name */}
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
                      placeholder="your.email@example.com"
                      className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                        {...register("email")}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="firstName"
                        className="text-sm font-medium text-black"
                        >
                        First Name
                        </Label>
                        <Input
                          id="firstName"
                        placeholder="John"
                        className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                          {...register("firstName")}
                        />
                        {errors.firstName && (
                          <p className="text-red-500 text-sm">
                            {errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="lastName"
                        className="text-sm font-medium text-black"
                        >
                        Last Name
                        </Label>
                        <Input
                          id="lastName"
                        placeholder="Doe"
                        className="h-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                          {...register("lastName")}
                        />
                        {errors.lastName && (
                          <p className="text-red-500 text-sm">
                            {errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceedToNext()}
                      className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold transition-all duration-200 border-2 border-green-600"
                    >
                    Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 2: Password and Agreements */}
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
                        {firstName} {lastName} • {email}
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
                        placeholder="Create a strong password"
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
                      <p className="text-xs text-gray-500">
                      Must be at least 4 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmPassword"
                      className="text-sm font-medium text-black"
                      >
                      Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        className="h-12 pr-12 border-2 border-green-600 focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                          {...register("confirmPassword")}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
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

                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="agreeToTerms"
                          checked={agreeToTerms}
                          onCheckedChange={(checked) =>
                            setValue("agreeToTerms", checked as boolean)
                          }
                        />
                        <div className="text-sm leading-relaxed">
                          <Label htmlFor="agreeToTerms" className="font-normal">
                          I agree to the{" "}
                            <Link
                              to="/terms-of-service"
                            className="text-green-600 hover:text-green-700 font-medium"
                            >
                            Terms of Service
                            </Link>{" "}
                          and{" "}
                            <Link
                              to="/privacy"
                            className="text-green-600 hover:text-green-700 font-medium"
                            >
                            Privacy Policy
                            </Link>
                          </Label>
                        </div>
                      </div>
                      {errors.agreeToTerms && (
                        <p className="text-red-500 text-sm">
                          {errors.agreeToTerms.message}
                        </p>
                      )}

                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="subscribeToUpdates"
                          checked={watch("subscribeToUpdates")}
                          onCheckedChange={(checked) =>
                            setValue("subscribeToUpdates", checked as boolean)
                          }
                        />
                        <Label
                          htmlFor="subscribeToUpdates"
                          className="font-normal text-sm"
                        >
                        Subscribe to updates and offers
                        </Label>
                      </div>
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
                          <>
                            <CustomLoader className="mr-2 h-4 w-4" />
                          Creating...
                          </>
                        ) : (
                          <>
                          Create Account
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Success */}
                {currentStep === 2 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6 py-8"
                  >
                    <div className="mx-auto w-20 h-20 bg-green-600 flex items-center justify-center border-4 border-green-600">
                      <UserCheck className="h-10 w-10 text-white" />
                    </div>

                    <div>
                    <h3 className="text-2xl font-bold text-black mb-2">
                      Account Created Successfully!
                      </h3>
                    <p className="text-gray-600">
                        We've sent a verification email to{" "}
                      <span className="font-medium text-black">
                          {email}
                        </span>
                      </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Please check your inbox to verify your account
                      </p>
                    </div>

                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                      <CustomLoader className="h-4 w-4" />
                    <span>Redirecting to verification...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
              <div className="p-4 bg-green-600 border-2 border-green-600">
                <p className="text-sm text-white text-center">
                    {(error as any).response?.data?.message ??
                      "Registration failed. Please try again."}
                  </p>
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
              onClick={handleGoogleRegister}
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
              Already have an account?{" "}
                <Link
                  to="/login"
                className="text-green-600 hover:text-green-700 font-medium"
                >
                Sign In
                </Link>
              </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
