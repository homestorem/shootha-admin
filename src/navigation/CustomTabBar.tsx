import React, { memo, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSettings } from "../providers/SettingsProvider";
import type { AppPalette } from "../theme/colors";
import { fontFamily } from "../theme/fonts";
import { spacing } from "../theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ICONS: Partial<Record<string, keyof typeof Ionicons.glyphMap>> = {
  Home: "home-outline",
  Fields: "football-outline",
  Notifications: "notifications-outline",
  Accounts: "wallet-outline",
  Profile: "person-circle-outline"
};

const ICONS_ACTIVE: Partial<Record<string, keyof typeof Ionicons.glyphMap>> = {
  Home: "home",
  Fields: "football",
  Notifications: "notifications",
  Accounts: "wallet",
  Profile: "person-circle"
};

function tabBarShadow(palette: AppPalette): object {
  void palette;
  return {};
}

function TabItem({
  label,
  icon,
  iconActive,
  focused,
  onPress,
  onLongPress,
  palette,
  styles
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  palette: AppPalette;
  styles: ReturnType<typeof createTabStyles>;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.04 : 1, { damping: 16, stiffness: 320, mass: 0.65 });
  }, [focused, scale]);

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const resolvedIcon = focused ? iconActive : icon;
  const isDark = palette.scheme === "dark";
  const iconColor = focused ? palette.primary : isDark ? "rgba(230,235,232,0.88)" : "rgba(35,44,40,0.62)";

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={8}
      android_ripple={{ color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", borderless: false }}
      style={({ pressed }) => [styles.tab, focused && styles.tabFocused, pressed && styles.tabPressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={[styles.iconCapsule, focused && styles.iconCapsuleActive, iconAnim]}>
        <Ionicons name={resolvedIcon} size={focused ? 22 : 20} color={iconColor} />
      </Animated.View>
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
const MemoTabItem = memo(TabItem);

function createTabStyles(palette: AppPalette) {
  const isDark = palette.scheme === "dark";
  const pillRadius = 40;
  return StyleSheet.create({
    outer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 20,
      paddingTop: 0,
      backgroundColor: "transparent"
    },
    shadowHost: {
      borderRadius: pillRadius,
      ...tabBarShadow(palette)
    },
    barGlass: {
      borderRadius: pillRadius,
      overflow: "hidden",
      minHeight: 74,
      position: "relative",
      backgroundColor: "transparent"
    },
    blurFill: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: pillRadius
    },
    /** طبقة لون خفيفة فوق الـ blur = زجاج مائل للأخضر الداكن / أبيض شفاف */
    toneOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: pillRadius,
      backgroundColor: isDark ? "rgba(18, 24, 20, 0.34)" : "rgba(239, 247, 242, 0.26)"
    },
    barRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: 9,
      paddingHorizontal: 6,
      minHeight: 74,
      position: "relative",
      zIndex: 2
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      marginHorizontal: 2,
      borderRadius: 24
    },
    tabFocused: {},
    tabPressed: {
      opacity: 0.9
    },
    iconCapsule: {
      width: 40,
      height: 34,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      borderWidth: 0
    },
    /** تبويب نشط: دائرة/حبة أفتح قليلاً مثل المرجع — بدون تعبئة لون أساسي كاملة */
    iconCapsuleActive: {
      backgroundColor: "transparent",
      borderWidth: 0,
      borderColor: "transparent",
      ...Platform.select({
        ios: {
          shadowColor: palette.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.45,
          shadowRadius: 10
        },
        android: { elevation: 0 },
        default: {}
      })
    },
    label: {
      marginTop: 0,
      fontSize: 10,
      fontFamily: fontFamily.sansBold,
      letterSpacing: 0.2,
      color: isDark ? "rgba(231, 235, 233, 0.84)" : "rgba(20, 35, 30, 0.58)"
    },
    labelActive: {
      color: palette.primary,
      fontFamily: fontFamily.sansBold
    }
  });
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { palette } = useSettings();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, spacing.sm) + 20;
  const styles = useMemo(() => createTabStyles(palette), [palette]);
  const isDark = palette.scheme === "dark";

  const visibleRoutes = state.routes;

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]} pointerEvents="box-none">
      <View style={styles.shadowHost}>
        <View style={styles.barGlass}>
          <BlurView
            intensity={isDark ? 58 : 62}
            tint={isDark ? "dark" : "light"}
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
            style={styles.blurFill}
          />
          <View style={styles.toneOverlay} pointerEvents="none" />
          <View style={styles.barRow}>
            {visibleRoutes.map((route, routeIndex) => {
              const focused = state.index === routeIndex;
              const { options } = descriptors[route.key];
              const rawLabel = options.tabBarLabel ?? options.title ?? route.name;
              const label = typeof rawLabel === "string" ? rawLabel : route.name;
              const icon = ICONS[route.name] ?? "ellipse-outline";
              const iconActive = ICONS_ACTIVE[route.name] ?? "ellipse";

              return (
                <MemoTabItem
                  key={route.key}
                  label={label}
                  icon={icon}
                  iconActive={iconActive}
                  focused={focused}
                  palette={palette}
                  styles={styles}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true
                    });
                    if (!focused && !event.defaultPrevented) {
                      if (Platform.OS !== "web") {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                  onLongPress={() =>
                    navigation.emit({
                      type: "tabLongPress",
                      target: route.key
                    })
                  }
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
