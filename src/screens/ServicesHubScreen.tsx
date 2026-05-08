import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SolidPanelFill } from "../components/SolidPanelFill";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { NeonHeroHeader } from "../components/ui/NeonHeroHeader";
import { useSettings } from "../providers/SettingsProvider";
import { t } from "../strings";
import type { MainTabParamList } from "../navigation/AppNavigator";
import { makeServicesHubStyles } from "./servicesHubScreenStyles";
import { buildWhatsappOpenUrlFromRaw } from "../lib/phoneDial";

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

type Tile = {
  key: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export const ServicesHubScreen: React.FC = () => {
  const { palette, supportWhatsappRaw, termsUrlRaw } = useSettings();
  const styles = useMemo(() => makeServicesHubStyles(palette), [palette]);
  const isDark = palette.scheme === "dark";

  const navigation = useNavigation();
  const tabNav = navigation.getParent() as BottomTabNavigationProp<MainTabParamList> | undefined;

  const tiles: Tile[] = [
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
      onPress: () => {
        Toast.show({ type: "info", text1: t.servicesHub.aboutToast });
      }
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
      onPress: () => {
        Toast.show({ type: "info", text1: t.servicesHub.platformsToast });
      }
    },
    {
      key: "whatsapp",
      title: t.servicesHub.whatsappTitle,
      subtitle: t.servicesHub.whatsappSub,
      icon: "logo-whatsapp",
      onPress: () => {
        const url = buildWhatsappOpenUrlFromRaw(supportWhatsappRaw);
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
      key: "website",
      title: t.servicesHub.websiteTitle,
      subtitle: t.servicesHub.websiteSub,
      icon: "globe-sharp",
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
    }
  ];

  return (
    <ScreenShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <InputLayer>
          <View style={styles.heroWrap}>
            <NeonHeroHeader
              palette={palette}
              title={t.servicesHub.title}
              subtitle={t.servicesHub.subtitle}
              rightAccessory={
                <Ionicons name="apps-outline" size={24} color="rgba(255,255,255,0.92)" />
              }
            />
          </View>

          <View style={styles.grid}>
            {tiles.map((it) => (
              <View key={it.key} style={styles.tileWrap}>
                <Pressable
                  onPress={it.onPress}
                  style={({ pressed }) => [
                    styles.glassShell,
                    pressed && styles.pressed,
                    pressed && styles.pressedScale
                  ]}
                >
                  <SolidPanelFill palette={palette} />
                  <View style={styles.inner}>
                    <View style={[styles.iconCircle, isDark && styles.iconGlow]}>
                      <Ionicons name={it.icon} size={22} color={palette.primary} />
                    </View>
                    <View>
                      <Text style={styles.tileTitle}>{it.title}</Text>
                      {it.subtitle ? <Text style={styles.tileSub}>{it.subtitle}</Text> : null}
                    </View>
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
        </InputLayer>
      </ScrollView>
    </ScreenShell>
  );
};

