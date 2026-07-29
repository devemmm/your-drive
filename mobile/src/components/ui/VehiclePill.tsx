import React, { useMemo } from "react";
import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Car, Truck, Bus, Bike, Key, UserCheck, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius, ColorPalette } from "@/lib/theme";
import { ThemedText } from "@/components/ui/Text";

export type IconKey = "car" | "truck" | "bus" | "bike" | "key" | "userCheck";
const ICON_MAP: Record<IconKey, LucideIcon> = {
  car: Car, truck: Truck, bus: Bus, bike: Bike, key: Key, userCheck: UserCheck,
};

interface VehiclePillProps {
  icon: IconKey;
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function VehiclePill({ icon, label, selected = false, onPress, style, testID }: VehiclePillProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors, selected), [colors, selected]);
  const Icon = ICON_MAP[icon];
  const tint = selected ? colors.text.inverse : colors.text.primary;
  return (
    <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.8} style={[s.pill, style]}>
      <Icon size={22} color={tint} />
      <ThemedText weight={600} style={[s.label, { color: tint }]}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette, selected: boolean) =>
  StyleSheet.create({
    pill: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: borderRadius.pill,
      backgroundColor: selected ? colors.primary : colors.background,
      borderWidth: selected ? 0 : 1,
      borderColor: colors.border,
      minWidth: 88,
    },
    label: { fontSize: 13 },
  });
