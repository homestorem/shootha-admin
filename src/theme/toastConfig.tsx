import React from "react";
import { BaseToast, ErrorToast, ToastConfig } from "react-native-toast-message";
import { colors } from "./colors";
import { radius } from "./tokens";

const rtlText1 = {
  fontSize: 15,
  fontWeight: "800" as const,
  textAlign: "right" as const,
  writingDirection: "rtl" as const,
  color: colors.text
};

const rtlText2 = {
  fontSize: 13,
  textAlign: "right" as const,
  writingDirection: "rtl" as const,
  color: colors.textMuted
};

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftWidth: 0,
        borderRightWidth: 4,
        borderRightColor: colors.primary,
        minHeight: props.text2 ? 78 : 58,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceCard
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={rtlText1}
      text2Style={rtlText2}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftWidth: 0,
        borderRightWidth: 4,
        borderRightColor: colors.danger,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceCard
      }}
      text1Style={rtlText1}
      text2Style={rtlText2}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftWidth: 0,
        borderRightWidth: 4,
        borderRightColor: colors.primaryLight,
        minHeight: props.text2 ? 78 : 58,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceCard
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={rtlText1}
      text2Style={rtlText2}
    />
  )
};
