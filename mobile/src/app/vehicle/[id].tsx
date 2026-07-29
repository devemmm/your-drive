import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useMyVehicles, useUpdateVehicle, useDeleteVehicle, useUpdateRentalSettings } from "@/hooks/useVehicles";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { VehicleCategory, FuelPolicy } from "@/lib/types";
import { VehicleFormData, validateVehicleFields, VehicleFieldErrors } from "@/lib/vehicleValidation";

const CATEGORIES: VehicleCategory[] = ["CAR", "MOTORBIKE", "BUS"];
const FUEL_POLICIES: { value: FuelPolicy; label: string }[] = [
  { value: "FULL_TO_FULL", label: "Full to Full" },
  { value: "SAME_LEVEL", label: "Same Level" },
];

export default function EditVehicleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { data: vehicles, isLoading } = useMyVehicles();
  const vehicle = vehicles?.find((v) => String(v.id) === id);

  const { mutate: updateVehicle, isPending: isUpdating } = useUpdateVehicle();
  const { mutate: deleteVehicle, isPending: isDeleting } = useDeleteVehicle();
  const { mutate: updateRentalSettings, isPending: isSavingRental } = useUpdateRentalSettings();
  const requireAuth = useRequireAuth();

  const [form, setForm] = useState<VehicleFormData & { category: VehicleCategory }>({
    make: "",
    model: "",
    year: "",
    color: "",
    plateNumber: "",
    capacity: "",
    category: "CAR",
  });

  const [rental, setRental] = useState({
    isAvailableForRental: false,
    hourlyRate: "",
    dailyRate: "",
    securityDeposit: "",
    rentalDescription: "",
    mileageLimit: "",
    fuelPolicy: "" as FuelPolicy | "",
  });

  const [errors, setErrors] = useState<VehicleFieldErrors>({});

  useEffect(() => {
    if (vehicle) {
      setForm({
        make: vehicle.make,
        model: vehicle.model,
        year: String(vehicle.year),
        color: vehicle.color,
        plateNumber: vehicle.plateNumber,
        capacity: String(vehicle.capacity),
        category: vehicle.category,
      });
      setRental({
        isAvailableForRental: vehicle.isAvailableForRental,
        hourlyRate: vehicle.hourlyRate ?? "",
        dailyRate: vehicle.dailyRate ?? "",
        securityDeposit: vehicle.securityDeposit ?? "",
        rentalDescription: vehicle.rentalDescription ?? "",
        mileageLimit: vehicle.mileageLimit ? String(vehicle.mileageLimit) : "",
        fuelPolicy: vehicle.fuelPolicy ?? "",
      });
    }
  }, [vehicle]);

  const set = (field: keyof VehicleFormData) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setR = (field: keyof typeof rental) => (value: string | boolean) => {
    setRental((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!id) return;
    const fieldErrors = validateVehicleFields(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    updateVehicle(
      {
        id,
        data: {
          make: form.make.trim(),
          model: form.model.trim(),
          year: parseInt(form.year),
          color: form.color.trim(),
          plateNumber: form.plateNumber.trim().toUpperCase(),
          capacity: parseInt(form.capacity),
          category: form.category,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to update vehicle.";
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const handleSaveRental = () => {
    if (!id) return;

    if (rental.isAvailableForRental && !rental.dailyRate && !rental.hourlyRate) {
      Alert.alert("Validation Error", "Please set at least a daily or hourly rate.");
      return;
    }

    const data: Record<string, unknown> = {
      isAvailableForRental: rental.isAvailableForRental,
    };
    if (rental.hourlyRate) data.hourlyRate = parseFloat(rental.hourlyRate);
    if (rental.dailyRate) data.dailyRate = parseFloat(rental.dailyRate);
    if (rental.securityDeposit) data.securityDeposit = parseFloat(rental.securityDeposit);
    if (rental.rentalDescription.trim()) data.rentalDescription = rental.rentalDescription.trim();
    if (rental.mileageLimit) data.mileageLimit = parseInt(rental.mileageLimit);
    if (rental.fuelPolicy) data.fuelPolicy = rental.fuelPolicy;

    updateRentalSettings(
      { id, data },
      {
        onSuccess: () => Alert.alert("Saved", "Rental settings updated."),
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to update rental settings.";
          Alert.alert("Error", msg);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      "Delete Vehicle",
      "Are you sure you want to delete this vehicle? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteVehicle(id, {
              onSuccess: () => router.back(),
              onError: (err: any) => {
                const msg = err?.response?.data?.message ?? "Failed to delete vehicle.";
                Alert.alert("Error", msg);
              },
            }),
        },
      ]
    );
  };

  if (isLoading) return <LoadingIndicator fullScreen />;

  if (!vehicle) {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Edit Vehicle"
        right={
          <TouchableOpacity
            // auth-gated
            onPress={() =>
              requireAuth(handleDelete, {
                reason: "Sign in to delete this vehicle",
              })
            }
            style={s.deleteBtn}
            activeOpacity={0.7}
            disabled={isDeleting}
          >
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Input label="Make" placeholder="e.g. Toyota" value={form.make} onChangeText={set("make")} autoCapitalize="words" error={errors.make} />
        <Input label="Model" placeholder="e.g. Corolla" value={form.model} onChangeText={set("model")} autoCapitalize="words" error={errors.model} />
        <Input label="Year" placeholder="e.g. 2020" value={form.year} onChangeText={set("year")} keyboardType="numeric" maxLength={4} error={errors.year} />
        <Input label="Color" placeholder="e.g. White" value={form.color} onChangeText={set("color")} autoCapitalize="words" error={errors.color} />
        <Input label="License Plate" placeholder="e.g. RAB 123A" value={form.plateNumber} onChangeText={set("plateNumber")} autoCapitalize="characters" error={errors.plateNumber} />
        <Input
          label="Capacity (seats)"
          placeholder="e.g. 5"
          value={form.category === "MOTORBIKE" ? "1" : form.capacity}
          onChangeText={set("capacity")}
          keyboardType="numeric"
          maxLength={3}
          editable={form.category !== "MOTORBIKE"}
          error={errors.capacity}
        />

        {/* Category selector */}
        <View style={s.section}>
          <Text style={s.label}>Category</Text>
          <View style={s.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.chip, form.category === cat && s.chipActive]}
                onPress={() => setForm((prev) => ({
                  ...prev,
                  category: cat,
                  // Motorbike is a single-rider vehicle — force capacity to 1.
                  capacity: cat === "MOTORBIKE" ? "1" : prev.capacity,
                }))}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, form.category === cat && s.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
            {errors.category && (
              <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: 4 }}>
                {errors.category}
              </Text>
            )}
        </View>

        <Button
          title="Save Changes"
          // auth-gated
          onPress={() =>
            requireAuth(handleSave, { reason: "Sign in to update this vehicle" })
          }
          loading={isUpdating}
          style={s.submitBtn}
        />

        {/* Rental Settings */}
        <View style={s.divider} />

        <View style={s.rentalHeader}>
          <Text style={s.sectionTitle}>Rental Settings</Text>
          <Switch
            value={rental.isAvailableForRental}
            onValueChange={(val) => setR("isAvailableForRental")(val)}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={rental.isAvailableForRental ? colors.primary : colors.text.tertiary}
          />
        </View>

        {rental.isAvailableForRental && (
          <View style={s.rentalFields}>
            <Input label="Daily Rate (RWF)" placeholder="e.g. 50000" value={rental.dailyRate} onChangeText={setR("dailyRate") as (v: string) => void} keyboardType="decimal-pad" />
            <Input label="Hourly Rate (RWF)" placeholder="e.g. 10000" value={rental.hourlyRate} onChangeText={setR("hourlyRate") as (v: string) => void} keyboardType="decimal-pad" />
            <Input label="Security Deposit (RWF)" placeholder="e.g. 100000" value={rental.securityDeposit} onChangeText={setR("securityDeposit") as (v: string) => void} keyboardType="decimal-pad" />
            <Input label="Mileage Limit (km)" placeholder="e.g. 200" value={rental.mileageLimit} onChangeText={setR("mileageLimit") as (v: string) => void} keyboardType="numeric" />
            <Input label="Description" placeholder="Describe rental terms, features..." value={rental.rentalDescription} onChangeText={setR("rentalDescription") as (v: string) => void} multiline />

            {/* Fuel Policy */}
            <View style={s.section}>
              <Text style={s.label}>Fuel Policy</Text>
              <View style={s.chipRow}>
                {FUEL_POLICIES.map((fp) => (
                  <TouchableOpacity
                    key={fp.value}
                    style={[s.chip, rental.fuelPolicy === fp.value && s.chipActive]}
                    onPress={() => setRental((prev) => ({ ...prev, fuelPolicy: fp.value }))}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipText, rental.fuelPolicy === fp.value && s.chipTextActive]}>{fp.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title="Save Rental Settings"
              // auth-gated
              onPress={() =>
                requireAuth(handleSaveRental, {
                  reason: "Sign in to update rental settings",
                })
              }
              loading={isSavingRental}
              style={s.submitBtn}
            />
          </View>
        )}

        <Button
          title="Delete Vehicle"
          variant="destructive"
          // auth-gated
          onPress={() =>
            requireAuth(handleDelete, {
              reason: "Sign in to delete this vehicle",
            })
          }
          loading={isDeleting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  deleteBtn: { width: 40, height: 40, alignItems: "flex-end", justifyContent: "center" },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  section: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: "500", color: colors.text.primary },
  chipRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  chipTextActive: { color: colors.primary },
  submitBtn: { marginTop: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  rentalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  rentalFields: { gap: spacing.lg },
});
