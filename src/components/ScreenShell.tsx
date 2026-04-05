import React from "react";
import { StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/tokens";

type Props = {
  children: React.ReactNode;
  variant?: "default" | "muted";
  style?: ViewStyle;
};

export const ScreenShell: React.FC<Props> = ({ children, variant = "muted", style }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const contentMax = isWide ? Math.min(560, width - spacing.section) : undefined;

  return (
    <SafeAreaView style={[styles.safe, variant === "muted" && styles.muted, style]} edges={["top", "left", "right"]}>
      <View style={[styles.inner, contentMax != null && { maxWidth: contentMax, width: "100%", alignSelf: "center" }]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  muted: {
    backgroundColor: colors.surface
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg
  }
});
