import React, { useMemo, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, ColorPalette } from "@/lib/theme";

interface Props {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  maxDays?: number;
}

const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function sameDay(a: Date, b: Date) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }
function isoDay(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); }
function monthLabel(d: Date) { return d.toLocaleDateString(undefined, { month: "long", year: "numeric" }); }
function dayLabel(d: Date) { return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }

export function DateModal({ visible, value, onConfirm, onCancel, maxDays = 60 }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const today = useMemo(() => startOfDay(new Date()), []);
  const max = useMemo(() => addDays(today, maxDays), [today, maxDays]);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(value));
  const [pending, setPending] = useState(value);

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const total = daysInMonth(viewMonth);
    const leadingBlanks = first.getDay();
    const out: Array<Date | null> = Array(leadingBlanks).fill(null);
    for (let day = 1; day <= total; day++) out.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [viewMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.head}>
            <TouchableOpacity onPress={() => setViewMonth(addDays(viewMonth, -daysInMonth(viewMonth)))}>
              <ChevronLeft color={colors.text.secondary} size={20} />
            </TouchableOpacity>
            <Text style={styles.headLabel}>{monthLabel(viewMonth)}</Text>
            <TouchableOpacity onPress={() => setViewMonth(addDays(viewMonth, daysInMonth(viewMonth)))}>
              <ChevronRight color={colors.text.secondary} size={20} />
            </TouchableOpacity>
          </View>
          <View style={styles.dayHeaderRow}>
            {DAY_HEADERS.map((h, i) => <Text key={i} style={styles.dayHeader}>{h}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((cell, i) => {
              if (!cell) return <View key={i} style={styles.cell} />;
              const isToday = sameDay(cell, today);
              const isPast = cell.getTime() < today.getTime();
              const isFuture = cell.getTime() > max.getTime();
              const isSelected = sameDay(cell, pending);
              if (isPast || isFuture) return <View key={i} style={[styles.cell, styles.cellMuted]}><Text style={styles.cellTextMuted}>{cell.getDate()}</Text></View>;
              return (
                <TouchableOpacity
                  key={i}
                  testID={isToday ? `home.dateModal.day.${isoDay(cell)}.today` : `home.dateModal.day.${isoDay(cell)}`}
                  onPress={() => setPending(cell)}
                  style={[styles.cell, isToday && styles.cellToday, isSelected && styles.cellSelected]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{cell.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            testID="home.dateModal.confirm"
            onPress={() => onConfirm(pending)}
            activeOpacity={0.85}
            style={styles.confirm}
          >
            <Text style={styles.confirmText}>Confirm — {dayLabel(pending)}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden" },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headLabel: { color: colors.text.primary, fontWeight: "600", fontSize: fontSize.md },
  dayHeaderRow: { flexDirection: "row", paddingHorizontal: spacing.sm },
  dayHeader: { flex: 1, textAlign: "center", color: colors.text.tertiary, fontSize: (fontSize as any).xs ?? 10, paddingVertical: spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  cell: { width: `${100/7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellMuted: { opacity: 0.4 },
  cellToday: { backgroundColor: (colors as any).successSurface ?? "#ecfdf5", borderRadius: 99 },
  cellSelected: { backgroundColor: colors.primary, borderRadius: 99 },
  cellText: { color: colors.text.primary, fontSize: fontSize.sm },
  cellTextMuted: { color: colors.text.tertiary, fontSize: fontSize.sm },
  cellTextSelected: { color: (colors.text as any).inverse ?? "#ffffff", fontWeight: "600" },
  confirm: { backgroundColor: colors.primary, paddingVertical: spacing.md, alignItems: "center" },
  confirmText: { color: (colors.text as any).inverse ?? "#ffffff", fontWeight: "600", fontSize: fontSize.md },
});
