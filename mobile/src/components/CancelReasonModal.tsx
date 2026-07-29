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
  "Change of plans",
  "Found another ride",
  "Schedule conflict",
  "Booked by mistake",
  "Other",
] as const;

interface CancelReasonModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function CancelReasonModal({
  visible,
  title = "Cancel Booking",
  description = "Please let us know why you're cancelling.",
  loading = false,
  onClose,
  onConfirm,
}: CancelReasonModalProps) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");

  const isOther = selectedPreset === "Other";
  const finalReason = isOther ? customReason.trim() : selectedPreset ?? "";
  const canSubmit = finalReason.length > 0;

  function handleClose() {
    setSelectedPreset(null);
    setCustomReason("");
    onClose();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onConfirm(finalReason);
    setSelectedPreset(null);
    setCustomReason("");
  }

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
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
              placeholder="Tell us more..."
              placeholderTextColor={colors.text.tertiary}
              value={customReason}
              onChangeText={setCustomReason}
              multiline
              numberOfLines={3}
              maxLength={300}
              autoFocus
            />
          )}

          <View style={s.actions}>
            <Button
              title="Keep Booking"
              variant="secondary"
              onPress={handleClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Confirm Cancel"
              variant="destructive"
              onPress={handleSubmit}
              loading={loading}
              disabled={!canSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  presetBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetText: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  presetTextActive: { color: colors.primary },
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
