import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import type { BookedRange } from "@/lib/types";
import { useTheme } from "@/providers/ThemeProvider";
import { fontSize, spacing, borderRadius, ColorPalette } from "@/lib/theme";

type DayCell = { date: Date; inMonth: boolean };

function daysInMonth(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();
  const start = new Date(year, month, 1 - firstWeekday);
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}

function sameYMD(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function intersectsAnyRange(day: Date, ranges: BookedRange[]): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return ranges.some((r) => {
    const rStart = new Date(r.start);
    const rEnd = new Date(r.end);
    return rStart < dayEnd && rEnd > dayStart;
  });
}

function ymdKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const __test__ = { daysInMonth, sameYMD, intersectsAnyRange };

type Props = {
  bookedRanges: BookedRange[];
  startDate: Date;
  endDate: Date;
  mode: "DAILY" | "HOURLY";
  onChange: (start: Date, end: Date) => void;
  // Test-only: pin the displayed month so the grid is deterministic in unit tests.
  anchorMonth?: Date;
  testID?: string;
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function AvailabilityCalendar({
  bookedRanges,
  startDate,
  endDate,
  mode,
  onChange,
  anchorMonth,
  testID = "cal",
}: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const todayStart = useMemo(() => {
    const t = anchorMonth ?? new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, [anchorMonth]);
  const maxMonthOffset = 1;

  const [monthOffset, setMonthOffset] = useState(0);
  const displayMonth = useMemo(() => {
    const base = anchorMonth ?? new Date();
    return new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  }, [anchorMonth, monthOffset]);

  const cells = useMemo(() => {
    const all = daysInMonth(displayMonth.getFullYear(), displayMonth.getMonth());
    // Trim trailing rows that are entirely out-of-month so we don't leave a
    // big empty band below the last week of the month.
    let lastInMonthIdx = -1;
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].inMonth) { lastInMonthIdx = i; break; }
    }
    const cellsToShow = Math.ceil((lastInMonthIdx + 1) / 7) * 7;
    return all.slice(0, cellsToShow);
  }, [displayMonth]);

  function handleDayPress(day: Date) {
    // v1: single-day selection on tap. Multi-day ranges built via date-picker
    // field above; calendar reflects whatever range parent props express.
    onChange(day, day);
  }

  const monthLabel = displayMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={s.wrapper} testID={testID}>
      <View style={s.header}>
        <TouchableOpacity
          testID={`${testID}.prev`}
          disabled={monthOffset <= 0}
          onPress={() => setMonthOffset((o) => Math.max(0, o - 1))}
          style={[s.navBtn, monthOffset <= 0 && s.navBtnDisabled]}
        >
          <ChevronLeft size={20} color={monthOffset <= 0 ? colors.text.tertiary : colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          testID={`${testID}.next`}
          disabled={monthOffset >= maxMonthOffset}
          onPress={() => setMonthOffset((o) => Math.min(maxMonthOffset, o + 1))}
          style={[s.navBtn, monthOffset >= maxMonthOffset && s.navBtnDisabled]}
        >
          <ChevronRight size={20} color={monthOffset >= maxMonthOffset ? colors.text.tertiary : colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.weekRow}>
        {WEEKDAY_LABELS.map((w, i) => (
          <Text key={i} style={s.weekLabel}>{w}</Text>
        ))}
      </View>

      <View style={s.grid}>
        {cells.map((cell, i) => {
          const isPast = cell.date < todayStart;
          const overlaps = intersectsAnyRange(cell.date, bookedRanges);
          const blocked = overlaps && mode === "DAILY";
          const partial = overlaps && mode === "HOURLY";
          const isStart = sameYMD(cell.date, startDate);
          const isEnd = sameYMD(cell.date, endDate);
          const isToday = sameYMD(cell.date, todayStart);
          const inRange =
            !sameYMD(startDate, endDate) &&
            cell.date > startDate &&
            cell.date < endDate;

          const disabled = !cell.inMonth || isPast || blocked;

          // Cell handles the connecting band (in-range fill, blocked grey);
          // inner pill handles the per-day visuals (selected, today border)
          // so the indicator size never depends on the cell's outer dimensions.
          const cellStyles = [
            s.cell,
            !cell.inMonth && s.cellOutOfMonth,
            isPast && s.cellPast,
            blocked && s.cellBlocked,
            inRange && s.cellInRange,
          ];

          const innerStyles = [
            s.cellInner,
            (isStart || isEnd) && s.cellInnerSelected,
            isToday && !(isStart || isEnd) && s.cellInnerToday,
          ];

          const textStyles = [
            s.cellText,
            !cell.inMonth && s.cellTextOutOfMonth,
            disabled && s.cellTextDisabled,
            (isStart || isEnd) && s.cellTextSelected,
          ];

          let stateSuffix = "outOfMonth";
          if (cell.inMonth) {
            if (blocked) stateSuffix = "blocked";
            else if (partial) stateSuffix = "partial";
            else stateSuffix = "inMonth";
          }

          return (
            <TouchableOpacity
              key={i}
              testID={`${testID}.day.${ymdKey(cell.date)}.${stateSuffix}`}
              disabled={disabled}
              onPress={() => handleDayPress(cell.date)}
              style={cellStyles}
              activeOpacity={0.7}
            >
              <View style={innerStyles}>
                <Text style={textStyles}>{cell.date.getDate()}</Text>
              </View>
              {partial && <View style={s.partialDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    wrapper: { gap: spacing.sm },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    monthLabel: { fontSize: fontSize.md, fontWeight: "700", color: colors.text.primary },
    navBtn: { padding: spacing.xs, borderRadius: borderRadius.sm },
    navBtnDisabled: { opacity: 0.4 },
    weekRow: { flexDirection: "row" },
    weekLabel: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.xs,
      color: colors.text.tertiary,
      fontWeight: "600",
    },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: {
      width: `${100 / 7}%`,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    cellOutOfMonth: { opacity: 0 },
    cellPast: { opacity: 0.35 },
    cellBlocked: { backgroundColor: colors.surface },
    cellInRange: { backgroundColor: colors.primaryLight },
    cellInner: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    cellInnerSelected: { backgroundColor: colors.primary },
    cellInnerToday: { borderWidth: 1, borderColor: colors.primary },
    cellText: { fontSize: fontSize.sm, color: colors.text.primary },
    cellTextOutOfMonth: { color: "transparent" },
    cellTextDisabled: { color: colors.text.tertiary },
    cellTextSelected: { color: colors.surface, fontWeight: "700" },
    partialDot: {
      position: "absolute",
      bottom: 4,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.text.tertiary,
    },
  });
