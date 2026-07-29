import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, Clock } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

type Mode = "date" | "time";

interface Props {
  mode: Mode;
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  testID?: string;
}

function formatValue(mode: Mode, value: Date): string {
  return mode === "date"
    ? value.toLocaleDateString()
    : value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Cross-platform date/time field.
 *
 * Android renders the native picker dialog inline; the dialog auto-closes
 * on OK/Cancel and we commit on `event.type === "set"`.
 *
 * iOS wraps the native spinner in a modal with a Done button so that
 * continuous `onChange` events from the spinner don't unmount the picker
 * before the user is finished selecting.
 */
export function DateTimeField({ mode, value, onChange, label, minimumDate, maximumDate, testID }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Date>(value);
  const Icon = mode === "date" ? Calendar : Clock;

  function openPicker() {
    setPending(value);
    setOpen(true);
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity testID={testID} onPress={openPicker} style={styles.field} activeOpacity={0.7}>
        <Icon size={18} color={colors.text.secondary} />
        <Text style={styles.text}>{formatValue(mode, value)}</Text>
      </TouchableOpacity>

      {open && Platform.OS === "android" ? (
        <DateTimePicker
          value={value}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === "set" && date) onChange(date);
          }}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <DateTimePicker
                value={pending}
                mode={mode}
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_, date) => {
                  if (date) setPending(date);
                }}
              />
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => setOpen(false)} style={styles.actionBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID={testID ? `${testID}.done` : undefined}
                  onPress={() => {
                    onChange(pending);
                    setOpen(false);
                  }}
                  style={styles.actionBtn}
                >
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
    backgroundColor: colors.background,
  },
  text: { fontSize: fontSize.md, color: colors.text.primary },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: spacing.lg },
  actions: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  actionBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  cancelText: { color: colors.text.secondary, fontSize: fontSize.md, fontWeight: "600" },
  doneText: { color: colors.primary, fontSize: fontSize.md, fontWeight: "700" },
});
