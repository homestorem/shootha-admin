import { StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";
import { neonCardShell, spacing } from "../theme/tokens";

export function makeServicesStyles(c: AppPalette) {
  const isDark = c.scheme === "dark";
  return StyleSheet.create({
    scroll: {
      paddingTop: spacing.sm,
      paddingBottom: 110
    },
    heroWrap: {
      marginBottom: spacing.lg
    },
    listShell: {
      ...neonCardShell(c),
      position: "relative",
      overflow: "hidden"
    },
    glassTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? "rgba(25,25,25,0.5)" : "rgba(255,255,255,0.65)"
    },
    row: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      minHeight: 64
    },
    rowLeft: {
      flex: 1,
      alignItems: "flex-end",
      minWidth: 0
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
      color: isDark ? "#FFFFFF" : "#1A1A1A"
    },
    rowSub: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18,
      textAlign: "right",
      color: isDark ? "#B0BEC5" : "#666666"
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      backgroundColor: isDark ? c.primarySoft : "rgba(0, 200, 83, 0.10)"
    },
    iconGlow: {
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.55,
      shadowRadius: 10
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
      marginRight: spacing.lg,
      marginLeft: spacing.lg
    },
    pressed: {
      opacity: 0.92
    },
    pressedScale: {
      transform: [{ scale: 0.992 }]
    }
  });
}

