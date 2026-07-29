import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { ImagePlus, X } from "lucide-react-native";
import { api } from "@/services/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { queryKeys } from "@/lib/constants";
import { handleApiError } from "@/lib/utils";
import { pickImageFromSource, type PickedImage } from "@/lib/imagePicker";
import { useMode } from "@/providers/ModeProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

const EXPERIENCE_OPTIONS = [
  { value: "1", label: "1 year" },
  { value: "2", label: "2 years" },
  { value: "3", label: "3 years" },
  { value: "4", label: "4 years" },
  { value: "5", label: "5 years" },
  { value: "more", label: "5+ years" },
] as const;

export default function DriverOnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { setMode } = useMode();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [licenseNumber, setLicenseNumber] = useState("");
  const [drivingExperience, setDrivingExperience] = useState<string>("");
  const [frontImage, setFrontImage] = useState<PickedImage | null>(null);
  const [backImage, setBackImage] = useState<PickedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pickImage(side: "front" | "back") {
    const picked = await pickImageFromSource({ fallbackName: `license-${side}` });
    if (!picked) return;
    if (side === "front") setFrontImage(picked);
    else setBackImage(picked);
  }

  async function uploadLicenseImage(img: PickedImage, side: "front" | "back") {
    const formData = new FormData();
    formData.append("license", {
      uri: img.uri,
      name: img.fileName,
      type: img.mimeType,
    } as any);
    await api.upload(`/onboarding/driver/license?side=${side}`, formData);
  }

  async function handleSubmit() {
    if (!licenseNumber.trim() || licenseNumber.trim().length < 3) {
      Alert.alert("Invalid license", "Please enter a valid license number (at least 3 characters).");
      return;
    }
    if (!drivingExperience) {
      Alert.alert("Missing experience", "Please select your driving experience.");
      return;
    }
    if (!frontImage) {
      Alert.alert("License image required", "Please upload a photo of the front of your license.");
      return;
    }
    if (!backImage) {
      Alert.alert("License image required", "Please upload a photo of the back of your license.");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Save license number + experience
      await api.post("/onboarding/driver", {
        licenseNumber: licenseNumber.trim(),
        drivingExperience,
      });

      // Step 2: Upload front license image (required)
      await uploadLicenseImage(frontImage, "front");

      // Step 3: Upload back license image (required)
      await uploadLicenseImage(backImage, "back");

      // Invalidate user profile so isDriverOnboarded refresh propagates
      await queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
      await queryClient.refetchQueries({ queryKey: queryKeys.user.profile });

      // The user just became a driver — drop them into driver mode so the
      // driver menus and home are what they see on the way out.
      await setMode("driver");

      Alert.alert(
        "Welcome aboard!",
        "Your driver profile is ready. You can now post rides.",
        [
          {
            text: "Continue",
            onPress: () => {
              if (redirect === "post-ride") {
                router.replace("/post-ride");
              } else {
                router.replace("/(drawer)");
              }
            },
          },
        ]
      );
    } catch (err) {
      handleApiError(err, t);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Become a Driver" onBack={() => router.replace("/(drawer)")} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>Driver Information</Text>
        <Text style={s.subtitle}>
          To post rides, we need to verify you're a licensed driver.
        </Text>

        <Card style={s.card}>
          <Input
            label="License Number"
            placeholder="e.g. RW-123456"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            autoCapitalize="characters"
          />

          <View style={s.section}>
            <Text style={s.label}>Driving Experience</Text>
            <View style={s.experienceGrid}>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.chip, drivingExperience === opt.value && s.chipActive]}
                  onPress={() => setDrivingExperience(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[s.chipText, drivingExperience === opt.value && s.chipTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.label}>License Photo (Front) *</Text>
            {frontImage ? (
              <View style={s.imageWrap}>
                <Image source={{ uri: frontImage.uri }} style={s.image} contentFit="cover" />
                <TouchableOpacity style={s.removeBtn} onPress={() => setFrontImage(null)}>
                  <X size={16} color={colors.text.inverse} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.addImageBtn} onPress={() => pickImage("front")}>
                <ImagePlus size={28} color={colors.text.tertiary} />
                <Text style={s.addImageText}>Upload front of license</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.section}>
            <Text style={s.label}>License Photo (Back) *</Text>
            {backImage ? (
              <View style={s.imageWrap}>
                <Image source={{ uri: backImage.uri }} style={s.image} contentFit="cover" />
                <TouchableOpacity style={s.removeBtn} onPress={() => setBackImage(null)}>
                  <X size={16} color={colors.text.inverse} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.addImageBtn} onPress={() => pickImage("back")}>
                <ImagePlus size={28} color={colors.text.tertiary} />
                <Text style={s.addImageText}>Upload back of license</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        <Button
          title="Continue"
          onPress={handleSubmit}
          loading={submitting}
          style={s.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  heading: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.md, color: colors.text.secondary, marginBottom: spacing.md },
  card: { gap: spacing.lg },
  section: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: "500", color: colors.text.primary },
  experienceGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  chipTextActive: { color: colors.primary },
  imageWrap: {
    width: "100%",
    height: 180,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageBtn: {
    width: "100%",
    height: 140,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  addImageText: { fontSize: fontSize.sm, color: colors.text.tertiary, fontWeight: "500" },
  submitBtn: { marginTop: spacing.md },
});
