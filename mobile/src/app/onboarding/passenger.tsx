import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { useAuthContext } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { queryKeys } from "@/lib/constants";
import { handleApiError } from "@/lib/utils";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export default function PassengerOnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const onboardMutation = useMutation({
    mutationFn: () => api.post("/onboarding/passenger", { termsAccepted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
    },
  });

  async function handleComplete() {
    try {
      await onboardMutation.mutateAsync();
      router.replace("/(drawer)");
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>Welcome, {user?.firstName}!</Text>
        <Text style={s.subtitle}>Let's get you set up as a passenger.</Text>
        <Text style={s.description}>
          You're almost ready to start finding rides. Complete your profile to get the best experience.
        </Text>
      </View>
      <View style={s.footer}>
        <Button title="Get Started" onPress={handleComplete} loading={onboardMutation.isPending} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xxl, justifyContent: "center", gap: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.lg, color: colors.text.secondary },
  description: { fontSize: fontSize.md, color: colors.text.tertiary, lineHeight: 24 },
  footer: { padding: spacing.xxl },
});
