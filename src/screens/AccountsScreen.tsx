import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { colors } from "../theme/colors";
import { cardElevation, radius, spacing } from "../theme/tokens";
import { t } from "../strings";
import {
  loadAccountsSnapshot,
  saveAccountsSnapshot,
  makeEntryId,
  sumExternalIncome,
  sumManualIncome,
  sumExpenses,
  sumMonthlyIncome,
  sumBookingIncome,
  type AccountEntry,
  type AccountEntryKind
} from "../services/accountsStore";
import dayjs from "../lib/dayjs";

export const AccountsScreen: React.FC = () => {
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [savingKind, setSavingKind] = useState<AccountEntryKind | null>(null);

  const load = useCallback(async () => {
    const snap = await loadAccountsSnapshot();
    setEntries(snap.entries.sort((a, b) => (a.at < b.at ? 1 : -1)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      void load().finally(() => {
        if (alive) setLoading(false);
      });
      return () => {
        alive = false;
      };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const parseAmount = (): number | null => {
    const n = parseFloat(amountText.replace(/,/g, ".").trim());
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100) / 100;
  };

  const persist = async (next: AccountEntry[]) => {
    await saveAccountsSnapshot({ entries: next });
    setEntries(next.sort((a, b) => (a.at < b.at ? 1 : -1)));
  };

  const addEntry = async (kind: AccountEntryKind) => {
    const amount = parseAmount();
    if (amount == null) {
      Toast.show({ type: "error", text1: t.accounts.invalidAmount });
      return;
    }
    setSavingKind(kind);
    try {
      const entry: AccountEntry = {
        id: makeEntryId(),
        kind,
        amount,
        note: note.trim(),
        at: new Date().toISOString()
      };
      await persist([entry, ...entries]);
      setAmountText("");
      setNote("");
      Toast.show({ type: "success", text1: t.accounts.savedToast });
    } finally {
      setSavingKind(null);
    }
  };

  const ext = sumExternalIncome(entries);
  const man = sumManualIncome(entries);
  const exp = sumExpenses(entries);
  const monthIn = sumMonthlyIncome(entries);
  const bookingInMonth = sumBookingIncome(
    entries.filter((e) => {
      const d = new Date(e.at);
      const ref = new Date();
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
    })
  );

  const kindLabel = (k: AccountEntryKind) => {
    if (k === "expense") return t.accounts.kindExpense;
    if (k === "income_external") return t.accounts.kindExternal;
    if (k === "income_booking") return t.accounts.kindBooking;
    return t.accounts.kindManual;
  };

  if (loading) {
    return (
      <ScreenShell>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingHint}>{t.common.loading}</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{t.accounts.title}</Text>
        <Text style={styles.pageSub}>{t.accounts.subtitle}</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, cardElevation()]}>
            <Text style={styles.statLabel}>{t.accounts.externalTotal}</Text>
            <Text style={styles.statValue}>{ext.toLocaleString("ar-IQ")}</Text>
            <Text style={styles.statCur}>{t.accounts.currency}</Text>
          </View>
          <View style={[styles.statCard, cardElevation()]}>
            <Text style={styles.statLabel}>{t.accounts.manualTotal}</Text>
            <Text style={styles.statValue}>{man.toLocaleString("ar-IQ")}</Text>
            <Text style={styles.statCur}>{t.accounts.currency}</Text>
          </View>
        </View>

        <View style={[styles.monthCard, cardElevation()]}>
          <Text style={styles.monthLabel}>{t.accounts.monthlyIncome}</Text>
          <Text style={styles.monthValue}>{monthIn.toLocaleString("ar-IQ")}</Text>
          <Text style={styles.monthHint}>{dayjs().format("MMMM YYYY")}</Text>
          {bookingInMonth > 0 ? (
            <Text style={styles.monthBookingHint}>
              {t.accounts.kindBooking}: {bookingInMonth.toLocaleString("ar-IQ")} {t.accounts.currency}
            </Text>
          ) : null}
        </View>

        <View style={[styles.expenseCard, cardElevation()]}>
          <Text style={styles.expenseLabel}>{t.accounts.expensesTotal}</Text>
          <Text style={styles.expenseValue}>{exp.toLocaleString("ar-IQ")}</Text>
          <Text style={styles.statCur}>{t.accounts.currency}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t.accounts.addMovement}</Text>
        <Text style={styles.inputLabel}>{t.accounts.amountLabel}</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder={t.accounts.amountPlaceholder}
          placeholderTextColor={colors.textSubtle}
          value={amountText}
          onChangeText={setAmountText}
          textAlign="right"
        />
        <Text style={styles.inputLabel}>{t.accounts.noteLabel}</Text>
        <TextInput
          style={[styles.input, styles.inputNote]}
          placeholder={t.accounts.notePlaceholder}
          placeholderTextColor={colors.textSubtle}
          value={note}
          onChangeText={setNote}
          textAlign="right"
          multiline
        />

        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnExpense, pressed && styles.pressed]}
            onPress={() => void addEntry("expense")}
            disabled={savingKind !== null}
          >
            {savingKind === "expense" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t.accounts.addExpense}</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnIncomeExt, pressed && styles.pressed]}
            onPress={() => void addEntry("income_external")}
            disabled={savingKind !== null}
          >
            {savingKind === "income_external" ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.btnTextDark}>{t.accounts.addIncomeExternal}</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnIncomeMan, pressed && styles.pressed]}
            onPress={() => void addEntry("income_manual")}
            disabled={savingKind !== null}
          >
            {savingKind === "income_manual" ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.btnTextDark}>{t.accounts.addIncomeManual}</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t.accounts.recentTitle}</Text>
        {entries.length === 0 ? (
          <Text style={styles.emptyList}>{t.accounts.emptyMovements}</Text>
        ) : (
          entries.map((e) => (
            <View key={e.id} style={[styles.rowCard, cardElevation()]}>
              <View style={styles.rowTop}>
                <Text style={styles.rowKind}>{kindLabel(e.kind)}</Text>
                <Text style={styles.rowAmount}>
                  {e.kind === "expense" ? "−" : "+"}
                  {e.amount.toLocaleString("ar-IQ")} {t.accounts.currency}
                </Text>
              </View>
              {e.note ? <Text style={styles.rowNote}>{e.note}</Text> : null}
              <Text style={styles.rowDate}>{dayjs(e.at).format("YYYY/MM/DD HH:mm")}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontWeight: "600"
  },
  scroll: {
    paddingBottom: 120,
    paddingTop: spacing.sm
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    letterSpacing: -0.3
  },
  pageSub: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: spacing.lg,
    lineHeight: 22
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
    fontWeight: "700",
    marginBottom: 6
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right"
  },
  statCur: {
    fontSize: 11,
    color: colors.textSubtle,
    textAlign: "right",
    marginTop: 4,
    fontWeight: "600"
  },
  monthCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryMuted
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primaryDark,
    textAlign: "right"
  },
  monthValue: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.primary,
    textAlign: "right",
    marginTop: 8
  },
  monthHint: {
    fontSize: 12,
    color: colors.primaryLight,
    textAlign: "right",
    marginTop: 6,
    fontWeight: "600"
  },
  monthBookingHint: {
    fontSize: 12,
    color: colors.primaryDark,
    textAlign: "right",
    marginTop: 8,
    fontWeight: "700"
  },
  expenseCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border
  },
  expenseLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    fontWeight: "700"
  },
  expenseValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.danger,
    textAlign: "right",
    marginTop: 6
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.sm
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 6
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    marginBottom: spacing.md
  },
  inputNote: {
    minHeight: 72,
    textAlignVertical: "top"
  },
  actionsRow: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  btn: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  btnExpense: {
    backgroundColor: colors.danger
  },
  btnIncomeExt: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.primary
  },
  btnIncomeMan: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border
  },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14
  },
  btnTextDark: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 13,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.88
  },
  emptyList: {
    textAlign: "right",
    color: colors.textMuted,
    fontWeight: "600",
    paddingVertical: spacing.lg
  },
  rowCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border
  },
  rowTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowKind: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text
  },
  rowNote: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    lineHeight: 20
  },
  rowDate: {
    marginTop: 6,
    fontSize: 11,
    color: colors.textSubtle,
    textAlign: "right",
    fontWeight: "600"
  }
});
