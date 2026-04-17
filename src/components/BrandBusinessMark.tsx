import React, { useMemo } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useSettings } from "../providers/SettingsProvider";
import { fontFamily } from "../theme/fonts";

type Props = {
  /** محاذاة السطر (الحجوزات: يمين، جاري التحميل: وسط) */
  textAlign?: "left" | "right" | "center";
  style?: StyleProp<TextStyle>;
};

/**
 * SHOOT'HA BUSINESS — نفس ألوان صفحة الحجوزات: SHOOT' أخضر، HA أبيض، BUSINESS بلون عميق/فاتح.
 * ظل خفيف لتحسين التباين على خلفية الملعب.
 */
export function BrandBusinessMark({ textAlign = "right", style }: Props) {
  const { palette } = useSettings();

  const base = useMemo(
    (): TextStyle => ({
      fontSize: 13,
      fontFamily: fontFamily.sansBold,
      letterSpacing: 1.4,
      textAlign,
      textShadowColor: palette.scheme === "dark" ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.28)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4
    }),
    [palette.scheme, textAlign]
  );

  const businessColor = palette.scheme === "light" ? palette.primaryDeep : palette.primaryLight;

  return (
    <Text style={[base, style]}>
      <Text style={{ color: palette.primary }}>SHOOT&apos;</Text>
      <Text style={{ color: "#FFFFFF" }}>HA</Text>
      <Text style={{ color: businessColor }}>
        {" "}
        BUSINESS
      </Text>
    </Text>
  );
}
