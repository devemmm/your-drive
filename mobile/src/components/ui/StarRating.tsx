import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Star } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { spacing } from "@/lib/theme";

interface StarRatingProps { rating: number; maxRating?: number; size?: number; interactive?: boolean; onRate?: (rating: number) => void; }

export function StarRating({ rating, maxRating = 5, size = 24, interactive = false, onRate }: StarRatingProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i < Math.round(rating);
        const star = (
          <Star
            key={i}
            size={size}
            color={filled ? colors.star : colors.border}
            fill={filled ? colors.star : "none"}
          />
        );
        if (interactive && onRate) {
          return <TouchableOpacity key={i} onPress={() => onRate(i + 1)}>{star}</TouchableOpacity>;
        }
        return star;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: spacing.xs },
});
