import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

type Kind = "from" | "to" | "stop";

interface LocationDotProps {
  kind: Kind;
  size?: number;
  testID?: string;
}

export function LocationDot({ kind, size = 18, testID }: LocationDotProps) {
  const { colors } = useTheme();
  const outerColor =
    kind === "from" ? colors.primary : kind === "to" ? colors.text.primary : colors.background;
  const borderColor =
    kind === "stop" ? colors.text.primary : "transparent";
  const inner = size * 0.4;
  return (
    <View
      testID={testID}
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: outerColor,
          borderWidth: kind === "stop" ? 2 : 0,
          borderColor,
        },
      ]}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: kind === "stop" ? colors.text.primary : colors.background,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: "center", justifyContent: "center" },
});
