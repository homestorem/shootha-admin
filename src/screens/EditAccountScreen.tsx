import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { SolidPanelFill } from "../components/SolidPanelFill";
import { InputLayer } from "../components/InputLayer";
import { useAuth } from "../providers/AuthProvider";
import { useSettings } from "../providers/SettingsProvider";
import { spacing } from "../theme/tokens";

export const EditAccountScreen: React.FC = () => {
  const { palette } = useSettings();
  const { user } = useAuth();
  const isDark = palette.scheme === "dark";
  const [name, setName] = useState(user?.display_name || user?.user_metadata?.name || "ahmad");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        inner: { padding: spacing.lg },
        label: { textAlign: "right", fontWeight: "800", marginBottom: 8, color: isDark ? "#FFFFFF" : "#1A1A1A" },
        input: { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", borderRadius: 12, padding: 12, color: isDark ? "#fff" : "#111", backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.4)" },
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
            <Text style={styles.label}>الاسم</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} textAlign="right" placeholder="ahmad" placeholderTextColor={isDark ? "#90A4AE" : "#666"} />
            <Pressable style={styles.btn} onPress={() => Toast.show({ type: "success", text1: "تم حفظ التعديل" })}>
              <Text style={styles.btnText}>حفظ</Text>
            </Pressable>
          </View>
        </View>
      </InputLayer>
    </ScreenShell>
  );
};

