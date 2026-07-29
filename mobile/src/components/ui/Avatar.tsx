import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/providers/ThemeProvider";
import { ColorPalette } from "@/lib/theme";
import { getInitials } from "@/lib/utils";

interface AvatarProps { firstName: string; lastName: string; imageUrl?: string | null; size?: number; }

export function Avatar({ firstName, lastName, imageUrl, size = 40 }: AvatarProps) {
  const { colors } = useTheme();
  const aStyles = useMemo(() => makeStyles(colors), [colors]);
  // Skip SVG URLs - React Native Image doesn't render SVGs and our local
  // initials fallback looks better than a broken image placeholder.
  const isValidRasterUrl =
    typeof imageUrl === "string" &&
    imageUrl.startsWith("http") &&
    !imageUrl.toLowerCase().endsWith(".svg");
  const validUrl = isValidRasterUrl ? imageUrl : null;
  if (validUrl) {
    return (
      <Image
        source={{ uri: validUrl }}
        style={[aStyles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        transition={200}
      />
    );
  }
  const fontSize = Math.round(size * 0.4);
  return (
    <View
      style={[
        aStyles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text
        style={[
          aStyles.initials,
          {
            fontSize,
            lineHeight: size,
            height: size,
            width: size,
          },
        ]}
        allowFontScaling={false}
      >
        {getInitials(firstName, lastName)}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  image: { backgroundColor: colors.surface },
  fallback: {
    backgroundColor: colors.primaryLight,
    overflow: "hidden",
  },
  initials: {
    color: colors.primary,
    fontWeight: "700",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
