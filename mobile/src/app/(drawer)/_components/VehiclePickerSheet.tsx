import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Check } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  plateNumber?: string;
  capacity: number;
}

interface Props {
  visible: boolean;
  vehicles: Vehicle[];
  title?: string;
  subtitle?: string;
  onPick: (vehicleId: number) => void;
  onClose: () => void;
  loading?: boolean;
}

export function VehiclePickerSheet({
  visible,
  vehicles,
  title = "Pick a vehicle",
  subtitle,
  onPick,
  onClose,
  loading,
}: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          <ScrollView style={{ maxHeight: 300 }}>
            {vehicles.map((v) => (
              <TouchableOpacity
                key={v.id}
                testID={`vehiclePicker.row.${v.id}`}
                style={s.row}
                onPress={() => onPick(v.id)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{v.make} {v.model}</Text>
                  <Text style={s.rowSub}>
                    {v.plateNumber ? `${v.plateNumber} · ` : ""}{v.capacity} seats
                  </Text>
                </View>
                <Check size={18} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button title="Cancel" variant="secondary" onPress={onClose} loading={loading} />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.sm, color: colors.text.secondary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  rowSub: { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: 2 },
});
