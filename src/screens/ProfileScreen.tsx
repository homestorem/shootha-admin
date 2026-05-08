import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SolidPanelFill } from "../components/SolidPanelFill";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "../providers/SettingsProvider";
import type { AppLanguage } from "../i18n";
import type { MainAppStackParamList } from "../navigation/mainAppStackTypes";
import { neonCardShell, spacing } from "../theme/tokens";
import { NeonHeroHeader } from "../components/ui/NeonHeroHeader";
import type { AppPalette } from "../theme/colors";
import { createRtl } from "../utils/rtl";

function makeStyles(c: AppPalette) {
  const isDark = c.scheme === "dark";
  return StyleSheet.create({
    scroll: { paddingTop: spacing.sm, paddingBottom: 110 },
    glassShell: {
      ...neonCardShell(c),
      marginBottom: spacing.md,
      overflow: "hidden"
    },
    userCard: { padding: spacing.lg },
    userName: {
      fontSize: 22,
      fontWeight: "900",
      textAlign: "right",
      writingDirection: "rtl",
      color: isDark ? "#FFFFFF" : "#1A1A1A"
    },
    userPhone: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
      color: isDark ? "#B0BEC5" : "#666666"
    },
    row: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      minHeight: 62,
      gap: spacing.sm
    },
    rowTextWrap: { flex: 1, alignItems: "flex-end", minWidth: 0 },
    rowTitle: {
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
      writingDirection: "rtl",
      color: isDark ? "#FFFFFF" : "#1A1A1A"
    },
    rowSub: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
      color: isDark ? "#B0BEC5" : "#666666"
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      backgroundColor: c.primarySoft
    },
    rowTitleDanger: {
      color: "#FF5252"
    },
    rowIconDanger: {
      backgroundColor: isDark ? "rgba(255,82,82,0.14)" : "rgba(255,82,82,0.10)",
      borderColor: isDark ? "rgba(255,82,82,0.24)" : "rgba(255,82,82,0.2)"
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
      marginHorizontal: spacing.lg
    },
    pressed: { opacity: 0.92, transform: [{ scale: 0.992 }] }
  });
}

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { palette, theme, setTheme, language, setLanguage, tr, textAlign, dir, isRTL } = useSettings();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const rtl = useMemo(() => createRtl(isRTL), [isRTL]);
  const nav = useNavigation<NativeStackNavigationProp<MainAppStackParamList>>();

  const displayName = user?.display_name || user?.user_metadata?.name || tr("profile.guestName");
  const phone = user?.phone || "—";

  const rows = [
    { key: "wallet", title: tr("nav.wallet"), sub: tr("profile.walletSub"), icon: "wallet-outline", onPress: () => nav.navigate("Wallet") },
    {
      key: "platforms",
      title: tr("profile.platformsTitle"),
      sub: tr("profile.platformsSub"),
      icon: "globe-outline",
      onPress: () => nav.navigate("SocialPlatforms")
    },
    {
      key: "field",
      title: tr("nav.fieldDataRequest"),
      sub: "",
      icon: "document-text-outline",
      onPress: () => nav.navigate("FieldDataRequest")
    },
    {
      key: "support",
      title: tr("nav.supportContact"),
      sub: tr("profile.supportSub"),
      icon: "chatbubbles-outline",
      onPress: () => nav.navigate("SupportContact")
    },
    { key: "terms", title: tr("nav.terms"), sub: "", icon: "reader-outline", onPress: () => nav.navigate("TermsConditions") },
    { key: "privacy", title: tr("nav.privacy"), sub: "", icon: "shield-checkmark-outline", onPress: () => nav.navigate("PrivacyPolicy") }
  ] as const;
  const appearanceLabel = theme === "dark" ? tr("profile.themeDark") : tr("profile.themeLight");
  const appearanceIcon = theme === "dark" ? "moon-outline" : "sunny-outline";
  const languageLabelMap: Record<AppLanguage, string> = {
    ar: "🇸🇦 العربية",
    ku: "🇮🇶 کوردی",
    en: "🇺🇸 English"
  };
  const languageCycle: AppLanguage[] = ["ar", "ku", "en"];

  return (
    <ScreenShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { writingDirection: dir } as ViewStyle]}
      >
        <InputLayer>
          <NeonHeroHeader
            palette={palette}
            title={tr("profile.title")}
            rightAccessory={<Ionicons name="person-circle-outline" size={24} color="#FFFFFF" />}
            compact
          />

          <View style={styles.glassShell}>
            <SolidPanelFill palette={palette} />
            <View style={styles.userCard}>
              <Text style={[styles.userName, { textAlign, writingDirection: dir }]}>{displayName}</Text>
              <Text style={[styles.userPhone, { textAlign, writingDirection: dir }]}>{phone}</Text>
            </View>
          </View>

          <View style={styles.glassShell}>
            <SolidPanelFill palette={palette} />
            {rows.map((row, idx) => (
              <View key={row.key}>
                <Pressable
                  style={({ pressed }) => [styles.row, { flexDirection: rtl.row }, pressed && styles.pressed]}
                  onPress={row.onPress}
                >
                  <Ionicons name={rtl.chevronForward} size={18} color={palette.textSubtle} />
                  <View style={[styles.rowTextWrap, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                    <Text style={[styles.rowTitle, { textAlign, writingDirection: dir }]}>{row.title}</Text>
                    {row.sub ? <Text style={[styles.rowSub, { textAlign, writingDirection: dir }]}>{row.sub}</Text> : null}
                  </View>
                  <View style={styles.rowIcon}>
                    <Ionicons name={row.icon as keyof typeof Ionicons.glyphMap} size={19} color={palette.primary} />
                  </View>
                </Pressable>
                {idx < rows.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
          <View style={styles.glassShell}>
            <SolidPanelFill palette={palette} />
            <Pressable
              style={({ pressed }) => [styles.row, { flexDirection: rtl.row }, pressed && styles.pressed]}
              onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Ionicons name={rtl.chevronForward} size={18} color={palette.textSubtle} />
              <View style={[styles.rowTextWrap, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.rowTitle, { textAlign, writingDirection: dir }]}>{tr("profile.appearance")}</Text>
                <Text style={[styles.rowSub, { textAlign, writingDirection: dir }]}>{appearanceLabel}</Text>
              </View>
              <View style={styles.rowIcon}>
                <Ionicons name={appearanceIcon as keyof typeof Ionicons.glyphMap} size={19} color={palette.primary} />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.row, { flexDirection: rtl.row }, pressed && styles.pressed]}
              onPress={() => {
                const idx = languageCycle.indexOf(language);
                const next = languageCycle[(idx + 1) % languageCycle.length];
                setLanguage(next);
              }}
            >
              <Ionicons name={rtl.chevronForward} size={18} color={palette.textSubtle} />
              <View style={[styles.rowTextWrap, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.rowTitle, { textAlign, writingDirection: dir }]}>{tr("profile.language")}</Text>
                <Text style={[styles.rowSub, { textAlign, writingDirection: dir }]}>{languageLabelMap[language]}</Text>
              </View>
              <View style={styles.rowIcon}>
                <Ionicons name="language-outline" size={19} color={palette.primary} />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.row, { flexDirection: rtl.row }, pressed && styles.pressed]}
              onPress={() => nav.navigate("DeleteAccountPhone")}
            >
              <Ionicons name={rtl.chevronForward} size={18} color={palette.textSubtle} />
              <View style={[styles.rowTextWrap, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.rowTitle, styles.rowTitleDanger, { textAlign, writingDirection: dir }]}>
                  {tr("profile.deleteAccount")}
                </Text>
              </View>
              <View style={[styles.rowIcon, styles.rowIconDanger]}>
                <Ionicons name="trash-outline" size={19} color="#FF5252" />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={({ pressed }) => [styles.row, { flexDirection: rtl.row }, pressed && styles.pressed]}
              onPress={() => void signOut()}
            >
              <Ionicons name={rtl.chevronForward} size={18} color={palette.textSubtle} />
              <View style={[styles.rowTextWrap, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                <Text style={[styles.rowTitle, styles.rowTitleDanger, { textAlign, writingDirection: dir }]}>
                  {tr("profile.logout")}
                </Text>
              </View>
              <View style={[styles.rowIcon, styles.rowIconDanger]}>
                <Ionicons name="log-out-outline" size={19} color="#FF5252" />
              </View>
            </Pressable>
          </View>
        </InputLayer>
      </ScrollView>
    </ScreenShell>
  );
};
