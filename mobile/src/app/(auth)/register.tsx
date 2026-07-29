import React, { useMemo } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { useRegister } from "@/hooks/useAuth";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { User, Mail, Lock, Gift } from "lucide-react-native";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import { handleApiError } from "@/lib/utils";

type RegisterFormInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  referralCode?: string;
};

type RegisterFormOutput = Omit<RegisterFormInput, "agreeToTerms"> & {
  agreeToTerms: true;
};

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rs = useMemo(() => makeStyles(colors), [colors]);
  const registerMutation = useRegister();
  const { signIn } = useAuthContext();
  const registerSchema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string()
          .min(8, t("auth.passwordRule"))
          .regex(/[A-Z]/, t("auth.passwordRule"))
          .regex(/[a-z]/, t("auth.passwordRule"))
          .regex(/[0-9]/, t("auth.passwordRule")),
        confirmPassword: z.string(),
        agreeToTerms: z.literal(true, {
          message: t("auth.agreeToTermsRequired"),
        }),
        referralCode: z.string().optional(),
      }).refine((data) => data.password === data.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] }),
    [t]
  );
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormInput, any, RegisterFormOutput>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "", agreeToTerms: false, referralCode: "" },
  });

  async function onSubmit(data: RegisterFormOutput) {
    try {
      const response = await registerMutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        referralCode: data.referralCode || undefined,
        agreeToTerms: data.agreeToTerms,
      });
      await signIn(response.data.token);
      router.replace("/onboarding/verify-phone");
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  return (
    <SafeAreaView style={rs.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={rs.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={rs.header}>
            <Text style={rs.title}>{t("auth.createAccount")}</Text>
            <Text style={rs.subtitle}>{t("auth.signUpGetStarted")}</Text>
          </View>
          <View style={rs.form}>
            <View style={rs.nameRow}>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="firstName" render={({ field: { onChange, value } }) => (
                  <Input testID="register.firstNameInput" placeholder={t("auth.firstName")} value={value} onChangeText={onChange} error={errors.firstName?.message} icon={<User size={20} color={colors.text.tertiary} />} />
                )} />
              </View>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="lastName" render={({ field: { onChange, value } }) => (
                  <Input testID="register.lastNameInput" placeholder={t("auth.lastName")} value={value} onChangeText={onChange} error={errors.lastName?.message} icon={<User size={20} color={colors.text.tertiary} />} />
                )} />
              </View>
            </View>
            <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
              <Input testID="register.emailInput" placeholder={t("auth.email")} value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} icon={<Mail size={20} color={colors.text.tertiary} />} />
            )} />
            <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
              <Input testID="register.passwordInput" placeholder={t("auth.password")} value={value} onChangeText={onChange} isPassword error={errors.password?.message} icon={<Lock size={20} color={colors.text.tertiary} />} />
            )} />
            <Controller control={control} name="confirmPassword" render={({ field: { onChange, value } }) => (
              <Input testID="register.confirmPasswordInput" placeholder={t("auth.confirmPassword")} value={value} onChangeText={onChange} isPassword error={errors.confirmPassword?.message} icon={<Lock size={20} color={colors.text.tertiary} />} />
            )} />
            <Controller control={control} name="referralCode" render={({ field: { onChange, value } }) => (
              <Input testID="register.referralInput" placeholder={t("auth.referralCode")} value={value} onChangeText={onChange} icon={<Gift size={20} color={colors.text.tertiary} />} />
            )} />
            <Controller
              control={control}
              name="agreeToTerms"
              render={({ field: { onChange, value } }) => (
                <View style={rs.termsRow}>
                  <Checkbox
                    testID="register.termsCheckbox"
                    value={value}
                    onValueChange={onChange}
                    accessibilityLabel={t("auth.agreeToTermsRequired")}
                  />
                  <Text style={rs.termsText}>
                    {t("auth.agreeToTermsPrefix")}
                    <Text
                      testID="register.termsLink"
                      style={rs.termsLink}
                      onPress={() => router.push("/(auth)/terms")}
                    >
                      {t("auth.agreeToTermsLink")}
                    </Text>
                  </Text>
                </View>
              )}
            />
            {errors.agreeToTerms ? (
              <Text style={rs.termsError}>{errors.agreeToTerms.message}</Text>
            ) : null}
            <Button testID="register.submitButton" title={t("auth.createAccount")} onPress={handleSubmit(onSubmit)} loading={registerMutation.isPending} />
          </View>
          <View style={rs.footer}>
            <Text style={rs.footerText}>{t("auth.haveAccount")} </Text>
            <Button variant="ghost" title={t("auth.login")} onPress={() => router.push("/(auth)/login")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: spacing.xxl },
  header: { marginBottom: spacing.xxl },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.xs },
  form: { gap: spacing.lg },
  nameRow: { flexDirection: "row", gap: spacing.md },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: "auto", paddingTop: spacing.xxl },
  footerText: { fontSize: fontSize.md, color: colors.text.secondary },
  termsRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  termsText: { flex: 1, fontSize: fontSize.sm, color: colors.text.secondary },
  termsLink: { color: colors.primary, fontWeight: "600" },
  termsError: { fontSize: fontSize.sm, color: colors.error, marginTop: spacing.xs },
});
