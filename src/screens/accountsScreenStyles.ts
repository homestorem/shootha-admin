import { StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";
import { neonCardShell, radius, spacing } from "../theme/tokens";

const TITLE_DARK = "#FFFFFF";
const SUB_DARK = "#B0BEC5";
/** تباين أعلى لنص «لا توجد حركات» */
const EMPTY_DARK = "#ECEFF1";
const EMPTY_LIGHT = "#212121";
const TITLE_LIGHT = "#1A1A1A";
const SUB_LIGHT = "#666666";
export function makeAccountsStyles(c: AppPalette) {
  const isDark = c.scheme === "dark";

  const titleColor = isDark ? TITLE_DARK : TITLE_LIGHT;
  const subColor = isDark ? SUB_DARK : SUB_LIGHT;

  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center"
    },
    scroll: {
      paddingBottom: 120,
      paddingTop: spacing.sm,
      writingDirection: "ltr"
    },
    heroWrap: {
      marginBottom: spacing.lg
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: titleColor,
      textAlign: "right",
      marginBottom: spacing.sm
    },
    glassShell: {
      ...neonCardShell(c),
      position: "relative",
      marginBottom: spacing.md,
      overflow: "hidden"
    },
    glassInner: {
      padding: spacing.md,
      position: "relative",
      zIndex: 2
    },
    glassInnerLg: {
      padding: spacing.lg,
      position: "relative",
      zIndex: 2
    },
    statsGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.sm
    },
    statTile: {
      width: "48%",
      flexGrow: 1,
      minWidth: "46%"
    },
    statLabel: {
      fontSize: 11,
      color: subColor,
      textAlign: "right",
      fontWeight: "700",
      marginBottom: 6
    },
    statValue: {
      fontSize: 17,
      fontWeight: "800",
      color: titleColor,
      textAlign: "right"
    },
    statValueIncome: {
      color: c.primary
    },
    statValueExpense: {
      color: c.danger
    },
    statCur: {
      fontSize: 10,
      color: subColor,
      textAlign: "right",
      marginTop: 4,
      fontWeight: "600",
      opacity: 0.9
    },
    netCardShell: {
      marginBottom: spacing.lg
    },
    netLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: titleColor,
      textAlign: "right",
      marginBottom: 4
    },
    netValue: {
      fontSize: 26,
      fontWeight: "900",
      textAlign: "right"
    },
    netPositive: {
      color: c.primary
    },
    netNegative: {
      color: c.danger
    },
    monthRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    },
    monthLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: subColor,
      textAlign: "right"
    },
    monthValue: {
      fontSize: 15,
      fontWeight: "800",
      color: c.primary,
      textAlign: "left"
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: subColor,
      textAlign: "right",
      marginBottom: 6
    },
    input: {
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.45)",
      color: titleColor,
      marginBottom: spacing.md
    },
    inputNote: {
      minHeight: 72,
      textAlignVertical: "top"
    },
    primaryBtn: {
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      marginTop: spacing.sm,
      marginBottom: spacing.xl
    },
    primaryBtnExpense: {
      backgroundColor: c.danger
    },
    primaryBtnIncome: {
      backgroundColor: c.primary
    },
    primaryBtnText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 16
    },
    pressed: {
      opacity: 0.88
    },
    emptyList: {
      textAlign: "right",
      color: isDark ? EMPTY_DARK : EMPTY_LIGHT,
      fontWeight: "800",
      fontSize: 15,
      paddingVertical: spacing.lg,
      lineHeight: 24
    },
    rowShell: {
      marginBottom: spacing.sm
    },
    rowTop: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.sm
    },
    rowLeft: {
      alignItems: "flex-end",
      flex: 1,
      minWidth: 0
    },
    rowKindRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: "flex-end"
    },
    rowKind: {
      fontSize: 13,
      fontWeight: "800",
      color: titleColor
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: isDark ? "rgba(0,200,83,0.15)" : "rgba(0,200,83,0.12)"
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: "800",
      color: c.primary
    },
    rowAmount: {
      fontSize: 16,
      fontWeight: "900",
      textAlign: "left"
    },
    rowAmountIn: {
      color: c.primary
    },
    rowAmountOut: {
      color: c.danger
    },
    rowNote: {
      marginTop: 8,
      fontSize: 14,
      color: titleColor,
      textAlign: "right",
      lineHeight: 20,
      opacity: 0.95
    },
    rowMeta: {
      marginTop: 6,
      fontSize: 11,
      color: subColor,
      textAlign: "right",
      fontWeight: "600"
    },
    rowDate: {
      marginTop: 4,
      fontSize: 11,
      color: subColor,
      textAlign: "right",
      fontWeight: "600",
      opacity: 0.85
    },
    rowSmall: {
      flexDirection: "row-reverse",
      gap: spacing.sm,
      marginBottom: spacing.sm
    },
    rowSmallItem: {
      flex: 1
    },
    /** صافي الربح في أعلى الصفحة */
    kpiHeroShell: {
      marginBottom: spacing.md
    },
    statFullRow: {
      width: "100%",
      marginBottom: spacing.sm
    }
  });
}
