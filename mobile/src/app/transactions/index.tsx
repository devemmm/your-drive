import React, { useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CreditCard } from "lucide-react-native";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { Card } from "@/components/ui/Card";
import { useTransactions } from "@/hooks/usePayments";
import { Transaction } from "@/lib/types";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<Transaction["status"], { bg: string; text: string }> = {
  PENDING: { bg: "#FEF3C7", text: "#D97706" },
  COMPLETED: { bg: "#DCFCE7", text: "#16A34A" },
  FAILED: { bg: "#FEE2E2", text: "#DC2626" },
  REFUNDED: { bg: "#E0E7FF", text: "#4338CA" },
};

function TransactionCard({ item, colors, styles: s }: { item: Transaction; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  const statusStyle = STATUS_COLORS[item.status] ?? STATUS_COLORS.PENDING;
  const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = new Date(item.createdAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card style={s.card}>
      <View style={s.cardRow}>
        <View style={s.iconWrap}>
          <CreditCard size={20} color={colors.text.secondary} />
        </View>
        <View style={s.cardInfo}>
          <Text style={s.type} numberOfLines={1}>{item.type.replace(/_/g, " ")}</Text>
          <Text style={s.date}>{dateStr} · {timeStr}</Text>
        </View>
        <View style={s.rightCol}>
          <Text style={s.amount}>{formatCurrency(Math.round(item.amount * 100), item.currency)}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[s.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading } = useTransactions();
  const transactions = data?.data ?? [];

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <ScreenHeader title="Payment History" />
        <LoadingIndicator fullScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Payment History" />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => <TransactionCard item={item} colors={colors} styles={s} />}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <CreditCard size={48} color={colors.text.tertiary} />
            <Text style={s.emptyTitle}>No transactions yet</Text>
            <Text style={s.emptySub}>Your payment history will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  card: { gap: 0 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, gap: 2 },
  type: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary, textTransform: "capitalize" },
  date: { fontSize: fontSize.xs, color: colors.text.tertiary },
  paymentId: { fontSize: fontSize.xs, color: colors.text.tertiary, fontFamily: "monospace" },
  rightCol: { alignItems: "flex-end", gap: spacing.xs },
  amount: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: "600" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  emptySub: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center" },
});
