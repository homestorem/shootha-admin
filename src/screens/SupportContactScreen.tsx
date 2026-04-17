import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenShell } from "../components/ScreenShell";
import { SolidPanelFill } from "../components/SolidPanelFill";
import { InputLayer } from "../components/InputLayer";
import { useSettings } from "../providers/SettingsProvider";
import type { MainAppStackParamList } from "../navigation/mainAppStackTypes";
import { digitsOnly } from "../lib/phoneDial";
import { spacing } from "../theme/tokens";

function whatsappUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const d = digitsOnly(s);
  return d ? `https://wa.me/${d}` : null;
}

export const SupportContactScreen: React.FC = () => {
  const { palette, supportWhatsappRaw, tr, textAlign } = useSettings();
  const nav = useNavigation<NativeStackNavigationProp<MainAppStackParamList>>();
  const isDark = palette.scheme === "dark";
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        inner: { padding: spacing.lg },
        body: { color: isDark ? "#B0BEC5" : "#666666", lineHeight: 22, fontWeight: "700" },
        btn: { marginTop: spacing.md, backgroundColor: palette.primary, borderRadius: 999, alignItems: "center", paddingVertical: 12 },
        btnText: { color: "#fff", fontWeight: "800" },
        btnOutline: {
          marginTop: spacing.sm,
          borderRadius: 999,
          alignItems: "center",
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: palette.primary
        },
        btnOutlineText: { color: palette.primary, fontWeight: "800" }
      }),
    [isDark, palette]
  );

  return (
    <ScreenShell>
      <InputLayer>
        <View style={styles.card}>
          <SolidPanelFill palette={palette} />
          <View style={styles.inner}>
            <Text style={[styles.body, { textAlign }]}>{tr("supportChat.hubIntro")}</Text>
            <Pressable style={styles.btn} onPress={() => nav.navigate("SupportChat")}>
              <Text style={styles.btnText}>{tr("supportChat.openInApp")}</Text>
            </Pressable>
            <Pressable
              style={styles.btnOutline}
              onPress={async () => {
                const url = whatsappUrl(supportWhatsappRaw);
                if (!url) return Toast.show({ type: "info", text1: tr("supportChat.whatsappMissing") });
                const ok = await Linking.canOpenURL(url).catch(() => false);
                if (!ok) return Toast.show({ type: "error", text1: tr("supportChat.openLinkFailed") });
                await Linking.openURL(url);
              }}
            >
              <Text style={styles.btnOutlineText}>{tr("supportChat.openWhatsapp")}</Text>
            </Pressable>
          </View>
        </View>
      </InputLayer>
    </ScreenShell>
  );
};

