import React from "react";
import { Image, Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSettings } from "../providers/SettingsProvider";

type Props = {
  children: React.ReactNode;
};

/**
 * خلفية التطبيق: صورة العشب بملء الشاشة بدون تدرجات أو طبقات ضبابية فوقها
 * حتى تبقى الصورة حادة وواضحة خلف الواجهة.
 */
export function AppBackground({ children }: Props) {
  const { palette } = useSettings();
  const { width, height } = useWindowDimensions();
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <Image
        source={require("../../assets/app-background.png")}
        style={[styles.bgImage, { width: w, height: h }]}
        resizeMode="cover"
        resizeMethod={Platform.OS === "android" ? "scale" : undefined}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  bgImage: {
    position: "absolute",
    left: 0,
    top: 0
  },
  content: {
    flex: 1
  }
});
