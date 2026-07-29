import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

const PRESET_REASONS = [
  "Unsafe driving",
  "Rude or abusive behaviour",
  "Vehicle condition",
  "Did not match profile",
  "Other",
] as const;

interface ReportTripModalProps {
  visible: boolean;
  loading?: boolean;
  subjectName?: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export function ReportTripModal({
  visible,
  loading = false,
  subjectName,
  onClose,
  onSubmit,
}: ReportTripModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");

  const isOther = selectedPreset === "Other";
  const finalReason = isOther ? customReason.trim() : selectedPreset ?? "";
  const canSubmit = finalReason.length >= 3;

  function handleClose() {
    setSelectedPreset(null);
    setCustomReason("");
    onClose();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(finalReason);
    setSelectedPreset(null);
    setCustomReason("");
  }

  const description = subjectName
    ? `Tell us what went wrong with ${subjectName}. An admin will review.`
    : "Tell us what went wrong. An admin will review.";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.backdrop}
      >
        <View style={s.sheet} testID="reportTrip.modal">
          <View style={s.header}>
            <Text style={s.title}>Report this trip</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={s.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="reportTrip.close"
            >
              <X size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <Text style={s.description}>{description}</Text>

          <View style={s.presetList}>
            {PRESET_REASONS.map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[s.presetBtn, selectedPreset === preset && s.presetBtnActive]}
                onPress={() => setSelectedPreset(preset)}
                activeOpacity={0.7}
                testID={`reportTrip.preset.${preset.replace(/\s+/g, "_")}`}
              >
                <Text
                  style={[
                    s.presetText,
                    selectedPreset === preset && s.presetTextActive,
                  ]}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isOther && (
            <TextInput
              style={s.input}
              placeholder="Describe what happened..."
              placeholderTextColor={colors.text.tertiary}
              value={customReason}
              onChangeText={setCustomReason}
              multiline
              numberOfLines={3}
              maxLength={1000}
              autoFocus
              testID="reportTrip.customReason"
            />
          )}

          <View style={s.actions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Send report"
              variant="destructive"
              onPress={handleSubmit}
              loading={loading}
              disabled={!canSubmit}
              style={{ flex: 1 }}
              testID="reportTrip.submit"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary },
  closeBtn: { padding: spacing.xs },
  description: { fontSize: fontSize.sm, color: colors.text.secondary },
  presetList: { gap: spacing.sm },
  presetBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  presetBtnActive: { borderColor: colors.error, backgroundColor: colors.primaryLight },
  presetText: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  presetTextActive: { color: colors.error },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: fontSize.md,
    color: colors.text.primary,
    minHeight: 90,
    textAlignVertical: "top",
  },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
});
