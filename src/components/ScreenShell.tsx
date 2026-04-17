import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "../theme/tokens";
import { rtl } from "../utils/rtl";

type Props = {
  children: React.ReactNode;
  variant?: "default" | "muted";
  style?: ViewStyle;
  /** بدون padding أفقي — للصفحة الرئيسية (هيرو داكن) فقط */
  fullBleed?: boolean;
  /**
   * عدم تطبيق safe-area من الأعلى؛ يُستخدم مع fullBleed على الصفحة الرئيسية
   * حتى يمتد التدرج من أعلى الشاشة — يجب أن يضيف المحتوى `paddingTop: insets.top` يدوياً.
   */
  bleedTop?: boolean;
};

export const ScreenShell: React.FC<Props> = ({
  children,
  variant = "muted",
  style,
  fullBleed = false,
  bleedTop = false
}) => {
  const safeEdges = bleedTop ? (["left", "right"] as const) : (["top", "left", "right"] as const);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: "transparent"
        },
        muted: {
          backgroundColor: "transparent"
        },
        inner: {
          flex: 1,
          paddingHorizontal: fullBleed ? 0 : spacing.lg,
          writingDirection: rtl.writingDirection
        }
      }),
    [fullBleed]
  );

  return (
    <SafeAreaView
      style={[styles.safe, variant === "muted" && styles.muted, style]}
      edges={safeEdges}
    >
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
};
