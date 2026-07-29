import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRideDetail, useSubmitReview } from "@/hooks/useRides";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { formatCurrency, formatDate, handleApiError } from "@/lib/utils";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

export default function RideCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const cs = useMemo(() => makeCsStyles(colors), [colors]);
  const srs = useMemo(() => makeSrsStyles(colors), [colors]);
  const { data: ride, isLoading } = useRideDetail(id!);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const reviewMutation = useSubmitReview();
  const requireAuth = useRequireAuth();

  if (isLoading || !ride) return <LoadingIndicator fullScreen />;

  async function handleSubmit() {
    if (rating === 0) return;
    try {
      await reviewMutation.mutateAsync({ rideId: ride!.id, driverId: ride!.driver.id, rating, review: comment || undefined });
      router.replace("/(drawer)");
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  return (
    <SafeAreaView style={cs.container}>
      <ScrollView contentContainerStyle={cs.content}>
        <View style={cs.successIcon}><Text style={cs.checkmark}>✓</Text></View>
        <Text style={cs.title}>{t("rides.rideCompleted")}</Text>
        <Text style={cs.route}>{ride.departureLocation.locationName} → {ride.destinationLocation.locationName}</Text>
        <Text style={cs.date}>{formatDate(ride.departureTime)}</Text>
        <Card style={cs.summaryCard}>
          <Text style={cs.summaryTitle}>{t("rides.paymentSummary")}</Text>
          <SRow label={t("rides.amountPaid")} value={formatCurrency(Math.round((ride.contribution + 350) * 100))} styles={srs} />
          <SRow label={t("rides.paymentMethod")} value={t("rides.paymentMethod")} styles={srs} />
          <SRow label={t("rides.transactionId")} value={`TXN-${id?.substring(0, 6).toUpperCase()}`} styles={srs} />
        </Card>
        <Text style={cs.ratingPrompt}>{t("rides.howWasRide", { name: ride.driver.firstName })}</Text>
        <StarRating rating={rating} size={40} interactive onRate={setRating} />
        <TextInput style={cs.commentInput} placeholder={t("rides.leaveComment")} placeholderTextColor={colors.text.tertiary} value={comment} onChangeText={setComment} multiline numberOfLines={3} />
        <Button
          title={t("rides.submitReview")}
          // auth-gated
          onPress={() =>
            requireAuth(() => void handleSubmit(), {
              reason: "Sign in to submit your review",
            })
          }
          loading={reviewMutation.isPending}
          disabled={rating === 0}
        />
        <Button title={t("rides.skip")} variant="secondary" onPress={() => router.replace("/(drawer)")} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SRow({ label, value, styles: srs }: { label: string; value: string; styles: ReturnType<typeof makeSrsStyles> }) {
  return <View style={srs.row}><Text style={srs.label}>{label}</Text><Text style={srs.value}>{value}</Text></View>;
}

const makeSrsStyles = (colors: ColorPalette) => StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  label: { fontSize: fontSize.sm, color: colors.text.secondary },
  value: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.primary },
});

const makeCsStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, alignItems: "center", gap: spacing.lg },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  checkmark: { fontSize: 32, color: colors.primary },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  route: { fontSize: fontSize.md, color: colors.text.secondary },
  date: { fontSize: fontSize.sm, color: colors.text.tertiary },
  summaryCard: { width: "100%" },
  summaryTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary, marginBottom: spacing.sm },
  ratingPrompt: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary, textAlign: "center" },
  commentInput: { width: "100%", borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.lg, fontSize: fontSize.md, color: colors.text.primary, textAlignVertical: "top", minHeight: 80 },
});
