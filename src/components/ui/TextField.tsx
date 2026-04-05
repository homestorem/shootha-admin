import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/tokens";

type Props = TextInputProps & {
  label: string;
  /** أيقونة يسار الحقل (في RTL تظهر جهة البداية المنطقية) */
  icon?: keyof typeof Ionicons.glyphMap;
};

export const TextField: React.FC<Props> = ({ label, icon, style, onFocus, onBlur, ...rest }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.fieldRow,
          focused && styles.fieldRowFocused,
          rest.editable === false && styles.fieldDisabled
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textSubtle}
          textAlign="right"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {icon ? (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textSubtle} />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    alignSelf: "stretch",
    width: "100%"
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: spacing.sm
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    width: "100%"
  },
  fieldRowFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surfaceCard,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2
  },
  fieldDisabled: {
    opacity: 0.65
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: colors.text,
    paddingVertical: spacing.md,
    minHeight: 48
  },
  iconWrap: {
    marginRight: spacing.sm
  }
});
