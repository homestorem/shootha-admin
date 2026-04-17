import type { TextStyle } from "react-native";
import type { AppPalette } from "./colors";
import { fontFamily } from "./fonts";

export function onBackgroundBrand(_p: AppPalette): TextStyle {
  return {};
}

export function onBackgroundTitle(p: AppPalette): TextStyle {
  return { color: p.text, fontFamily: fontFamily.sansBold };
}

export function onBackgroundSubtitle(p: AppPalette): TextStyle {
  return { color: p.textSecondary, fontFamily: fontFamily.sansRegular };
}

export function onBackgroundSection(p: AppPalette): TextStyle {
  return { color: p.text, fontFamily: fontFamily.sansBold };
}
