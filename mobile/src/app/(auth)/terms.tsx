import React, { useMemo } from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export default function TermsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <SafeAreaView testID="terms.screen" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("auth.terms.title")}</Text>
        <Text style={styles.body}>{t("auth.terms.body")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xxl, gap: spacing.lg },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  body: { fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 24 },
});
