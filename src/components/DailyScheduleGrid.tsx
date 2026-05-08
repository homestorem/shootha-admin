import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import dayjs from "../lib/dayjs";
import { formatHm12HourAr } from "../lib/timeFormat";
import { t } from "../strings";
import { useSettings } from "../providers/SettingsProvider";
import { useAuth } from "../providers/AuthProvider";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import type { AppPalette } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";
import { fetchMergedFieldsForUid } from "../services/ownerFieldsFirestore";
import { fetchOwnerBookingsForUid } from "../services/ownerBookingsFirestore";
import { endTimeFromDuration, fetchVenueBookingsForOwner, SYNC_SOURCE_OWNER_APP } from "../services/venueBookingsFirestore";

const HALF_HOUR_SLOTS = 48;

function slotLabel(slotIndex: number): string {
  const h = Math.floor(slotIndex / 2);
  const half = slotIndex % 2 === 1;
  const hm = `${h.toString().padStart(2, "0")}:${half ? "30" : "00"}`;
  return formatHm12HourAr(hm);
}

function slotStartHour(slotIndex: number): number {
  return slotIndex * 0.5;
}

function slotBooked(slotIndex: number, bookedRanges: { start: number; end: number }[]): boolean {
  const s = slotStartHour(slotIndex);
  const e = s + 0.5;
  return bookedRanges.some((r) => r.start < e && r.end > s);
}

function hmToHour(value: string): number | null {
  const parts = String(value ?? "").trim().split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h + m / 60;
}

function makeGridStyles(c: AppPalette) {
  const bookedBackground = c.scheme === "dark" ? "#FF3B30" : "#DC2626";
  const bookedBorder = c.scheme === "dark" ? "#FF8A80" : "#991B1B";
  const bookedText = c.scheme === "dark" ? "#FFECEC" : "#7F1D1D";
  const bookedHint = c.scheme === "dark" ? "rgba(255, 236, 236, 0.92)" : "rgba(127, 29, 29, 0.84)";

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
      backgroundColor: bookedBackground,
      borderWidth: 1,
      borderColor: bookedBorder
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
    slotTextBooked: { color: bookedText },
    slotTextAv: { color: c.textSecondary },
    slotHintBooked: { color: bookedHint }
  });
}

type Props = {
  /** عند false يُخفى سطر التاريخ والوصف (مثلاً داخل بطاقة مدمجة) */
  showHeader?: boolean;
};

export const DailyScheduleGrid: React.FC<Props> = ({ showHeader = true }) => {
  const { palette } = useSettings();
  const { user } = useAuth();
  const styles = useMemo(() => makeGridStyles(palette), [palette]);
  const [bookedRanges, setBookedRanges] = useState<{ start: number; end: number }[]>([]);
  const today = dayjs();
  const dateLabel = today.format("dddd DD MMMM YYYY");
  const todayIso = today.format("YYYY-MM-DD");

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!isFirebaseConfigured() || !user?.id) {
        if (alive) setBookedRanges([]);
        return;
      }
      const ownerUid = user.id.trim();
      const ownerPublicId = (user.ownerId ?? deriveOwnerIdFromUid(ownerUid)).trim();
      if (!ownerUid || !ownerPublicId) {
        if (alive) setBookedRanges([]);
        return;
      }

      try {
        const [fields, ownerBookings, venueBookings] = await Promise.all([
          fetchMergedFieldsForUid(ownerUid, ownerPublicId),
          fetchOwnerBookingsForUid(ownerUid),
          fetchVenueBookingsForOwner(ownerPublicId)
        ]);
        const ownedFieldIds = new Set(fields.map((f) => String(f.id ?? "").trim()).filter(Boolean));

        const ownerRanges = ownerBookings
          .filter((b) => b.date === todayIso)
          .filter((b) => b.status === "approved" || b.status === "confirmed")
          .filter((b) => ownedFieldIds.size === 0 || ownedFieldIds.has(String(b.fieldId ?? "").trim()))
          .map((b) => {
            const start = hmToHour(b.startTime);
            const end = hmToHour(b.endTime);
            return start != null && end != null && end > start ? { start, end } : null;
          })
          .filter((r): r is { start: number; end: number } => r != null);

        const venueRanges = venueBookings
          .filter((v) => v.date === todayIso)
          .filter((v) => v.syncSource !== SYNC_SOURCE_OWNER_APP)
          .filter((v) => v.status === "approved" || v.status === "confirmed")
          .filter((v) => ownedFieldIds.size === 0 || ownedFieldIds.has(String(v.venueId ?? "").trim()))
          .map((v) => {
            const end = endTimeFromDuration(v.date, v.startTime, v.duration);
            const startH = hmToHour(v.startTime);
            const endH = hmToHour(end);
            return startH != null && endH != null && endH > startH ? { start: startH, end: endH } : null;
          })
          .filter((r): r is { start: number; end: number } => r != null);

        if (alive) setBookedRanges([...ownerRanges, ...venueRanges]);
      } catch {
        if (alive) setBookedRanges([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [todayIso, user?.id, user?.ownerId]);

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
          const booked = slotBooked(slotIndex, bookedRanges);
          return (
            <View key={slotIndex} style={styles.row}>
              <Text style={styles.timeLabel}>{label}</Text>
              <View style={[styles.slot, booked ? styles.booked : styles.available]}>
                <Text style={[styles.slotText, booked ? styles.slotTextBooked : styles.slotTextAv]}>
                  {booked ? t.schedule.booked : t.schedule.available}
                </Text>
                <Text style={[styles.slotHint, booked ? styles.slotHintBooked : null]}>{t.schedule.slotHalfHour}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
