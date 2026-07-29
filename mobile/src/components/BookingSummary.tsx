import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

interface BookingSummaryProps { pricePerSeat: number; seats: number; platformFee: number; }

export function BookingSummary({ pricePerSeat, seats, platformFee }: BookingSummaryProps) {
  const { colors } = useTheme();
  const bs = useMemo(() => makeStyles(colors), [colors]);
  const subtotal = pricePerSeat * seats;
  const total = subtotal + platformFee;
  return (
    <View style={bs.container}>
      <Row label="Price per seat" value={formatCurrency(Math.round(pricePerSeat * 100))} styles={bs} />
      <Row label="Seats" value={`x ${seats}`} styles={bs} />
      <Row label="Platform fee" value={formatCurrency(Math.round(platformFee * 100))} styles={bs} />
      <View style={bs.divider} />
      <View style={bs.totalRow}>
        <Text style={bs.totalLabel}>Total</Text>
        <Text style={bs.totalValue}>{formatCurrency(Math.round(total * 100))}</Text>
      </View>
    </View>
  );
}

function Row({ label, value, styles: bs }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return <View style={bs.row}><Text style={bs.label}>{label}</Text><Text style={bs.value}>{value}</Text></View>;
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: fontSize.sm, color: colors.text.secondary },
  value: { fontSize: fontSize.sm, color: colors.text.primary, fontWeight: "500" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
  totalValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.primary },
});
