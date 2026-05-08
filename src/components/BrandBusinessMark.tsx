import React, { useMemo } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useSettings } from "../providers/SettingsProvider";
import { fontFamily } from "../theme/fonts";

type Props = {
  /** محاذاة السطر (الحجوزات: يمين، جاري التحميل: وسط) */
  textAlign?: "left" | "right" | "center";
  style?: StyleProp<TextStyle>;
};

/** شعار نصّي موحّد لاسم التطبيق. */
export function BrandBusinessMark({ textAlign = "right", style }: Props) {
  const { palette } = useSettings();

  const base = useMemo(
    (): TextStyle => ({
      fontSize: 18,
      fontFamily: fontFamily.sansBold,
      fontWeight: "900",
      letterSpacing: 0.35,
      textAlign
    }),
    [textAlign]
  );

  // لمسة نيون خفيفة بالوضع الداكن فقط.
  const isDark = palette.scheme === "dark";
  const brandColor = isDark ? "#9CFF7A" : "#1A2A22";

  return (
    <Text
      style={[
        base,
        {
          color: brandColor,
          ...(isDark
            ? {
                textShadowColor: "rgba(57,255,20,0.35)",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 6
              }
            : null)
        },
        style
      ]}
    >
      SHOOT'HA Business
    </Text>
  );
}
