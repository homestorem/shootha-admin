import { Platform, ViewStyle } from "react-native";
import type { AppPalette } from "./colors";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999
} as const;

/** كرت زجاجي حديث فوق الخلفية — تباين واضح وحواف ناعمة */
export function cardElevation(palette: AppPalette, elevated = false): ViewStyle {
  const isDark = palette.scheme === "dark";
  const base: ViewStyle = {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(12, 18, 34, 0.07)",
    backgroundColor: isDark ? palette.surfaceCard : "rgba(255, 255, 255, 0.94)",
    overflow: "hidden"
  };
  if (Platform.OS === "web") {
    return {
      ...base,
      boxShadow: elevated
        ? isDark
          ? "0 12px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.06) inset, 0 1px 0 rgba(255, 255, 255, 0.05) inset"
          : "0 10px 36px rgba(12, 18, 34, 0.1), 0 2px 8px rgba(15, 61, 46, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.8) inset"
        : isDark
          ? "0 4px 20px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.04) inset"
          : "0 4px 20px rgba(12, 18, 34, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.75) inset"
    } as ViewStyle;
  }
  return {
    ...base,
    shadowColor: isDark ? "#000000" : "#0c1222",
    shadowOffset: { width: 0, height: elevated ? 12 : 6 },
    shadowOpacity: isDark ? (elevated ? 0.42 : 0.28) : elevated ? 0.11 : 0.06,
    shadowRadius: elevated ? 24 : 16,
    elevation: elevated ? 10 : 5
  };
}

export function modalBackdropStyle(palette: AppPalette): ViewStyle {
  return { backgroundColor: palette.overlay };
}

/** إطار بطاقة ناعم مع وهج أخضر خفيف — بدون blur */
export function neonCardShell(palette: AppPalette): ViewStyle {
  const d = palette.scheme === "dark";
  return {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: d ? "rgba(57, 255, 20, 0.22)" : "rgba(0, 200, 83, 0.16)",
    ...Platform.select({
      ios: {
        shadowColor: palette.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: d ? 0.16 : 0.08,
        shadowRadius: 14
      },
      android: { elevation: d ? 5 : 3 },
      web: {
        boxShadow: d
          ? "0 8px 28px rgba(0,0,0,0.28), 0 0 20px rgba(57,255,20,0.08)"
          : "0 6px 20px rgba(12,18,34,0.06)"
      },
      default: {}
    })
  };
}
