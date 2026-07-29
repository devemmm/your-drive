import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Alert, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/providers/AuthProvider";
import { useUpdateChauffeurAvailability } from "@/hooks/useChauffeur";
import { useMyWallet } from "@/hooks/useMyWallet";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { handleApiError } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import type { User } from "@/lib/types";

export default function ChauffeurAvailabilityScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  // While the user is still hydrating, show a spinner — do NOT mount the form
  // with null data or the useState initializers would capture stale defaults.
  if (!user) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="Chauffeur Availability" onBack={() => router.back()} />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Deep-link gate: users who haven't completed driver onboarding can't be here.
  // Render-time guard prevents the form from ever mounting; effect handles the redirect.
  if (!user.isDriverOnboarded) {
    return <OnboardingRedirect />;
  }

  return <AvailabilityForm user={user} />;
}

function OnboardingRedirect() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  useEffect(() => {
    Alert.alert(
      "Driver onboarding required",
      "Complete driver onboarding before offering chauffeur services.",
      [{ text: "OK", onPress: () => router.replace("/onboarding/driver") }]
    );
  }, [router]);
  return (
    <SafeAreaView style={s.container}>
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );
}

function AvailabilityForm({ user }: { user: User }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const mutation = useUpdateChauffeurAvailability();
  const { data: wallet } = useMyWallet();
  const requireAuth = useRequireAuth();
  const walletBlocked =
    !!wallet?.enforceDebtLimit && wallet.balanceCents < -wallet.debtLimitCents;

  // Safe: `user` is guaranteed non-null by the caller, so initializers read real data.
  const [isAvailable, setIsAvailable] = useState(user.isAvailableForChauffeur ?? true);
  const [hourlyRate, setHourlyRate] = useState(
    user.chauffeurHourlyRate != null ? String(user.chauffeurHourlyRate) : ""
  );
  const [dailyRate, setDailyRate] = useState(
    user.chauffeurDailyRate != null ? String(user.chauffeurDailyRate) : ""
  );
  const [description, setDescription] = useState(user.chauffeurDescription ?? "");
  const [languages, setLanguages] = useState<string[]>(user.languagesSpoken ?? []);
  function toggleLanguage(code: string) {
    setLanguages((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  const hourlyNum = hourlyRate.trim() === "" ? null : Number(hourlyRate);
  const dailyNum = dailyRate.trim() === "" ? null : Number(dailyRate);

  const hourlyInvalid =
    hourlyRate.trim() !== "" &&
    (!Number.isFinite(hourlyNum as number) || (hourlyNum as number) <= 0);
  const dailyInvalid =
    dailyRate.trim() !== "" &&
    (!Number.isFinite(dailyNum as number) || (dailyNum as number) <= 0);

  const hasAtLeastOneRate = hourlyNum !== null || dailyNum !== null;
  const needsRate = isAvailable && !hasAtLeastOneRate;
  const descriptionTooLong = description.length > 500;

  const canSubmit =
    !hourlyInvalid &&
    !dailyInvalid &&
    !descriptionTooLong &&
    !needsRate &&
    !mutation.isPending &&
    !walletBlocked;

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      await mutation.mutateAsync({
        isAvailableForChauffeur: isAvailable,
        chauffeurHourlyRate: hourlyNum,
        chauffeurDailyRate: dailyNum,
        chauffeurDescription: description.trim() === "" ? null : description.trim(),
        languagesSpoken: languages.length > 0 ? languages : null,
      });
      Alert.alert(
        isAvailable ? "You're listed!" : "Availability updated",
        isAvailable
          ? "Clients can now find and hire you as a chauffeur."
          : "Your chauffeur profile is hidden. You can turn it back on any time.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      if (err?.response?.data?.error === "WALLET_DEBT_LIMIT") {
        Alert.alert(
          "Top up your wallet",
          "Your wallet balance is below the allowed limit. Contact admin to add credit."
        );
        return;
      }
      handleApiError(err, t);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Chauffeur Availability" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>Offer Your Services</Text>
        <Text style={s.subtitle}>
          Set your rates and turn on availability to appear in chauffeur search results.
        </Text>

        <Card style={walletBlocked ? { ...s.card, ...s.cardDisabled } : s.card}>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Available for hire</Text>
              <Text style={s.toggleHelp}>
                {walletBlocked
                  ? "Top up your wallet to enable chauffeur availability."
                  : "When on, clients can find and book you."}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              disabled={walletBlocked}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Available for hire"
              accessibilityHint="Toggles whether clients can find and book you as a chauffeur"
            />
          </View>

          <Input
            label="Hourly Rate (RWF)"
            placeholder="e.g. 45"
            keyboardType="decimal-pad"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            error={hourlyInvalid ? "Enter a positive number" : undefined}
          />

          <Input
            label="Daily Rate (RWF)"
            placeholder="e.g. 300"
            keyboardType="decimal-pad"
            value={dailyRate}
            onChangeText={setDailyRate}
            error={dailyInvalid ? "Enter a positive number" : undefined}
          />

          {needsRate ? (
            <Text style={s.warning} accessibilityLiveRegion="polite">
              Enter at least one rate to offer chauffeur services.
            </Text>
          ) : null}

          <Input
            label="Description (optional)"
            placeholder="Tell clients about your experience…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            error={descriptionTooLong ? "Maximum 500 characters" : undefined}
          />
          <Text style={s.counter} accessibilityElementsHidden importantForAccessibility="no">
            {description.length} / 500
          </Text>

          <Text style={s.toggleLabel}>Languages spoken</Text>
          <Text style={[s.subtitle, { marginBottom: spacing.sm, marginTop: 2 }]}>
            Helps passengers pick a driver they can communicate with.
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const selected = languages.includes(lang.code);
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => toggleLanguage(lang.code)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primaryLight : colors.background,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.primary : colors.text.secondary,
                      fontSize: fontSize.sm,
                      fontWeight: "600",
                    }}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Button
          title="Save"
          // auth-gated
          onPress={() =>
            requireAuth(() => void handleSubmit(), {
              reason: "Sign in to update your chauffeur availability",
            })
          }
          loading={mutation.isPending}
          disabled={!canSubmit}
          style={s.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  card: { gap: spacing.lg },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text.primary,
  },
  toggleHelp: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  warning: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: -spacing.sm,
  },
  counter: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    textAlign: "right",
    marginTop: -spacing.sm,
  },
  submitBtn: { marginTop: spacing.md },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardDisabled: { opacity: 0.45 },
});
