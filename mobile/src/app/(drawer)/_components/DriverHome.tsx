import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable, Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation, useRouter } from "expo-router";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { Menu, Locate, MapPin } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { useAuthContext } from "@/providers/AuthProvider";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTheme } from "@/providers/ThemeProvider";
import { useToggleRideRequestAvailability } from "@/hooks/useUser";
import {
  useOpenRideRequestsForDrivers,
  useAcceptRideRequest,
  type RideRequest,
} from "@/hooks/useRideRequests";
import { useMyVehicles } from "@/hooks/useVehicles";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { ensureLocationPermission } from "@/lib/permissions";
import { mapStyleDark } from "@/lib/mapStyleDark";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { STORAGE_KEYS } from "@/lib/constants";
import { formatRideRoute } from "@/utils/formatRideRoute";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { FocusedRideRequestSheet } from "./FocusedRideRequestSheet";
import { CounterOfferSheet, type CounterOfferSheetRef } from "@/components/CounterOfferSheet";
import { VehiclePickerSheet } from "./VehiclePickerSheet";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HARARE_REGION = {
  latitude: -17.8292,
  longitude: 31.0522,
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

export function DriverHome() {
  const { user } = useAuthContext();
  const requireAuth = useRequireAuth();
  const { colors, resolved } = useTheme();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const toggleAvailability = useToggleRideRequestAvailability();
  const acceptMutation = useAcceptRideRequest();
  const isOnline = !!user?.isAvailableForRideRequest;
  const { data: openRequests = [] } = useOpenRideRequestsForDrivers(isOnline);
  const { data: vehicles = [] } = useMyVehicles();
  const { location, refetch: refetchLocation } = useCurrentLocation();
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);

  const [focusedRequestId, setFocusedRequestId] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  // dismissed is stored as state so mutations trigger re-renders (backlogIds recomputes).
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [backlogSheetOpen, setBacklogSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [counterState, setCounterState] = useState<{
    rideRequestId: number;
    proposedFare: number;
    vehicleId: number;
  } | null>(null);
  const seenFirstPollRef = useRef<boolean>(false);
  const counterSheetRef = useRef<CounterOfferSheetRef>(null);

  // Permission check on mount — mirrors PassengerHome so the "open settings"
  // banner can render when the driver has previously denied location.
  useEffect(() => {
    ensureLocationPermission().then((res) => setLocationGranted(res === "granted"));
  }, []);

  // Animate to the driver's location as soon as GPS resolves.
  useEffect(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        800,
      );
    }
  }, [location]);

  // Reset when the driver toggles online/offline so a fresh online session
  // starts from a clean slate.
  useEffect(() => {
    if (!isOnline) {
      setDismissed(new Set());
      seenFirstPollRef.current = false;
      setFocusedRequestId(null);
    }
  }, [isOnline]);

  // Selection: on first poll, dump everything into dismissed (treat as backlog).
  // On subsequent polls, the first not-dismissed, not-already-focused id wins.
  useEffect(() => {
    if (!isOnline) return;
    if (!seenFirstPollRef.current) {
      seenFirstPollRef.current = true;
      if (openRequests.length > 0) {
        setDismissed(new Set(openRequests.map((r) => r.id)));
      }
      return;
    }
    if (focusedRequestId != null) {
      const stillThere = openRequests.some((r) => r.id === focusedRequestId);
      if (!stillThere) setFocusedRequestId(null);
      return;
    }
    const next = openRequests.find((r) => !dismissed.has(r.id));
    if (next) setFocusedRequestId(next.id);
  }, [openRequests, isOnline, focusedRequestId, dismissed]);

  // Reset and tick the countdown while a request is focused.
  useEffect(() => {
    if (focusedRequestId == null) {
      setSecondsRemaining(20);
      return;
    }
    setSecondsRemaining(20);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [focusedRequestId]);

  // Expiry: when the counter hits 0, dismiss the focused request to backlog.
  useEffect(() => {
    if (focusedRequestId == null || secondsRemaining > 0) return;
    const expiredId = focusedRequestId;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(expiredId);
      return next;
    });
    setFocusedRequestId(null);
  }, [secondsRemaining, focusedRequestId]);

  // Default vehicle: persisted choice, falling back to first vehicle. We MUST
  // also write the fallback back to AsyncStorage — the heartbeat hook reads
  // CURRENT_VEHICLE_ID straight from storage, and the backend nearby query
  // filters out presence rows with a null vehicle id. Without this write a
  // fresh driver appears nowhere on the passenger map until they manually
  // change vehicle.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.CURRENT_VEHICLE_ID).then((stored) => {
      const parsed = stored ? Number(stored) : NaN;
      if (Number.isFinite(parsed) && vehicles.some((v) => v.id === parsed)) {
        setVehicleId(parsed);
      } else if (vehicles.length > 0) {
        const defaultId = vehicles[0].id;
        setVehicleId(defaultId);
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_VEHICLE_ID, String(defaultId));
      }
    });
  }, [vehicles]);

  const focusedRequest = useMemo<RideRequest | null>(
    () => openRequests.find((r) => r.id === focusedRequestId) ?? null,
    [openRequests, focusedRequestId],
  );
  const focusedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );

  const backlogIds = useMemo(
    () =>
      openRequests
        .filter((r) => dismissed.has(r.id) && r.id !== focusedRequestId)
        .map((r) => r.id),
    [openRequests, focusedRequestId, dismissed],
  );

  const backlogSet = useMemo(() => new Set(backlogIds), [backlogIds]);

  const initialRegion = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : HARARE_REGION;

  async function handleToggle(next: boolean) {
    try {
      await toggleAvailability.mutateAsync(next);
    } catch {
      // Surface via existing API error handling.
    }
  }

  function handleSkip() {
    if (focusedRequestId == null) return;
    const skippedId = focusedRequestId;
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(skippedId);
      return next;
    });
    setFocusedRequestId(null);
  }

  function handleCounter() {
    if (focusedRequest == null || vehicleId == null) return;
    const fare = focusedRequest.proposedFare ? parseFloat(focusedRequest.proposedFare) : 0;
    const focusedId = focusedRequest.id;
    setCounterState({ rideRequestId: focusedId, proposedFare: fare, vehicleId });
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(focusedId);
      return next;
    });
    setFocusedRequestId(null);
    setTimeout(() => counterSheetRef.current?.open(), 250);
  }

  async function handleAccept() {
    if (focusedRequestId == null || vehicleId == null) return;
    const acceptedId = focusedRequestId;
    try {
      const res = await acceptMutation.mutateAsync({
        requestId: acceptedId,
        vehicleId,
      });
      const rideId = (res as any)?.data?.ride?.id;
      setFocusedRequestId(null);
      if (rideId) router.replace(`/ride/${rideId}` as any);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409 || status === 410) {
        setDismissed((prev) => {
          const next = new Set(prev);
          next.add(acceptedId);
          return next;
        });
        setFocusedRequestId(null);
      }
    }
  }

  async function handlePickVehicle(id: number) {
    setVehicleId(id);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_VEHICLE_ID, String(id));
    setPickerOpen(false);
  }

  function centerOnUser() {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500,
      );
    }
    refetchLocation();
  }

  const pickerVehicles = vehicles.map((v) => ({
    id: v.id,
    make: v.make,
    model: v.model,
    plateNumber: v.plateNumber,
    capacity: v.capacity,
  }));

  const s = makeStyles(colors);

  return (
    <View style={s.container} testID="driverHome.screen">
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />

      <MapErrorBoundary>
        <MapView
          ref={mapRef}
          testID="driverHome.map"
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          mapPadding={{ top: 0, right: 0, bottom: 120, left: 0 }}
          customMapStyle={resolved === "dark" ? mapStyleDark : undefined}
        >
          {location && (
            <Marker
              testID="driverHome.currentLocationPin"
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
          testID="driverHome.locationBanner"
          style={[s.banner, { backgroundColor: colors.warning }]}
        >
          <Text style={[s.bannerText, { color: colors.text.inverse }]}>
            Location is off. Drivers can't go online without it.
          </Text>
          <Pressable onPress={() => Linking.openSettings()}>
            <Text style={[s.bannerLink, { color: colors.text.inverse }]}>Open settings</Text>
          </Pressable>
        </View>
      ) : null}

      <TouchableOpacity
        testID="driverHome.menuButton"
        style={[s.hamburgerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.openDrawer()}
        activeOpacity={0.8}
      >
        <Menu size={22} color={colors.text.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        testID="driverHome.locateButton"
        style={[s.gpsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={centerOnUser}
        activeOpacity={0.8}
      >
        <Locate size={20} color={colors.text.primary} />
      </TouchableOpacity>

      {isOnline && focusedRequestId == null && (
        <Text style={s.idleCaption}>Looking for requests…</Text>
      )}

      {isOnline && backlogIds.length > 0 && (
        <TouchableOpacity
          testID="driverHome.backlogChip"
          style={s.chip}
          activeOpacity={0.85}
          onPress={() => setBacklogSheetOpen(true)}
        >
          <Text style={s.chipText}>{backlogIds.length} requests waiting</Text>
        </TouchableOpacity>
      )}

      <View style={s.bottomBar}>
        {!isOnline ? (
          <>
            <Button
              testID="driverHome.goOnline"
              title="GO ONLINE"
              onPress={() =>
                requireAuth(() => handleToggle(true), {
                  reason: "Sign in to go online",
                })
              }
              loading={toggleAvailability.isPending}
              disabled={vehicles.length === 0}
            />
            {vehicles.length === 0 && (
              <Text style={s.cta}>Add a vehicle to go online</Text>
            )}
          </>
        ) : (
          <Button
            testID="driverHome.goOffline"
            title="GO OFFLINE"
            variant="secondary"
            onPress={() =>
              requireAuth(() => handleToggle(false), {
                reason: "Sign in to go online",
              })
            }
            loading={toggleAvailability.isPending}
          />
        )}
      </View>

      {focusedRequest && (
        <FocusedRideRequestSheet
          request={focusedRequest}
          vehicleLabel={focusedVehicle ? `${focusedVehicle.make} ${focusedVehicle.model}` : null}
          secondsRemaining={secondsRemaining}
          onChangeVehicle={() => setPickerOpen(true)}
          onAccept={() =>
            requireAuth(handleAccept, {
              reason: "Sign in to accept ride requests",
            })
          }
          onCounter={() =>
            requireAuth(handleCounter, {
              reason: "Sign in to submit a counter-offer",
            })
          }
          onSkip={handleSkip}
          acceptDisabled={!vehicleId}
          acceptPending={acceptMutation.isPending}
        />
      )}

      <Modal
        visible={backlogSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBacklogSheetOpen(false)}
      >
        <View style={s.backlogBackdrop} testID="driverHome.backlogSheet">
          <View style={s.backlogPanel}>
            <Text style={s.backlogTitle}>Backlog</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {openRequests
                .filter((r) => backlogSet.has(r.id))
                .map((r) => {
                  const route = formatRideRoute(r);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      testID={`driverHome.backlogRow.${r.id}`}
                      style={s.backlogRow}
                      onPress={() => {
                        setDismissed((prev) => {
                          const next = new Set(prev);
                          next.delete(r.id);
                          return next;
                        });
                        setFocusedRequestId(r.id);
                        setBacklogSheetOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={s.backlogRowText}>
                        {route.from} → {route.to}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            <Button title="Close" variant="secondary" onPress={() => setBacklogSheetOpen(false)} />
          </View>
        </View>
      </Modal>

      {counterState && (
        <CounterOfferSheet
          ref={counterSheetRef}
          rideRequestId={counterState.rideRequestId}
          proposedFare={counterState.proposedFare}
          vehicleId={counterState.vehicleId}
        />
      )}

      <VehiclePickerSheet
        visible={pickerOpen}
        vehicles={pickerVehicles}
        title="Change vehicle"
        onPick={handlePickVehicle}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  currentPin: { alignItems: "center", justifyContent: "center" },
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
  bannerText: { flex: 1, fontSize: fontSize.sm, marginRight: spacing.md },
  bannerLink: { fontWeight: "700", fontSize: fontSize.sm },
  hamburgerBtn: {
    position: "absolute", top: 56, left: 16, width: 44, height: 44,
    borderRadius: 22, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  gpsBtn: {
    position: "absolute", bottom: 130, right: 16, width: 44, height: 44,
    borderRadius: 22, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  idleCaption: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
    textAlign: "center",
    color: colors.text.secondary,
    fontSize: fontSize.sm,
  },
  chip: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  chipText: { color: colors.text.inverse, fontWeight: "700", fontSize: fontSize.sm },
  bottomBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    gap: spacing.sm,
  },
  cta: { color: colors.text.secondary, textAlign: "center", fontSize: fontSize.xs },
  backlogBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  backlogPanel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    maxHeight: "70%",
  },
  backlogTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  backlogRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backlogRowText: { fontSize: fontSize.md, color: colors.text.primary },
});
