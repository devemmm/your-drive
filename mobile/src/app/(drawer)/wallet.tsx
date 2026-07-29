import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowDownLeft, ArrowUpRight, Receipt, Wallet as WalletIcon, AlertCircle } from "lucide-react-native";
import { useMyWallet, type WalletLedgerEntry } from "@/hooks/useMyWallet";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

const HUMAN_TYPE: Record<string, string> = {
  WALLET_CREDIT: "Credit",
  COMMISSION_DEBIT: "Commission",
};

function humanizeType(type: string) {
  return HUMAN_TYPE[type] ?? type.replace(/_/g, " ").toLowerCase();
}

function LedgerRow({ entry }: { entry: WalletLedgerEntry }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const amountNum = typeof entry.amount === "number" ? entry.amount : parseFloat(entry.amount);
  const isCredit = amountNum >= 0;
  const accent = isCredit ? colors.success : colors.error;
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
  const sign = isCredit ? "+" : "−";

  return (
    <View style={s.ledgerRow}>
      <View style={[s.ledgerIcon, { backgroundColor: accent + "18" }]}>
        <Icon size={18} color={accent} />
      </View>
      <View style={s.ledgerBody}>
        <Text style={s.ledgerTitle} numberOfLines={1}>{humanizeType(entry.type)}</Text>
        <Text style={s.ledgerMeta} numberOfLines={1}>{formatRelativeTime(entry.createdAt)}</Text>
      </View>
      <Text style={[s.ledgerAmount, { color: accent }]}>
        {sign}{formatCurrency(Math.round(Math.abs(amountNum) * 100))}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyWallet();

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
        <ScreenHeader title="Wallet" variant="root" />
        <LoadingIndicator fullScreen />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
        <ScreenHeader title="Wallet" variant="root" />
        <View style={s.errorWrap}>
          <AlertCircle size={40} color={colors.error} />
          <Text style={s.errorTitle}>Couldn't load wallet</Text>
          <Text style={s.errorSub}>
            {error instanceof Error ? error.message : "Check your connection and try again."}
          </Text>
          <Button title="Retry" size="md" onPress={() => refetch()} style={{ marginTop: spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  const balanceCents = data.balanceCents;
  const limitCents = data.debtLimitCents;
  const availableCents = balanceCents + limitCents;
  const inDebt = balanceCents < 0;
  const ledger = data.ledger ?? [];

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      <ScreenHeader title="Wallet" variant="root" />

      <FlatList
        data={ledger}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => <LedgerRow entry={item} />}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={s.headerBlock}>
            <Card style={s.hero}>
              <View style={s.heroTop}>
                <View style={s.heroIcon}>
                  <WalletIcon size={20} color={colors.primary} />
                </View>
                <Text style={s.heroLabel}>Current balance</Text>
              </View>
              <Text style={[s.heroBalance, inDebt && { color: colors.error }]}>
                {formatCurrency(balanceCents, "RWF")}
              </Text>
              {data.enforceDebtLimit && (
                <View style={s.heroDivider} />
              )}
              {data.enforceDebtLimit && (
                <View style={s.heroStatsRow}>
                  <View style={s.heroStat}>
                    <Text style={s.heroStatLabel}>Debt limit</Text>
                    <Text style={s.heroStatValue}>{formatCurrency(limitCents, "RWF")}</Text>
                  </View>
                  <View style={s.heroStatDivider} />
                  <View style={s.heroStat}>
                    <Text style={s.heroStatLabel}>Available</Text>
                    <Text style={[s.heroStatValue, { color: colors.primary }]}>
                      {formatCurrency(availableCents, "RWF")}
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            {inDebt && (
              <View style={s.debtBanner}>
                <AlertCircle size={16} color={colors.warning} />
                <Text style={s.debtText}>
                  Your balance is negative. It will be settled from your next payout.
                </Text>
              </View>
            )}

            <Text style={s.sectionHeader}>Recent activity</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Receipt size={40} color={colors.text.tertiary} />}
            title="No activity yet"
            subtitle="Credits and commissions will appear here"
          />
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  listContent: { padding: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl },

  headerBlock: { gap: spacing.lg, paddingBottom: spacing.lg },

  hero: { gap: spacing.sm },
  heroTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heroIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLabel: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: "600" },
  heroBalance: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  heroStatsRow: { flexDirection: "row", alignItems: "center" },
  heroStat: { flex: 1, gap: 2 },
  heroStatDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.border, marginHorizontal: spacing.md },
  heroStatLabel: { fontSize: fontSize.xs, color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600" },
  heroStatValue: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },

  debtBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FEF3C7",
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  debtText: { flex: 1, fontSize: fontSize.xs, color: "#92400E", lineHeight: 16 },

  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  ledgerIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  ledgerBody: { flex: 1, gap: 2 },
  ledgerTitle: { fontSize: fontSize.sm, fontWeight: "700", color: colors.text.primary },
  ledgerMeta: { fontSize: fontSize.xs, color: colors.text.secondary },
  ledgerAmount: { fontSize: fontSize.sm, fontWeight: "700" },
  separator: { height: spacing.sm },

  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  errorTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  errorSub: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center" },
});
