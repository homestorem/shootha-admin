import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle, TextStyle } from "react-native";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  textStyle
}) => {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style
      ]}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.textOnPrimary : isDanger ? colors.danger : colors.primary} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.textPrimary,
            isSecondary && styles.textSecondary,
            isGhost && styles.textGhost,
            isDanger && styles.textDanger,
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    width: "100%"
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border
  },
  ghost: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 2,
    borderColor: colors.primary
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "transparent"
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  text: {
    fontSize: 16,
    fontWeight: "800"
  },
  textPrimary: {
    color: colors.textOnPrimary
  },
  textSecondary: {
    color: colors.text
  },
  textGhost: {
    color: colors.primary
  },
  textDanger: {
    color: colors.danger
  }
});
