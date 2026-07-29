import React, { useMemo } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useForgotPassword } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import { handleApiError } from "@/lib/utils";

const schema = z.object({ email: z.string().email("Invalid email address") });

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const fs = useMemo(() => makeStyles(colors), [colors]);
  const forgotMutation = useForgotPassword();
  const { control, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(data: { email: string }) {
    try {
      await forgotMutation.mutateAsync(data.email);
      router.push({ pathname: "/(auth)/reset-password", params: { email: data.email } });
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  return (
    <SafeAreaView style={fs.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={fs.content}>
          <Text style={fs.title}>{t("auth.forgotPasswordTitle")}</Text>
          <Text style={fs.subtitle}>{t("auth.forgotPasswordDesc")}</Text>
          <View style={fs.form}>
            <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
              <Input testID="forgotPassword.emailInput" placeholder={t("auth.email")} value={value} onChangeText={onChange} keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
            )} />
            <Button testID="forgotPassword.submitButton" title={t("auth.sendResetLink")} onPress={handleSubmit(onSubmit)} loading={forgotMutation.isPending} />
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
