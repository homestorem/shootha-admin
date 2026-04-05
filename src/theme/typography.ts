import { TextStyle } from "react-native";
import { colors } from "./colors";

export const typography: Record<string, TextStyle> = {
  brand: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.primaryDark,
    textAlign: "right"
  },
  h1: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: colors.text,
    textAlign: "right"
  },
  h2: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right"
  },
  h3: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right"
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 21
  },
  body: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "right",
    lineHeight: 22
  },
  caption: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSubtle,
    textAlign: "right"
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "right"
  },
  button: {
    fontSize: 16,
    fontWeight: "800"
  }
};
