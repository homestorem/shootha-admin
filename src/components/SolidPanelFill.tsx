import React from "react";
import { View, StyleSheet } from "react-native";
import type { AppPalette } from "../theme/colors";

type Props = { palette: AppPalette };

/** خلفية صلبة للبطاقات بدل BlurView — لا تقسّم خلفية التطبيق */
export function SolidPanelFill({ palette }: Props) {
  const dark = palette.scheme === "dark";
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: dark ? palette.card : "rgba(252, 252, 252, 0.97)" }
      ]}
    />
  );
}
