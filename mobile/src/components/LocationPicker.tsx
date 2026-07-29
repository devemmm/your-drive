import React, { useMemo, useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, MapPin, Search } from "lucide-react-native";
import {
  useCityAutocomplete, useAddressAutocomplete, usePlacesSessionToken,
  fetchPlaceDetails, extractLocation, ExtractedLocation, PlacePrediction,
} from "@/hooks/usePlaces";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { RWANDA_CITIES } from "@/lib/rwandaCities";

const TEST_MODE = process.env.EXPO_PUBLIC_TEST_MODE === "1";

// Stable testID slug per curated city.
function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z]/g, "-");
}

// Synthetic PlacePrediction-shaped items so test mode reuses the same render
// path as the real Google Places results. `place_id` doubles as the testID
// key so flows can target an exact city. Dedupe by slug since multiple
// RWANDA_CITIES keys can alias to the same city (e.g. butare -> Huye).
const TEST_PREDICTIONS: PlacePrediction[] = Array.from(
  Object.values(RWANDA_CITIES)
    .reduce((acc, c) => {
      const slug = citySlug(c.city);
      if (!acc.has(slug)) {
        acc.set(slug, {
          place_id: `test:${slug}`,
          description: `${c.city}, ${c.region}`,
          structured_formatting: { main_text: c.city, secondary_text: c.region },
        });
      }
      return acc;
    }, new Map<string, PlacePrediction>())
    .values()
);

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: ExtractedLocation) => void;
  mode?: "cities" | "addresses";
  title?: string;
}

export function LocationPicker({ visible, onClose, onSelect, mode = "cities", title = "Select location" }: LocationPickerProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(false);
  const sessionToken = usePlacesSessionToken();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const citiesQuery = useCityAutocomplete(
    !TEST_MODE && mode === "cities" ? debouncedQuery : "",
    sessionToken
  );
  const addressesQuery = useAddressAutocomplete(
    !TEST_MODE && mode === "addresses" ? debouncedQuery : "",
    sessionToken
  );
  const activeQuery = mode === "cities" ? citiesQuery : addressesQuery;

  const predictions: PlacePrediction[] = TEST_MODE
    ? TEST_PREDICTIONS.filter((p) =>
        debouncedQuery.length === 0
          ? true
          : p.structured_formatting.main_text.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    : (activeQuery.data?.data?.predictions ?? []);

  async function handleSelect(prediction: PlacePrediction) {
    if (TEST_MODE && prediction.place_id.startsWith("test:")) {
      const slug = prediction.place_id.slice("test:".length);
      const match = Object.values(RWANDA_CITIES).find((c) => citySlug(c.city) === slug);
      if (match) {
        onSelect({
          country: "Rwanda",
          region: match.region,
          city: match.city,
          locationName: match.city,
          address: `${match.city}, ${match.region}`,
          latitude: match.latitude,
          longitude: match.longitude,
        });
        setQuery("");
        onClose();
      }
      return;
    }
    setLoadingDetails(true);
    try {
      const details = await fetchPlaceDetails(prediction.place_id, sessionToken);
      if (details) {
        const location = extractLocation(details);
        onSelect(location);
        setQuery("");
        onClose();
      }
    } finally {
      setLoadingDetails(false);
    }
  }

  function handleClose() {
    setQuery("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.searchWrap}>
            <Search size={18} color={colors.text.tertiary} />
            <TextInput
              testID="picker.searchInput"
              style={s.searchInput}
              placeholder="Type to search..."
              placeholderTextColor={colors.text.tertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
          {(activeQuery.isLoading || loadingDetails) && (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`picker.item.${citySlug(item.structured_formatting.main_text)}`}
                style={s.item}
                onPress={() => handleSelect(item)}
              >
                <MapPin size={18} color={colors.text.secondary} />
                <View style={s.itemText}>
                  <Text style={s.itemMain}>{item.structured_formatting.main_text}</Text>
                  <Text style={s.itemSub} numberOfLines={1}>{item.structured_formatting.secondary_text}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              debouncedQuery.length >= 2 && !activeQuery.isLoading ? (
                <Text style={s.emptyText}>No results found</Text>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  closeBtn: { padding: spacing.xs },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: spacing.md, margin: spacing.lg, paddingHorizontal: spacing.lg, height: 48, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text.primary },
  loadingWrap: { padding: spacing.lg, alignItems: "center" },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemText: { flex: 1 },
  itemMain: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  itemSub: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  emptyText: { textAlign: "center", color: colors.text.tertiary, padding: spacing.xxl },
});
