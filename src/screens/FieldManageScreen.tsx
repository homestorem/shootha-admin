import React, { useLayoutEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "../lib/dayjs";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { colors } from "../theme/colors";
import { radius, spacing, cardElevation } from "../theme/tokens";
import { t } from "../strings";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { useAuth } from "../providers/AuthProvider";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import { fetchMergedFieldsForUid } from "../services/ownerFieldsFirestore";
import {
  computeAvailableSlots,
  deleteOwnerBookingDoc,
  fetchOwnerBookingsForUid,
  insertOwnerBooking,
  updateOwnerBookingDoc,
  venueBookingToOwnerBookingDoc,
  type BookingSourceKind,
  type OwnerBookingDoc
} from "../services/ownerBookingsFirestore";
import { fetchVenueBookingsForOwner, SYNC_SOURCE_OWNER_APP } from "../services/venueBookingsFirestore";
import { BOOKING_DURATION_MINUTES_OPTIONS, type BookingDurationMinutesOption } from "../lib/bookingsApi";
import type { MainAppStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<MainAppStackParamList, "FieldManage">;

export const FieldManageScreen: React.FC<Props> = ({ navigation, route }) => {
  const { fieldId, fieldName } = route.params;
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const ownerPub = uid ? user?.ownerId ?? deriveOwnerIdFromUid(uid) : "";
  const queryClient = useQueryClient();

  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [durationMins, setDurationMins] = useState<BookingDurationMinutesOption>(60);
  const [price, setPrice] = useState("100");
  const [servicesText, setServicesText] = useState("");
  const [source, setSource] = useState<BookingSourceKind>("manual");
  const [playerName, setPlayerName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerBookingDoc | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: fieldName });
  }, [navigation, fieldName]);

  const {
    data: fields = [],
    isPending: fieldsPending
  } = useQuery({
    queryKey: ["ownerFields", uid, user?.ownerId],
    queryFn: () => fetchMergedFieldsForUid(uid, ownerPub),
    enabled: Boolean(uid && ownerPub && isFirebaseConfigured())
  });

  const field = fields.find((f) => f.id === fieldId);
  const isDashboardField = field?.source === "dashboard";

  const { data: allBookings = [] } = useQuery({
    queryKey: ["ownerBookings", uid],
    queryFn: () => fetchOwnerBookingsForUid(uid),
    enabled: Boolean(uid && isFirebaseConfigured())
  });

  const { data: allVenueBookings = [] } = useQuery({
    queryKey: ["venueBookingsByOwner", ownerPub],
    queryFn: () => fetchVenueBookingsForOwner(ownerPub),
    enabled: Boolean(uid && ownerPub && isFirebaseConfigured())
  });

  const fieldBookings = useMemo(() => {
    const ownerRows = allBookings.filter((b) => b.fieldId === fieldId);
    const venueRows = allVenueBookings
      .filter((v) => v.venueId === fieldId && v.syncSource !== SYNC_SOURCE_OWNER_APP)
      .map((v) => venueBookingToOwnerBookingDoc(v, "display"));
    return [...ownerRows, ...venueRows].sort((a, b) =>
      `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`)
    );
  }, [allVenueBookings, fieldId, allBookings]);

  const bookingsForSlots = useMemo(() => {
    const ownerRows = allBookings.filter(
      (b) =>
        b.fieldId === fieldId &&
        String(b.status ?? "").toLowerCase() !== "cancelled" &&
        !b.mirrorBookingId
    );
    const venueRows = allVenueBookings
      .filter((v) => v.venueId === fieldId && String(v.status ?? "").toLowerCase() !== "cancelled")
      .map((v) => venueBookingToOwnerBookingDoc(v, "slots"));
    return [...ownerRows, ...venueRows];
  }, [allVenueBookings, fieldId, allBookings]);

  const slots = useMemo(
    () =>
      computeAvailableSlots(
        date,
        bookingsForSlots,
        durationMins,
        8,
        22,
        editOpen ? editing?.id ?? null : null
      ),
    [date, bookingsForSlots, durationMins, editing, editOpen]
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ownerBookings", uid] });
    void queryClient.invalidateQueries({ queryKey: ["bookings", uid] });
    void queryClient.invalidateQueries({ queryKey: ["mergedBookings", uid] });
    void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", ownerPub] });
  };

  const insertMut = useMutation({
    mutationFn: () => {
      const [hour, minute] = startTime.split(":").map((x) => parseInt(x, 10));
      const end = dayjs(date)
        .hour(hour || 0)
        .minute(minute || 0)
        .second(0)
        .add(durationMins, "minute");
      return insertOwnerBooking({
        ownerUid: uid,
        fieldId,
        fieldName,
        date,
        startTime,
        endTime: end.format("HH:mm"),
        durationMinutes: durationMins,
        totalPrice: parseFloat(price.replace(/,/g, ".")) || 0,
        status: "approved",
        source,
        playerName: source === "player" ? playerName.trim() || null : null,
        services: servicesText
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean),
        ownerPublicId: source === "manual" ? ownerPub : undefined
      });
    },
    onSuccess: () => {
      invalidate();
      Toast.show({ type: "success", text1: t.fields.bookingSaved });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editing) return Promise.resolve();
      const [hour, minute] = startTime.split(":").map((x) => parseInt(x, 10));
      const end = dayjs(date)
        .hour(hour || 0)
        .minute(minute || 0)
        .second(0)
        .add(durationMins, "minute");
      return updateOwnerBookingDoc(editing.id, {
        date,
        startTime,
        endTime: end.format("HH:mm"),
        durationMinutes: durationMins,
        totalPrice: parseFloat(price.replace(/,/g, ".")) || 0,
        playerName: source === "player" ? playerName.trim() || null : null,
        services: servicesText
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean),
        fieldName,
        status: editing.status
      });
    },
    onSuccess: () => {
      setEditOpen(false);
      setEditing(null);
      invalidate();
      Toast.show({ type: "success", text1: t.fields.bookingUpdated });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOwnerBookingDoc(id),
    onSuccess: () => {
      invalidate();
      Toast.show({ type: "success", text1: t.fields.bookingDeleted });
    }
  });

  const applyDurationToEnd = useCallback(
    (start: string, mins: number) => {
      const [h, m] = start.split(":").map((x) => parseInt(x, 10));
      const base = dayjs(date).hour(h || 0).minute(m || 0);
      const end = base.add(mins, "minute");
      setEndTime(end.format("HH:mm"));
    },
    [date]
  );

  const pickSlot = (s: { start: string; end: string }) => {
    setStartTime(s.start);
    setEndTime(s.end);
    const [h0, m0] = s.start.split(":").map((x) => parseInt(x, 10));
    const [h1, m1] = s.end.split(":").map((x) => parseInt(x, 10));
    const diff = h1 * 60 + m1 - (h0 * 60 + m0);
    if (diff === 60 || diff === 90) {
      setDurationMins(diff as BookingDurationMinutesOption);
    }
  };

  const openEdit = (b: OwnerBookingDoc) => {
    if (String(b.id).startsWith("vb:")) return;
    setEditing(b);
    setDate(b.date);
    setStartTime(b.startTime);
    setEndTime(b.endTime);
    setDurationMins((b.durationMinutes === 90 ? 90 : 60) as BookingDurationMinutesOption);
    setPrice(String(b.totalPrice));
    setServicesText((b.services ?? []).join("، "));
    setSource(b.source);
    setPlayerName(b.playerName ?? "");
    setEditOpen(true);
  };

  const canBook = field?.status === "open";

  const banner =
    field?.status === "closed"
      ? t.fields.closedBanner
      : field?.status === "maintenance"
        ? t.fields.maintenanceBanner
        : null;

  const dashHint =
    isDashboardField && field?.status === "open" ? t.fields.dashboardSyncHint : null;

  const showDashVenueHint =
    isDashboardField && fieldBookings.some((b) => String(b.id).startsWith("vb:"));

  if (!isFirebaseConfigured() || !uid) {
    return (
      <ScreenShell>
        <Text style={styles.err}>{t.fields.needFirebase}</Text>
      </ScreenShell>
    );
  }

  if (fieldsPending && fields.length === 0) {
    return (
      <ScreenShell>
        <View style={[styles.scroll, { alignItems: "center", paddingTop: 48 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}
        {dashHint ? <Text style={styles.syncHint}>{dashHint}</Text> : null}

        <Text style={styles.section}>{t.fields.selectDate}</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} textAlign="right" placeholder="YYYY-MM-DD" />

        <Text style={styles.section}>{t.fields.availableSlots}</Text>
        <Text style={styles.hint}>{t.fields.pickSlotHint}</Text>
        {slots.length === 0 ? (
          <Text style={styles.muted}>{t.fields.noSlots}</Text>
        ) : (
          <View style={styles.slotWrap}>
            {slots.map((s) => (
              <Pressable
                key={s.label}
                style={({ pressed }) => [styles.slotChip, pressed && { opacity: 0.85 }]}
                onPress={() => pickSlot(s)}
              >
                <Text style={styles.slotChipText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.section}>{t.fields.bookingSection}</Text>
        <Text style={styles.label}>{t.bookings.startTimeLabel}</Text>
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} textAlign="right" />
        <Text style={styles.label}>{t.bookings.durationMinutesLabel}</Text>
        <View style={styles.durRow}>
          {BOOKING_DURATION_MINUTES_OPTIONS.map((m) => (
            <Pressable
              key={m}
              style={[styles.durChip, durationMins === m && styles.durChipOn]}
              onPress={() => {
                setDurationMins(m);
                applyDurationToEnd(startTime, m);
              }}
            >
              <Text style={[styles.durChipText, durationMins === m && styles.durChipTextOn]}>{m}′</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{t.bookings.priceLabel}</Text>
        <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" textAlign="right" />
        <Text style={styles.label}>{t.fields.servicesLabel}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={servicesText}
          onChangeText={setServicesText}
          textAlign="right"
          placeholder={t.fields.servicesPlaceholder}
          multiline
        />
        <Text style={styles.label}>{t.fields.sourceLabel}</Text>
        <View style={styles.durRow}>
          <Pressable
            style={[styles.durChip, source === "manual" && styles.durChipOn]}
            onPress={() => setSource("manual")}
          >
            <Text style={[styles.durChipText, source === "manual" && styles.durChipTextOn]}>{t.fields.sourceManual}</Text>
          </Pressable>
          <Pressable
            style={[styles.durChip, source === "player" && styles.durChipOn]}
            onPress={() => setSource("player")}
          >
            <Text style={[styles.durChipText, source === "player" && styles.durChipTextOn]}>{t.fields.sourcePlayer}</Text>
          </Pressable>
        </View>
        {source === "player" ? (
          <>
            <Text style={styles.label}>{t.fields.playerNameLabel}</Text>
            <TextInput
              style={styles.input}
              value={playerName}
              onChangeText={setPlayerName}
              textAlign="right"
              placeholder={t.fields.playerNamePlaceholder}
            />
          </>
        ) : null}

        <Pressable
          style={[styles.primaryBtn, (!canBook || insertMut.isPending) && styles.disabled]}
          disabled={!canBook || insertMut.isPending}
          onPress={() => insertMut.mutate()}
        >
          {insertMut.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>{t.fields.saveBooking}</Text>
          )}
        </Pressable>

        <Text style={[styles.section, { marginTop: spacing.xl }]}>{t.fields.fieldBookingsSection}</Text>
        {showDashVenueHint ? <Text style={styles.hint}>{t.fields.dashboardBookingsReadOnly}</Text> : null}
        {fieldBookings.length === 0 ? (
          <Text style={styles.muted}>{t.bookings.emptySubtitle}</Text>
        ) : (
          fieldBookings.map((b) => (
            <View key={b.id} style={[styles.bCard, cardElevation(false)]}>
              <Text style={styles.bDate}>
                {b.date} · {b.startTime} — {b.endTime}
              </Text>
              <Text style={styles.bMeta}>
                {b.source === "manual" ? t.bookings.sourceManualLabel : `${t.bookings.sourcePlayerPrefix}${b.playerName || t.bookings.noPlayerName}`}
              </Text>
              {b.services?.length ? (
                <Text style={styles.bMeta}>
                  {t.bookings.servicesLineLabel}: {b.services.join("، ")}
                </Text>
              ) : null}
              <Text style={styles.bMeta}>
                {t.bookings.totalPriceLabel}: {b.totalPrice} {t.bookings.currencyShort}
              </Text>
              {!String(b.id).startsWith("vb:") ? (
                <View style={styles.bActions}>
                  <Pressable onPress={() => openEdit(b)} style={styles.linkBtn}>
                    <Text style={styles.linkTxt}>{t.bookings.editBookingShort}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert(t.fields.confirmDeleteTitle, t.fields.confirmDeleteBody, [
                        { text: t.common.cancel, style: "cancel" },
                        {
                          text: t.fields.deleteBooking,
                          style: "destructive",
                          onPress: () => deleteMut.mutate(b.id)
                        }
                      ])
                    }
                    style={styles.linkBtn}
                  >
                    <Text style={[styles.linkTxt, { color: colors.danger }]}>{t.bookings.deleteBookingShort}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={editOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.fields.editBooking}</Text>
            <Text style={styles.label}>{t.fields.selectDate}</Text>
            <TextInput style={styles.input} value={date} onChangeText={setDate} textAlign="right" />
            <Text style={styles.label}>{t.bookings.startTimeLabel}</Text>
            <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} textAlign="right" />
            <Text style={styles.label}>{t.bookings.durationMinutesLabel}</Text>
            <View style={styles.durRow}>
              {BOOKING_DURATION_MINUTES_OPTIONS.map((m) => (
                <Pressable
                  key={m}
                  style={[styles.durChip, durationMins === m && styles.durChipOn]}
                  onPress={() => {
                    setDurationMins(m);
                    applyDurationToEnd(startTime, m);
                  }}
                >
                  <Text style={[styles.durChipText, durationMins === m && styles.durChipTextOn]}>{m}′</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t.bookings.priceLabel}</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" textAlign="right" />
            <Text style={styles.label}>{t.fields.servicesLabel}</Text>
            <TextInput style={[styles.input, styles.multiline]} value={servicesText} onChangeText={setServicesText} textAlign="right" multiline />
            <Text style={styles.label}>{t.fields.sourceLabel}</Text>
            <View style={styles.durRow}>
              <Pressable style={[styles.durChip, source === "manual" && styles.durChipOn]} onPress={() => setSource("manual")}>
                <Text style={[styles.durChipText, source === "manual" && styles.durChipTextOn]}>{t.fields.sourceManual}</Text>
              </Pressable>
              <Pressable style={[styles.durChip, source === "player" && styles.durChipOn]} onPress={() => setSource("player")}>
                <Text style={[styles.durChipText, source === "player" && styles.durChipTextOn]}>{t.fields.sourcePlayer}</Text>
              </Pressable>
            </View>
            {source === "player" ? (
              <>
                <Text style={styles.label}>{t.fields.playerNameLabel}</Text>
                <TextInput style={styles.input} value={playerName} onChangeText={setPlayerName} textAlign="right" />
              </>
            ) : null}
            <View style={styles.modalRow}>
              <Pressable
                style={[styles.modalBtn, styles.cancel]}
                onPress={() => {
                  setEditOpen(false);
                  setEditing(null);
                }}
              >
                <Text>{t.bookings.modalCancel}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.save]} onPress={() => updateMut.mutate()}>
                {updateMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>{t.bookings.modalSave}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  err: { padding: spacing.lg, textAlign: "center" },
  banner: { backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  bannerText: { textAlign: "right", color: colors.danger, fontWeight: "700" },
  syncHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: spacing.md,
    lineHeight: 18,
    fontWeight: "600"
  },
  section: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "right", marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: "right", marginBottom: spacing.sm },
  muted: { color: colors.textMuted, textAlign: "right", marginBottom: spacing.md },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceMuted,
    color: colors.text
  },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  label: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, textAlign: "right", marginBottom: 6 },
  slotWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  slotChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft
  },
  slotChipText: { fontWeight: "700", color: colors.primaryDark },
  durRow: { flexDirection: "row-reverse", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" },
  durChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted
  },
  durChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  durChipText: { fontWeight: "800", color: colors.textSecondary },
  durChipTextOn: { color: colors.textOnPrimary },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: "center",
    marginTop: spacing.md
  },
  primaryBtnText: { color: colors.textOnPrimary, fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.45 },
  bCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  bDate: { fontWeight: "800", textAlign: "right", color: colors.text, marginBottom: 6 },
  bMeta: { fontSize: 13, color: colors.textSecondary, textAlign: "right", marginBottom: 4 },
  bActions: { flexDirection: "row-reverse", gap: spacing.lg, marginTop: spacing.sm },
  linkBtn: { paddingVertical: 6 },
  linkTxt: { fontWeight: "800", color: colors.primary },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    maxHeight: "92%"
  },
  modalTitle: { fontSize: 20, fontWeight: "900", textAlign: "right", marginBottom: spacing.md },
  modalRow: { flexDirection: "row-reverse", gap: 10, marginTop: spacing.lg },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.full, alignItems: "center" },
  cancel: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  save: { backgroundColor: colors.primary },
  saveTxt: { color: colors.textOnPrimary, fontWeight: "800" }
});
