import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { spacing, fontSize, borderRadius, ColorPalette } from "@/lib/theme";

interface MapErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback. If omitted, a generic "Maps unavailable" view renders. */
  fallback?: React.ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

function MapErrorFallback({ message }: { message?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.fallback} testID="map.errorFallback">
      <View style={styles.iconWrap}>
        <MapPin size={24} color={colors.text.secondary} />
      </View>
      <Text style={styles.title}>Maps unavailable</Text>
      <Text style={styles.hint}>Map can't be displayed right now.</Text>
      {__DEV__ && message ? (
        <Text style={styles.devHint}>
          [dev] {message}. Check the Google Maps API key for this build.
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Catches synchronous render-time errors from native map modules (e.g.
 * react-native-maps crashing because PROVIDER_GOOGLE has no API key) and
 * renders a placeholder instead of letting the whole screen crash.
 *
 * Wrap MapView mount sites only — not whole screens — so the rest of the
 * UI (drawer, bottom sheet, controls) keeps working.
 */
export class MapErrorBoundary extends React.Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Keep noise low but surface in dev so we notice if the map starts
    // throwing for new reasons.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[MapErrorBoundary] caught map render error:", error, info);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <MapErrorFallback message={this.state.message} />;
    }
    return this.props.children;
  }
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  devHint: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 16,
    opacity: 0.7,
  },
});
