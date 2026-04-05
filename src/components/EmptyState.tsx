import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

export const EmptyState: React.FC<Props> = ({ icon = "calendar-outline", title, subtitle }) => (
  <View style={styles.wrap}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={36} color={colors.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xxl
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500"
  }
});
