import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSettings } from "../../providers/SettingsProvider";
import { radius, spacing, cardElevation } from "../../theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
};

export const SurfaceCard: React.FC<Props> = ({ children, style, elevated }) => {
  const { palette } = useSettings();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md
        }
      }),
    []
  );

  return <View style={[styles.card, cardElevation(palette, !!elevated), style]}>{children}</View>;
};
