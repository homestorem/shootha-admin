import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors } from "../theme/colors";
import { radius, spacing, cardElevation } from "../theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ICONS: Partial<Record<string, keyof typeof Ionicons.glyphMap>> = {
  Home: "calendar",
  Fields: "football-outline",
  Notifications: "notifications",
  Accounts: "wallet-outline",
  Profile: "person-circle"
};

function TabItem({
  label,
  icon,
  focused,
  onPress
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.05 : 1, { damping: 14, stiffness: 260 });
  }, [focused, scale]);

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        focused && styles.tabFocused,
        pressed && styles.tabPressed
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
    >
      <Animated.View style={[styles.iconCircle, focused && styles.iconCircleActive, iconAnim]}>
        <Ionicons name={icon} size={22} color={focused ? colors.textOnPrimary : colors.textSubtle} />
      </Animated.View>
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, spacing.sm + 2);

  const visibleRoutes = state.routes.filter((r) => r.name !== "Schedule");

  return (
    <View style={[styles.outer, { paddingBottom: bottomPad }]}>
      <View style={[styles.bar, cardElevation(true)]}>
        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === routeIndex;
          const { options } = descriptors[route.key];
          const rawLabel = options.tabBarLabel ?? options.title ?? route.name;
          const label = typeof rawLabel === "string" ? rawLabel : route.name;
          const icon = ICONS[route.name] ?? "ellipse";

          return (
            <TabItem
              key={route.key}
              label={label}
              icon={icon}
              focused={focused}
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
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: "transparent"
  },
  bar: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: colors.tabBarBg,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm + 2,
    minHeight: 64,
    overflow: "hidden"
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs
  },
  tabFocused: {},
  tabPressed: {
    opacity: 0.9
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  iconCircleActive: {
    backgroundColor: colors.primary
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSubtle
  },
  labelActive: {
    color: colors.primary
  }
});
