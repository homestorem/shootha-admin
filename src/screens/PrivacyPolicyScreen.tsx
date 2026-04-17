import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { SolidPanelFill } from "../components/SolidPanelFill";
import { InputLayer } from "../components/InputLayer";
import { useSettings } from "../providers/SettingsProvider";
import { spacing } from "../theme/tokens";

export const PrivacyPolicyScreen: React.FC = () => {
  const { palette, termsUrlRaw } = useSettings();
  const isDark = palette.scheme === "dark";
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        inner: { padding: spacing.lg },
        body: { textAlign: "right", color: isDark ? "#B0BEC5" : "#666666", lineHeight: 22, fontWeight: "700" },
        btn: { marginTop: spacing.md, backgroundColor: palette.primary, borderRadius: 999, alignItems: "center", paddingVertical: 12 },
        btnText: { color: "#fff", fontWeight: "800" }
      }),
    [isDark, palette]
  );
  return (
    <ScreenShell>
      <InputLayer>
        <View style={styles.card}>
          <SolidPanelFill palette={palette} />
          <View style={styles.inner}>
            <Text style={styles.body}>نلتزم بحماية بياناتك وخصوصيتك أثناء استخدام التطبيق.</Text>
            <Pressable
              style={styles.btn}
              onPress={async () => {
                const url = termsUrlRaw?.trim();
                if (!url || !/^https?:\/\//i.test(url)) return Toast.show({ type: "info", text1: "الرابط غير مُعدّ" });
                const ok = await Linking.canOpenURL(url).catch(() => false);
                if (!ok) return Toast.show({ type: "error", text1: "تعذّر فتح الرابط" });
                await Linking.openURL(url);
              }}
            >
              <Text style={styles.btnText}>فتح سياسة الخصوصية</Text>
            </Pressable>
          </View>
        </View>
      </InputLayer>
    </ScreenShell>
  );
};

