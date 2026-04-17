import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { SolidPanelFill } from "../components/SolidPanelFill";
import { InputLayer } from "../components/InputLayer";
import { useSettings } from "../providers/SettingsProvider";
import { spacing } from "../theme/tokens";

export const FieldDataRequestScreen: React.FC = () => {
  const { palette } = useSettings();
  const isDark = palette.scheme === "dark";
  const [text, setText] = useState("");
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, position: "relative" },
        pageFill: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: isDark ? palette.card : "rgba(252, 252, 252, 0.97)"
        },
        card: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        inner: { padding: spacing.lg },
        label: { textAlign: "right", fontWeight: "800", marginBottom: 8, color: isDark ? "#FFFFFF" : "#1A1A1A" },
        input: { minHeight: 120, textAlignVertical: "top", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", borderRadius: 12, padding: 12, color: isDark ? "#fff" : "#111", backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.4)" },
        btn: { marginTop: spacing.md, backgroundColor: palette.primary, borderRadius: 999, alignItems: "center", paddingVertical: 12 },
        btnText: { color: "#fff", fontWeight: "800" }
      }),
    [isDark, palette]
  );
  return (
    <ScreenShell>
      <View style={styles.root}>
        <View pointerEvents="none" style={styles.pageFill} />
        <InputLayer>
          <View style={styles.card}>
            <SolidPanelFill palette={palette} />
            <View style={styles.inner}>
              <Text style={styles.label}>اكتب تفاصيل التعديل المطلوب</Text>
              <TextInput value={text} onChangeText={setText} style={styles.input} multiline textAlign="right" placeholder="مثال: تعديل السعر أو الخدمات..." placeholderTextColor={isDark ? "#90A4AE" : "#666"} />
              <Pressable style={styles.btn} onPress={() => Toast.show({ type: "success", text1: "تم إرسال الطلب" })}>
                <Text style={styles.btnText}>إرسال</Text>
              </Pressable>
            </View>
          </View>
        </InputLayer>
      </View>
    </ScreenShell>
  );
};

