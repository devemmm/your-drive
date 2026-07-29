import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { DateTimeField } from "@/components/DateTimeField";
import { useAuthContext } from "@/providers/AuthProvider";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { handleApiError } from "@/lib/utils";
import { pickImageFromSource } from "@/lib/imagePicker";
import { queryKeys } from "@/lib/constants";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : new Date(1990, 0, 1)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Validation", "First name and last name are required.");
      return;
    }
    try {
      setIsSaving(true);
      const trimmedPhone = phoneNumber.trim();
      await api.post("/users/update", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: trimmedPhone,
        dateOfBirth: dateOfBirth.toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
      // A changed phone number triggers a server-sent OTP; hand off to the
      // verify screen (code already sent) instead of the plain success alert.
      const phoneChanged =
        trimmedPhone.length > 0 && trimmedPhone !== (user?.phoneNumber ?? "");
      if (phoneChanged) {
        router.push({
          pathname: "/onboarding/verify-phone",
          params: { phone: trimmedPhone, returnTo: "/(drawer)/profile" },
        });
        return;
      }
      Alert.alert("Success", "Profile updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      handleApiError(error, t);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangePhoto() {
    const picked = await pickImageFromSource({ fallbackName: "avatar" });
    if (!picked) return;
    setIsUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("image", { uri: picked.uri, name: picked.fileName, type: picked.mimeType } as any);
      await api.upload("/users/onboarding/profile-image", fd);
      await queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
    } catch (err) {
      handleApiError(err, t);
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Edit Profile" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={s.avatarSection}>
            <Avatar
              firstName={user?.firstName ?? ""}
              lastName={user?.lastName ?? ""}
              imageUrl={user?.profileImage?.url}
              size={100}
            />
            <TouchableOpacity
              // auth-gated
              onPress={() =>
                requireAuth(() => void handleChangePhoto(), {
                  reason: "Sign in to update your profile",
                })
              }
              style={s.changePhotoBtn}
              disabled={isUploadingPhoto}
            >
              <Text style={s.changePhotoText}>
                {isUploadingPhoto ? "Uploading..." : "Change Photo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={s.form}>
            <Input
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              autoCapitalize="words"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              autoCapitalize="words"
            />
            <Input
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />

            <DateTimeField
              mode="date"
              label="Date of Birth"
              value={dateOfBirth}
              maximumDate={new Date()}
              onChange={setDateOfBirth}
              testID="profile.dobField"
            />

            <Button
              title="Save Changes"
              // auth-gated
              onPress={() =>
                requireAuth(() => void handleSave(), {
                  reason: "Sign in to update your profile",
                })
              }
              loading={isSaving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.xxl, paddingBottom: spacing.xxxl },
  avatarSection: { alignItems: "center", gap: spacing.md },
  changePhotoBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.lg },
  changePhotoText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: "600" },
  form: { gap: spacing.lg },
});
