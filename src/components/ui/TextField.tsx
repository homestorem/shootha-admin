import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../../providers/SettingsProvider";
import type { AppPalette } from "../../theme/colors";
import { fontFamily } from "../../theme/fonts";
import { radius, spacing } from "../../theme/tokens";
import { rtl } from "../../utils/rtl";

type Props = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

function makeTextFieldStyles(c: AppPalette) {
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
      /** مع forceRTL: بدون ltr يعكّس ترتيب الصف ويكسر إدخال Android (نفس منطق PhoneLocalField) */
      writingDirection: "ltr",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.15)",
      borderRadius: radius.md,
      backgroundColor: "rgba(255,255,255,0.08)",
      paddingHorizontal: spacing.md,
      minHeight: 52,
      width: "100%"
    },
    /** بدون shadow/elevation عند التركيز — تغيير الطبقة الأصلية كان يسقط focus فور فتح الكيبورد */
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
      fontFamily: fontFamily.sansRegular,
      color: c.text,
      writingDirection: "rtl",
      paddingVertical: spacing.md,
      minHeight: 48
    },
    inputLatin: {
      fontFamily: fontFamily.latinRegular,
      writingDirection: "ltr"
    },
    iconWrap: {
      marginRight: spacing.sm
    }
  });
}

export const TextField: React.FC<Props> = ({
  label,
  icon,
  style,
  onFocus,
  onBlur,
  editable: _e,
  defaultValue: _defaultValue,
  value,
  onChangeText,
  ...rest
}) => {
  const { palette } = useSettings();
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => makeTextFieldStyles(palette), [palette]);
  const kt = rest.keyboardType;
  const useLatin =
    kt === "numeric" ||
    kt === "number-pad" ||
    kt === "decimal-pad" ||
    kt === "phone-pad";

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.fieldRow, focused && styles.fieldRowFocused]}>
        <View style={styles.inputOuter}>
          <TextInput
            {...rest}
            placeholderTextColor={palette.textSubtle}
            textAlign="right"
            style={[styles.input, useLatin && styles.inputLatin, style]}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            value={value}
            onChangeText={onChangeText}
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
