import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "../navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "../lib/dayjs";
import { t } from "../strings";
import { ScreenShell } from "../components/ScreenShell";
import { colors } from "../theme/colors";
import { cardElevation, radius, spacing } from "../theme/tokens";

/** ٤٨ فترة × نصف ساعة (٠٠:٠٠ — ٢٣:٣٠) */
const HALF_HOUR_SLOTS = 48;

/** نطاقات تجريبية بنفس منطق الحجز (ساعة / ساعة ونص) كساعات عشرية */
const bookedRanges: { start: number; end: number }[] = [
  { start: 18, end: 19 },
  { start: 19.5, end: 21 }
];

function slotLabel(slotIndex: number): string {
  const h = Math.floor(slotIndex / 2);
  const half = slotIndex % 2 === 1;
  return `${h.toString().padStart(2, "0")}:${half ? "30" : "00"}`;
}

/** بداية الفترة كساعة عشرية (٠ = ٠٠:٠٠، ٠٫٥ = ٠٠:٣٠) */
function slotStartHour(slotIndex: number): number {
  return slotIndex * 0.5;
}

function slotBooked(slotIndex: number): boolean {
  const s = slotStartHour(slotIndex);
  const e = s + 0.5;
  return bookedRanges.some((r) => r.start < e && r.end > s);
}

export const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const today = dayjs();
  const dateLabel = today.format("dddd DD MMMM YYYY");

  return (
    <ScreenShell>
      <View style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.navigate("Home")}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
            hitSlop={12}
          >
            <Ionicons name="chevron-forward" size={26} color={colors.primary} />
            <Text style={styles.backText}>{t.schedule.backToBookings}</Text>
          </Pressable>
        </View>
        <View style={styles.head}>
          <Text style={styles.title}>{t.schedule.title}</Text>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.sub}>{t.schedule.subtitle}</Text>
        </View>
        <ScrollView
          style={[styles.timeline, cardElevation(true)]}
          contentContainerStyle={styles.timelineInner}
          showsVerticalScrollIndicator={false}
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
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    paddingBottom: 100
  },
  topBar: {
    paddingTop: spacing.xs,
    marginBottom: spacing.sm
  },
  backBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: 6
  },
  backPressed: {
    opacity: 0.78
  },
  backText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary
  },
  head: {
    marginBottom: spacing.md
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    marginBottom: 4,
    letterSpacing: -0.5
  },
  date: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "right",
    fontWeight: "600"
  },
  sub: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: "right",
    lineHeight: 18,
    fontWeight: "600"
  },
  timeline: {
    flex: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xs
  },
  timelineInner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxxl
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    marginVertical: 3
  },
  timeLabel: {
    width: 52,
    textAlign: "right",
    fontSize: 11,
    color: colors.textSubtle,
    fontWeight: "800",
    paddingTop: 8
  },
  slot: {
    flex: 1,
    borderRadius: radius.sm + 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
    minHeight: 40,
    justifyContent: "center"
  },
  booked: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryMuted
  },
  available: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  slotText: {
    fontSize: 12,
    textAlign: "right",
    fontWeight: "800"
  },
  slotHint: {
    fontSize: 10,
    color: colors.textSubtle,
    textAlign: "right",
    marginTop: 2,
    fontWeight: "600"
  },
  slotTextBooked: {
    color: colors.primaryDark
  },
  slotTextAv: {
    color: colors.textMuted
  }
});
