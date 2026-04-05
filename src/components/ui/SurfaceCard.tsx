import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "../../theme/colors";
import { radius, spacing, cardElevation } from "../../theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
};

export const SurfaceCard: React.FC<Props> = ({ children, style, elevated }) => (
  <View style={[styles.card, cardElevation(!!elevated), style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceCard
  }
});
