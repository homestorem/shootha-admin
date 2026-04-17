import { StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";
import { neonCardShell, radius, spacing } from "../theme/tokens";

export function makeServicesHubStyles(c: AppPalette) {
  const isDark = c.scheme === "dark";
  return StyleSheet.create({
    scroll: {
      paddingTop: spacing.sm,
      paddingBottom: 110
    },
    heroWrap: {
      marginBottom: spacing.lg
    },
    grid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 14
    },
    tileWrap: {
      width: "48%",
      flexGrow: 1,
      minWidth: "46%"
    },
    glassShell: {
      ...neonCardShell(c),
      position: "relative",
      overflow: "hidden"
    },
    glassTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? "rgba(25,25,25,0.5)" : "rgba(255,255,255,0.65)"
    },
    inner: {
      padding: spacing.lg,
      minHeight: 140,
      alignItems: "flex-end",
      justifyContent: "space-between"
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-end",
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
    tileTitle: {
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
      color: isDark ? "#FFFFFF" : "#1A1A1A",
      marginTop: spacing.sm
    },
    tileSub: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18,
      textAlign: "right",
      color: isDark ? "#B0BEC5" : "#666666"
    },
    pressed: {
      opacity: 0.92
    },
    pressedScale: {
      transform: [{ scale: 0.985 }]
    }
  });
}

