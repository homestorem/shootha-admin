import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { spacing } from "../../theme/tokens";

type Props = {
  color: string;
  /** ارتفاع أدنى للمنطقة حتى يبقى المؤشر في وسط المساحة المرئية */
  minHeight?: number;
};

/** تحميل مركزي فقط — بدون blur وبدون غطاء شاشة ثقيل */
export function CenteredLoading({ color, minHeight = 220 }: Props) {
  return (
    <View style={[styles.wrap, { minHeight }]}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xl
  }
});
