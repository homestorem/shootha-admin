import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { SolidPanelFill } from "../components/SolidPanelFill";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { useSettings } from "../providers/SettingsProvider";
import { useAuth } from "../providers/AuthProvider";
import type { AppPalette } from "../theme/colors";
import { makeAccountsStyles } from "./accountsScreenStyles";
import { NeonHeroHeader } from "../components/ui/NeonHeroHeader";
import {
  loadAccountsSnapshot,
  saveAccountsSnapshot,
  makeEntryId,
  sumExternalIncome,
  sumManualIncome,
  sumBookingAutoIncome,
  sumIncomeForCalendarDay,
  sumExpenses,
  sumMonthlyIncome,
  type AccountEntry
} from "../services/accountsStore";
import dayjs from "../lib/dayjs";
import { formatHm12HourAr } from "../lib/timeFormat";
import { syncAccountsIncomeFromBookings } from "../services/accountsSync";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { upsertFieldFinanceLedgerEntry } from "../services/fieldFinancesFirestore";
import { formatNumberEn } from "../lib/numberFormat";

const PLACEHOLDER_SUB_DARK = "#90A4AE";
const PLACEHOLDER_SUB_LIGHT = "#616161";

type AccountsStyles = ReturnType<typeof makeAccountsStyles>;

function AccountsGlassPanel(props: {
  palette: AppPalette;
  styles: AccountsStyles;
  children: React.ReactNode;
  padding?: "md" | "lg";
  style?: object;
}) {
  const { palette, styles, children, padding = "md", style } = props;
  return (
    <View style={[styles.glassShell, style]}>
      <SolidPanelFill palette={palette} />
      <View style={padding === "lg" ? styles.glassInnerLg : styles.glassInner}>{children}</View>
    </View>
  );
}

export const AccountsScreen: React.FC = () => {
  const { palette, tr } = useSettings();
  const { user } = useAuth();
  const styles = useMemo(() => makeAccountsStyles(palette), [palette]);
  const isDark = palette.scheme === "dark";
  const phColor = isDark ? PLACEHOLDER_SUB_DARK : PLACEHOLDER_SUB_LIGHT;

  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  /** آخر مزامنة وارد الحجوزات عند التركيز — لتقليل جلب Firestore المتكرر عند التنقل بين التبويبات */
  const lastFocusBookingSyncMs = useRef(0);

  const personName = (user?.display_name?.trim() || tr("profile.guestName")).trim();

  const applyLocalSnapshot = useCallback(async () => {
    const snap = await loadAccountsSnapshot();
    setEntries(snap.entries.sort((a, b) => (a.at < b.at ? 1 : -1)));
  }, []);

  const runBookingIncomeSync = useCallback(async () => {
    if (!user?.id) return;
    await syncAccountsIncomeFromBookings({
      ownerUid: user.id,
      ownerPublicId: user.ownerId,
      personName
    }).catch(() => {
      /* keep accounts screen usable even if sync fails */
    });
  }, [user?.id, user?.ownerId, personName]);

  /** تحديث كامل (سحب للتحديث): مزامنة الحجوزات ثم المحلي */
  const refreshAll = useCallback(async () => {
    await runBookingIncomeSync();
    await applyLocalSnapshot();
  }, [runBookingIncomeSync, applyLocalSnapshot]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        await applyLocalSnapshot();
        if (!alive) return;
        void (async () => {
          const now = Date.now();
          if (now - lastFocusBookingSyncMs.current > 120_000) {
            try {
              await runBookingIncomeSync();
            } catch {
              /* ignore */
            }
            lastFocusBookingSyncMs.current = Date.now();
          }
          if (!alive) return;
          await applyLocalSnapshot();
        })();
      })();
      return () => {
        alive = false;
      };
    }, [applyLocalSnapshot, runBookingIncomeSync, user?.id])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    lastFocusBookingSyncMs.current = 0;
    await refreshAll();
    lastFocusBookingSyncMs.current = Date.now();
    setRefreshing(false);
  }, [refreshAll]);

  const parseAmount = (): number | null => {
    const n = parseFloat(amountText.replace(/,/g, ".").trim());
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100) / 100;
  };

  /**
   * يجب تمرير `entryForCloud` عند إضافة حركة بتاريخ قديم؛ وإلا كان الكود يعتمد على أحدث `at` في المصفوفة
   * فيرفع إلى Firestore حركة قديمة ويتجاهل الحركة الجديدة.
   */
  const persist = async (next: AccountEntry[], entryForCloud?: AccountEntry) => {
    await saveAccountsSnapshot({ entries: next });
    const sorted = [...next].sort((a, b) => (a.at < b.at ? 1 : -1));
    setEntries(sorted);
    const ledgerEntry = entryForCloud ?? sorted[0];
    if (user?.id && ledgerEntry && isFirebaseConfigured()) {
      try {
        await upsertFieldFinanceLedgerEntry({
          ownerUid: user.id,
          ownerPublicId: user.ownerId ?? null,
          personId: user.id,
          personName,
          entry: ledgerEntry
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        Toast.show({
          type: "error",
          text1: tr("accounts.cloudLedgerWriteFailed"),
          text2: `${tr("accounts.cloudLedgerWriteFailedHint")}\n${msg}`.slice(0, 220)
        });
      }
    }
  };

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }
    if (date) {
      setSelectedDate(date);
    }
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }
  };

  const addExpense = async () => {
    const amount = parseAmount();
    if (amount == null) {
      Toast.show({ type: "error", text1: tr("accounts.invalidAmount") });
      return;
    }

    setSaving(true);
    try {
      const entry: AccountEntry = {
        id: makeEntryId(),
        kind: "expense",
        amount,
        note: note.trim(),
        at: selectedDate.toISOString(),
        category: category.trim() ? category.trim() : undefined
      };
      await persist([entry, ...entries], entry);
      setAmountText("");
      setNote("");
      setCategory("");
      setSelectedDate(new Date());
      Toast.show({ type: "success", text1: tr("accounts.savedToast") });
    } finally {
      setSaving(false);
    }
  };

  const ext = sumExternalIncome(entries);
  const man = sumManualIncome(entries);
  const bookingAuto = sumBookingAutoIncome(entries);
  const dailyIncome = sumIncomeForCalendarDay(entries, new Date());
  const exp = sumExpenses(entries);
  const monthIn = sumMonthlyIncome(entries);
  const totalIn = man + ext + bookingAuto;
  const net = totalIn - exp;

  const kindLabel = (k: string) => {
    if (k === "expense") return tr("accounts.kindExpense");
    if (k === "income_external") return tr("accounts.kindExternal");
    if (k === "income_booking") return tr("accounts.kindBooking");
    if (k === "income_manual") return tr("accounts.kindManual");
    return k || tr("accounts.kindExternal");
  };

  return (
    <ScreenShell>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={palette.primary} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        <View style={{ position: "relative", alignSelf: "stretch" }}>
          <InputLayer>
            <View style={styles.heroWrap}>
              <NeonHeroHeader
                palette={palette}
                title={tr("accounts.title")}
                subtitle={user?.id ? `${tr("accounts.personLabel")}: ${personName}` : undefined}
                rightAccessory={
                  <Ionicons name="wallet-outline" size={24} color="rgba(255,255,255,0.92)" />
                }
              />
            </View>

            <View style={styles.kpiHeroShell}>
              <AccountsGlassPanel palette={palette} styles={styles} padding="lg">
                <Text style={styles.netLabel}>{tr("accounts.summaryKpi")}</Text>
                <Text style={[styles.netValue, net >= 0 ? styles.netPositive : styles.netNegative]}>
                  {net >= 0 ? "+" : "−"}
                  {formatNumberEn(Math.abs(net))} {tr("accounts.currency")}
                </Text>
                <View style={styles.monthRow}>
                  <Text style={styles.monthLabel}>{tr("accounts.monthlyIncome")}</Text>
                  <Text style={styles.monthValue}>{formatNumberEn(monthIn)}</Text>
                </View>
                <Text style={[styles.rowDate, { marginTop: 8 }]}>{dayjs().format("MMMM YYYY")}</Text>
              </AccountsGlassPanel>
            </View>

            <Text style={styles.sectionTitle}>{tr("accounts.dashboardSection")}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <AccountsGlassPanel palette={palette} styles={styles}>
                  <Text style={styles.statLabel}>{tr("accounts.externalTotal")}</Text>
                  <Text style={[styles.statValue, styles.statValueIncome]}>
                    {formatNumberEn(ext)}
                  </Text>
                  <Text style={styles.statCur}>{tr("accounts.currency")}</Text>
                </AccountsGlassPanel>
              </View>
              <View style={styles.statTile}>
                <AccountsGlassPanel palette={palette} styles={styles}>
                  <Text style={styles.statLabel}>{tr("accounts.manualTotal")}</Text>
                  <Text style={[styles.statValue, styles.statValueIncome]}>
                    {formatNumberEn(man)}
                  </Text>
                  <Text style={styles.statCur}>{tr("accounts.currency")}</Text>
                </AccountsGlassPanel>
              </View>
              <View style={styles.statTile}>
                <AccountsGlassPanel palette={palette} styles={styles}>
                  <Text style={styles.statLabel}>{tr("accounts.dailyIncomeTotal")}</Text>
                  <Text style={[styles.statValue, styles.statValueIncome]}>
                    {formatNumberEn(dailyIncome)}
                  </Text>
                  <Text style={styles.statCur}>{tr("accounts.currency")}</Text>
                  <Text style={[styles.statCur, { marginTop: 2 }]}>{tr("accounts.dailyIncomeHint")}</Text>
                </AccountsGlassPanel>
              </View>
              <View style={styles.statTile}>
                <AccountsGlassPanel palette={palette} styles={styles}>
                  <Text style={styles.statLabel}>{tr("accounts.expensesTotal")}</Text>
                  <Text style={[styles.statValue, styles.statValueExpense]}>
                    {formatNumberEn(exp)}
                  </Text>
                  <Text style={styles.statCur}>{tr("accounts.currency")}</Text>
                </AccountsGlassPanel>
              </View>
            </View>

            <View style={styles.statFullRow}>
              <AccountsGlassPanel palette={palette} styles={styles}>
                <Text style={styles.statLabel}>{tr("accounts.bookingIncomeAuto")}</Text>
                <Text style={[styles.statValue, styles.statValueIncome]}>{formatNumberEn(bookingAuto)}</Text>
                <Text style={styles.statCur}>{tr("accounts.currency")}</Text>
              </AccountsGlassPanel>
            </View>

            <Text style={styles.sectionTitle}>{tr("accounts.addMovement")}</Text>
            <AccountsGlassPanel palette={palette} styles={styles} padding="lg">
              <Text style={styles.inputLabel}>{tr("accounts.amountLabel")}</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={tr("accounts.amountPlaceholder")}
                placeholderTextColor={phColor}
                value={amountText}
                onChangeText={setAmountText}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>{tr("accounts.categoryLabel")}</Text>
              <TextInput
                style={styles.input}
                placeholder={tr("accounts.categoryPlaceholder")}
                placeholderTextColor={phColor}
                value={category}
                onChangeText={setCategory}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>{tr("accounts.noteLabel")}</Text>
              <TextInput
                style={[styles.input, styles.inputNote]}
                placeholder={tr("accounts.notePlaceholder")}
                placeholderTextColor={phColor}
                value={note}
                onChangeText={setNote}
                textAlign="right"
                multiline
              />

              <Text style={styles.inputLabel}>{tr("accounts.dateLabel")}</Text>
              <Pressable
                style={({ pressed }) => [styles.input, pressed && styles.pressed]}
                onPress={() => setShowDatePicker((v) => !v)}
              >
                <Text style={{ color: isDark ? "#FFFFFF" : "#1A1A1A", textAlign: "right", fontSize: 16 }}>
                  {dayjs(selectedDate).format("YYYY/MM/DD")}
                </Text>
              </Pressable>
              {showDatePicker ? (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={onDateChange}
                />
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, styles.primaryBtnExpense, pressed && styles.pressed]}
                onPress={() => {
                  if (saving) return;
                  void addExpense();
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{tr("accounts.submitExpense")}</Text>
                )}
              </Pressable>
            </AccountsGlassPanel>

            <Text style={styles.sectionTitle}>{tr("accounts.recentTitle")}</Text>
            {entries.length === 0 ? (
              <Text style={styles.emptyList}>{tr("accounts.emptyMovements")}</Text>
            ) : (
              entries.map((e) => {
                const isOut = e.kind === "expense";
                return (
                  <View key={e.id} style={styles.rowShell}>
                    <AccountsGlassPanel palette={palette} styles={styles}>
                      <View style={styles.rowTop}>
                        <View style={styles.rowLeft}>
                          <View style={styles.rowKindRow}>
                            <Text style={styles.rowKind}>{kindLabel(e.kind)}</Text>
                            <View style={styles.statusPill}>
                              <Text style={styles.statusPillText}>{tr("accounts.statusCompleted")}</Text>
                            </View>
                          </View>
                          {e.category ? (
                            <Text style={styles.rowMeta}>
                              {tr("accounts.categoryLabel")}: {e.category}
                            </Text>
                          ) : null}
                          {e.note ? <Text style={styles.rowNote}>{e.note}</Text> : null}
                          {e.durationHours != null && e.pricePerHour != null ? (
                            <Text style={styles.rowMeta}>
                              {e.durationHours} × {formatNumberEn(e.pricePerHour)}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.rowAmount, isOut ? styles.rowAmountOut : styles.rowAmountIn]}>
                          {isOut ? "−" : "+"}
                          {formatNumberEn(e.amount)}
                        </Text>
                      </View>
                      <Text style={styles.rowDate}>
                        {dayjs(e.at).format("YYYY/MM/DD")}{" "}
                        {formatHm12HourAr(dayjs(e.at).format("HH:mm"))}
                      </Text>
                    </AccountsGlassPanel>
                  </View>
                );
              })
            )}
          </InputLayer>
        </View>
      </ScrollView>
    </ScreenShell>
  );
};
