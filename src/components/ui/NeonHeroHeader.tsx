import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { AppPalette } from "../../theme/colors";
import { spacing } from "../../theme/tokens";

type Props = {
  palette: AppPalette;
  title: string;
  subtitle?: string;
  /** أيقونة أو محتوى يمين العنوان (RTL) */
  rightAccessory?: React.ReactNode;
  footer?: React.ReactNode;
  /** عنوان أصغر للملفات الثانوية */
  compact?: boolean;
};

/**
 * عنوان شاشة بأسلوب «إضافة حجز»: حواف ناعمة 28+، إطار نيون، تدرج/زجاج بدون blur.
 */
export function NeonHeroHeader({
  palette,
  title,
  subtitle,
  rightAccessory,
  footer,
  compact
}: Props) {
  const dark = palette.scheme === "dark";
  const gradColors = dark
    ? (["rgba(14, 32, 20, 0.88)", "rgba(6, 14, 9, 0.94)"] as const)
    : (["#0a5c36", "#008f4a", "#00C853"] as const);
  const r = compact ? 22 : 28;
  const padV = compact ? 14 : 20;
  const padH = compact ? spacing.md : spacing.lg;

  return (
    <View
      style={[
        styles.shell,
        {
          borderRadius: r,
          borderColor: dark ? "rgba(57, 255, 20, 0.42)" : "rgba(0, 200, 83, 0.38)",
          ...Platform.select({
            ios: {
              shadowColor: palette.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: dark ? 0.38 : 0.2,
              shadowRadius: compact ? 12 : 18
            },
            android: { elevation: dark ? 8 : 5 },
            web: {
              boxShadow: dark
                ? "0 0 28px rgba(57, 255, 20, 0.22), 0 12px 40px rgba(0,0,0,0.35)"
                : "0 8px 28px rgba(0, 200, 83, 0.18), 0 4px 16px rgba(0,0,0,0.08)"
            },
            default: {}
          })
        }
      ]}
    >
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { borderRadius: r, paddingVertical: padV, paddingHorizontal: padH }]}
      >
        <View style={styles.topRow}>
          <View style={styles.textCol}>
            <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.sub, compact && styles.subCompact]} numberOfLines={3}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {rightAccessory ? <View style={styles.badge}>{rightAccessory}</View> : null}
        </View>
        {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginBottom: spacing.md,
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: "transparent"
  },
  gradient: {
    overflow: "hidden"
  },
  topRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  textCol: {
    flex: 1,
    alignItems: "flex-end",
    minWidth: 0
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
    letterSpacing: -0.4
  },
  titleCompact: {
    fontSize: 20,
    letterSpacing: -0.3
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "right",
    writingDirection: "rtl",
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20
  },
  subCompact: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.38)",
    alignItems: "center",
    justifyContent: "center"
  },
  footerSlot: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.28)"
  }
});
