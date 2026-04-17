import { StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";
import { neonCardShell, radius, spacing } from "../theme/tokens";
import { rtl } from "../utils/rtl";

export function makeFieldsStyles(c: AppPalette) {
  const isDark = c.scheme === "dark";
  return StyleSheet.create({
    root: { flex: 1, paddingTop: spacing.sm, writingDirection: rtl.writingDirection },
    pad: { padding: spacing.lg },
    flex: { flex: 1 },
    center: { justifyContent: "center", alignItems: "center" },
    loading: {
      marginTop: 12,
      fontWeight: "700",
      fontSize: 15,
      color: isDark ? "#D2DEE4" : "#3F3F3F"
    },
    header: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md
    },
    title: {
      fontSize: 32,
      fontWeight: "900",
      textAlign: "right",
      letterSpacing: -0.8,
      color: isDark ? "#FFFFFF" : "#111111"
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: 120, writingDirection: rtl.writingDirection },
    listEmpty: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 120, writingDirection: rtl.writingDirection },
    cardShell: {
      ...neonCardShell(c),
      marginBottom: spacing.md,
      overflow: "hidden",
      position: "relative"
    },
    cardFill: {
      ...StyleSheet.absoluteFillObject
    },
    cardFillDark: {
      backgroundColor: c.card
    },
    cardFillLight: {
      backgroundColor: "rgba(252, 252, 252, 0.98)"
    },
    cardInner: {
      paddingVertical: spacing.md + 4,
      paddingHorizontal: spacing.lg,
      position: "relative",
      zIndex: 2,
      writingDirection: "rtl"
    },
    cardTop: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between" },
    cardText: { flex: 1 },
    fieldName: {
      fontSize: 17,
      fontWeight: "800",
      color: isDark ? "#FFFFFF" : "#111111",
      textAlign: "right",
      writingDirection: "rtl",
      letterSpacing: -0.3
    },
    loc: {
      fontSize: 13,
      color: isDark ? "rgba(255,255,255,0.84)" : "#3F3F3F",
      textAlign: "right",
      writingDirection: "rtl",
      marginTop: 6,
      fontWeight: "600"
    },
    dashBadge: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "800",
      color: c.primary,
      textAlign: "right",
      writingDirection: "rtl"
    },
    badge: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl"
    },
    badgeOpen: {
      color: c.primary
    },
    manageLink: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "flex-end",
      marginTop: spacing.md,
      gap: 6
    },
    manageLinkText: { fontSize: 14, fontWeight: "800", color: c.primary },
    retry: {
      alignSelf: "center",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      borderRadius: radius.full
    },
    retryText: { color: c.primary, fontWeight: "700" }
  });
}
