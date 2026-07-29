import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { authStorage } from "@/services/auth";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  async function continueAsGuest() {
    await authStorage.setHasSeenWelcome(true);
    router.replace("/(drawer)");
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.logo}>YourDrive</Text>
        <Text style={s.tagline}>{t("auth.welcome")}</Text>
      </View>
      <View style={s.buttons} testID="welcome.actions">
        <Button
          testID="welcome.signUpButton"
          title={t("auth.signUp")}
          onPress={() => router.push("/(auth)/register")}
        />
        <Button
          testID="welcome.loginButton"
          title={t("auth.login")}
          variant="secondary"
          onPress={() => router.push("/(auth)/login")}
        />
        <Button
          testID="welcome.guestButton"
          title={t("auth.continueAsGuest")}
          variant="ghost"
          onPress={continueAsGuest}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xxl },
  content: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.lg },
  logo: { fontSize: fontSize.title, fontWeight: "700", color: colors.primary },
  tagline: { fontSize: fontSize.md, color: colors.text.secondary, textAlign: "center" },
  buttons: { gap: spacing.md, paddingBottom: spacing.xxxl },
});
