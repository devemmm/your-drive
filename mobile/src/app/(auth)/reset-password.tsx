import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useResetPassword } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import { handleApiError } from "@/lib/utils";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rs = useMemo(() => makeStyles(colors), [colors]);
  const { email } = useLocalSearchParams<{ email?: string }>();
  const resetMutation = useResetPassword();
  const schema = useMemo(
    () =>
      z.object({
        code: z.string().min(1, t("auth.resetCodeRequired")),
        password: z.string()
          .min(8, t("auth.passwordRule"))
          .regex(/[A-Z]/, t("auth.passwordRule"))
          .regex(/[a-z]/, t("auth.passwordRule"))
          .regex(/[0-9]/, t("auth.passwordRule")),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: t("auth.passwordsDontMatch"),
        path: ["confirmPassword"],
      }),
    [t]
  );
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { code: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!email) router.replace("/(auth)/forgot-password");
  }, [email, router]);

  async function onSubmit(data: { code: string; password: string; confirmPassword: string }) {
    if (!email) return;
    try {
      await resetMutation.mutateAsync({ token: data.code.trim(), newPassword: data.password, email });
      Alert.alert(t("auth.resetSuccessTitle"), t("auth.resetSuccessDesc"));
      router.replace("/(auth)/login");
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  return (
    <SafeAreaView style={rs.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={rs.content}>
          <Text style={rs.title}>{t("auth.resetPasswordTitle")}</Text>
          <Text style={rs.subtitle}>{t("auth.resetPasswordDesc", { email })}</Text>
          <View style={rs.form}>
            <Controller control={control} name="code" render={({ field: { onChange, value } }) => (
              <Input testID="resetPassword.codeInput" placeholder={t("auth.resetCode")} value={value} onChangeText={onChange} keyboardType="number-pad" autoCapitalize="none" error={errors.code?.message} />
            )} />
            <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
              <Input testID="resetPassword.passwordInput" placeholder={t("auth.newPassword")} value={value} onChangeText={onChange} isPassword error={errors.password?.message} />
            )} />
            <Controller control={control} name="confirmPassword" render={({ field: { onChange, value } }) => (
              <Input testID="resetPassword.confirmInput" placeholder={t("auth.confirmPassword")} value={value} onChangeText={onChange} isPassword error={errors.confirmPassword?.message} />
            )} />
            <Button testID="resetPassword.submitButton" title={t("auth.resetPasswordSubmit")} onPress={handleSubmit(onSubmit)} loading={resetMutation.isPending} />
          </View>
          <Button title={t("common.back")} variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xxl },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.md, color: colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  form: { gap: spacing.lg },
});
