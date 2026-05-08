import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BrandBusinessMark } from "../BrandBusinessMark";
import {
  HOME_CARD_BG,
  HOME_CARD_BORDER,
  HOME_NEON,
  HOME_NEON_DIM
} from "../../screens/homeDesignTokens";
import { spacing } from "../../theme/tokens";
import { useSettings } from "../../providers/SettingsProvider";

export type HomeTabKey = "today" | "past" | "upcoming";

type Props = {
  paddingTop: number;
  welcomeNameLine: string;
  welcomeSub: string;
  addBookingLabel: string;
  addBookingSub: string;
  fieldRequestTitle: string;
  fieldRequestSub: string;
  todayLabel: string;
  pastLabel: string;
  upcomingLabel: string;
  counts: { today: number; past: number; upcoming: number };
  activeTab: HomeTabKey;
  onTab: (k: HomeTabKey) => void;
  onAddBooking: () => void;
  onFieldRequest: () => void;
};

export function HomeDashboardHero({
  paddingTop,
  welcomeNameLine,
  welcomeSub,
  addBookingLabel,
  addBookingSub,
  fieldRequestTitle,
  fieldRequestSub,
  todayLabel,
  pastLabel,
  upcomingLabel,
  counts,
  activeTab,
  onTab,
  onAddBooking,
  onFieldRequest
}: Props) {
  const { isRTL, palette } = useSettings();
  const isDark = palette.scheme === "dark";
  const chevronIcon = isRTL ? "chevron-back" : "chevron-forward";
  // نفس ألوان هيدر الإشعارات الأخضر.
  const heroGradientColors = isDark
    ? (["rgba(14, 32, 20, 0.88)", "rgba(6, 14, 9, 0.94)"] as const)
    : (["#0a5c36", "#008f4a", "#00C853"] as const);
  const heroBorderColor = isDark ? "rgba(57, 255, 20, 0.42)" : "rgba(0, 200, 83, 0.38)";
  const primaryTextColor = "#FFFFFF";
  const secondaryTextColor = "rgba(255,255,255,0.9)";
  const softCardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const softCardBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";

  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={heroGradientColors}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, { borderColor: heroBorderColor }]}
      >
        <View style={[styles.inner, { paddingTop: paddingTop + spacing.sm }]}>
          <View style={styles.topRow} accessibilityRole="header">
            <BrandBusinessMark textAlign="left" style={styles.brandMark} />
            <View style={styles.greetCol}>
              <Text style={[styles.welcomeName, { color: primaryTextColor }]} numberOfLines={2}>
                {welcomeNameLine}
              </Text>
              <Text style={[styles.welcomeSub, { color: secondaryTextColor }]} numberOfLines={2}>
                {welcomeSub}
              </Text>
            </View>
          </View>

          <View style={styles.heroRow}>
            <View style={styles.ctaCol}>
              <Pressable
                onPress={onAddBooking}
                style={({ pressed }) => [styles.addOutlineBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={addBookingLabel}
              >
                <Text style={[styles.addOutlineText, { color: primaryTextColor }]}>{addBookingLabel}</Text>
              </Pressable>
              <Text style={[styles.addOutlineSub, { color: secondaryTextColor }]} numberOfLines={3}>
                {addBookingSub}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onFieldRequest}
            style={({ pressed }) => [
              styles.fieldCard,
              { backgroundColor: softCardBg, borderColor: softCardBorder },
              pressed && styles.pressed
            ]}
            accessibilityRole="button"
          >
            <View style={styles.fieldTextWrap}>
              <Text style={[styles.fieldTitle, { color: primaryTextColor }]}>{fieldRequestTitle}</Text>
              <Text style={[styles.fieldSub, { color: secondaryTextColor }]}>{fieldRequestSub}</Text>
            </View>
            <Ionicons name={chevronIcon} size={22} color={secondaryTextColor} />
          </Pressable>

          <View style={styles.statsRow}>
            <StatBox
              active={activeTab === "today"}
              value={counts.today}
              label={todayLabel}
              onPress={() => onTab("today")}
              isDark={isDark}
            />
            <StatBox
              active={activeTab === "past"}
              value={counts.past}
              label={pastLabel}
              onPress={() => onTab("past")}
              isDark={isDark}
            />
            <StatBox
              active={activeTab === "upcoming"}
              value={counts.upcoming}
              label={upcomingLabel}
              onPress={() => onTab("upcoming")}
              isDark={isDark}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function StatBox({
  active,
  value,
  label,
  onPress,
  isDark
}: {
  active: boolean;
  value: number;
  label: string;
  onPress: () => void;
  isDark: boolean;
}) {
  const baseBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const baseBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const activeBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const activeBorder = isDark ? HOME_NEON_DIM : "rgba(0,0,0,0.2)";
  const numColor = isDark ? "#FFFFFF" : "#111111";
  const labelColor = isDark ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.55)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statBox,
        { backgroundColor: baseBg, borderColor: baseBorder },
        active && styles.statBoxActive,
        active && { backgroundColor: activeBg, borderColor: activeBorder },
        pressed && styles.pressed
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.statNum, { color: numColor }, active && styles.statNumActive]}>{value}</Text>
      <Text style={[styles.statLab, { color: labelColor }, active && styles.statLabActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 0,
    marginBottom: spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 20
      },
      android: { elevation: 12 },
      default: {}
    })
  },
  gradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)"
  },
  inner: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg + 4
  },
  topRow: {
    flexDirection: "row",
    direction: "ltr",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md
  },
  brandMark: {
    marginTop: 2,
    maxWidth: "46%"
  },
  greetCol: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: spacing.md
  },
  welcomeName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 4,
    letterSpacing: -0.2
  },
  welcomeSub: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 19,
    maxWidth: "100%",
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  heroRow: {
    flexDirection: "row",
    direction: "ltr",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    marginBottom: spacing.md
  },
  ctaCol: {
    width: 148,
    maxWidth: "100%",
    alignItems: "stretch",
    paddingTop: 4
  },
  addOutlineBtn: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: HOME_NEON,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    ...Platform.select({
      ios: {
        shadowColor: HOME_NEON,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 10
      },
      android: { elevation: 6 },
      default: {}
    })
  },
  addOutlineText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  addOutlineSub: {
    marginTop: 8,
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  fieldCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    backgroundColor: HOME_CARD_BG,
    borderWidth: 1,
    borderColor: HOME_CARD_BORDER,
    marginBottom: spacing.sm + 2,
    gap: 12
  },
  fieldTextWrap: {
    flex: 1,
    minWidth: 0
  },
  fieldTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 4
  },
  fieldSub: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18
  },
  statsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 8,
    marginTop: spacing.sm
  },
  statBox: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minHeight: 76
  },
  statBoxActive: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 2,
    borderColor: HOME_NEON_DIM,
    ...Platform.select({
      ios: {
        shadowColor: HOME_NEON,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 12
      },
      android: { elevation: 5 },
      default: {}
    })
  },
  statNum: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"] as const
  },
  statNumActive: {
    color: HOME_NEON
  },
  statLab: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)"
  },
  statLabActive: {
    color: HOME_NEON
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  }
});
