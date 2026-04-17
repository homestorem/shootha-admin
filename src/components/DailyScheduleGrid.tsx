import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import dayjs from "../lib/dayjs";
import { formatHm12HourAr } from "../lib/timeFormat";
import { t } from "../strings";
import { useSettings } from "../providers/SettingsProvider";
import type { AppPalette } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

const HALF_HOUR_SLOTS = 48;

const bookedRanges: { start: number; end: number }[] = [
  { start: 18, end: 19 },
  { start: 19.5, end: 21 }
];

function slotLabel(slotIndex: number): string {
  const h = Math.floor(slotIndex / 2);
  const half = slotIndex % 2 === 1;
  const hm = `${h.toString().padStart(2, "0")}:${half ? "30" : "00"}`;
  return formatHm12HourAr(hm);
}

function slotStartHour(slotIndex: number): number {
  return slotIndex * 0.5;
}

function slotBooked(slotIndex: number): boolean {
  const s = slotStartHour(slotIndex);
  const e = s + 0.5;
  return bookedRanges.some((r) => r.start < e && r.end > s);
}

function makeGridStyles(c: AppPalette) {
  return StyleSheet.create({
    dateLine: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
      textAlign: "right",
      marginBottom: spacing.sm
    },
    sub: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSecondary,
      textAlign: "right",
      lineHeight: 18,
      marginBottom: spacing.md
    },
    body: {
      flex: 1
    },
    bodyInner: {
      paddingBottom: spacing.xxl
    },
    row: {
      flexDirection: "row-reverse",
      alignItems: "stretch",
      marginVertical: 3
    },
    timeLabel: {
      minWidth: 64,
      maxWidth: 72,
      textAlign: "right",
      fontSize: 10,
      color: c.textMuted,
      fontWeight: "800",
      paddingTop: 10
    },
    slot: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      marginLeft: spacing.sm,
      minHeight: 42,
      justifyContent: "center"
    },
    booked: {
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primaryMuted
    },
    available: {
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.border
    },
    slotText: {
      fontSize: 12,
      textAlign: "right",
      fontWeight: "800"
    },
    slotHint: {
      fontSize: 10,
      color: c.textMuted,
      textAlign: "right",
      marginTop: 2,
      fontWeight: "600"
    },
    slotTextBooked: { color: c.primaryDark },
    slotTextAv: { color: c.textSecondary }
  });
}

type Props = {
  /** عند false يُخفى سطر التاريخ والوصف (مثلاً داخل بطاقة مدمجة) */
  showHeader?: boolean;
};

export const DailyScheduleGrid: React.FC<Props> = ({ showHeader = true }) => {
  const { palette } = useSettings();
  const styles = useMemo(() => makeGridStyles(palette), [palette]);
  const today = dayjs();
  const dateLabel = today.format("dddd DD MMMM YYYY");

  return (
    <View style={{ flex: 1 }}>
      {showHeader ? (
        <>
          <Text style={styles.dateLine}>{dateLabel}</Text>
          <Text style={styles.sub}>{t.schedule.subtitle}</Text>
        </>
      ) : null}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyInner}
        showsVerticalScrollIndicator
      >
        {Array.from({ length: HALF_HOUR_SLOTS }, (_, slotIndex) => {
          const label = slotLabel(slotIndex);
          const booked = slotBooked(slotIndex);
          return (
            <View key={slotIndex} style={styles.row}>
              <Text style={styles.timeLabel}>{label}</Text>
              <View style={[styles.slot, booked ? styles.booked : styles.available]}>
                <Text style={[styles.slotText, booked ? styles.slotTextBooked : styles.slotTextAv]}>
                  {booked ? t.schedule.booked : t.schedule.available}
                </Text>
                <Text style={styles.slotHint}>{t.schedule.slotHalfHour}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
