import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Pressable, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation } from "expo-router";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useTranslation } from "react-i18next";
import { Menu, Locate, Car, Bike, MapPin } from "lucide-react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { useNearbyDrivers, MapBounds } from "@/hooks/useNearbyDrivers";
import { HomeBottomSheet } from "@/components/HomeBottomSheet";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { useTheme } from "@/providers/ThemeProvider";
import { ensureLocationPermission } from "@/lib/permissions";
import { spacing, fontSize } from "@/lib/theme";
import { mapStyleDark } from "@/lib/mapStyleDark";
import type { Region } from "react-native-maps";
import { PickerProvider } from "@/providers/PickerProvider";
import { useMapPinController } from "@/components/MapPinController";

const HARARE_REGION = {
  latitude: -17.8292,
  longitude: 31.0522,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

// ---------------------------------------------------------------------------
// HomePickerOverlay — renders the center map pin and forwards MapView region
// changes into the pin controller for the map-drag picker flow. The From/To
// rows, autocomplete and chip now live inside LocationPickerCard at the top
// of HomeBottomSheet — no second sheet.
// ---------------------------------------------------------------------------

interface HomePickerOverlayProps {
  regionRef: React.MutableRefObject<((r: Region) => void) | null>;
}

function HomePickerOverlay({ regionRef }: HomePickerOverlayProps) {
  const { pin, onRegionChange } = useMapPinController();

  useEffect(() => {
    regionRef.current = onRegionChange;
    return () => {
      regionRef.current = null;
    };
  }, [onRegionChange, regionRef]);

  return <>{pin}</>;
}

// ---------------------------------------------------------------------------
// PassengerHome
// ---------------------------------------------------------------------------

export function PassengerHome() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { colors, resolved } = useTheme();
  const { t } = useTranslation();
  const { location, address, refetch } = useCurrentLocation();
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  useEffect(() => {
    ensureLocationPermission().then((res) => setLocationGranted(res === "granted"));
  }, []);

  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const { data: nearbyData } = useNearbyDrivers(bounds);
  const nearbyDrivers = nearbyData?.drivers ?? [];

  // Ref used to forward MapView region changes into the picker overlay
  const overlayRegionRef = useRef<((r: Region) => void) | null>(null);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    setBounds({
      swLat: region.latitude - region.latitudeDelta / 2,
      swLng: region.longitude - region.longitudeDelta / 2,
      neLat: region.latitude + region.latitudeDelta / 2,
      neLng: region.longitude + region.longitudeDelta / 2,
    });
    overlayRegionRef.current?.(region);
  }, []);

  const region = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : HARARE_REGION;

  // Animate to user location when GPS resolves
  useEffect(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        800
      );
    }
  }, [location]);

  function centerOnUser() {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500
      );
    }
    refetch();
  }

  return (
    <PickerProvider>
      <View style={s.container} testID="home.screen">
        <StatusBar style={resolved === "dark" ? "light" : "dark"} />

        <MapErrorBoundary>
          <MapView
            ref={mapRef}
            testID="home.map"
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            mapPadding={{ top: 0, right: 0, bottom: 200, left: 0 }}
            customMapStyle={resolved === "dark" ? mapStyleDark : undefined}
          >
            {nearbyDrivers.map((driver) => (
              <Marker
                key={driver.id}
                coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
                title={driver.vehicleCategory === "CAR" ? "Car" : "Moto"}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={s.markerIcon}>
                  {driver.vehicleCategory === "CAR" ? (
                    <Car size={18} color={colors.primary} />
                  ) : (
                    <Bike size={18} color={colors.primary} />
                  )}
                </View>
              </Marker>
            ))}
            {/* Current location pin — mirrors the old "Pickup point" marker but
                styled to match the picker's green pin so it reads as one
                consistent affordance. Address info is now in the sheet's From
                row, no need to duplicate it as a bubble on the map. */}
            {location && (
              <Marker
                testID="home.currentLocationPin"
                coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View style={s.currentPin}>
                  <MapPin size={28} color={colors.primary} fill={colors.primary} />
                </View>
              </Marker>
            )}
          </MapView>
        </MapErrorBoundary>

        {locationGranted === false ? (
          <View
            testID="home.locationBanner"
            style={[s.banner, { backgroundColor: colors.warning }]}
          >
            <Text style={[s.bannerText, { color: colors.text.inverse }]}>
              {t("home.locationBanner")}
            </Text>
            <Pressable onPress={() => Linking.openSettings()}>
              <Text style={[s.bannerLink, { color: colors.text.inverse }]}>
                {t("home.openSettings")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <TouchableOpacity
          testID="home.menuButton"
          style={[s.hamburgerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.openDrawer()}
          activeOpacity={0.8}
        >
          <Menu size={22} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="home.locateButton"
          style={[s.gpsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={centerOnUser}
          activeOpacity={0.8}
        >
          <Locate size={20} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Picker overlay: map pin + suggestion sheet */}
        <HomePickerOverlay regionRef={overlayRegionRef} />

        <HomeBottomSheet ref={bottomSheetRef} />
      </View>
    </PickerProvider>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    position: "absolute",
    top: 110,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    marginRight: spacing.md,
  },
  bannerLink: {
    fontWeight: "700",
    fontSize: fontSize.sm,
  },
  markerIcon: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPin: {
    alignItems: "center",
    justifyContent: "center",
  },
  hamburgerBtn: {
    position: "absolute", top: 56, left: 16, width: 44, height: 44,
    borderRadius: 22, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  gpsBtn: {
    position: "absolute", bottom: 210, right: 16, width: 44, height: 44,
    borderRadius: 22, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
});
