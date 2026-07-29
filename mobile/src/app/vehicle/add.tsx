import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { ImagePlus, X } from "lucide-react-native";
import { api } from "@/services/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";
import { VehicleCategory } from "@/lib/types";
import { queryKeys } from "@/lib/constants";
import { VehicleFormData, validateVehicleFields, VehicleFieldErrors } from "@/lib/vehicleValidation";
import { pickImageFromSource, type PickedImage } from "@/lib/imagePicker";

const CATEGORIES: VehicleCategory[] = ["CAR", "MOTORBIKE", "BUS"];
const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"] as const;
const FUEL_TYPES = ["PETROL", "DIESEL", "ELECTRIC", "HYBRID"] as const;
const TIERS = ["ECONOMY", "PREMIUM"] as const;
type Transmission = (typeof TRANSMISSIONS)[number];
type FuelType = (typeof FUEL_TYPES)[number];
type Tier = (typeof TIERS)[number];
const MAX_IMAGES = 4;

export default function AddVehicleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
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
  const [images, setImages] = useState<PickedImage[]>([]);
  const [yellowCard, setYellowCard] = useState<PickedImage | null>(null);
  const [insurance, setInsurance] = useState<PickedImage | null>(null);
  const [authorization, setAuthorization] = useState<PickedImage | null>(null);
  const [transmission, setTransmission] = useState<Transmission | null>(null);
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
  const [docErrors, setDocErrors] = useState<{ images?: string; docs?: string }>({});

  const { mutate: createVehicle, isPending } = useMutation({
    mutationFn: (formData: FormData) => api.upload("/vehicles", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.mine });
      router.back();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Failed to add vehicle. Please try again.";
      Alert.alert("Error", msg);
    },
  });

  const set = (field: keyof VehicleFormData) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  async function handlePickImage() {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit reached", `You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    const picked = await pickImageFromSource({ fallbackName: "vehicle" });
    if (!picked) return;
    setImages((prev) => [...prev, picked].slice(0, MAX_IMAGES));
    setDocErrors((prev) => ({ ...prev, images: undefined }));
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setDocErrors((prev) => ({ ...prev, images: undefined }));
  }

  async function pickSingleDoc(setter: (p: PickedImage | null) => void, fallbackName: string) {
    const picked = await pickImageFromSource({ fallbackName });
    if (!picked) return;
    setter(picked);
    setDocErrors((prev) => ({ ...prev, docs: undefined }));
  }

  const handleSubmit = () => {
    const fieldErrors = validateVehicleFields(form);
    const docErr: { images?: string; docs?: string } = {};
    if (images.length === 0) docErr.images = "Please add at least one image of your vehicle.";
    if (!yellowCard || !insurance || !authorization) {
      docErr.docs = "Yellow card, insurance, and authorization are all required.";
    }

    setErrors(fieldErrors);
    setDocErrors(docErr);

    if (Object.keys(fieldErrors).length > 0 || Object.keys(docErr).length > 0) {
      return;
    }

    const formData = new FormData();
    formData.append("make", form.make.trim());
    formData.append("model", form.model.trim());
    formData.append("year", String(parseInt(form.year)));
    formData.append("color", form.color.trim());
    formData.append("plateNumber", form.plateNumber.trim().toUpperCase());
    formData.append("capacity", String(parseInt(form.capacity)));
    formData.append("category", form.category);
    if (transmission) formData.append("transmission", transmission);
    if (fuelType) formData.append("fuelType", fuelType);
    if (tier) formData.append("tier", tier);

    images.forEach((img) => {
      formData.append("images", { uri: img.uri, name: img.fileName, type: img.mimeType } as any);
    });
    formData.append("yellowCard", { uri: yellowCard!.uri, name: yellowCard!.fileName, type: yellowCard!.mimeType } as any);
    formData.append("insurance", { uri: insurance!.uri, name: insurance!.fileName, type: insurance!.mimeType } as any);
    formData.append("authorization", { uri: authorization!.uri, name: authorization!.fileName, type: authorization!.mimeType } as any);

    createVehicle(formData);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Add Vehicle" />

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
          <View style={s.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.categoryChip, form.category === cat && s.categoryChipActive]}
                onPress={() => setForm((prev) => ({
                  ...prev,
                  category: cat,
                  // Motorbike is a single-rider vehicle — force capacity to 1.
                  capacity: cat === "MOTORBIKE" ? "1" : prev.capacity,
                }))}
                activeOpacity={0.7}
              >
                <Text style={[s.categoryChipText, form.category === cat && s.categoryChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.category && (
            <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: 4 }}>
              {errors.category}
            </Text>
          )}
        </View>

        <ChipRow
          label="Transmission"
          options={TRANSMISSIONS}
          value={transmission}
          onChange={(v) => setTransmission(v)}
          styles={s}
        />
        <ChipRow
          label="Fuel type"
          options={FUEL_TYPES}
          value={fuelType}
          onChange={(v) => setFuelType(v)}
          styles={s}
        />
        <ChipRow
          label="Tier (optional)"
          options={TIERS}
          value={tier}
          onChange={(v) => setTier(v)}
          styles={s}
        />

        {/* Image picker */}
        <View style={s.section}>
          <Text style={s.label}>Vehicle Images ({images.length}/{MAX_IMAGES})</Text>
          <View style={s.imagesRow}>
            {images.map((img, i) => (
              <View key={i} style={s.imageWrap}>
                <Image source={{ uri: img.uri }} style={s.image} contentFit="cover" />
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemoveImage(i)}>
                  <X size={14} color={colors.text.inverse} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={s.addImageBtn} onPress={handlePickImage}>
                <ImagePlus size={24} color={colors.text.tertiary} />
                <Text style={s.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          {docErrors.images && (
            <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: 4 }}>
              {docErrors.images}
            </Text>
          )}
        </View>

        {/* Vehicle KYC docs */}
        <View style={s.section}>
          <Text style={s.label}>Required documents</Text>
          <Text style={[s.addImageText, { marginBottom: spacing.sm }]}>
            Upload a clear photo of each. An admin will review before your vehicle can take rides.
          </Text>
          <View style={s.imagesRow}>
            <DocSlot
              label="Yellow card"
              value={yellowCard}
              onPick={() => pickSingleDoc(setYellowCard, "yellow-card")}
              onClear={() => setYellowCard(null)}
              styles={s}
              colors={colors}
            />
            <DocSlot
              label="Insurance"
              value={insurance}
              onPick={() => pickSingleDoc(setInsurance, "insurance")}
              onClear={() => setInsurance(null)}
              styles={s}
              colors={colors}
            />
            <DocSlot
              label="Authorization"
              value={authorization}
              onPick={() => pickSingleDoc(setAuthorization, "authorization")}
              onClear={() => setAuthorization(null)}
              styles={s}
              colors={colors}
            />
          </View>
          {docErrors.docs && (
            <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: 4 }}>
              {docErrors.docs}
            </Text>
          )}
        </View>

        <Button
          title="Submit for review"
          // auth-gated
          onPress={() =>
            requireAuth(handleSubmit, { reason: "Sign in to add a vehicle" })
          }
          loading={isPending}
          style={s.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
  styles,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.categoryRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.categoryChip, value === opt && styles.categoryChipActive]}
            onPress={() => onChange(value === opt ? null : opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryChipText, value === opt && styles.categoryChipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function DocSlot({
  label,
  value,
  onPick,
  onClear,
  styles,
  colors,
}: {
  label: string;
  value: PickedImage | null;
  onPick: () => void;
  onClear: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ColorPalette;
}) {
  if (value) {
    return (
      <View style={styles.imageWrap}>
        <Image source={{ uri: value.uri }} style={styles.image} contentFit="cover" />
        <TouchableOpacity style={styles.removeBtn} onPress={onClear}>
          <X size={14} color={colors.text.inverse} />
        </TouchableOpacity>
        <View style={{ position: "absolute", bottom: 4, left: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 4, paddingHorizontal: 4 }}>
          <Text style={{ color: "white", fontSize: 9, textAlign: "center" }}>{label}</Text>
        </View>
      </View>
    );
  }
  return (
    <TouchableOpacity style={styles.addImageBtn} onPress={onPick}>
      <ImagePlus size={24} color={colors.text.tertiary} />
      <Text style={styles.addImageText}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  section: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: "500", color: colors.text.primary },
  categoryRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  categoryChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  categoryChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  categoryChipText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  categoryChipTextActive: { color: colors.primary },
  imagesRow: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  imageWrap: { width: 96, height: 96, borderRadius: borderRadius.lg, overflow: "hidden", position: "relative" },
  image: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  addImageBtn: { width: 96, height: 96, borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  addImageText: { fontSize: fontSize.xs, color: colors.text.tertiary, fontWeight: "500" },
  submitBtn: { marginTop: spacing.md },
});
