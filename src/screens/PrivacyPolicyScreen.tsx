import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { useSettings } from "../providers/SettingsProvider";
import { spacing, radius, cardElevation } from "../theme/tokens";
import { fontFamily } from "../theme/fonts";
import type { AppPalette } from "../theme/colors";

const SECTION_KEYS: { titleKey: string; bodyKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { titleKey: "privacyScreen.s1Title", bodyKey: "privacyScreen.s1Body", icon: "folder-open-outline" },
  { titleKey: "privacyScreen.s2Title", bodyKey: "privacyScreen.s2Body", icon: "options-outline" },
  { titleKey: "privacyScreen.s3Title", bodyKey: "privacyScreen.s3Body", icon: "share-social-outline" },
  { titleKey: "privacyScreen.s4Title", bodyKey: "privacyScreen.s4Body", icon: "lock-closed-outline" },
  { titleKey: "privacyScreen.s5Title", bodyKey: "privacyScreen.s5Body", icon: "person-circle-outline" },
  { titleKey: "privacyScreen.s6Title", bodyKey: "privacyScreen.s6Body", icon: "sync-outline" },
  { titleKey: "privacyScreen.s7Title", bodyKey: "privacyScreen.s7Body", icon: "chatbubbles-outline" }
];

export const PrivacyPolicyScreen: React.FC = () => {
  const { palette, tr, textAlign, isRTL } = useSettings();
  const isDark = palette.scheme === "dark";
  const writingDirection = isRTL ? ("rtl" as const) : ("ltr" as const);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { paddingBottom: spacing.xxxl + 24 },
        hero: {
          borderRadius: radius.xl,
          overflow: "hidden",
          marginBottom: spacing.lg,
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(12, 18, 34, 0.08)"
        },
        heroGrad: {
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg
        },
        heroBadge: {
          alignSelf: isRTL ? "flex-end" : "flex-start",
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: radius.full,
          backgroundColor: "rgba(255,255,255,0.2)"
        },
        heroBadgeText: {
          color: "#fff",
          fontSize: 11,
          fontFamily: fontFamily.sansBold,
          letterSpacing: 0.5
        },
        heroTitle: {
          marginTop: spacing.md,
          color: "#fff",
          fontSize: 20,
          fontFamily: fontFamily.sansBold,
          lineHeight: 28,
          textAlign,
          writingDirection
        },
        heroSub: {
          marginTop: spacing.sm,
          color: "rgba(255,255,255,0.9)",
          fontSize: 13,
          fontFamily: fontFamily.sansRegular,
          lineHeight: 20,
          textAlign,
          writingDirection
        },
        introCard: {
          marginBottom: spacing.lg,
          padding: spacing.lg,
          borderRadius: radius.xl,
          ...cardElevation(palette)
        },
        introLabel: {
          fontSize: 12,
          fontFamily: fontFamily.sansBold,
          color: palette.primary,
          marginBottom: spacing.sm,
          textAlign,
          writingDirection
        },
        introBody: {
          fontSize: 14,
          fontFamily: fontFamily.sansRegular,
          lineHeight: 22,
          color: isDark ? "rgba(255,255,255,0.88)" : "rgba(15, 23, 42, 0.85)",
          textAlign,
          writingDirection
        },
        sectionCard: {
          marginBottom: spacing.md,
          padding: spacing.lg
        },
        sectionHead: {
          alignItems: "flex-start",
          gap: 12
        },
        sectionBadge: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center"
        },
        sectionBadgeText: {
          color: "#fff",
          fontSize: 16,
          fontFamily: fontFamily.sansBold,
          fontVariant: ["tabular-nums"] as const
        },
        sectionHeadText: {
          flex: 1,
          minWidth: 0
        },
        iconRow: {
          alignItems: "center"
        },
        sectionTitle: {
          flex: 1,
          fontSize: 15,
          fontFamily: fontFamily.sansBold,
          color: isDark ? "#fff" : "#0f172a",
          lineHeight: 22
        },
        sectionBody: {
          fontSize: 14,
          fontFamily: fontFamily.sansRegular,
          lineHeight: 23,
          color: isDark ? "rgba(255,255,255,0.82)" : "rgba(51, 65, 85, 0.95)"
        }
      }),
    [isDark, isRTL, palette, textAlign, writingDirection]
  );

  function SectionCard({
    index,
    title,
    body,
    icon,
    pal
  }: {
    index: number;
    title: string;
    body: string;
    icon: keyof typeof Ionicons.glyphMap;
    pal: AppPalette;
  }) {
    const paragraphs = body.split(/\n\n+/).filter(Boolean);
    const wd = isRTL ? ("rtl" as const) : ("ltr" as const);
    return (
      <View style={[styles.sectionCard, cardElevation(pal)]}>
        <View style={[styles.sectionHead, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <LinearGradient
            colors={[pal.primary, isDark ? "rgba(46, 204, 113, 0.75)" : pal.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sectionBadge}
          >
            <Text style={styles.sectionBadgeText}>{index}</Text>
          </LinearGradient>
          <View style={styles.sectionHeadText}>
            <View style={[styles.iconRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Ionicons
                name={icon}
                size={18}
                color={pal.primary}
                style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }}
              />
              <Text style={[styles.sectionTitle, { textAlign, writingDirection: wd }]}>{title}</Text>
            </View>
          </View>
        </View>
        {paragraphs.map((p, i) => (
          <Text
            key={i}
            style={[
              styles.sectionBody,
              { textAlign, writingDirection: wd, marginTop: i === 0 ? spacing.sm : spacing.md }
            ]}
          >
            {p.trim()}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <ScreenShell>
      <InputLayer>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <LinearGradient
              colors={
                isDark ? ["#0f3d28", "#0a2418", "#050a08"] : ["#1a6b45", "#0d4d32", "#0a3020"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGrad}
            >
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{tr("privacyScreen.heroBadge")}</Text>
              </View>
              <Text style={styles.heroTitle}>{tr("privacyScreen.docTitle")}</Text>
              <Text style={styles.heroSub}>{tr("privacyScreen.docSubtitle")}</Text>
              <View style={{ alignItems: "center", marginTop: spacing.md }}>
                <Ionicons name="shield-checkmark-outline" size={40} color="rgba(255,255,255,0.35)" />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.introCard}>
            <Text style={styles.introLabel}>{tr("privacyScreen.introTitle")}</Text>
            <Text style={styles.introBody}>{tr("privacyScreen.introBody")}</Text>
          </View>

          {SECTION_KEYS.map((sec, idx) => (
            <SectionCard
              key={sec.titleKey}
              index={idx + 1}
              title={tr(sec.titleKey)}
              body={tr(sec.bodyKey)}
              icon={sec.icon}
              pal={palette}
            />
          ))}
        </ScrollView>
      </InputLayer>
    </ScreenShell>
  );
};
