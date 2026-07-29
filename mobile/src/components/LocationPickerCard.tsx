import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { MapPin, X } from "lucide-react-native";
import { usePicker } from "@/providers/PickerProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useAddressAutocomplete, usePlacesSessionToken, fetchPlaceDetails, type PlacePrediction } from "@/hooks/usePlaces";
import { extractCity } from "@/utils/extractCity";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export function LocationPickerCard() {
  const { from, to, activeField, mode, activate, cancel, setField, useCurrentLocationFor, confirm } = usePicker();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const { location, city: gpsCity } = useCurrentLocation();
  const sessionToken = usePlacesSessionToken();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  const { data: autocompleteData } = useAddressAutocomplete(debouncedQuery, sessionToken);
  const suggestions: PlacePrediction[] = autocompleteData?.data?.predictions ?? [];

  // Auto-populate From with GPS city so search has a valid origin even when
  // the user never taps the picker. Only runs while From is still the default
  // current-location value so we don't clobber explicit picks.
  useEffect(() => {
    if (!gpsCity || from.city) return;
    if (from.kind !== "current") return;
    useCurrentLocationFor("from", {
      city: gpsCity,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
  }, [gpsCity, location, from.city, from.kind, useCurrentLocationFor]);

  // Reset the query whenever picker mode flips so a fresh activation starts blank.
  useEffect(() => {
    if (mode !== "picking") setQuery("");
  }, [mode, activeField]);

  const onSuggestionPress = useCallback(
    async (prediction: PlacePrediction) => {
      if (!activeField) return;
      const field = activeField;
      Keyboard.dismiss();
      const details = await fetchPlaceDetails(prediction.place_id, sessionToken).catch(() => null);
      if (details) {
        setField(field, {
          kind: "place",
          placeId: details.place_id,
          label: details.name || prediction.structured_formatting.main_text,
          city: extractCity(details.address_components),
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
        });
      } else {
        setField(field, {
          kind: "place",
          placeId: prediction.place_id,
          label: prediction.structured_formatting.main_text,
          city: prediction.structured_formatting.main_text,
          latitude: 0,
          longitude: 0,
        });
      }
      setQuery("");
      confirm();
    },
    [activeField, sessionToken, setField, confirm]
  );

  const onCancel = useCallback(() => {
    setQuery("");
    Keyboard.dismiss();
    cancel();
  }, [cancel]);

  const renderRow = (field: "from" | "to") => {
    const value = field === "from" ? from : to;
    const isActive = activeField === field;
    const placeholder = field === "from" ? "Set pickup location" : "Where to?";
    const display = value?.label ?? placeholder;
    const pipStyle = field === "from" ? styles.pipFrom : styles.pipTo;
    const testIDBase = field === "from" ? "picker.fromField" : "picker.toField";

    return (
      <TouchableOpacity
        testID={isActive ? `${testIDBase}.active` : testIDBase}
        accessibilityRole="button"
        activeOpacity={0.7}
        style={[styles.row, isActive && styles.rowActive]}
        onPress={() => activate(field)}
      >
        <View style={[styles.pip, pipStyle]} />
        <View style={styles.rowText}>
          <Text style={styles.label}>{field === "from" ? "From" : "To"}</Text>
          {isActive ? (
            <TextInput
              testID="picker.searchInput"
              value={query}
              onChangeText={setQuery}
              placeholder={display}
              placeholderTextColor={colors.text.tertiary}
              autoFocus
              style={styles.input}
              returnKeyType="search"
            />
          ) : (
            <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
              {display}
            </Text>
          )}
        </View>
        {isActive ? (
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  const isPicking = mode === "picking";

  return (
    <View testID="picker.card" style={styles.card} accessibilityLabel="Location picker">
      {renderRow("from")}
      <View style={styles.divider} />
      {renderRow("to")}

      {isPicking && suggestions.length > 0 ? (
        <View testID="picker.suggestionSheet" style={styles.expandedArea}>
          <View style={styles.divider} />
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={item.place_id}
              testID={`picker.suggestion.${index}`}
              accessibilityRole="button"
              onPress={() => onSuggestionPress(item)}
              style={styles.suggestion}
              activeOpacity={0.7}
            >
              <MapPin size={16} color={colors.primary} />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionMain} numberOfLines={1}>
                  {item.structured_formatting.main_text}
                </Text>
                <Text style={styles.suggestionSub} numberOfLines={1}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    minHeight: 56,
  },
  rowActive: { backgroundColor: colors.surfaceSoftGreen },
  pip: { width: 9, height: 9, borderRadius: 9 / 2 },
  pipFrom: { backgroundColor: colors.primary },
  pipTo: { backgroundColor: colors.text.primary },
  rowText: { flex: 1 },
  label: { color: colors.text.tertiary, fontSize: (fontSize as any).xs ?? 10, textTransform: "uppercase", letterSpacing: 0.4 },
  value: { color: colors.text.primary, fontSize: fontSize.md, fontWeight: "500" },
  placeholder: { color: colors.text.tertiary, fontSize: fontSize.md },
  input: { color: colors.text.primary, fontSize: fontSize.md, fontWeight: "500", padding: 0, margin: 0 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  expandedArea: { paddingBottom: spacing.sm },
  suggestion: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  suggestionText: { flex: 1 },
  suggestionMain: { color: colors.text.primary, fontSize: fontSize.md, fontWeight: "500" },
  suggestionSub: { color: colors.text.tertiary, fontSize: fontSize.sm, marginTop: 2 },
});
