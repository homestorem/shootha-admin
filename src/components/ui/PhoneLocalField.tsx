import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { radius, spacing } from "../../theme/tokens";
import { DEFAULT_DIAL_CODE } from "../../lib/phoneDial";

type Props = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  editable?: boolean;
};

export const PhoneLocalField: React.FC<Props> = ({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  editable = true
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.fieldRow,
          focused && styles.fieldRowFocused,
          editable === false && styles.fieldDisabled
        ]}
      >
        {icon ? (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textSubtle} />
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textSubtle}
          textAlign="right"
          keyboardType="phone-pad"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <View style={styles.prefixWrap}>
          <Text style={styles.prefixText}>{DEFAULT_DIAL_CODE}</Text>
        </View>
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
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
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
  },
  prefixWrap: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border
  },
  prefixText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.2
  }
});
