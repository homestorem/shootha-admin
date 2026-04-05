import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BRAND } from "../theme/brand";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
};

export const AuthScreenLayout: React.FC<Props> = ({
  children,
  title,
  subtitle,
  icon = "football-outline",
  footer,
  contentStyle
}) => (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primaryDeep, colors.primary, colors.heroEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.brandUpper} accessibilityRole="header">
            {BRAND.nameUpper}
          </Text>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={36} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
        </LinearGradient>
        <View style={[styles.card, contentStyle]}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface
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
    paddingTop: spacing.xl,
    paddingBottom: 56,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl
  },
  brandUpper: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2.4,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    marginBottom: spacing.md
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
    fontWeight: "800",
    color: colors.textOnPrimary,
    textAlign: "center",
    lineHeight: 32
  },
  heroSub: {
    marginTop: spacing.sm + 2,
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: spacing.sm
  },
  card: {
    marginTop: -40,
    marginHorizontal: spacing.lg,
    alignSelf: "stretch",
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0c1222",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
    overflow: "visible"
  },
  footer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignSelf: "stretch",
    alignItems: "stretch"
  }
});
