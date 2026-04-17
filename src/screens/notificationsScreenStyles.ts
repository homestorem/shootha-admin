import { Platform, StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";
import { rtl } from "../utils/rtl";

const YELLOW = "#FFC107";

export function makeNotificationsStyles(c: AppPalette) {
  const isDark = c.scheme === "dark";

  return StyleSheet.create({
    center: {
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      paddingVertical: spacing.xxxl
    },
    retryBtn: {
      marginTop: spacing.lg,
      alignSelf: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 4,
      backgroundColor: c.primarySoft,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.primaryMuted
    },
    retryText: {
      color: c.primary,
      fontWeight: "800",
      fontSize: 15
    },
    root: {
      flex: 1,
      paddingTop: spacing.sm,
      writingDirection: rtl.writingDirection
    },
    list: {
      flex: 1
    },
    listPadGrow: {
      paddingBottom: 100,
      paddingTop: spacing.xs,
      flexGrow: 1,
      paddingHorizontal: 0
    },

    markAllPill: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: "rgba(255,255,255,0.96)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.45)"
    },
    markAllPillText: {
      color: c.primaryDeep,
      fontWeight: "800",
      fontSize: 13
    },

    itemOuter: {
      marginBottom: 12
    },
    cardShell: {
      borderRadius: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      position: "relative",
      ...Platform.select({
        ios: {
          shadowColor: c.primary,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: isDark ? 0.12 : 0.06,
          shadowRadius: 14
        },
        android: { elevation: isDark ? 4 : 2 },
        default: {}
      })
    },
    cardShellUnread: {
      borderColor: isDark ? "rgba(57, 255, 20, 0.45)" : "rgba(0, 200, 83, 0.35)",
      borderWidth: 1.5
    },
    cardTintBase: {
      ...StyleSheet.absoluteFillObject
    },
    cardTintDark: {
      backgroundColor: c.card
    },
    cardTintLight: {
      backgroundColor: "rgba(252, 252, 252, 0.97)"
    },
    cardTintWarning: {
      backgroundColor: "rgba(255, 193, 7, 0.15)"
    },
    accentStripe: {
      position: "absolute",
      right: 0,
      top: "12%",
      bottom: "12%",
      width: 3,
      borderRadius: 2,
      backgroundColor: c.primary,
      zIndex: 3
    },
    cardInner: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      position: "relative",
      zIndex: 2
    },
    itemRow: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      gap: spacing.md
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"
    },
    itemMain: {
      flex: 1,
      minWidth: 0
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
      lineHeight: 22,
      letterSpacing: -0.2,
      color: isDark ? "#FFFFFF" : "#1A1A1A"
    },
    itemBody: {
      marginTop: 6,
      fontSize: 14,
      textAlign: "right",
      writingDirection: "rtl",
      lineHeight: 20,
      fontWeight: "500",
      color: isDark ? "#D0DCE2" : "#3F3F3F"
    },
    itemMeta: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 10
    },
    typePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
      borderWidth: 1
    },
    typePillText: {
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center"
    },
    typePillBooking: {
      backgroundColor: c.primarySoft,
      borderColor: c.primaryMuted
    },
    typePillBookingText: {
      color: c.primary
    },
    typePillApproval: {
      backgroundColor: "rgba(255, 193, 7, 0.18)",
      borderColor: "rgba(255, 193, 7, 0.45)"
    },
    typePillApprovalText: {
      color: YELLOW
    },
    typePillSystem: {
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
    },
    typePillSystemText: {
      color: isDark ? "#C5CFD4" : "#5A5A5A"
    },
    timeWrap: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 4
    },
    timeText: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#C5CFD4" : "#5A5A5A"
    },
    ctaInline: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 4,
      maxWidth: "100%"
    },
    ctaText: {
      fontSize: 12,
      color: c.primary,
      fontWeight: "800",
      flexShrink: 1,
      textAlign: "right",
      writingDirection: "rtl"
    }
  });
}
