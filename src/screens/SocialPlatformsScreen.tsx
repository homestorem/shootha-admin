import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SolidPanelFill } from "../components/SolidPanelFill";
import Toast from "react-native-toast-message";

import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { NeonHeroHeader } from "../components/ui/NeonHeroHeader";
import { useSettings } from "../providers/SettingsProvider";
import { t } from "../strings";
import { digitsOnly } from "../lib/phoneDial";
import { makeSocialPlatformsStyles } from "./socialPlatformsScreenStyles";

function normalizeHttpUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

function buildWhatsappOpenUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const d = digitsOnly(s);
  if (!d) return null;
  return `https://wa.me/${d}`;
}

async function safeOpenUrl(url: string): Promise<boolean> {
  const ok = await Linking.canOpenURL(url).catch(() => false);
  if (!ok) return false;
  await Linking.openURL(url);
  return true;
}

type PlatformTile = {
  key: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export const SocialPlatformsScreen: React.FC = () => {
  const { palette, supportWhatsappRaw, termsUrlRaw } = useSettings();
  const styles = useMemo(() => makeSocialPlatformsStyles(palette), [palette]);
  const isDark = palette.scheme === "dark";

  const tiles: PlatformTile[] = [
    {
      key: "instagram",
      title: t.platforms.instagramTitle,
      subtitle: t.platforms.instagramSub,
      icon: "logo-instagram",
      onPress: () => Toast.show({ type: "info", text1: t.platforms.comingSoon })
    },
    {
      key: "facebook",
      title: t.platforms.facebookTitle,
      subtitle: t.platforms.facebookSub,
      icon: "logo-facebook",
      onPress: () => Toast.show({ type: "info", text1: t.platforms.comingSoon })
    },
    {
      key: "tiktok",
      title: t.platforms.tiktokTitle,
      subtitle: t.platforms.tiktokSub,
      icon: "logo-tiktok",
      onPress: () => Toast.show({ type: "info", text1: t.platforms.comingSoon })
    },
    {
      key: "whatsapp",
      title: t.platforms.whatsappTitle,
      subtitle: t.platforms.whatsappSub,
      icon: "logo-whatsapp",
      onPress: () => {
        const url = buildWhatsappOpenUrl(supportWhatsappRaw);
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
      title: t.platforms.websiteTitle,
      subtitle: t.platforms.websiteSub,
      icon: "globe-outline",
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
      key: "phone",
      title: t.platforms.phoneTitle,
      subtitle: t.platforms.phoneSub,
      icon: "call-outline",
      onPress: () => Toast.show({ type: "info", text1: t.platforms.phoneHint })
    }
  ];

  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <InputLayer>
          <View style={styles.heroWrap}>
            <NeonHeroHeader
              palette={palette}
              title={t.servicesHub.platformsTitle}
              rightAccessory={
                <Ionicons name="globe-outline" size={24} color="rgba(255,255,255,0.92)" />
              }
            />
          </View>

          <View style={styles.grid}>
            {tiles.map((it) => (
              <View key={it.key} style={styles.tileWrap}>
                <Pressable
                  onPress={it.onPress}
                  style={({ pressed }) => [styles.cardShell, pressed && styles.pressed, pressed && styles.pressedScale]}
                >
                  <SolidPanelFill palette={palette} />
                  <View style={styles.inner}>
                    <View style={[styles.iconCircle, isDark && styles.iconGlow]}>
                      <Ionicons name={it.icon} size={24} color={palette.primary} />
                    </View>
                    <View>
                      <Text style={styles.name}>{it.title}</Text>
                      {it.subtitle ? <Text style={styles.sub}>{it.subtitle}</Text> : null}
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

