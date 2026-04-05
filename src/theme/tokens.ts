import { Platform, ViewStyle } from "react-native";
import { colors } from "./colors";

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

/** ظل ناعم للكروت — متوافق مع الويب */
export function cardElevation(elevated = false): ViewStyle {
  const base: ViewStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard
  };
  if (Platform.OS === "web") {
    return {
      ...base,
      boxShadow: elevated
        ? "0 4px 24px rgba(15, 61, 46, 0.08), 0 1px 3px rgba(12, 18, 34, 0.06)"
        : "0 1px 3px rgba(12, 18, 34, 0.06), 0 8px 24px rgba(12, 18, 34, 0.04)"
    };
  }
  return {
    ...base,
    shadowColor: "#0c1222",
    shadowOffset: { width: 0, height: elevated ? 8 : 4 },
    shadowOpacity: elevated ? 0.1 : 0.06,
    shadowRadius: elevated ? 20 : 12,
    elevation: elevated ? 6 : 3
  };
}

export function modalBackdropStyle(): ViewStyle {
  return { backgroundColor: colors.overlay };
}
