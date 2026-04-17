import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../providers/SettingsProvider";
import { fontFamily } from "../theme/fonts";
import { radius, spacing } from "../theme/tokens";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

export const EmptyState: React.FC<Props> = ({ icon = "calendar-outline", title, subtitle }) => {
  const { palette } = useSettings();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: spacing.xxxl,
          paddingHorizontal: spacing.xxl
        },
        iconCircle: {
          width: 100,
          height: 100,
          borderRadius: 36,
          backgroundColor: palette.scheme === "dark" ? palette.primarySoft : "#F7F7F7",
          borderWidth: 1.5,
          borderColor:
            palette.scheme === "dark" ? "rgba(57, 255, 20, 0.28)" : "rgba(0, 200, 83, 0.12)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.xl,
          ...Platform.select({
            ios: {
              shadowColor: palette.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: palette.scheme === "dark" ? 0.2 : 0.08,
              shadowRadius: 16
            },
            android: { elevation: palette.scheme === "dark" ? 4 : 2 },
            default: {}
          })
        },
        title: {
          fontSize: 20,
          fontFamily: fontFamily.sansBold,
          color: palette.scheme === "dark" ? "#FFFFFF" : "#000000",
          textAlign: "center",
          marginBottom: spacing.sm,
          letterSpacing: -0.3
        },
        subtitle: {
          fontSize: 15,
          fontFamily: fontFamily.sansRegular,
          textAlign: "center",
          lineHeight: 24,
          color: palette.scheme === "dark" ? "rgba(255,255,255,0.86)" : "#3F3F3F",
          maxWidth: 300,
          alignSelf: "center"
        }
      }),
    [palette]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={palette.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};
