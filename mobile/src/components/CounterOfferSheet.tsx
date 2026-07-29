import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useSubmitBid } from "@/hooks/useBids";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, fontSize, spacing, type ColorPalette } from "@/lib/theme";
import { formatCurrency, handleApiError } from "@/lib/utils";

export type CounterOfferSheetRef = { open: () => void; close: () => void };

type Props = {
  rideRequestId: number;
  proposedFare: number;
  vehicleId: number;
};

export const CounterOfferSheet = forwardRef<CounterOfferSheetRef, Props>(
  function CounterOfferSheet({ rideRequestId, proposedFare, vehicleId }, ref) {
    const sheetRef = useRef<BottomSheet>(null);
    const router = useRouter();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const styles = makeStyles(colors);
    const [amount, setAmount] = useState(String(Math.round(proposedFare)));
    const submit = useSubmitBid(rideRequestId);
    const requireAuth = useRequireAuth();

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    async function onSubmit() {
      const parsed = parseFloat(amount);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      try {
        const bid = await submit.mutateAsync({ amount: parsed, vehicleId });
        sheetRef.current?.close();
        router.push(`/bids/${bid.id}/waiting` as any);
      } catch (err: any) {
        handleApiError(err, t);
        const code = err?.response?.data?.code;
        if (code === "REQUEST_CLOSED") {
          sheetRef.current?.close();
        }
      }
    }

    return (
      <BottomSheet
        ref={sheetRef}
        snapPoints={["50%"]}
        index={-1}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        // Let the sheet handle the keyboard itself. KeyboardAvoidingView inside
        // @gorhom/bottom-sheet fights the sheet's own positioning, which is why
        // the input was hiding under the keyboard.
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={styles.content}>
          <Text style={styles.title}>Make a counter-offer</Text>
          <Text style={styles.subtitle}>
            Passenger proposed {formatCurrency(Math.round(proposedFare * 100))}
          </Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputPrefix}>RWF</Text>
            <BottomSheetTextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="Amount"
              placeholderTextColor={colors.text.secondary}
              style={styles.input}
            />
          </View>
          <Text style={styles.helper}>
            Your bid will be visible to the passenger.
          </Text>
          <Button
            title="Send offer"
            onPress={() =>
              requireAuth(() => void onSubmit(), {
                reason: "Sign in to submit a bid",
              })
            }
            loading={submit.isPending}
          />
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    content: { padding: spacing.xxl, gap: spacing.lg },
    title: {
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSize.md,
      color: colors.text.secondary,
      marginBottom: spacing.lg,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      height: 52,
      gap: spacing.sm,
    },
    inputPrefix: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.text.secondary,
    },
    input: {
      flex: 1,
      fontSize: fontSize.md,
      color: colors.text.primary,
      height: "100%",
    },
    helper: {
      fontSize: fontSize.sm,
      color: colors.text.secondary,
      marginVertical: spacing.lg,
    },
  });
