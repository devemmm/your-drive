import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuthContext } from "@/providers/AuthProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { DateTimeField } from "@/components/DateTimeField";
import { useMyVehicles } from "@/hooks/useVehicles";
import { useCreateRide, usePublishRide } from "@/hooks/useRides";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useFareEstimate, haversineKm, durationMinFromKm } from "@/hooks/useFareEstimate";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { LocationPicker } from "@/components/LocationPicker";
import { ExtractedLocation } from "@/hooks/usePlaces";
import { Vehicle } from "@/lib/types";
import { MapPin, ChevronDown, X } from "lucide-react-native";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useOpenDrawer } from "@/providers/DrawerControlProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { formatCurrency, handleApiError } from "@/lib/utils";
import { ensurePushPermission } from "@/lib/permissions";

const STEPS = ["Route", "Vehicle", "Preferences", "Pricing", "Review"];

interface FormData {
  originLocation: ExtractedLocation | null;
  destinationLocation: ExtractedLocation | null;
  departureDate: string;
  departureTime: string;
  vehicleId: string;
  availableSeats: string;
  airConditioning: boolean;
  smoking: boolean;
  contribution: string;
  bookingType: "AUTOMATIC" | "MANUAL";
  contributionCollectionMethod: "DIRECT" | "VIA_PLATFORM";
}

const initialForm: FormData = {
  originLocation: null,
  destinationLocation: null,
  departureDate: "",
  departureTime: "",
  vehicleId: "",
  availableSeats: "1",
  airConditioning: false,
  smoking: false,
  contribution: "",
  bookingType: "AUTOMATIC",
  contributionCollectionMethod: "DIRECT",
};

export default function PostRideScreen() {
  const router = useRouter();
  const openDrawer = useOpenDrawer();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const ps = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [priceEdited, setPriceEdited] = useState(false);

  const { data: vehicles, isLoading: vehiclesLoading } = useMyVehicles();
  const createRide = useCreateRide();
  const publishRide = usePublishRide();
  const requireAuth = useRequireAuth();

  const distanceKm = useMemo(() => {
    if (!form.originLocation || !form.destinationLocation) return 0;
    return haversineKm(
      { lat: form.originLocation.latitude, lng: form.originLocation.longitude },
      { lat: form.destinationLocation.latitude, lng: form.destinationLocation.longitude }
    );
  }, [form.originLocation, form.destinationLocation]);

  const durationMin = useMemo(() => durationMinFromKm(distanceKm), [distanceKm]);

  const selectedVehicle = useMemo(
    () => (vehicles ?? []).find((v) => String(v.id) === form.vehicleId),
    [vehicles, form.vehicleId]
  );

  const fareInput = useMemo(() => {
    if (distanceKm <= 0 || !selectedVehicle) return null;
    return {
      vehicleCategory: selectedVehicle.category as "CAR" | "MOTORBIKE" | "BUS",
      rideType: "P2P" as const,
      distanceKm,
      durationMin,
    };
  }, [distanceKm, durationMin, selectedVehicle]);

  const { data: fareData } = useFareEstimate(fareInput);
  const suggestedFare = fareData?.data?.suggestedFare ?? null;

  // Redirect to driver onboarding if not onboarded
  useEffect(() => {
    if (user && !user.isDriverOnboarded) {
      router.replace("/onboarding/driver?redirect=post-ride");
    }
  }, [user, router]);

  // Auto-fill contribution from fare suggestion (unless user has already typed)
  useEffect(() => {
    if (!priceEdited && suggestedFare != null) {
      setForm((prev) => ({ ...prev, contribution: String(suggestedFare) }));
    }
  }, [suggestedFare, priceEdited]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    // Per-step validation
    if (step === 0) {
      if (!form.originLocation || !form.destinationLocation) {
        Alert.alert("Missing fields", "Please select both pickup and destination cities.");
        return;
      }
      if (!form.departureDate || !form.departureTime) {
        Alert.alert("Missing fields", "Please select departure date and time.");
        return;
      }
    } else if (step === 1) {
      if (!form.vehicleId) {
        Alert.alert("No vehicle selected", "Please select a vehicle to continue.");
        return;
      }
      const seats = parseInt(form.availableSeats);
      if (!seats || seats < 1) {
        Alert.alert("Invalid seats", "Please enter a valid number of available seats.");
        return;
      }
    } else if (step === 3) {
      const price = parseFloat(form.contribution);
      if (isNaN(price) || price < 0) {
        Alert.alert("Invalid price", "Please enter a valid contribution amount.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    if (step === 0) {
      openDrawer();
    } else {
      setStep((s) => s - 1);
    }
  }

  async function handlePublish() {
    try {
      if (!form.originLocation || !form.destinationLocation) {
        Alert.alert("Missing fields", "Please select both pickup and destination cities.");
        return;
      }
      if (!form.departureDate || !form.departureTime) {
        Alert.alert("Missing fields", "Please select departure date and time.");
        return;
      }
      if (!form.vehicleId) {
        Alert.alert("Missing vehicle", "Please select a vehicle.");
        return;
      }

      // Combine date + time into a single ISO timestamp (milliseconds)
      const [hh, mm] = form.departureTime.split(":").map(Number);
      const departure = new Date(form.departureDate);
      departure.setHours(hh || 0, mm || 0, 0, 0);
      let departureMs = departure.getTime();
      // Buffer: server rejects a departure time in the past. If the wizard
      // was opened with defaults and the user lingered, the time can drift
      // behind `Date.now()`. Push it ~30 min into the future in that case.
      if (departureMs <= Date.now()) {
        departureMs = Date.now() + 30 * 60 * 1000;
      }
      const arrivalMs = departureMs + 2 * 60 * 60 * 1000; // default +2 hours

      const payload = {
        departure: {
          region: form.originLocation.region,
          city: form.originLocation.city,
          locationName: form.originLocation.locationName,
          latitude: form.originLocation.latitude,
          longitude: form.originLocation.longitude,
          address: form.originLocation.address,
        },
        destination: {
          region: form.destinationLocation.region,
          city: form.destinationLocation.city,
          locationName: form.destinationLocation.locationName,
          latitude: form.destinationLocation.latitude,
          longitude: form.destinationLocation.longitude,
          address: form.destinationLocation.address,
        },
        departureTime: departureMs,
        estimatedArrivalTime: arrivalMs,
        availableSeats: parseInt(form.availableSeats) || 1,
        contribution: parseFloat(form.contribution) || 0,
        vehicleId: parseInt(form.vehicleId),
        bookingType: form.bookingType,
        contributionCollectionMethod: form.contributionCollectionMethod,
        preferences: {
          airConditioning: form.airConditioning,
          smoking: form.smoking,
        },
      };

      const result = await createRide.mutateAsync(payload);
      const rideId = (result as any)?.data?.id;
      if (rideId) {
        await publishRide.mutateAsync(rideId);
      }
      // Just-in-time push permission request after first successful publish.
      // void: don't block success flow on user's permission decision;
      // ensurePushPermission stores the "asked before" flag to avoid re-prompting.
      void ensurePushPermission();
      Alert.alert("Success", "Your ride has been published!", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error: any) {
      handleApiError(error, t);
    }
  }

  const isPublishing = createRide.isPending || publishRide.isPending;

  return (
    <SafeAreaView style={ps.container}>
      {/* ScreenHeader flips leading icon: ☰ on step 0 (root of drawer stack),
          ← on later steps. handleBack still decides what each tap does. */}
      <ScreenHeader
        title="Post a Ride"
        variant={step === 0 ? "root" : "child"}
        onBack={handleBack}
      />

      {/* Progress bar */}
      <View style={ps.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[ps.progressSegment, i <= step && ps.progressActive]} />
        ))}
      </View>
      <Text style={ps.stepLabel}>{STEPS[step]} ({step + 1}/{STEPS.length})</Text>

      <ScrollView contentContainerStyle={ps.content}>
        {step === 0 && (
          <View testID="postRide.step.0">
            <RouteStep form={form} update={update} colors={colors} styles={ps} />
          </View>
        )}
        {step === 1 && (
          <View testID="postRide.step.1">
            <VehicleStep form={form} update={update} vehicles={vehicles ?? []} isLoading={vehiclesLoading} colors={colors} styles={ps} />
          </View>
        )}
        {step === 2 && (
          <View testID="postRide.step.2">
            <PreferencesStep form={form} update={update} colors={colors} styles={ps} />
          </View>
        )}
        {step === 3 && (
          <View testID="postRide.step.3">
            <PricingStep
              form={form}
              update={update}
              colors={colors}
              styles={ps}
              onPriceTouch={() => setPriceEdited(true)}
              suggested={suggestedFare}
              distanceKm={distanceKm}
              durationMin={durationMin}
            />
          </View>
        )}
        {step === 4 && (
          <View testID="postRide.step.4">
            <ReviewStep form={form} vehicles={vehicles ?? []} styles={ps} />
          </View>
        )}
      </ScrollView>

      <View style={ps.footer}>
        {step < STEPS.length - 1 ? (
          <Button title="Next" onPress={handleNext} testID="postRide.nextButton" />
        ) : (
          <Button
            title="Publish Ride"
            onPress={() =>
              requireAuth(() => void handlePublish(), {
                reason: "Sign in to post a ride",
              })
            }
            loading={isPublishing}
            testID="postRide.publishButton"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* Step components */

function RouteStep({ form, update, colors, styles: ps }: { form: FormData; update: <K extends keyof FormData>(key: K, value: FormData[K]) => void; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  const [departureDate, setDepartureDate] = useState(form.departureDate ? new Date(form.departureDate) : new Date());
  const [departureTime, setDepartureTime] = useState(form.departureTime ? new Date(`1970-01-01T${form.departureTime}:00`) : new Date());
  const [pickerOpen, setPickerOpen] = useState<"origin" | "destination" | null>(null);

  // Seed form state with initial date/time values so they're not empty when user taps Next without opening the picker
  useEffect(() => {
    if (!form.departureDate) update("departureDate", departureDate.toISOString());
    if (!form.departureTime) {
      const hh = String(departureTime.getHours()).padStart(2, "0");
      const mm = String(departureTime.getMinutes()).padStart(2, "0");
      update("departureTime", `${hh}:${mm}`);
    }
  }, []);

  return (
    <View style={ps.stepContent}>
      <Text style={ps.sectionTitle}>Where are you going?</Text>

      {/* Origin location picker */}
      <View style={ps.fieldWrapper}>
        <Text style={ps.fieldLabel}>From</Text>
        <TouchableOpacity
          testID="postRide.originField"
          style={ps.locationPickerBtn}
          onPress={() => setPickerOpen("origin")}
          activeOpacity={0.7}
        >
          <MapPin size={18} color={form.originLocation ? colors.primary : colors.text.tertiary} />
          <Text style={form.originLocation ? ps.locationPickerText : ps.locationPickerPlaceholder} numberOfLines={1}>
            {form.originLocation ? form.originLocation.city : "Select pickup city"}
          </Text>
          {form.originLocation ? (
            <TouchableOpacity
              onPress={() => update("originLocation", null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : (
            <ChevronDown size={16} color={colors.text.tertiary} />
          )}
        </TouchableOpacity>
        {form.originLocation && (
          <Text style={ps.locationSubText} numberOfLines={1}>{form.originLocation.address}</Text>
        )}
      </View>

      {/* Destination location picker */}
      <View style={ps.fieldWrapper}>
        <Text style={ps.fieldLabel}>To</Text>
        <TouchableOpacity
          testID="postRide.destinationField"
          style={ps.locationPickerBtn}
          onPress={() => setPickerOpen("destination")}
          activeOpacity={0.7}
        >
          <MapPin size={18} color={form.destinationLocation ? colors.error : colors.text.tertiary} />
          <Text style={form.destinationLocation ? ps.locationPickerText : ps.locationPickerPlaceholder} numberOfLines={1}>
            {form.destinationLocation ? form.destinationLocation.city : "Select destination city"}
          </Text>
          {form.destinationLocation ? (
            <TouchableOpacity
              onPress={() => update("destinationLocation", null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : (
            <ChevronDown size={16} color={colors.text.tertiary} />
          )}
        </TouchableOpacity>
        {form.destinationLocation && (
          <Text style={ps.locationSubText} numberOfLines={1}>{form.destinationLocation.address}</Text>
        )}
      </View>

      <DateTimeField
        testID="postRide.dateField"
        mode="date"
        label="Departure Date"
        value={departureDate}
        minimumDate={new Date()}
        onChange={(date) => {
          setDepartureDate(date);
          update("departureDate", date.toISOString());
        }}
      />

      <DateTimeField
        testID="postRide.timeField"
        mode="time"
        label="Departure Time"
        value={departureTime}
        onChange={(time) => {
          setDepartureTime(time);
          const hh = String(time.getHours()).padStart(2, "0");
          const mm = String(time.getMinutes()).padStart(2, "0");
          update("departureTime", `${hh}:${mm}`);
        }}
      />

      {/* Location pickers as modals */}
      <LocationPicker
        visible={pickerOpen === "origin"}
        onClose={() => setPickerOpen(null)}
        onSelect={(loc) => update("originLocation", loc)}
        mode="cities"
        title="Select pickup city"
      />
      <LocationPicker
        visible={pickerOpen === "destination"}
        onClose={() => setPickerOpen(null)}
        onSelect={(loc) => update("destinationLocation", loc)}
        mode="cities"
        title="Select destination city"
      />
    </View>
  );
}

function VehicleStep({ form, update, vehicles, isLoading, colors, styles: ps }: { form: FormData; update: <K extends keyof FormData>(key: K, value: FormData[K]) => void; vehicles: Vehicle[]; isLoading: boolean; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  if (isLoading) return <LoadingIndicator />;
  return (
    <View style={ps.stepContent}>
      <Text style={ps.sectionTitle}>Select your vehicle</Text>
      {vehicles.length === 0 ? (
        <Text style={ps.emptyText}>No vehicles found. Add a vehicle first.</Text>
      ) : (
        vehicles.map((v) => (
          <TouchableOpacity key={v.id} testID={`postRide.vehicleCard.${v.id}`} onPress={() => update("vehicleId", String(v.id))}>
            <Card style={form.vehicleId === String(v.id) ? { ...ps.vehicleCard, ...ps.vehicleCardSelected } : ps.vehicleCard}>
              <Text style={ps.vehicleName}>{v.make} {v.model} ({v.year})</Text>
              <Text style={ps.vehicleMeta}>{v.color} · {v.plateNumber} · {v.capacity} seats</Text>
            </Card>
          </TouchableOpacity>
        ))
      )}
      <Field
        label="Available Seats"
        value={form.availableSeats}
        onChangeText={(v) => update("availableSeats", v)}
        placeholder="e.g. 3"
        keyboardType="numeric"
        colors={colors}
        styles={ps}
        testID="postRide.seatsInput"
      />
    </View>
  );
}

function PreferencesStep({ form, update, colors, styles: ps }: { form: FormData; update: <K extends keyof FormData>(key: K, value: FormData[K]) => void; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={ps.stepContent}>
      <Text style={ps.sectionTitle}>Ride Preferences</Text>
      <ToggleRow label="Air Conditioning" value={form.airConditioning} onToggle={(v) => update("airConditioning", v)} colors={colors} styles={ps} testID="postRide.acToggle" />
      <ToggleRow label="Smoking Allowed" value={form.smoking} onToggle={(v) => update("smoking", v)} colors={colors} styles={ps} testID="postRide.smokingToggle" />
    </View>
  );
}

function PricingStep({
  form,
  update,
  colors,
  styles: ps,
  onPriceTouch,
  suggested,
  distanceKm,
  durationMin,
}: {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  onPriceTouch: () => void;
  suggested: number | null;
  distanceKm: number;
  durationMin: number;
}) {
  return (
    <View style={ps.stepContent}>
      <Text style={ps.sectionTitle}>Pricing & Booking</Text>
      <Field
        label="Contribution per Seat (RWF)"
        value={form.contribution}
        onChangeText={(v) => {
          onPriceTouch();
          update("contribution", v);
        }}
        placeholder="e.g. 5000"
        keyboardType="numeric"
        colors={colors}
        styles={ps}
        testID="postRide.contributionInput"
      />
      {suggested != null && distanceKm > 0 && (
        <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>
          Suggested: {formatCurrency(Math.round(suggested * 100))} based on {distanceKm.toFixed(1)} km · {durationMin} min
        </Text>
      )}

      <Text style={ps.fieldLabel}>Booking Type</Text>
      <View style={ps.bookingTypeRow}>
        {(["AUTOMATIC", "MANUAL"] as const).map((type) => (
          <TouchableOpacity key={type} testID={`postRide.bookingType.${type}`} style={[ps.bookingTypeBtn, form.bookingType === type && ps.bookingTypeBtnActive]} onPress={() => update("bookingType", type)}>
            <Text style={[ps.bookingTypeBtnText, form.bookingType === type && ps.bookingTypeBtnTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TODO(payments): Add payment method picker once a Rwanda-supported
          provider (MTN MoMo, Airtel Money, Flutterwave) is integrated. For now
          all rides are collected in cash directly by the driver. */}
      <Text style={ps.fieldLabel}>Payment</Text>
      <View style={ps.paymentNote}>
        <Text style={ps.paymentNoteTitle}>Cash on trip</Text>
        <Text style={ps.paymentNoteDesc}>
          Passengers pay you directly in cash when they board. In-app payments
          are coming soon.
        </Text>
      </View>
    </View>
  );
}

function ReviewStep({ form, vehicles, styles: ps }: { form: FormData; vehicles: Vehicle[]; styles: ReturnType<typeof makeStyles> }) {
  const vehicle = vehicles.find((v) => String(v.id) === form.vehicleId);
  return (
    <View style={ps.stepContent}>
      <Text style={ps.sectionTitle}>Review Your Ride</Text>
      <Card style={ps.reviewCard}>
        <ReviewRow label="From" value={form.originLocation?.city || "—"} styles={ps} />
        <ReviewRow label="To" value={form.destinationLocation?.city || "—"} styles={ps} />
        <ReviewRow label="Date" value={form.departureDate ? new Date(form.departureDate).toLocaleDateString() : "—"} styles={ps} />
        <ReviewRow label="Time" value={form.departureTime || "—"} styles={ps} />
        <ReviewRow label="Vehicle" value={vehicle ? `${vehicle.make} ${vehicle.model}` : "—"} styles={ps} />
        <ReviewRow label="Seats" value={form.availableSeats} styles={ps} />
        <ReviewRow label="Contribution/Seat" value={form.contribution ? `RWF ${form.contribution}` : "—"} styles={ps} />
        <ReviewRow label="Booking" value={form.bookingType} styles={ps} />
        <ReviewRow label="Payment" value="Cash on trip" styles={ps} />
        <ReviewRow label="AC" value={form.airConditioning ? "Yes" : "No"} styles={ps} />
        <ReviewRow label="Smoking Allowed" value={form.smoking ? "Yes" : "No"} styles={ps} />
      </Card>
    </View>
  );
}

function ReviewRow({ label, value, styles: ps }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={ps.reviewRow}>
      <Text style={ps.reviewLabel}>{label}</Text>
      <Text style={ps.reviewValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({ label, value, onToggle, colors, styles: ps, testID }: { label: string; value: boolean; onToggle: (v: boolean) => void; colors: ColorPalette; styles: ReturnType<typeof makeStyles>; testID?: string }) {
  return (
    <View style={ps.toggleRow}>
      <Text style={ps.fieldLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.primary }} testID={testID} />
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, colors, styles: ps, testID }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: "default" | "numeric"; colors: ColorPalette; styles: ReturnType<typeof makeStyles>; testID?: string;
}) {
  return (
    <View style={ps.fieldWrapper}>
      <Text style={ps.fieldLabel}>{label}</Text>
      <TextInput
        style={ps.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.tertiary}
        keyboardType={keyboardType || "default"}
        testID={testID}
      />
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  back: { fontSize: fontSize.xxl, color: colors.text.primary },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  progressBar: { flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.primary },
  stepLabel: { fontSize: fontSize.xs, color: colors.text.secondary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  stepContent: { gap: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  fieldWrapper: { gap: spacing.xs },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md, fontSize: fontSize.md, color: colors.text.primary },
  locationPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    height: 52,
    backgroundColor: colors.background,
  },
  locationPickerText: { flex: 1, fontSize: fontSize.md, color: colors.text.primary },
  locationPickerPlaceholder: { flex: 1, fontSize: fontSize.md, color: colors.text.tertiary },
  locationSubText: { fontSize: fontSize.xs, color: colors.text.tertiary, paddingHorizontal: spacing.xs },
  dateInput: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md, height: 52 },
  dateText: { fontSize: fontSize.md, color: colors.text.primary },
  vehicleCard: { gap: spacing.xs },
  vehicleCardSelected: { borderWidth: 2, borderColor: colors.primary },
  vehicleName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  vehicleMeta: { fontSize: fontSize.sm, color: colors.text.secondary },
  emptyText: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: "center", paddingVertical: spacing.xl },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bookingTypeRow: { flexDirection: "row", gap: spacing.sm },
  bookingTypeBtn: { flex: 1, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  bookingTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bookingTypeBtnText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  bookingTypeBtnTextActive: { color: colors.text.inverse },
  paymentNote: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.primaryLight, gap: spacing.xs },
  paymentNoteTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.primary },
  paymentNoteDesc: { fontSize: fontSize.xs, color: colors.text.secondary, lineHeight: 18 },
  reviewCard: { gap: spacing.sm },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  reviewLabel: { fontSize: fontSize.sm, color: colors.text.secondary },
  reviewValue: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.primary },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
