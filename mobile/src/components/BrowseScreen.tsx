import React, { useMemo } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { useTheme } from "@/providers/ThemeProvider";
import { spacing, ColorPalette } from "@/lib/theme";

interface BrowseScreenProps<T> {
  title: string;
  data: T[] | undefined;
  isLoading: boolean;
  renderItem: (item: T) => React.ReactElement;
  keyExtractor: (item: T) => string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptySubtitle: string;
  headerVariant?: "root" | "child";
}

export function BrowseScreen<T>({ title, data, isLoading, renderItem, keyExtractor, emptyIcon, emptyTitle, emptySubtitle, headerVariant = "root" }: BrowseScreenProps<T>) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title={title} variant={headerVariant} />
      {isLoading ? (
        <LoadingIndicator fullScreen />
      ) : !data?.length ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        <FlatList
          data={data}
          renderItem={({ item }) => renderItem(item)}
          keyExtractor={keyExtractor}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
});
