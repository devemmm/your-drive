import React, { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  Hand, Users, Minus, Plus, Search,
} from "lucide-react-native";
import { DateTimeField } from "@/components/DateTimeField";
import { LocationPickerCard } from "@/components/LocationPickerCard";
import { usePicker } from "@/providers/PickerProvider";
import { useCreateRideRequest } from "@/hooks/useRideRequests";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useFareEstimate, haversineKm, durationMinFromKm } from "@/hooks/useFareEstimate";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { formatCurrency, handleApiError } from "@/lib/utils";
import { ensurePushPermission } from "@/lib/permissions";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import { SheetHandle } from "@/components/ui/SheetHandle";
import { Button } from "@/components/ui/Button";
import { OperatorListView } from "@/components/bus/OperatorListView";
import { useBusOperators } from "@/hooks/useBus";
import { HomeServiceRow, type VehicleType } from "@/components/HomeServiceRow";

type Mode = "request" | "find";

const MAX_PASSENGERS = 8;

interface HomeBottomSheetProps {
  onSheetChange?: (index: number) => void;
}

const HomeBottomSheet = forwardRef<BottomSheet, HomeBottomSheetProps>(
  ({ onSheetChange }, ref) => {
    const router = useRouter();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const bs = useMemo(() => makeStyles(colors), [colors]);
    const createRequest = useCreateRideRequest();
    const requireAuth = useRequireAuth();
    const { location: currentLocation, address: currentAddress } = useCurrentLocation();

    const { data: busOperators = [] } = useBusOperators();

    const { from, to, confirm: confirmPicker } = usePicker();

    const [vehicleType, setVehicleType] = useState<VehicleType>("CAR");
    const [mode, setMode] = useState<Mode>("request");
    const [proposedFare, setProposedFare] = useState("");
    const [fareEdited, setFareEdited] = useState(false);

    const estimateInput = useMemo(() => {
      const toLat = (to as { latitude?: number } | undefined)?.latitude;
      const toLng = (to as { longitude?: number } | undefined)?.longitude;
      if (!currentLocation || toLat == null || toLng == null) return null;
      const distanceKm = haversineKm(
        { lat: currentLocation.latitude, lng: currentLocation.longitude },
        { lat: toLat, lng: toLng },
      );
      if (distanceKm <= 0) return null;
      return {
        vehicleCategory: vehicleType === "BUS" ? "CAR" : vehicleType,
        rideType: "D2D" as const,
        distanceKm,
        durationMin: durationMinFromKm(distanceKm),
      };
    }, [currentLocation, to, vehicleType]);

    const { data: fareEstimate } = useFareEstimate(estimateInput);

    useEffect(() => {
      if (fareEdited) return;
      const suggested = fareEstimate?.data?.suggestedFare;
      if (suggested) setProposedFare(String(Math.round(suggested)));
    }, [fareEstimate, fareEdited]);

    function handleFareChange(next: string) {
      setFareEdited(true);
      setProposedFare(next);
    }
    const [passengers, setPassengers] = useState(1);
    const [date, setDate] = useState(() => {
      // Default to 30 minutes from now so the user picks a future time without
      // immediately tripping the server's "must be in the future" check.
      const d = new Date();
      d.setMinutes(d.getMinutes() + 30, 0, 0);
      return d;
    });

    const snapPoints = useMemo(() => ["22%", "85%"], []);

    const handleSheetChange = useCallback(
      (index: number) => {
        onSheetChange?.(index);
      },
      [onSheetChange]
    );

    async function handleRequestRide() {
      if (!currentLocation) {
        Alert.alert("Location unavailable", "Please enable location services to request a ride.");
        return;
      }
      if (!to?.city) {
        Alert.alert("Missing destination", "Please select where you want to go.");
        return;
      }
      const fare = parseFloat(proposedFare);
      if (!fare || fare <= 0) {
        Alert.alert("Proposed fare", "Enter the amount you're offering to pay.");
        return;
      }
      try {
        const payload: any = {
          origin: {
            city: from.city || "Current Location",
            province: from.city || "Unknown",
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            locationName: from.label || currentAddress || "Current Location",
            address: from.label || currentAddress || "Current Location",
          },
          destination: {
            city: to.city,
            province: to.city,
            latitude: (to as any).latitude,
            longitude: (to as any).longitude,
            locationName: to.label,
            address: to.label,
          },
          seats: vehicleType === "MOTORBIKE" ? 1 : passengers,
          rideType: "P2P",
          proposedFare: fare,
          vehicleCategory: vehicleType,
        };
        const response = await createRequest.mutateAsync(payload);
        // Just-in-time push permission request after first successful ride-request submit.
        // void: don't block success flow on user's permission decision;
        // ensurePushPermission stores the "asked before" flag to avoid re-prompting.
        void ensurePushPermission();
        const requestId = (response as any)?.data?.id;
        if (requestId) {
          router.push(`/ride-requests/${requestId}` as any);
        }
      } catch (error: any) {
        handleApiError(error, t);
      }
    }

    function handleFindRides() {
      if (!to?.city) {
        Alert.alert("Missing destination", "Pick a destination first.");
        return;
      }
      if (!from?.city) {
        Alert.alert("Missing pickup", "Pick your pickup location.");
        return;
      }
      confirmPicker();
      router.push({
        pathname: "/ride/search-results",
        params: {
          originCity: from.city,
          destinationCity: to.city,
          // `departureTime` (epoch ms) is the field the server validator
          // accepts; it day-buckets the filter so the time portion narrows
          // to the same calendar day. We also pass the ISO string for the
          // results screen header.
          departureTime: String(date.getTime()),
          departureIso: date.toISOString(),
          passengers: passengers.toString(),
          vehicleCategory: vehicleType,
        },
      });
    }

    return (
      <>
        <BottomSheet
          ref={ref}
          index={1}
          snapPoints={snapPoints}
          onChange={handleSheetChange}
          backgroundStyle={bs.background}
          handleComponent={() => <SheetHandle />}
          enablePanDownToClose={false}
          accessible={false}
        >
          <BottomSheetScrollView
            contentContainerStyle={bs.content}
            showsVerticalScrollIndicator={false}
          >
            <View testID="home.bottomSheet" style={bs.contentInner}>
            {/* From/To picker — lives at the top of the sheet so users can set
                pickup and destination without leaving the search controls. */}
            <LocationPickerCard />

            {/* Vehicle type tabs + Rent a Car / Hire a Driver service entries */}
            <HomeServiceRow
              vehicleType={vehicleType}
              onSelectVehicle={(type) => {
                setVehicleType(type);
                if (type === "MOTORBIKE") setPassengers(1);
              }}
              onOpenRental={() => router.push("/rental")}
              onOpenChauffeur={() => router.push("/chauffeur")}
            />

            {vehicleType === "BUS" ? (
              <OperatorListView
                operators={busOperators}
                onSelect={(operatorId) => {
                  const op = busOperators.find((o) => o.id === operatorId);
                  router.push({
                    pathname: "/bus/[operatorId]/routes",
                    params: { operatorId: String(operatorId), operatorName: op?.name ?? "" },
                  });
                }}
              />
            ) : (
              <>
                {/* Mode toggle */}
                <View style={bs.modeToggle}>
                  <TouchableOpacity
                    testID="home.modeBtn.request"
                    style={[bs.modeBtn, mode === "request" && bs.modeBtnActive]}
                    onPress={() => setMode("request")}
                    activeOpacity={0.8}
                  >
                    <Hand size={14} color={mode === "request" ? colors.text.inverse : colors.text.secondary} />
                    <Text style={[bs.modeText, mode === "request" && bs.modeTextActive]}>
                      Request a Ride
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="home.modeBtn.find"
                    style={[bs.modeBtn, mode === "find" && bs.modeBtnActive]}
                    onPress={() => setMode("find")}
                    activeOpacity={0.8}
                  >
                    <Search size={14} color={mode === "find" ? colors.text.inverse : colors.text.secondary} />
                    <Text style={[bs.modeText, mode === "find" && bs.modeTextActive]}>
                      Find a Ride
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Contextual fields */}
                {(() => {
                  const showPax = mode !== "request" || vehicleType !== "MOTORBIKE";
                  const renderPaxField = (style: any) =>
                    showPax ? (
                      <View testID="home.paxField" style={style}>
                        <TouchableOpacity
                          testID="home.paxDecrement"
                          onPress={() => setPassengers((p) => Math.max(1, p - 1))}
                          disabled={passengers <= 1}
                          activeOpacity={0.7}
                        >
                          <Minus size={14} color={passengers <= 1 ? colors.text.tertiary : colors.primary} />
                        </TouchableOpacity>
                        <View style={bs.paxCenter}>
                          <Users size={14} color={colors.text.secondary} />
                          <Text style={bs.paxCount}>{passengers}</Text>
                        </View>
                        <TouchableOpacity
                          testID="home.paxIncrement"
                          onPress={() => setPassengers((p) => Math.min(MAX_PASSENGERS, p + 1))}
                          disabled={passengers >= MAX_PASSENGERS}
                          activeOpacity={0.7}
                        >
                          <Plus size={14} color={passengers >= MAX_PASSENGERS ? colors.text.tertiary : colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : null;

                  if (mode === "request") {
                    return (
                      <View style={bs.fieldsRow}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={bs.fareField}>
                            <Text style={bs.farePrefix}>{fareEstimate?.data?.currency ?? "RWF"}</Text>
                            <TextInput
                              style={bs.fareInput}
                              placeholder={
                                fareEstimate?.data
                                  ? `Suggested ${Math.round(fareEstimate.data.suggestedFare).toLocaleString()}`
                                  : "Your offer (e.g. 2500)"
                              }
                              placeholderTextColor={colors.text.tertiary}
                              keyboardType="numeric"
                              value={proposedFare}
                              onChangeText={handleFareChange}
                            />
                          </View>
                          {fareEstimate?.data && fareEdited ? (
                            <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                              Suggested: {formatCurrency(Math.round(fareEstimate.data.suggestedFare * 100), fareEstimate.data.currency)} · ~{fareEstimate.data.distanceKm.toFixed(1)} km
                            </Text>
                          ) : null}
                        </View>
                        {renderPaxField(bs.paxField)}
                      </View>
                    );
                  }

                  return (
                    <View style={bs.fieldsColumn}>
                      <View style={bs.dateTimeRow}>
                        <View style={bs.dateTimeCol}>
                          <DateTimeField
                            testID="home.dateField"
                            mode="date"
                            value={date}
                            minimumDate={new Date()}
                            onChange={(d) => {
                              // Preserve current time-of-day when the date changes
                              const next = new Date(d);
                              next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                              setDate(next);
                            }}
                          />
                        </View>
                        <View style={bs.dateTimeCol}>
                          <DateTimeField
                            testID="home.timeField"
                            mode="time"
                            value={date}
                            onChange={(t) => {
                              const next = new Date(date);
                              next.setHours(t.getHours(), t.getMinutes(), 0, 0);
                              setDate(next);
                            }}
                          />
                        </View>
                      </View>
                      {renderPaxField(bs.paxFieldFull)}
                    </View>
                  );
                })()}

                {/* Action button */}
                <Button
                  testID="home.searchRidesButton"
                  title={mode === "request" ? "Request Ride" : "Search Rides"}
                  onPress={
                    mode === "request"
                      ? () =>
                          requireAuth(() => void handleRequestRide(), {
                            reason: "Sign in to book your ride",
                          })
                      : handleFindRides
                  }
                  loading={createRequest.isPending}
                />
              </>
            )}
            </View>
          </BottomSheetScrollView>
        </BottomSheet>

      </>
    );
  }
);

HomeBottomSheet.displayName = "HomeBottomSheet";
export { HomeBottomSheet };

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  background: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  content: { padding: spacing.xl },
  contentInner: { gap: spacing.lg },
  modeToggle: {
    flexDirection: "row", backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: 4, gap: 4,
  },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: borderRadius.md,
  },
  modeBtnActive: { backgroundColor: colors.primary },
  modeText: { fontSize: fontSize.xs, fontWeight: "600", color: colors.text.secondary },
  modeTextActive: { color: colors.text.inverse },
  fieldsRow: { flexDirection: "row", gap: spacing.sm },
  fieldsColumn: { gap: spacing.lg },
  fareField: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, height: 48, borderWidth: 1, borderColor: colors.border,
  },
  farePrefix: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  fareInput: { flex: 1, fontSize: fontSize.sm, color: colors.text.primary },
  paxField: {
    width: 110, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, height: 48, borderWidth: 1, borderColor: colors.border,
  },
  paxFieldFull: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, height: 48, borderWidth: 1, borderColor: colors.border,
  },
  paxCenter: { flexDirection: "row", alignItems: "center", gap: 4 },
  paxCount: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.primary },
  dateTimeRow: { flexDirection: "row", gap: spacing.sm },
  dateTimeCol: { flex: 1 },
});
