import { ShowCustomToast } from "@/components/LogoutModal";
import Logo from "@/components/logos/logo4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { z } from "zod";

const phoneSchema = z.object({
  phone: z.string().min(4, "Phone number is required"),
});

const codeSchema = z.object({
  code: z.string().min(6, "Verification code must be 6 digits"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type CodeFormData = z.infer<typeof codeSchema>;

const VerifyUserPhoneNumber = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");

  const {
    handleSubmit: handlePhoneSubmit,
    control: phoneControl,
    formState: { errors: phoneErrors },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const {
    handleSubmit: handleCodeSubmit,
    control: codeControl,
    formState: { errors: codeErrors },
  } = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
  });

  const onPhoneSubmit = (data: PhoneFormData) => {
    setPhoneNumber(data.phone);
    setStep("code");
    toast({
      title: t("Verification code sent"),
      description: `${t("We've sent a 6-digit code to")} ${data.phone}`,
    });
  };

  const onCodeSubmit = (data: CodeFormData) => {
    ShowCustomToast(
      toast,
      t("VerifyPhoneNumber.toastTitle"),
      t("VerifyPhoneNumber.toastDesc")
    );
  };

  const handleResendCode = () => {
    toast({
      title: t("VerifyPhoneNumber.toastTitle2"),
      description: `${t("VerifyPhoneNumber.toastDesc2")} ${phoneNumber}`,
    });
  };

  return (
    <div className="flex items-center justify-center h-[500px] mt-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md mx-auto space-y-6 p-6 bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg shadow-md">
        <div className="space-y-2">
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-12 rounded-lg" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
            {step === "phone"
              ? t("VerifyPhoneNumber.verify")
              : t("VerifyPhoneNumber.enter")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
            {step === "phone"
              ? t("VerifyPhoneNumber.why")
              : `${t("VerifyPhoneNumber.sent")} ${phoneNumber}`}
          </p>
        </div>

        {step === "phone" ? (
          <form
            onSubmit={handlePhoneSubmit(onPhoneSubmit)}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-gray-700 dark:text-gray-300"
              >
                {t("VerifyPhoneNumber.phone")}
              </Label>
              <div className="relative">
                <Controller
                  name="phone"
                  control={phoneControl}
                  render={({ field }) => (
                    <div
                      className={`flex items-center h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background bg-background dark:bg-gray-700 dark:text-white
                    ${
                      phoneErrors.phone
                        ? "border-red-500 focus-within:ring-red-300"
                        : "border-gray-300 dark:border-gray-600"
                    }
                    focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2`}
                    >
                      <PhoneInput
                        {...field}
                        id="phone"
                        defaultCountry="US"
                        international
                        className="flex gap-2 w-full"
                        countrySelectProps={{
                          className:
                            "text-sm py-0 pl-0 pr-1 border-r border-gray-300 dark:border-gray-600",
                        }}
                        numberInputProps={{
                          className:
                            "border-none focus:outline-none focus:ring-0 px-2 bg-transparent text-inherit",
                        }}
                        style={{
                          "--PhoneInputCountrySelectArrow-color": "#6b7280",
                          "--PhoneInputCountrySelectArrow-color--focus":
                            "#ffffff",
                          "--PhoneInputCountrySelectArrow-opacity": "1",
                          "--PhoneInputCountrySelectArrow-width": "0.35em",
                          "--PhoneInputCountrySelectArrow-marginLeft": "0.35em",
                        }}
                      />
                    </div>
                  )}
                />
              </div>
              {phoneErrors.phone && (
                <p className="text-red-500 text-sm mt-1">
                  {phoneErrors.phone.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-primary-600 dark:hover:bg-primary-700"
            >
              {t("VerifyPhoneNumber.code")}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={handleCodeSubmit(onCodeSubmit)}
            className="space-y-6 w-full sm:w-[400px]"
          >
            <div className="space-y-2">
              <Label
                htmlFor="code"
                className="text-gray-700 dark:text-gray-300"
              >
                {t("VerifyPhoneNumber.verification")}
              </Label>
              <Controller
                name="code"
                control={codeControl}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="123456"
                    className={`w-full bg-white dark:bg-gray-700 dark:text-white ${
                      codeErrors.code
                        ? "border-red-500 focus:ring-red-300"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                )}
              />
              {codeErrors.code && (
                <p className="text-red-500 text-sm mt-1">
                  {codeErrors.code.message}
                </p>
              )}
            </div>

            <div className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-primary-600 dark:hover:bg-primary-700"
              >
                {t("VerifyPhoneNumber.verifyCode")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                className="w-full dark:border-gray-500 dark:text-white"
              >
                {t("VerifyPhoneNumber.resend")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("phone")}
                className="w-full text-gray-600 dark:text-gray-300"
              >
                {t("VerifyPhoneNumber.changeNumber")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default VerifyUserPhoneNumber;
