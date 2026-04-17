import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SolidPanelFill } from "../components/SolidPanelFill";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { NeonHeroHeader } from "../components/ui/NeonHeroHeader";
import { useSettings } from "../providers/SettingsProvider";
import { t } from "../strings";
import type { MainTabParamList } from "../navigation/AppNavigator";
import type { MainAppStackParamList } from "../navigation/mainAppStackTypes";
import { makeServicesStyles } from "./servicesScreenStyles";

type RowItem = {
  key: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function normalizeHttpUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

async function safeOpenUrl(url: string): Promise<boolean> {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (!ok) return false;
  await Linking.openURL(url);
  return true;
}

export const ServicesScreen: React.FC = () => {
  const { palette, termsUrlRaw } = useSettings();
  const styles = useMemo(() => makeServicesStyles(palette), [palette]);
  const isDark = palette.scheme === "dark";

  const navigation = useNavigation<NativeStackNavigationProp<MainAppStackParamList>>();
  const tabNav = navigation.getParent() as BottomTabNavigationProp<MainTabParamList> | undefined;
  const stackNav = navigation;

  const rows: RowItem[] = [
    {
      key: "wallet",
      title: t.servicesHub.walletTitle,
      subtitle: t.servicesHub.walletSub,
      icon: "wallet-outline",
      onPress: () => tabNav?.navigate("Accounts")
    },
    {
      key: "about",
      title: t.servicesHub.aboutTitle,
      subtitle: t.servicesHub.aboutSub,
      icon: "information-circle-outline",
      onPress: () => Toast.show({ type: "info", text1: t.servicesHub.aboutToast })
    },
    {
      key: "privacy",
      title: t.servicesHub.privacyTitle,
      subtitle: t.servicesHub.privacySub,
      icon: "shield-checkmark-outline",
      onPress: () => {
        const url = normalizeHttpUrl(termsUrlRaw);
        if (!url) {
          Toast.show({ type: "info", text1: t.servicesHub.linksNotSet });
          return;
        }
        void safeOpenUrl(url).then((ok) => {
          if (!ok) Toast.show({ type: "error", text1: t.servicesHub.openLinkFailed });
        });
      }
    },
    {
      key: "platforms",
      title: t.servicesHub.platformsTitle,
      subtitle: t.servicesHub.platformsSub,
      icon: "globe-outline",
      onPress: () => stackNav.navigate("SocialPlatforms")
    }
  ];

  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <InputLayer>
          <View style={styles.heroWrap}>
            <NeonHeroHeader
              palette={palette}
              title={t.servicesHub.title}
              subtitle={t.servicesHub.subtitle}
              rightAccessory={
                <Ionicons name="list-circle-outline" size={24} color="rgba(255,255,255,0.92)" />
              }
            />
          </View>

          <View style={styles.listShell}>
            <SolidPanelFill palette={palette} />
            {rows.map((r, idx) => (
              <View key={r.key}>
                <Pressable
                  onPress={r.onPress}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed, pressed && styles.pressedScale]}
                >
                  <Ionicons name="chevron-back" size={18} color={palette.textSubtle} />
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>{r.title}</Text>
                    {r.subtitle ? <Text style={styles.rowSub}>{r.subtitle}</Text> : null}
                  </View>
                  <View style={[styles.rowIcon, isDark && styles.iconGlow]}>
                    <Ionicons name={r.icon} size={20} color={palette.primary} />
                  </View>
                </Pressable>
                {idx < rows.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>
        </InputLayer>
      </ScrollView>
    </ScreenShell>
  );
};

