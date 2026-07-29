import React, { Component, ErrorInfo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={s.container}>
      <AlertTriangle size={48} color={colors.error} />
      <Text style={s.title}>Something went wrong</Text>
      <Text style={s.message}>{error?.message || "An unexpected error occurred"}</Text>
      <Button title="Try Again" onPress={onReset} />
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xxl, backgroundColor: colors.background },
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary },
  message: { fontSize: fontSize.sm, color: colors.error, textAlign: "center" },
});
