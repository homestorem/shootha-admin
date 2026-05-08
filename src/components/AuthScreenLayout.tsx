import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "../providers/SettingsProvider";
import type { AppPalette } from "../theme/colors";
import { PRIMARY_HERO_GRADIENT_DARK, PRIMARY_HERO_GRADIENT_LIGHT } from "../theme/primaryHeroGradient";
import { fontFamily } from "../theme/fonts";
import { radius, spacing } from "../theme/tokens";
import { InputLayer } from "./InputLayer";
import { HoneycombTopFade } from "./ui/HoneycombTopFade";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
};

function makeAuthStyles(c: AppPalette, topInset: number) {
  const heroShadow = c.scheme === "dark" ? "#000" : "#0c1222";
  const heroShadowOpacity = c.scheme === "dark" ? 0.48 : 0.16;
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "transparent"
    },
    flex: {
      flex: 1
    },
    scrollView: {
      flex: 1
    },
    scroll: {
      flexGrow: 1,
      paddingBottom: spacing.xxxl,
      alignItems: "stretch"
    },
    hero: {
      paddingHorizontal: spacing.xxl,
      paddingTop: topInset + spacing.xl,
      paddingBottom: 76,
      minHeight: 290,
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      zIndex: 0
    },
    iconWrap: {
      alignSelf: "center",
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg
    },
    heroTitle: {
      fontSize: 24,
      fontFamily: fontFamily.sansBold,
      color: "#FFFFFF",
      textAlign: "center",
      lineHeight: 32
    },
    heroSub: {
      marginTop: spacing.sm + 2,
      fontSize: 14,
      fontFamily: fontFamily.sansRegular,
      color: "rgba(255,255,255,0.92)",
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: spacing.sm
    },
    card: {
      marginTop: -40,
      marginHorizontal: spacing.lg,
      alignSelf: "stretch",
      backgroundColor: c.scheme === "dark" ? "rgba(24,24,24,0.72)" : "rgba(255,255,255,0.82)",
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1.4,
      borderColor: c.scheme === "dark" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.12)",
      shadowColor: heroShadow,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: heroShadowOpacity,
      shadowRadius: 36,
      elevation: 14,
      overflow: "visible",
      position: "relative",
      /** فوق الـ hero المتداخل (marginTop سالب) حتى يصل اللمس وطلب التركيز إلى TextInput على iOS */
      zIndex: 2
    },
    footer: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      alignSelf: "stretch",
      alignItems: "stretch"
    }
  });
}

export const AuthScreenLayout: React.FC<Props> = ({
  children,
  title,
  subtitle,
  icon = "football-outline",
  footer,
  contentStyle
}) => {
  const { palette } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeAuthStyles(palette, insets.top), [palette, insets.top]);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={false}
          removeClippedSubviews={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <LinearGradient
            colors={palette.scheme === "dark" ? [...PRIMARY_HERO_GRADIENT_DARK] : [...PRIMARY_HERO_GRADIENT_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
            pointerEvents="box-none"
          >
            <HoneycombTopFade />
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>{title}</Text>
            {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
          </LinearGradient>
          <View style={[styles.card, contentStyle]}>
            <InputLayer>{children}</InputLayer>
          </View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
