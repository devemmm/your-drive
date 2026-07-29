import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { setLanguage } from "@/translations/i18n";
import {
  UserPen, Car, CreditCard, UserCheck, Globe,
  HelpCircle, FileText, LogOut, ChevronRight,
  IdCard, BadgeCheck, Radio, ListChecks,
} from "lucide-react-native";
import { useAuthContext } from "@/providers/AuthProvider";
import { useToggleRideRequestAvailability } from "@/hooks/useUser";
import { useMyWallet } from "@/hooks/useMyWallet";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS, CLIENT_ROUTES } from "@/lib/constants";
import { useMyVehicles } from "@/hooks/useVehicles";

const makeMiStyles = (colors: ColorPalette) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.md },
  iconWrap: { width: 24, alignItems: "center" },
  label: { fontSize: fontSize.md, color: colors.text.primary },
});

const makeSecStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { gap: spacing.sm },
  title: { fontSize: fontSize.xs, fontWeight: "600", color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: spacing.xs },
  card: { gap: 0, paddingVertical: spacing.xs },
});

export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n: i18nInstance } = useTranslation();
  const { signOut, user } = useAuthContext();
  const { colors, preference, setPreference } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const mi = useMemo(() => makeMiStyles(colors), [colors]);
  const sec = useMemo(() => makeSecStyles(colors), [colors]);

  const MenuItem = ({ icon, label, onPress, right }: { icon: React.ReactNode; label: string; onPress: () => void; right?: React.ReactNode }) => (
    <TouchableOpacity style={mi.row} onPress={onPress} activeOpacity={0.7}>
      <View style={mi.iconWrap}>{icon}</View>
      <Text style={mi.label}>{label}</Text>
      <View style={{ flex: 1 }} />
      {right ?? <ChevronRight size={18} color={colors.text.tertiary} />}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={sec.container}>
      <Text style={sec.title}>{title}</Text>
      <Card style={sec.card}>{children}</Card>
    </View>
  );

  const currentLang = i18nInstance.language === "rw" ? "RW" : "EN";
  const currentLangCode: "en" | "rw" = i18nInstance.language === "rw" ? "rw" : "en";
  const toggleAvailability = useToggleRideRequestAvailability();
  const { data: wallet } = useMyWallet();
  const walletBlocked =
    !!wallet?.enforceDebtLimit && wallet.balanceCents < -wallet.debtLimitCents;

  const { data: myVehicles } = useMyVehicles();

  async function ensureLocationPermission(): Promise<boolean> {
    const existing = await Location.getForegroundPermissionsAsync();
    if (existing.status === "granted") return true;

    if (existing.canAskAgain) {
      const requested = await Location.requestForegroundPermissionsAsync();
      return requested.status === "granted";
    }

    // User previously denied with "don't ask again" — offer a Settings deep-link.
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Location permission needed",
        "Location access is blocked. Enable it in Settings to go online.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Open Settings",
            onPress: () => {
              Linking.openSettings();
              resolve(false);
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  }

  async function pickVehicleIfNeeded(): Promise<boolean> {
    const vehicles = myVehicles ?? [];
    if (vehicles.length === 0) {
      Alert.alert(
        "Add a vehicle first",
        "You need at least one vehicle on your profile before you can go online."
      );
      return false;
    }
    if (vehicles.length === 1) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_VEHICLE_ID,
        String(vehicles[0].id)
      );
      return true;
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Go online with which vehicle?",
        "Choose the vehicle you're driving right now.",
        [
          ...vehicles.map((v) => ({
            text: `${v.make} ${v.model} (${v.plateNumber})`,
            onPress: async () => {
              await AsyncStorage.setItem(
                STORAGE_KEYS.CURRENT_VEHICLE_ID,
                String(v.id)
              );
              resolve(true);
            },
          })),
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  }

  const handleToggleLanguage = useCallback(() => {
    const next = i18nInstance.language === "rw" ? "en" : "rw";
    setLanguage(next);
  }, [i18nInstance.language]);

  const handleToggleAvailability = useCallback(
    async (next: boolean) => {
      try {
        if (next) {
          const ok = await ensureLocationPermission();
          if (!ok) {
            Alert.alert(
              "Location permission required",
              "To go online you need to grant location access to this app."
            );
            return;
          }
          const picked = await pickVehicleIfNeeded();
          if (!picked) return;
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_VEHICLE_ID);
        }
        await toggleAvailability.mutateAsync(next);
      } catch (err: any) {
        if (err?.response?.data?.error === "WALLET_DEBT_LIMIT") {
          Alert.alert(
            "Top up your wallet",
            "Your wallet balance is below the allowed limit. Contact admin to add credit."
          );
          return;
        }
        if (err?.response?.data?.error === "KYC_NOT_APPROVED") {
          Alert.alert(
            "Awaiting approval",
            err?.response?.data?.message || "Your driver documents haven't been approved yet."
          );
          return;
        }
        Alert.alert(
          "Couldn't update availability",
          err?.response?.data?.message || "Please try again."
        );
      }
    },
    [toggleAvailability, myVehicles]
  );

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      <ScreenHeader title="Profile" variant="root" />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Avatar
            firstName={user?.firstName ?? ""}
            lastName={user?.lastName ?? ""}
            imageUrl={user?.profileImage?.url}
            size={80}
          />
          <View style={s.headerInfo}>
            <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
            <Text style={s.email}>{user?.email}</Text>
            {user?.averageRating != null && (
              <StarRating rating={user.averageRating} size={16} interactive={false} />
            )}
            {memberSince ? (
              <Text style={s.memberSince}>Member since {memberSince}</Text>
            ) : null}
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <TouchableOpacity
            style={s.statCell}
            onPress={() => router.push("/transactions" as any)}
            activeOpacity={0.7}
          >
            <Text style={s.statValue}>
              {wallet ? `RWF ${Math.round(wallet.balanceCents / 100).toLocaleString()}` : "—"}
            </Text>
            <Text style={s.statLabel}>Wallet</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity
            style={s.statCell}
            onPress={() => router.push("/vehicle" as any)}
            activeOpacity={0.7}
          >
            <Text style={s.statValue}>{myVehicles?.length ?? "—"}</Text>
            <Text style={s.statLabel}>Vehicles</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Section title="Account">
          <MenuItem icon={<UserPen size={20} color={colors.text.secondary} />} label="Edit Profile" onPress={() => router.push("/profile/edit" as any)} />
          <View style={s.divider} />
          <MenuItem icon={<Car size={20} color={colors.text.secondary} />} label="My Vehicles" onPress={() => router.push("/vehicle" as any)} />
          <View style={s.divider} />
          <MenuItem icon={<CreditCard size={20} color={colors.text.secondary} />} label="Payment History" onPress={() => router.push("/transactions" as any)} />
        </Section>

        {/* Services */}
        <Section title="Services">
          {user && !user.isDriverOnboarded ? (
            <>
              <View style={s.divider} />
              <MenuItem
                icon={<IdCard size={20} color={colors.text.secondary} />}
                label="Become a Driver"
                onPress={() => router.push("/onboarding/driver" as any)}
              />
            </>
          ) : null}

          {user && user.isDriverOnboarded && !user.isAvailableForChauffeur ? (
            <>
              <View style={s.divider} />
              <MenuItem
                icon={<UserCheck size={20} color={colors.text.secondary} />}
                label="Offer Chauffeur Services"
                onPress={() => router.push("/chauffeur/availability" as any)}
              />
            </>
          ) : null}

          {user && user.isAvailableForChauffeur ? (
            <>
              <View style={s.divider} />
              <MenuItem
                icon={<BadgeCheck size={20} color={colors.text.secondary} />}
                label="Manage Chauffeur Availability"
                onPress={() => router.push("/chauffeur/availability" as any)}
              />
            </>
          ) : null}
        </Section>

        {/* KYC banner — surfaces only for onboarded drivers awaiting/denied review */}
        {user && user.isDriverOnboarded && user.kycStatus && user.kycStatus !== "APPROVED" && (
          <View
            style={{
              marginHorizontal: spacing.lg,
              marginBottom: spacing.md,
              padding: spacing.lg,
              borderRadius: borderRadius.lg,
              backgroundColor: user.kycStatus === "REJECTED" ? "#fee2e2" : "#fef3c7",
              borderLeftWidth: 4,
              borderLeftColor: user.kycStatus === "REJECTED" ? colors.error : "#f59e0b",
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.text.primary, marginBottom: 4 }}>
              {user.kycStatus === "REJECTED" ? "Documents rejected" : "Awaiting approval"}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
              {user.kycStatus === "REJECTED"
                ? user.kycReviewNotes || "An admin rejected your driver documents. Update them and resubmit."
                : "An admin is reviewing your driver documents. You'll be able to go online and add a vehicle once approved."}
            </Text>
          </View>
        )}

        {/* Driver Mode (only for onboarded drivers) */}
        {user && user.isDriverOnboarded && (
          <Section title="Driver Mode">
            <View style={[mi.row, walletBlocked && s.rowDisabled]}>
              <View style={mi.iconWrap}>
                <Radio
                  size={20}
                  color={
                    walletBlocked
                      ? colors.text.tertiary
                      : user.isAvailableForRideRequest
                      ? colors.success
                      : colors.text.secondary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={mi.label}>Available for ride requests</Text>
                <Text style={s.subtext}>
                  {walletBlocked
                    ? "Top up your wallet to go online"
                    : user.isAvailableForRideRequest
                    ? "You're online and receiving requests"
                    : "Turn on to accept on-demand rides"}
                </Text>
              </View>
              <Switch
                value={!!user.isAvailableForRideRequest}
                onValueChange={handleToggleAvailability}
                disabled={toggleAvailability.isPending || walletBlocked}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            {user.isAvailableForRideRequest && (
              <>
                <View style={s.divider} />
                <MenuItem
                  icon={<ListChecks size={20} color={colors.primary} />}
                  label="Live Ride Requests"
                  onPress={() => router.replace("/" as any)}
                />
              </>
            )}
          </Section>
        )}

        {/* Preferences */}
        <Section title="Preferences">
          <MenuItem
            icon={<Globe size={20} color={colors.text.secondary} />}
            label="Language"
            onPress={handleToggleLanguage}
            right={
              <View style={s.langBadge}>
                <Text style={s.langText}>{currentLang}</Text>
              </View>
            }
          />
        </Section>

        {/* Appearance */}
        <View testID="profile.appearanceSection" style={s.section}>
          <Text style={s.sectionTitle}>{t("profile.appearance")}</Text>
          {(["system", "light", "dark"] as const).map((opt) => (
            <Pressable
              key={opt}
              testID={`profile.themeOption.${opt}`}
              onPress={() => setPreference(opt)}
              style={s.optionRow}
            >
              <View style={[s.radio, preference === opt && s.radioSelected]} />
              <Text style={s.optionLabel}>{t(`profile.theme.${opt}`)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Language */}
        <View testID="profile.languageSection" style={s.section}>
          <Text style={s.sectionTitle}>{t("profile.language")}</Text>
          {(["en", "rw"] as const).map((opt) => (
            <Pressable
              key={opt}
              testID={`profile.languageOption.${opt}`}
              onPress={() => setLanguage(opt)}
              style={s.optionRow}
            >
              <View style={[s.radio, currentLangCode === opt && s.radioSelected]} />
              <Text style={s.optionLabel}>{t(`profile.languageOption.${opt}`)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Support */}
        <Section title="Support">
          <MenuItem icon={<HelpCircle size={20} color={colors.text.secondary} />} label="Help Center" onPress={() => Linking.openURL(CLIENT_ROUTES.helpCenter)} />
          <View style={s.divider} />
          <MenuItem icon={<FileText size={20} color={colors.text.secondary} />} label="Terms of Service" onPress={() => Linking.openURL(CLIENT_ROUTES.termsOfService)} />
        </Section>

        {/* Sign Out */}
        <Button
          testID="profile.logoutButton"
          title="Sign Out"
          variant="destructive"
          onPress={signOut}
          icon={<LogOut size={18} color={colors.text.inverse} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.xxl },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.lg },
  headerInfo: { flex: 1, gap: spacing.xs },
  name: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary },
  email: { fontSize: fontSize.sm, color: colors.text.secondary },
  memberSince: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: -spacing.lg },
  langBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  langText: { fontSize: fontSize.xs, fontWeight: "700", color: colors.primary },
  subtext: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 },
  rowDisabled: { opacity: 0.45 },
  section: { paddingVertical: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text.primary, marginBottom: spacing.md },
  optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionLabel: { fontSize: fontSize.md, color: colors.text.primary },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCell: { flex: 1, alignItems: "center", paddingVertical: spacing.xs },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 },
});
