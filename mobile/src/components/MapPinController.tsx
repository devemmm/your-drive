import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { MapPin } from "lucide-react-native";
import { usePicker } from "@/providers/PickerProvider";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useTheme } from "@/providers/ThemeProvider";

interface Region { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number; }

interface Props {
  onRegionChange?: (r: Region) => void;
}

/**
 * Renders the center-of-map crosshair pin when the picker is in "picking" mode.
 * Subscribes to picker.activeField + a region-change stream (driven by the host
 * screen via `register`) to debounce reverse-geocode and write the result back
 * into the active picker field.
 */
export function MapPinController({ onRegionChange }: Props) {
  const { mode, activeField, setField } = usePicker();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const reverseGeo = useReverseGeocode();

  useEffect(() => {
    if (!reverseGeo.result || !activeField) return;
    setField(activeField, {
      kind: "dragged",
      label: reverseGeo.result.label,
      city: reverseGeo.result.city,
      latitude: reverseGeo.result.latitude,
      longitude: reverseGeo.result.longitude,
    });
  }, [reverseGeo.result, activeField, setField]);

  // The host screen calls handleRegionChange when the MapView region settles.
  const handleRegionChange = (region: Region) => {
    onRegionChange?.(region);
    if (mode === "picking") {
      reverseGeo.lookup({ latitude: region.latitude, longitude: region.longitude });
    }
  };

  if (mode !== "picking") return null;

  return (
    <View pointerEvents="none" style={styles.wrapper} testID="picker.centerPin">
      <MapPin size={36} color={colors.primary} />
    </View>
  );
}

/**
 * Hook variant for the host: returns `{ pin, onRegionChange }` so the screen
 * can render the pin AND wire the region listener with a single call.
 */
export function useMapPinController() {
  const picker = usePicker();
  const reverseGeo = useReverseGeocode();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  useEffect(() => {
    if (!reverseGeo.result || !picker.activeField) return;
    picker.setField(picker.activeField, {
      kind: "dragged",
      label: reverseGeo.result.label,
      city: reverseGeo.result.city,
      latitude: reverseGeo.result.latitude,
      longitude: reverseGeo.result.longitude,
    });
  }, [reverseGeo.result, picker.activeField, picker.setField]);

  const onRegionChange = (region: Region) => {
    if (picker.mode === "picking") {
      reverseGeo.lookup({ latitude: region.latitude, longitude: region.longitude });
    }
  };

  const pin = picker.mode === "picking" ? (
    <View pointerEvents="none" style={styles.wrapper} testID="picker.centerPin">
      <MapPin size={36} color={colors.primary} />
    </View>
  ) : null;

  return { pin, onRegionChange };
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
});
