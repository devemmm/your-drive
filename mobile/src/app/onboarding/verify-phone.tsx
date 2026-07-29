import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAddPhone, useVerifyPhone } from "@/hooks/useUser";
import { useTheme } from "@/providers/ThemeProvider";
import { handleApiError } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  // When opened with a phone param (e.g. from profile edit) the code was
  // already sent by the server, so start directly on the code-entry step.
  const params = useLocalSearchParams<{ phone?: string; returnTo?: string }>();
  const [phone, setPhone] = useState(params.phone ?? "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(Boolean(params.phone));
  const addPhone = useAddPhone();
  const verifyPhone = useVerifyPhone();

  async function handleSendCode() {
    try {
      await addPhone.mutateAsync(phone);
      setCodeSent(true);
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  async function handleVerify() {
    try {
      await verifyPhone.mutateAsync({ phoneNumber: phone, code });
      router.replace((params.returnTo as never) ?? "/(drawer)");
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>Verify Phone Number</Text>
        {!codeSent ? (
          <View style={s.form}>
            <Input testID="verifyPhone.phoneInput" placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Button testID="verifyPhone.sendCodeButton" title="Send Code" onPress={handleSendCode} loading={addPhone.isPending} />
          </View>
        ) : (
          <View style={s.form}>
            <Text style={s.subtitle}>Enter the code sent to {phone}</Text>
            <Input testID="verifyPhone.codeInput" placeholder="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" />
            <Button testID="verifyPhone.verifyButton" title="Verify" onPress={handleVerify} loading={verifyPhone.isPending} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xxl, gap: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.md, color: colors.text.secondary },
  form: { gap: spacing.lg },
});
