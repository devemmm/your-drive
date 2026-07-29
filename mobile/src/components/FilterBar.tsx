import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Badge } from "@/components/ui/Badge";
import { spacing } from "@/lib/theme";

interface FilterBarProps { activeType: "P2P" | "D2D"; onTypeChange: (type: "P2P" | "D2D") => void; }

export function FilterBar({ activeType, onTypeChange }: FilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={fb.scroll}
      contentContainerStyle={fb.container}
    >
      <TouchableOpacity onPress={() => onTypeChange("P2P")}><Badge label="P2P" variant={activeType === "P2P" ? "primary" : "outline"} /></TouchableOpacity>
      <TouchableOpacity onPress={() => onTypeChange("D2D")}><Badge label="D2D" variant={activeType === "D2D" ? "primary" : "outline"} /></TouchableOpacity>
      <TouchableOpacity><Badge label="Price" variant="outline" /></TouchableOpacity>
      <TouchableOpacity><Badge label="Time" variant="outline" /></TouchableOpacity>
      <TouchableOpacity><Badge label="Prefs" variant="outline" /></TouchableOpacity>
    </ScrollView>
  );
}

const fb = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  container: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
});
