import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSettings } from "../../providers/SettingsProvider";
import { fontFamily } from "../../theme/fonts";
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
  /** Override primary button gradient (useful for auth screens). */
  primaryGradientColors?: readonly string[];
};

export const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  textStyle,
  primaryGradientColors
}) => {
  const { palette: c } = useSettings();
  const styles = useMemo(() => makeButtonStyles(c), [c]);

  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";

  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={() => {
        if (inactive) return;
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style
      ]}
      accessibilityRole="button"
    >
      {isPrimary ? (
        <LinearGradient
          colors={(primaryGradientColors ??
            (c.scheme === "dark" ? ([c.primary, "#2EE85A"] as const) : (["#00C853", "#00E676"] as const))) as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryGradient}
        >
          {loading ? (
            <ActivityIndicator color={c.textOnPrimary} />
          ) : (
            <Text
              style={[
                styles.text,
                styles.textPrimary,
                textStyle
              ]}
            >
              {title}
            </Text>
          )}
        </LinearGradient>
      ) : loading ? (
        <ActivityIndicator color={isDanger ? c.danger : c.primary} />
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

function makeButtonStyles(c: import("../../theme/colors").AppPalette) {
  return StyleSheet.create({
    base: {
      borderRadius: radius.full,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      width: "100%"
    },
    primaryGradient: {
      width: "100%",
      minHeight: 52,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl
    },
    primary: {
      backgroundColor: "transparent",
      paddingVertical: 0,
      paddingHorizontal: 0
    },
    secondary: {
      backgroundColor: c.surfaceMuted,
      borderWidth: 1.5,
      borderColor: c.border
    },
    ghost: {
      backgroundColor: "rgba(255,255,255,0.08)",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.25)"
    },
    danger: {
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: "transparent"
    },
    disabled: {
      opacity: 0.5
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.96 }]
    },
    text: {
      fontSize: 16,
      fontFamily: fontFamily.sansBold
    },
    textPrimary: {
      color: c.textOnPrimary
    },
    textSecondary: {
      color: c.text
    },
    textGhost: {
      color: c.primary
    },
    textDanger: {
      color: c.danger
    }
  });
}
