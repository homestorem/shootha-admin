import React from "react";
import { BaseToast, ErrorToast, ToastConfig } from "react-native-toast-message";
import type { AppPalette } from "./colors";
import { fontFamily } from "./fonts";
import { radius } from "./tokens";

export function buildToastConfig(palette: AppPalette): ToastConfig {
  const rtlText1 = {
    fontSize: 15,
    fontFamily: fontFamily.sansBold,
    textAlign: "right" as const,
    writingDirection: "rtl" as const,
    color: palette.text
  };

  const rtlText2 = {
    fontSize: 13,
    fontFamily: fontFamily.sansRegular,
    textAlign: "right" as const,
    writingDirection: "rtl" as const,
    color: palette.textMuted
  };

  return {
    success: (props) => (
      <BaseToast
        {...props}
        style={{
          borderLeftWidth: 0,
          borderRightWidth: 4,
          borderRightColor: palette.primary,
          minHeight: props.text2 ? 78 : 58,
          borderRadius: radius.md,
          backgroundColor: palette.surfaceCard
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
          borderRightColor: palette.danger,
          borderRadius: radius.md,
          backgroundColor: palette.surfaceCard
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
          borderRightColor: palette.primaryLight,
          minHeight: props.text2 ? 78 : 58,
          borderRadius: radius.md,
          backgroundColor: palette.surfaceCard
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={rtlText1}
        text2Style={rtlText2}
      />
    )
  };
}
