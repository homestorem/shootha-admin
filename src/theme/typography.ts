import { TextStyle } from "react-native";
import { colors } from "./colors";
import { fontFamily } from "./fonts";

/** عناوين وأزرار: Bold (Cairo) — نصوص فرعية: Regular */
export const typography: Record<string, TextStyle> = {
  brand: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primaryDark,
    textAlign: "right"
  },
  h1: {
    fontFamily: fontFamily.sansBold,
    fontSize: 28,
    letterSpacing: -0.6,
    color: colors.text,
    textAlign: "right"
  },
  h2: {
    fontFamily: fontFamily.sansBold,
    fontSize: 22,
    color: colors.text,
    textAlign: "right"
  },
  h3: {
    fontFamily: fontFamily.sansBold,
    fontSize: 18,
    color: colors.text,
    textAlign: "right"
  },
  subtitle: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 21
  },
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 22
  },
  caption: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: "right"
  },
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right"
  },
  button: {
    fontFamily: fontFamily.sansBold,
    fontSize: 16
  },
  /** مبالغ وأرقام بصرياً أوضح */
  numeric: {
    fontFamily: fontFamily.latinBold,
    fontSize: 16
  }
};
