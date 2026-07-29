import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { borderRadius } from "@/lib/theme";

interface SheetHandleProps {
  testID?: string;
}

export function SheetHandle({ testID }: SheetHandleProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View
        testID={testID}
        style={[styles.bar, { backgroundColor: colors.border, borderRadius: borderRadius.full }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  bar: { width: 48, height: 5 },
});
