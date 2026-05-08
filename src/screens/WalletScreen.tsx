import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SolidPanelFill } from "../components/SolidPanelFill";
import { NeonHeroHeader } from "../components/ui/NeonHeroHeader";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { useSettings } from "../providers/SettingsProvider";
import { neonCardShell, spacing } from "../theme/tokens";
import type { AppPalette } from "../theme/colors";
import dayjs from "../lib/dayjs";
import { loadWalletSnapshot, processDueWalletSettlements, redeemVoucherCode, type WalletEntryType, type WalletJournalEntry } from "../services/walletStore";
import { useAuth } from "../providers/AuthProvider";
import { formatNumberEn } from "../lib/numberFormat";

export const WalletScreen: React.FC = () => {
  const { palette } = useSettings();
  const { user } = useAuth();
  const isDark = palette.scheme === "dark";
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<WalletJournalEntry[]>([]);
  const [available, setAvailable] = useState(0);

  const [cardCode, setCardCode] = useState("");
  const [saving, setSaving] = useState(false);

  const fmt = (n: unknown) => formatNumberEn(typeof n === "number" && Number.isFinite(n) ? n : 0);

  const reload = useCallback(async () => {
    const ownerUid = user?.id ?? user?.uid;
    await processDueWalletSettlements(ownerUid);
    const snap = await loadWalletSnapshot(ownerUid);
    setEntries(snap.entries);
    setAvailable(snap.account.availableBalance);
  }, [user?.id, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const submit = async () => {
    const code = cardCode.trim();
    if (!code) {
      Toast.show({ type: "error", text1: "أدخل رمز البطاقة" });
      return;
    }

    setSaving(true);
    try {
      const res = await redeemVoucherCode({ code, userUid: user?.uid, ownerId: user?.ownerId });
      if (!res.ok) {
        const reasonText =
          res.reason === "not_found"
            ? "رمز البطاقة غير صحيح"
            : res.reason === "already_used"
              ? "هذه البطاقة مستخدمة مسبقاً"
              : res.reason === "auth_required"
                ? "يجب تسجيل الدخول أولاً"
                : res.reason === "invalid_amount"
                  ? "قيمة البطاقة غير صالحة"
                  : "تعذر شحن البطاقة حالياً";
        Toast.show({
          type: "error",
          text1: reasonText
        });
        return;
      }
      setCardCode("");
      await reload();
      Toast.show({ type: "success", text1: `تم الشحن بنجاح: ${fmt(res.amount)} د.ع` });
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = (t: WalletEntryType) => {
    switch (t) {
      case "topup":
        return "شحن";
      case "booking_charge":
        return "خصم حجز";
      case "dashboard_income":
        return "إضافة للداشبورد";
      case "booking_income":
        return "وارد حجز";
      case "expense":
        return "مصروف";
      default:
        return "تسوية";
    }
  };

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.primary} />}
      >
        <InputLayer>
          <NeonHeroHeader
            palette={palette}
            title="المحفظة"
            rightAccessory={<Ionicons name="wallet-outline" size={24} color="#FFFFFF" />}
            compact
          />

          <View style={styles.glassShell}>
            <SolidPanelFill palette={palette} />
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>الرصيد المتاح</Text>
              <Text style={styles.balanceValue}>{fmt(available)} د.ع</Text>
            </View>
          </View>

          <View style={styles.glassShell}>
            <SolidPanelFill palette={palette} />
            <View style={styles.formCard}>
              <Text style={styles.section}>شحن عبر رمز البطاقة</Text>
              <TextInput style={styles.input} value={cardCode} onChangeText={setCardCode} autoCapitalize="characters" placeholder="مثال: APL-100-2026" placeholderTextColor={styles.ph.color} textAlign="right" />
              <Pressable style={styles.primaryBtn} onPress={() => void submit()}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>شحن الرصيد</Text>}
              </Pressable>
            </View>
          </View>

          <Text style={styles.section}>سجل المحفظة</Text>
          {entries.length === 0 ? <Text style={styles.empty}>لا توجد عمليات بعد.</Text> : null}
          {entries.map((e) => (
            <View key={e.id} style={styles.glassShell}>
              <SolidPanelFill palette={palette} />
              <View style={styles.row}>
                <View style={styles.rowRight}>
                  <Text style={styles.rowType}>{typeLabel(e.type)}</Text>
                  <Text style={styles.rowDate}>{dayjs(e.createdAt).format("YYYY/MM/DD HH:mm")}</Text>
                </View>
                <Text style={[styles.rowAmount, e.direction === "credit" ? styles.credit : styles.debit]}>
                  {e.direction === "credit" ? "+" : "-"}{fmt(e.amount)}
                </Text>
              </View>
            </View>
          ))}
        </InputLayer>
      </ScrollView>
    </ScreenShell>
  );
};

function makeStyles(palette: AppPalette) {
  const isDark = palette.scheme === "dark";
  const primary = palette.primary;
  return StyleSheet.create({
    scroll: { paddingTop: spacing.sm, paddingBottom: 120 },
    section: { fontSize: 15, fontWeight: "800", textAlign: "right", marginBottom: spacing.sm, color: isDark ? "#fff" : "#1A1A1A" },
    glassShell: {
      ...neonCardShell(palette),
      marginBottom: spacing.md,
      overflow: "hidden"
    },
    balanceCard: { padding: spacing.lg },
    balanceLabel: { textAlign: "right", color: isDark ? "#B0BEC5" : "#666", fontWeight: "700" },
    balanceValue: { marginTop: 8, textAlign: "right", fontSize: 28, fontWeight: "900", color: primary },
    formCard: { padding: spacing.lg },
    input: { borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: isDark ? "#fff" : "#111", backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.42)", marginBottom: spacing.sm },
    ph: { color: isDark ? "#90A4AE" : "#757575" },
    primaryBtn: { marginTop: spacing.sm, borderRadius: 999, alignItems: "center", paddingVertical: 12, backgroundColor: primary },
    primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
    empty: { textAlign: "right", color: isDark ? "#B0BEC5" : "#666", fontWeight: "700", paddingVertical: spacing.sm },
    row: { padding: spacing.md, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
    rowRight: { alignItems: "flex-end", flex: 1 },
    rowType: { fontWeight: "800", color: isDark ? "#fff" : "#1A1A1A" },
    rowDate: { marginTop: 4, fontSize: 11, color: isDark ? "#B0BEC5" : "#666", fontWeight: "700" },
    rowAmount: { fontSize: 16, fontWeight: "900" },
    credit: { color: primary },
    debit: { color: "#FF5252" }
  });
}

