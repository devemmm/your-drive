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
import { useLogin } from "@/hooks/useAuth";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Mail, Lock } from "lucide-react-native";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import { handleApiError } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn } = useAuthContext();
  const { colors } = useTheme();
  const ls = useMemo(() => makeStyles(colors), [colors]);
  const loginMutation = useLogin();
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginForm) {
    try {
      const response = await loginMutation.mutateAsync(data);
      await signIn(response.data.token);
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  return (
    <SafeAreaView style={ls.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={ls.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={ls.header}>
            <Text style={ls.title}>{t("auth.welcomeBack")}</Text>
            <Text style={ls.subtitle}>{t("auth.signInContinue")}</Text>
          </View>
          <View style={ls.form}>
            <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
              <Input testID="auth.emailInput" placeholder={t("auth.email")} value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email?.message} icon={<Mail size={20} color={colors.text.tertiary} />} />
            )} />
            <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
              <Input testID="auth.passwordInput" placeholder={t("auth.password")} value={value} onChangeText={onChange} isPassword error={errors.password?.message} icon={<Lock size={20} color={colors.text.tertiary} />} />
            )} />
            <Button testID="auth.forgotPasswordLink" variant="ghost" title={t("auth.forgotPassword")} onPress={() => router.push("/(auth)/forgot-password")} style={{ alignSelf: "flex-end" }} />
            <Button testID="auth.loginButton" title={t("auth.login")} onPress={handleSubmit(onSubmit)} loading={loginMutation.isPending} />
          </View>
          <View style={ls.footer}>
            <Text style={ls.footerText}>{t("auth.noAccount")} </Text>
            <Button variant="ghost" title={t("auth.signUp")} onPress={() => router.push("/(auth)/register")} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: spacing.xxl },
  header: { marginBottom: spacing.xxxl },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.xs },
  form: { gap: spacing.lg },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: "auto", paddingTop: spacing.xxl },
  footerText: { fontSize: fontSize.md, color: colors.text.secondary },
});
