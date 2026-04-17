import { StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

export function makeFieldRequestBottomSheetStyles(c: AppPalette) {
  const backdropBase = c.scheme === "dark" ? "rgba(0,0,0,0.85)" : "rgba(12, 18, 34, 0.55)";
  return StyleSheet.create({
    kavRoot: {
      flex: 1,
      pointerEvents: "box-none"
    },
    keyboardAccessoryBar: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 100000,
      elevation: 48,
      backgroundColor: c.surfaceCard,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingVertical: 10,
      paddingHorizontal: spacing.lg,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "flex-start"
    },
    keyboardDoneBtn: {
      paddingVertical: 6,
      paddingHorizontal: spacing.md
    },
    keyboardDoneText: {
      fontSize: 17,
      fontWeight: "800",
      color: c.primary
    },
    root: {
      flex: 1,
      justifyContent: "flex-end",
      pointerEvents: "box-none"
    },
    backdropPressable: {
      zIndex: 0
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: backdropBase
    },
    sheetBody: {
      flex: 1,
      minHeight: 0,
      position: "relative",
      width: "100%"
    },
    sheetScroll: {
      flex: 1,
      minHeight: 0
    },
    sheet: {
      backgroundColor: c.surfaceCard,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      width: "100%",
      zIndex: 10,
      overflow: "hidden",
      flexDirection: "column",
      shadowColor: c.scheme === "dark" ? "#000" : "#0c1222",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: c.scheme === "dark" ? 0.5 : 0.15,
      shadowRadius: 28,
      elevation: 24
    },
    hero: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm + 2,
      paddingBottom: spacing.lg + 2
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.35)",
      marginBottom: 14
    },
    heroTop: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center"
    },
    closeBtn: {
      padding: 6
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: "#FFFFFF",
      textAlign: "right",
      marginBottom: 6
    },
    heroSub: {
      fontSize: 14,
      color: "rgba(255,255,255,0.9)",
      textAlign: "right",
      lineHeight: 21,
      marginBottom: 16
    },
    progressRow: {
      flexDirection: "row-reverse",
      gap: 8,
      marginBottom: 10
    },
    progressSeg: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.28)"
    },
    progressSegActive: {
      backgroundColor: "#FFFFFF"
    },
    stepBadge: {
      fontSize: 12,
      fontWeight: "700",
      color: "rgba(255,255,255,0.88)",
      textAlign: "right"
    },
    scrollPad: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      writingDirection: "ltr"
    },
    inputLabel: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "right",
      marginBottom: 6,
      fontWeight: "700"
    },
    optionsWrap: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: spacing.md + 2
    },
    optionChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceMuted
    },
    optionChipActive: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft
    },
    optionChipText: {
      fontSize: 13,
      fontWeight: "800",
      color: c.text,
      textAlign: "right"
    },
    optionChipTextActive: {
      color: c.primaryDark
    },
    phoneRow: {
      flexDirection: "row",
      alignItems: "stretch",
      writingDirection: "ltr",
      marginBottom: spacing.md + 2,
      gap: 8
    },
    phoneInputOuter: {
      flex: 1,
      minWidth: 0,
      alignSelf: "stretch"
    },
    phoneInputFlex: {
      flex: 1,
      width: "100%",
      marginBottom: 0
    },
    dialPrefix: {
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surfaceMuted
    },
    dialPrefixText: {
      fontSize: 15,
      fontWeight: "800",
      color: c.primary
    },
    input: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      fontSize: 16,
      marginBottom: spacing.md + 2,
      backgroundColor: c.surfaceMuted,
      color: c.text
    },
    inputMultiline: {
      minHeight: 100,
      textAlignVertical: "top"
    },
    readonlyIdBox: {
      justifyContent: "center",
      minHeight: 48
    },
    readonlyIdText: {
      fontSize: 16,
      color: c.textSecondary,
      textAlign: "right",
      fontWeight: "600"
    },
    idHintMuted: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "right",
      marginBottom: 10
    },
    summary: {
      backgroundColor: c.surfaceMuted,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
      textAlign: "right",
      marginBottom: 10
    },
    summaryLine: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "right",
      lineHeight: 22,
      marginBottom: 4
    },
    actions: {
      flexDirection: "row-reverse",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border
    },
    btnSecondary: {
      flex: 1,
      borderRadius: radius.full,
      paddingVertical: spacing.md + 2,
      alignItems: "center",
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.border
    },
    btnSecondaryText: {
      fontSize: 15,
      fontWeight: "800",
      color: c.textSecondary
    },
    btnPrimary: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: c.primary
    },
    btnDisabled: {
      opacity: 0.45
    },
    btnPrimaryText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#FFFFFF"
    },
    pressed: {
      opacity: 0.92
    }
  });
}
