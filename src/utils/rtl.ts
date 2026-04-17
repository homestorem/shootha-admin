import { I18nManager } from "react-native";
import type { ViewStyle } from "react-native";

export function createRtl(isRTL: boolean) {
  return {
    row: (isRTL ? "row-reverse" : "row") as ViewStyle["flexDirection"],
    textAlign: (isRTL ? "right" : "left") as "right" | "left",
    writingDirection: (isRTL ? "rtl" : "ltr") as "rtl" | "ltr",
    chevronForward: (isRTL ? "chevron-back" : "chevron-forward") as "chevron-back" | "chevron-forward"
  };
}

// Backward-compatible static helpers for existing screens not migrated yet.
export const isRTL = I18nManager.isRTL;
export const rtl = createRtl(isRTL);
