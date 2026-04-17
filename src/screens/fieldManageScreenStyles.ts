import { StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

export function makeFieldManageStyles(c: AppPalette) {
  return StyleSheet.create({
    scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 120, writingDirection: "rtl" },
    /** لوح صلب فوق خلفية الصورة — تباين قوي للنصوص */
    panel: {
      backgroundColor: c.surfaceCard,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.16)" : "rgba(18, 18, 18, 0.12)"
    },
    metaTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: c.text,
      textAlign: "right",
      marginBottom: spacing.sm
    },
    metaLine: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: "right",
      marginBottom: 6,
      fontWeight: "600",
      lineHeight: 20
    },
    sectionFirst: { marginTop: 0 },
    err: { padding: spacing.lg, textAlign: "center" },
    banner: {
      backgroundColor: c.dangerSoft,
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(255, 59, 48, 0.55)" : "rgba(255, 59, 48, 0.35)"
    },
    bannerText: { textAlign: "right", color: c.danger, fontWeight: "700" },
    section: {
      fontSize: 17,
      fontWeight: "800",
      color: c.text,
      textAlign: "right",
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(18, 18, 18, 0.08)"
    },
    hint: { fontSize: 13, color: c.textSecondary, textAlign: "right", marginBottom: spacing.sm, fontWeight: "600" },
    muted: { color: c.textSecondary, textAlign: "right", marginBottom: spacing.md, fontWeight: "600" },
    input: {
      borderWidth: 2,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.16)" : "rgba(18, 18, 18, 0.12)",
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: c.scheme === "dark" ? "#252525" : c.surfaceMuted,
      color: c.text
    },
    multiline: { minHeight: 72, textAlignVertical: "top" },
    label: { fontSize: 13, fontWeight: "800", color: c.text, textAlign: "right", marginBottom: 6 },
    slotWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
    slotChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderRadius: radius.md,
      backgroundColor: c.scheme === "dark" ? "#2E2E2E" : "#FFFFFF",
      borderWidth: 1.5,
      borderColor: c.scheme === "dark" ? "rgba(0, 230, 118, 0.5)" : "rgba(0, 200, 120, 0.45)"
    },
    slotChipText: { fontWeight: "800", color: c.text, fontSize: 13 },
    durRow: { flexDirection: "row-reverse", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" },
    durChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(18, 18, 18, 0.1)",
      backgroundColor: c.scheme === "dark" ? c.surfaceCard : c.surfaceMuted
    },
    durChipOn: { backgroundColor: c.primary, borderColor: c.primary },
    durChipText: { fontWeight: "800", color: c.textSecondary },
    durChipTextOn: { color: c.textOnPrimary },
    primaryBtn: {
      backgroundColor: c.primary,
      paddingVertical: 14,
      borderRadius: radius.full,
      alignItems: "center",
      marginTop: spacing.md
    },
    primaryBtnText: { color: c.textOnPrimary, fontWeight: "800", fontSize: 16 },
    disabled: { opacity: 0.45 },
    bCard: {
      backgroundColor: c.surfaceCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md
    },
    bCardEdge: {
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(18, 18, 18, 0.14)"
    },
    bDate: { fontWeight: "800", textAlign: "right", color: c.text, marginBottom: 6 },
    bMeta: { fontSize: 13, color: c.textSecondary, textAlign: "right", marginBottom: 4 },
    bActions: { flexDirection: "row-reverse", gap: spacing.lg, marginTop: spacing.sm },
    linkBtn: { paddingVertical: 6 },
    linkTxt: { fontWeight: "800", color: c.primary },
    modalBg: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "flex-end"
    },
    modalSheetScroll: {
      maxHeight: "92%",
      width: "100%"
    },
    modalScrollContent: {
      writingDirection: "rtl",
      paddingBottom: spacing.lg
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
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md
    },
    modalCloseBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: -spacing.sm,
      borderRadius: radius.full
    },
    modalTitleInHeader: {
      flex: 1,
      fontSize: 20,
      fontWeight: "900",
      textAlign: "center",
      color: c.text
    },
    modalHeaderSpacer: { width: 44, height: 44 },
    modalTitle: { fontSize: 20, fontWeight: "900", textAlign: "right", marginBottom: spacing.md },
    modalRow: { flexDirection: "row-reverse", gap: 10, marginTop: spacing.lg },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.full, alignItems: "center" },
    cancel: {
      backgroundColor: c.surfaceMuted,
      borderWidth: 1.5,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(18, 18, 18, 0.12)"
    },
    save: { backgroundColor: c.primary },
    cancelTxt: { color: c.text, fontWeight: "800" },
    saveTxt: { color: c.textOnPrimary, fontWeight: "800" },

    /** —— تصميم شوتها (بطاقة خضراء، فترات عمودية، شريط سفلي) —— */
    pageRoot: { flex: 1 },
    scrollShoot: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 168,
      writingDirection: "rtl"
    },
    heroCard: {
      backgroundColor: c.primary,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      overflow: "hidden"
    },
    heroRow: {
      flexDirection: "row-reverse",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md
    },
    heroLeftCol: { flex: 1, justifyContent: "center", gap: 10 },
    heroMetaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
    heroMetaText: { fontSize: 15, fontWeight: "800", color: c.textOnPrimary },
    heroRightCol: { alignItems: "flex-end", justifyContent: "center" },
    heroPriceMain: {
      fontSize: 28,
      fontWeight: "900",
      color: c.textOnPrimary,
      textAlign: "right",
      letterSpacing: -0.5
    },
    heroPriceUnit: { fontSize: 14, fontWeight: "800", color: c.textOnPrimary, marginTop: 4, textAlign: "right" },
    fieldNameHeadline: {
      fontSize: 22,
      fontWeight: "900",
      color: c.text,
      textAlign: "right",
      marginBottom: spacing.sm
    },
    subRow: { flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
    starText: { fontSize: 14, fontWeight: "800", color: c.accent },
    ratingBadge: {
      backgroundColor: c.primarySoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full
    },
    ratingBadgeText: { fontSize: 12, fontWeight: "800", color: c.primaryDark },
    categoryRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: spacing.sm },
    categoryText: { fontSize: 14, fontWeight: "700", color: c.textSecondary },
    descBlock: {
      fontSize: 14,
      lineHeight: 22,
      color: c.textSecondary,
      textAlign: "right",
      marginBottom: spacing.md,
      fontWeight: "600"
    },
    servicesWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
    serviceChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.scheme === "dark" ? "#2A2A2A" : c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(0, 230, 118, 0.35)" : "rgba(0, 200, 120, 0.25)"
    },
    serviceChipText: { fontSize: 12, fontWeight: "800", color: c.text },
    shootSectionTitle: {
      fontSize: 17,
      fontWeight: "900",
      color: c.text,
      textAlign: "right",
      marginBottom: spacing.sm
    },
    shootHint: { fontSize: 12, color: c.textMuted, textAlign: "right", marginBottom: spacing.md, fontWeight: "600" },
    dateRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
    dateInputCompact: {
      flex: 1,
      borderWidth: 2,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(18, 18, 18, 0.1)",
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      backgroundColor: c.scheme === "dark" ? "#252525" : c.surfaceMuted,
      color: c.text,
      fontWeight: "700"
    },
    durationPriceScroll: {
      flexDirection: "row-reverse",
      gap: 10,
      paddingVertical: 6,
      paddingHorizontal: 2,
      marginBottom: spacing.md
    },
    durationPriceCard: {
      width: 112,
      minHeight: 96,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(18, 18, 18, 0.1)",
      backgroundColor: c.scheme === "dark" ? "#252525" : c.surfaceMuted
    },
    durationPriceCardOn: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft
    },
    durationPriceTitle: { fontSize: 14, fontWeight: "900", color: c.text, textAlign: "center" },
    durationPriceTitleOn: { color: c.primaryDark },
    durationPriceAmount: {
      fontSize: 12,
      fontWeight: "800",
      color: c.primary,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 18
    },
    durationPriceAmountOn: { color: c.primaryDark },
    slotList: { gap: 8, marginBottom: spacing.md },
    slotRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.scheme === "dark" ? "#2A2A2A" : "#F5F5F5",
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)"
    },
    slotRowSelected: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft
    },
    slotRowTime: { fontSize: 16, fontWeight: "900", color: c.text },
    slotRowTimeSelected: { color: c.primaryDark },
    slotBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: c.primary
    },
    slotBadgeSelected: {
      backgroundColor: c.primaryDark
    },
    slotBadgeText: { fontSize: 12, fontWeight: "900", color: c.textOnPrimary },
    slotBadgeTextSelected: { color: "#FFFFFF" },
    sizeRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
    sizeChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(18, 18, 18, 0.1)",
      backgroundColor: c.scheme === "dark" ? "#252525" : c.surfaceMuted
    },
    sizeChipOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
    sizeChipText: { fontWeight: "800", color: c.text },
    sizeChipTextOn: { color: c.primaryDark },
    extraCard: {
      flexDirection: "row-reverse",
      alignItems: "center",
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: c.scheme === "dark" ? "#2A2A2A" : "#F5F5F5",
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)"
    },
    extraCheckbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: c.primary, marginLeft: spacing.md },
    extraCheckboxOn: { backgroundColor: c.primary },
    extraName: { flex: 1, fontSize: 13, fontWeight: "700", color: c.text, textAlign: "right" },
    extraPrice: { fontSize: 13, fontWeight: "900", color: c.primary },
    ratingSection: {
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: c.scheme === "dark" ? "#252525" : c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"
    },
    ratingBarRow: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 10, gap: 8 },
    ratingBarLabel: { width: 88, fontSize: 12, color: c.textSecondary, textAlign: "right", fontWeight: "600" },
    ratingBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.scheme === "dark" ? "#3A3A3A" : "#E0E0E0", overflow: "hidden" },
    ratingBarFill: { height: 8, backgroundColor: c.primary, borderRadius: 4 },
    ratingBarValue: { width: 36, fontSize: 12, fontWeight: "800", color: c.text, textAlign: "right" },
    stickyFooter: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row-reverse",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
      backgroundColor: c.scheme === "dark" ? c.surface : c.surfaceCard
    },
    footerTotalBlock: { alignItems: "flex-end", minWidth: 100 },
    footerTotalLbl: { fontSize: 12, color: c.textMuted, fontWeight: "600" },
    footerTotalVal: { fontSize: 18, fontWeight: "900", color: c.primary, marginTop: 2 },
    footerCta: {
      flex: 1,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: radius.full
    },
    footerCtaReady: { backgroundColor: c.primary },
    footerCtaDisabled: { backgroundColor: c.scheme === "dark" ? "#3A3A3A" : "#E8E8E8" },
    footerCtaText: { fontSize: 14, fontWeight: "900", color: c.text },
    footerCtaTextReady: { color: "#FFFFFF" },
    /** شريط الأيام (شبيه ShootHa) */
    dayPickerScroll: {
      flexDirection: "row-reverse",
      gap: 10,
      paddingVertical: 6,
      paddingHorizontal: 2,
      marginBottom: spacing.md
    },
    dayPickerCard: {
      minWidth: 76,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.scheme === "dark" ? "rgba(255, 255, 255, 0.14)" : "rgba(18, 18, 18, 0.1)",
      backgroundColor: c.scheme === "dark" ? "#252525" : c.surfaceMuted
    },
    dayPickerCardOn: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft
    },
    dayPickerWeekday: { fontSize: 13, fontWeight: "800", color: c.textSecondary, textAlign: "center" },
    dayPickerWeekdayOn: { color: c.primaryDark },
    dayPickerDom: { fontSize: 18, fontWeight: "900", color: c.text, textAlign: "center", marginTop: 4 },
    dayPickerDomOn: { color: c.primaryDark },
    spacerBlock: { height: spacing.md }
  });
}
