import { Platform, StyleSheet, Text } from "react-native";
import type { AppPalette } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";
import { rtl } from "../utils/rtl";

export function makeBookingsStyles(c: AppPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: 0,
      writingDirection: rtl.writingDirection
    },
    headerBtnPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.97 }]
    },
    /** حواف أفقية مع الهيرو fullBleed — الفاتح والداكن */
    listInsetHome: {
      flex: 1,
      paddingHorizontal: spacing.lg
    },
    listSectionTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: "#FFFFFF",
      textAlign: "right",
      writingDirection: "rtl",
      marginBottom: spacing.md,
      marginTop: spacing.xs,
      letterSpacing: -0.3
    },
    homeEmptyCard: {
      alignSelf: "stretch",
      marginVertical: spacing.xl,
      paddingVertical: spacing.xxxl + 8,
      paddingHorizontal: spacing.lg,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: "rgba(57, 255, 20, 0.42)",
      backgroundColor: "rgba(20, 28, 22, 0.72)",
      alignItems: "center",
      justifyContent: "center"
    },
    homeEmptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#FFFFFF",
      marginTop: spacing.md,
      textAlign: "center"
    },
    homeEmptySubtitle: {
      fontSize: 12,
      fontWeight: "600",
      color: "rgba(255,255,255,0.68)",
      marginTop: spacing.sm,
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: spacing.sm
    },
    listContent: {
      paddingBottom: 100
    },
    listEmptyGrow: {
      flexGrow: 1
    },
    /** محتوى ScrollView داخل مودالات الحجز — بدون flexGrow/justifyContent flex-end (تكسر التمرير وتخفي الأزرار). */
    bookingModalScrollContent: {
      writingDirection: "rtl",
      paddingBottom: spacing.lg
    },
    modalSheetScroll: {
      maxHeight: "92%",
      width: "100%"
    },
    warnText: {
      fontSize: 13,
      color: c.accent,
      textAlign: "right",
      marginBottom: 10,
      lineHeight: 20,
      fontWeight: "600"
    },
    addedFieldsSectionTitle: {
      fontSize: 15,
      fontWeight: "900",
      color: c.text,
      textAlign: "right",
      marginBottom: spacing.sm
    },
    fieldListRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(18, 18, 18, 0.1)"
    },
    fieldListRowPressed: {
      opacity: 0.88
    },
    fieldListTextCol: {
      flex: 1,
      minWidth: 0
    },
    fieldListName: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      textAlign: "right"
    },
    fieldListLoc: {
      marginTop: 4,
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "right",
      fontWeight: "600"
    },
    selectedFieldBar: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primaryMuted
    },
    selectedFieldBarText: {
      flex: 1,
      minWidth: 0
    },
    selectedFieldLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      textAlign: "right",
      marginBottom: 2
    },
    selectedFieldName: {
      fontSize: 15,
      fontWeight: "900",
      color: c.primaryDark,
      textAlign: "right"
    },
    changeFieldBtn: {
      paddingVertical: 8,
      paddingHorizontal: spacing.sm + 2
    },
    changeFieldBtnText: {
      fontSize: 13,
      fontWeight: "800",
      color: c.primary
    },
    durationChips: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 12
    },
    durationChip: {
      flex: 1,
      minWidth: "42%" as const,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: c.scheme === "dark" ? c.surfaceCard : c.surfaceMuted,
      borderWidth: 2,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(18, 18, 18, 0.1)",
      alignItems: "center"
    },
    durationChipActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
      borderWidth: 2
    },
    durationChipTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text
    },
    durationChipTitleActive: {
      color: c.primaryDark
    },
    durationChipSub: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 4,
      fontWeight: "600"
    },
    durationChipSubActive: {
      color: c.primary
    },
    inputLabel: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "right",
      marginBottom: 4,
      fontWeight: "700"
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "flex-end"
    },
    modalCard: {
      backgroundColor: c.surfaceCard,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      borderTopWidth: 3,
      borderTopColor: c.primary,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderLeftColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(18, 18, 18, 0.08)",
      borderRightColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(18, 18, 18, 0.08)",
      padding: spacing.xl,
      position: "relative",
      zIndex: 2,
      pointerEvents: "auto",
      writingDirection: "rtl"
    },
    modalHeaderRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      marginBottom: spacing.md
    },
    modalCloseBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      marginRight: -spacing.sm,
      borderRadius: radius.full
    },
    modalTitleInHeader: {
      flex: 1,
      fontSize: 20,
      fontWeight: "800",
      textAlign: "center",
      color: c.text,
      letterSpacing: -0.3
    },
    modalHeaderSpacer: {
      width: 44,
      height: 44
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: spacing.lg,
      color: c.text,
      letterSpacing: -0.3
    },
    input: {
      borderWidth: 2,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.16)" : "rgba(18, 18, 18, 0.12)",
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      marginBottom: spacing.sm + 2,
      backgroundColor: c.scheme === "dark" ? "#252525" : c.surfaceMuted,
      color: c.text
    },
    modalActions: {
      flexDirection: "row-reverse",
      marginTop: spacing.md
    },
    modalButton: {
      flex: 1,
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      alignItems: "center"
    },
    modalCancel: {
      backgroundColor: c.surfaceMuted,
      marginRight: spacing.sm,
      borderWidth: 1.5,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(18, 18, 18, 0.12)"
    },
    modalPrimary: {
      backgroundColor: c.primary
    },
    modalCancelText: {
      color: c.text,
      fontWeight: "800"
    },
    modalPrimaryText: {
      color: c.textOnPrimary,
      fontWeight: "800"
    }
  });
}

export type BookingsStyles = ReturnType<typeof makeBookingsStyles>;
