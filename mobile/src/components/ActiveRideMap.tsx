import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Location } from "@/lib/types";
import { useDirections } from "@/hooks/usePlaces";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { useTheme } from "@/providers/ThemeProvider";

interface ActiveRideMapProps {
  origin: Location;
  destination: Location;
}

export function ActiveRideMap({ origin, destination }: ActiveRideMapProps) {
  const { colors } = useTheme();
  const { data: route } = useDirections(
    { latitude: origin.latitude, longitude: origin.longitude },
    { latitude: destination.latitude, longitude: destination.longitude }
  );

  const region = {
    latitude: (origin.latitude + destination.latitude) / 2,
    longitude: (origin.longitude + destination.longitude) / 2,
    latitudeDelta: Math.abs(origin.latitude - destination.latitude) * 1.5 + 0.1,
    longitudeDelta: Math.abs(origin.longitude - destination.longitude) * 1.5 + 0.1,
  };

  // Use real route if available, otherwise fall back to straight line
  const polylineCoords = route?.coordinates ?? [
    { latitude: origin.latitude, longitude: origin.longitude },
    { latitude: destination.latitude, longitude: destination.longitude },
  ];

  return (
    <View style={ms.wrapper}>
      <MapErrorBoundary>
        <MapView
          testID="activeRide.map"
          style={ms.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
        >
          <Marker
            coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
            title={origin.locationName}
            pinColor={colors.primary}
          />
          <Marker
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            title={destination.locationName}
            pinColor={colors.error}
          />
          <Polyline
            coordinates={polylineCoords}
            strokeWidth={4}
            strokeColor={colors.primary}
          />
        </MapView>
      </MapErrorBoundary>
    </View>
  );
}

const ms = StyleSheet.create({
  wrapper: { width: "100%", height: 350 },
  map: { flex: 1 },
});
