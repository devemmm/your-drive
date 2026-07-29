import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { QrCode, MapPin, Users } from "lucide-react-native";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { QrScannerModal } from "@/components/QrScannerModal";
import { useRideManifest, useAttendByCode, type ManifestSeat } from "@/hooks/useRideManifest";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

export default function ManifestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Number(id);
  const { data, isLoading, refetch, isFetching } = useRideManifest(rideId);
  const attend = useAttendByCode();
  const [scannerOpen, setScannerOpen] = useState(false);
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const requireAuth = useRequireAuth();

  const seats = data ?? [];
  const boardedCount = seats.filter((seat) => seat.attendedAt != null).length;

  async function attendByCode(code: string) {
    try {
      await attend.mutateAsync({ rideId, attendanceCode: code });
      refetch();
    } catch (e: any) {
      Alert.alert("Could not board", e?.response?.data?.error ?? "Unknown error");
    }
  }

  async function onScan(code: string) {
    setScannerOpen(false);
    await attendByCode(code);
  }

  return (
    <SafeAreaView style={s.container} edges={["top", "left", "right"]}>
      <ScreenHeader title="Manifest" />
      {seats.length > 0 && (
        <View style={s.summary}>
          <Users size={16} color={colors.text.secondary} />
          <Text style={s.summaryText}>
            {boardedCount} of {seats.length} boarded
          </Text>
        </View>
      )}

      {isLoading ? (
        <LoadingIndicator fullScreen />
      ) : (
        <FlatList
          testID="manifest.list"
          data={seats}
          keyExtractor={(seat) => String(seat.id)}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Users size={40} color={colors.text.tertiary} />}
              title="No passengers yet"
              subtitle="Approved bookings will appear here as passengers join the trip."
            />
          }
          renderItem={({ item }) => (
            <ManifestRow
              seat={item}
              colors={colors}
              styles={s}
              // auth-gated
              onBoard={(code) =>
                requireAuth(() => attendByCode(code), {
                  reason: "Sign in to board this passenger",
                })
              }
            />
          )}
        />
      )}

      <TouchableOpacity
        testID="manifest.scanFab"
        style={s.fab}
        // auth-gated
        onPress={() =>
          requireAuth(() => setScannerOpen(true), {
            reason: "Sign in to scan boarding QR",
          })
        }
        activeOpacity={0.85}
      >
        <QrCode size={20} color={colors.text.inverse} />
        <Text style={s.fabTxt}>Scan QR</Text>
      </TouchableOpacity>
      <QrScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScan={onScan} />
    </SafeAreaView>
  );
}

function ManifestRow({
  seat,
  colors,
  styles: s,
  onBoard,
}: {
  seat: ManifestSeat;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  onBoard: (code: string) => void;
}) {
  const [firstName, ...rest] = seat.passengerName.trim().split(/\s+/);
  const lastName = rest.join(" ");
  const isBoarded = seat.attendedAt != null;
  return (
    <Card style={s.row} testID={`manifest.row.${seat.id}`}>
      <Avatar firstName={firstName || "?"} lastName={lastName} size={44} />
      <View style={s.rowMain}>
        <Text style={s.passengerName} numberOfLines={1}>
          {seat.passengerName}
        </Text>
        <View style={s.metaRow}>
          <Text style={s.code} numberOfLines={1}>
            {seat.attendanceCode}
          </Text>
          {seat.boardingStop ? (
            <View style={s.boardingStop}>
              <MapPin size={12} color={colors.text.tertiary} />
              <Text style={s.boardingStopText} numberOfLines={1}>
                {seat.boardingStop}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {isBoarded ? (
        <View testID={`manifest.boardedBadge.${seat.id}`}>
          <Badge label="Boarded" variant="primary" />
        </View>
      ) : (
        <Button
          testID={`manifest.boardButton.${seat.id}`}
          size="sm"
          variant="primary"
          title="Board"
          onPress={() => onBoard(seat.attendanceCode)}
        />
      )}
    </Card>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    summaryText: { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: "500" },
    listContent: { padding: spacing.lg, paddingBottom: 120, gap: spacing.sm, flexGrow: 1 },
    separator: { height: spacing.sm },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
    },
    rowMain: { flex: 1, gap: 4 },
    passengerName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
    metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
    code: {
      fontSize: fontSize.xs,
      fontWeight: "600",
      color: colors.text.secondary,
      letterSpacing: 1.5,
      fontFamily: "Courier",
    },
    boardingStop: { flexDirection: "row", alignItems: "center", gap: 2 },
    boardingStopText: { fontSize: fontSize.xs, color: colors.text.tertiary },
    fab: {
      position: "absolute",
      right: spacing.lg,
      bottom: spacing.xl,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.full,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
    fabTxt: { color: colors.text.inverse, fontWeight: "700", fontSize: fontSize.sm },
  });
