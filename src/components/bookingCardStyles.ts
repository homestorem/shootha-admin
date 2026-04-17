import { StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";
import { fontFamily } from "../theme/fonts";
import { radius, spacing } from "../theme/tokens";

export function makeBookingCardStyles(c: AppPalette) {
  return StyleSheet.create({
    card: {
      padding: spacing.lg,
      marginBottom: spacing.md
    },
    /** بعد `cardElevation` — حد أوضح للبطاقات على خلفية متدرجة */
    cardEdge: {
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(18, 18, 18, 0.14)"
    },
    cardPendingAccent: {
      borderStartWidth: 3,
      borderStartColor: c.accent
    },
    cardHighlighted: {
      borderWidth: 2,
      borderColor: c.primary,
      backgroundColor: c.primarySoft
    },
    header: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing.sm
    },
    headerPills: {
      alignItems: "flex-end",
      gap: 6
    },
    settledPill: {
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: c.border
    },
    settledPillText: {
      fontSize: 11,
      fontFamily: fontFamily.sansBold,
      color: c.textMuted
    },
    headerText: {
      flex: 1,
      marginLeft: spacing.md
    },
    fieldName: {
      fontSize: 16,
      fontFamily: fontFamily.sansBold,
      textAlign: "right",
      color: c.text,
      marginBottom: 4
    },
    playerName: {
      fontSize: 14,
      fontFamily: fontFamily.sansRegular,
      textAlign: "right",
      color: c.textMuted
    },
    statusPill: {
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 6
    },
    statusText: {
      fontSize: 12,
      fontFamily: fontFamily.sansBold
    },
    dateText: {
      fontSize: 12,
      color: c.textSubtle,
      textAlign: "right",
      marginBottom: 4,
      fontFamily: fontFamily.sansRegular
    },
    timeText: {
      fontSize: 16,
      fontFamily: fontFamily.sansBold,
      color: c.textSecondary,
      textAlign: "right",
      marginBottom: spacing.sm
    },
    metaLine: {
      fontSize: 13,
      fontFamily: fontFamily.sansRegular,
      color: c.textMuted,
      textAlign: "right",
      marginBottom: 4
    },
    createdBy: {
      fontSize: 11,
      fontFamily: fontFamily.sansRegular,
      color: c.textSubtle,
      textAlign: "right",
      marginBottom: spacing.md
    },
    actionsRow: {
      flexDirection: "row-reverse",
      justifyContent: "flex-start",
      marginTop: spacing.sm,
      gap: spacing.sm
    },
    actionButton: {
      borderRadius: radius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      minWidth: 88,
      alignItems: "center"
    },
    actionPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }]
    },
    reject: {
      backgroundColor: c.dangerSoft
    },
    approve: {
      backgroundColor: c.primary
    },
    actionText: {
      fontSize: 14,
      fontFamily: fontFamily.sansBold,
      color: c.danger
    },
    approveText: {
      color: c.textOnPrimary
    },
    ownerActions: {
      flexDirection: "row-reverse",
      gap: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: spacing.xs
    },
    smallBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.primarySoft
    },
    smallBtnText: {
      fontFamily: fontFamily.sansBold,
      color: c.primaryDark,
      fontSize: 13
    },
    smallBtnDanger: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.dangerSoft
    },
    smallBtnDangerText: {
      fontFamily: fontFamily.sansBold,
      color: c.danger,
      fontSize: 13
    },
    smallBtnAccent: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.accentMuted,
      borderWidth: 1,
      borderColor: c.accent
    },
    smallBtnAccentText: {
      fontFamily: fontFamily.sansBold,
      color: c.accent,
      fontSize: 13
    },
    attendanceBlock: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border
    },
    attendanceTitle: {
      fontSize: 13,
      fontFamily: fontFamily.sansBold,
      color: c.text,
      textAlign: "right",
      marginBottom: 4
    },
    attendanceHint: {
      fontSize: 11,
      fontFamily: fontFamily.sansRegular,
      color: c.textMuted,
      textAlign: "right",
      lineHeight: 16,
      marginBottom: spacing.sm
    },
    attendanceRow: {
      flexDirection: "row-reverse",
      gap: spacing.sm,
      justifyContent: "flex-start"
    },
    attendanceBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: "center"
    },
    attendanceBtnAttendedActive: {
      backgroundColor: c.primary,
      borderColor: c.primaryDark
    },
    attendanceBtnNoShowActive: {
      backgroundColor: c.dangerSoft,
      borderColor: c.danger
    },
    attendanceBtnDisabled: {
      opacity: 0.55
    },
    attendanceBtnText: {
      fontSize: 13,
      fontFamily: fontFamily.sansBold,
      color: c.textSecondary
    },
    attendanceBtnTextOnActive: {
      color: c.textOnPrimary
    },
    attendanceBtnTextNoShow: {
      color: c.danger,
      fontFamily: fontFamily.sansBold
    }
  });
}
