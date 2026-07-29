import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useBid, useCancelBid } from "@/hooks/useBids";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, type ColorPalette } from "@/lib/theme";
import { formatCurrency, handleApiError } from "@/lib/utils";

export default function BidWaitingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bidId = id ? Number(id) : null;
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data: bid } = useBid(bidId, true);
  const cancel = useCancelBid();
  const requireAuth = useRequireAuth();

  useEffect(() => {
    if (!bid) return;
    if (bid.status === "ACCEPTED" && bid.rideId) {
      router.replace(`/ride/${bid.rideId}` as any);
    } else if (bid.status === "DECLINED" || bid.status === "EXPIRED") {
      router.replace("/" as any);
    }
  }, [bid?.status, bid?.rideId]);

  async function onCancel() {
    if (!bidId) return;
    try {
      await cancel.mutateAsync(bidId);
      router.replace("/" as any);
    } catch (err: any) {
      handleApiError(err, t);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your offer</Text>
        <Text style={styles.amount}>
          {bid ? formatCurrency(Math.round(parseFloat(bid.bidAmount) * 100)) : "—"}
        </Text>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginVertical: spacing.xxl }}
        />
        <Text style={styles.waiting}>Waiting for passenger to choose…</Text>
        <Button
          title="Cancel offer"
          variant="secondary"
          // auth-gated
          onPress={() =>
            requireAuth(() => void onCancel(), {
              reason: "Sign in to cancel this offer",
            })
          }
          loading={cancel.isPending}
          style={{ marginTop: spacing.xxl }}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      flex: 1,
      padding: spacing.xxl,
      justifyContent: "center",
      alignItems: "center",
    },
    title: { fontSize: fontSize.lg, color: colors.text.secondary },
    amount: {
      fontSize: fontSize.xxxl,
      fontWeight: "700",
      color: colors.text.primary,
      marginTop: spacing.sm,
    },
    waiting: {
      fontSize: fontSize.md,
      color: colors.text.secondary,
      textAlign: "center",
    },
  });
