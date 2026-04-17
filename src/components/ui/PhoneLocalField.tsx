import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../../providers/SettingsProvider";
import type { AppPalette } from "../../theme/colors";
import { fontFamily } from "../../theme/fonts";
import { radius, spacing } from "../../theme/tokens";
import { DEFAULT_DIAL_CODE } from "../../lib/phoneDial";
import { rtl } from "../../utils/rtl";

type Props = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  showDialCode?: boolean;
};

function makePhoneStyles(c: AppPalette) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
      alignSelf: "stretch",
      width: "100%",
      writingDirection: rtl.writingDirection
    },
    label: {
      fontSize: 13,
      fontFamily: fontFamily.sansBold,
      color: c.textSecondary,
      textAlign: "right",
      writingDirection: "rtl",
      marginBottom: spacing.sm
    },
    fieldRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      /** صف الرقم باتجاه LTR حتى لا يعكس RTL ترتيب العناصر ويعطل الإدخال على أندرويد */
      writingDirection: "ltr",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.15)",
      borderRadius: radius.md,
      backgroundColor: "rgba(255,255,255,0.08)",
      paddingLeft: spacing.sm,
      paddingRight: spacing.md,
      minHeight: 52,
      width: "100%"
    },
    fieldRowFocused: {
      borderColor: c.borderFocus,
      backgroundColor: "rgba(255,255,255,0.12)"
    },
    inputOuter: {
      flex: 1,
      minWidth: 0,
      alignSelf: "stretch"
    },
    input: {
      flex: 1,
      width: "100%",
      fontSize: 17,
      fontFamily: fontFamily.latinRegular,
      color: c.text,
      paddingVertical: spacing.md,
      minHeight: 48
    },
    iconWrap: {
      marginLeft: spacing.sm
    },
    prefixWrap: {
      marginRight: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)"
    },
    separator: {
      width: 1,
      alignSelf: "stretch",
      marginVertical: spacing.sm,
      backgroundColor: "rgba(255,255,255,0.2)",
      marginRight: spacing.sm
    },
    prefixText: {
      fontSize: 15,
      fontFamily: fontFamily.latinBold,
      color: c.primary,
      letterSpacing: 0.2
    }
  });
}

export const PhoneLocalField: React.FC<Props> = ({ label, icon, value, onChangeText, placeholder, showDialCode = true }) => {
  const { palette } = useSettings();
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => makePhoneStyles(palette), [palette]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[styles.fieldRow, focused && styles.fieldRowFocused]}
      >
        {showDialCode ? (
          <>
            <View style={styles.prefixWrap}>
              <Text style={styles.prefixText}>{DEFAULT_DIAL_CODE}</Text>
            </View>
            <View style={styles.separator} />
          </>
        ) : null}
        <View style={styles.inputOuter}>
          <TextInput
            style={styles.input}
            placeholderTextColor={palette.textSubtle}
            textAlign="left"
            keyboardType="phone-pad"
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
        {icon ? (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={20} color={focused ? palette.primary : palette.textSubtle} />
          </View>
        ) : null}
      </View>
    </View>
  );
};
