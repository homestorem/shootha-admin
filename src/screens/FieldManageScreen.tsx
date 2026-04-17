import React, { useLayoutEffect, useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Keyboard,
  Share
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "../lib/dayjs";
import { formatHm12HourAr } from "../lib/timeFormat";
import Toast from "react-native-toast-message";
import { ScreenShell } from "../components/ScreenShell";
import { InputLayer } from "../components/InputLayer";
import { useSettings } from "../providers/SettingsProvider";
import { spacing, cardElevation } from "../theme/tokens";
import { makeFieldManageStyles } from "./fieldManageScreenStyles";
import { t } from "../strings";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import { useAuth } from "../providers/AuthProvider";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import { fetchMergedFieldsForUid } from "../services/ownerFieldsFirestore";
import {
  fetchFieldDocumentById,
  fetchFieldDocumentByName,
  fetchFieldDocumentForOwner,
  fetchFieldDocumentByOwnerAndName,
  mergeOwnerFieldWithFirebaseDoc
} from "../services/firebaseFieldDocument";
import {
  computeAvailableSlots,
  deleteOwnerBookingDoc,
  fetchOwnerBookingsForUid,
  insertOwnerBooking,
  updateOwnerBookingDoc,
  venueBookingToOwnerBookingDoc,
  type OwnerBookingDoc
} from "../services/ownerBookingsFirestore";
import { fetchVenueBookingsForOwner, SYNC_SOURCE_OWNER_APP } from "../services/venueBookingsFirestore";
import { FIELD_MANAGE_DURATION_OPTIONS, type FieldManageDurationOption } from "../lib/bookingsApi";
import { formatBookingPaymentMethod } from "../lib/bookingPaymentMethod";
import type { MainAppStackParamList } from "../navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildDurationPriceMap, computeSuggestedBookingPrice } from "../lib/fieldDocExtras";
import { getArabicWeekdayName } from "../lib/arWeekday";
import { formatNumberEn } from "../lib/numberFormat";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { getFirestoreDb } from "../lib/firebaseClient";

type Props = NativeStackScreenProps<MainAppStackParamList, "FieldManage">;

export const FieldManageScreen: React.FC<Props> = ({ navigation, route }) => {
  const { palette } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeFieldManageStyles(palette), [palette]);
  const editModalScrollPad = useMemo(
    () => [styles.modalScrollContent, { paddingBottom: spacing.xl + Math.max(insets.bottom, 8) }],
    [styles.modalScrollContent, insets.bottom]
  );
  const { fieldId, fieldName } = route.params;
  const { user } = useAuth();
  const uid = user?.id ?? user?.uid ?? "";
  const ownerPub = uid ? user?.ownerId ?? deriveOwnerIdFromUid(uid) : "";
  const queryClient = useQueryClient();

  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);
  const [durationMins, setDurationMins] = useState<FieldManageDurationOption>(60);
  const [price, setPrice] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const skipPriceSuggestAfterModal = useRef(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<OwnerBookingDoc | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [extraSelected, setExtraSelected] = useState<Record<string, boolean>>({});
  const [forcedDurationPrices, setForcedDurationPrices] = useState<{
    price90?: number;
    price120?: number;
    price180?: number;
    price60?: number;
    pricePerHour?: number;
  } | null>(null);
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

  const { data: fieldDoc } = useQuery({
    queryKey: ["firebaseFieldDoc", uid, fieldId, ownerPub, field?.name ?? fieldName],
    queryFn: async () => {
      try {
        const byId = await fetchFieldDocumentById(fieldId);
        if (byId) return byId;
      } catch {
        // Continue with fallbacks if direct id lookup fails (e.g. permission/index mismatch).
      }

      const candidateNames = Array.from(
        new Set([field?.name, fieldName].map((v) => String(v ?? "").trim()).filter(Boolean))
      );

      if (ownerPub) {
        for (const name of candidateNames) {
          try {
            const byOwnerAndName = await fetchFieldDocumentByOwnerAndName(ownerPub, name);
            if (byOwnerAndName) return byOwnerAndName;
          } catch {
            // Continue to next fallback.
          }
        }
      }

      for (const name of candidateNames) {
        try {
          const byName = await fetchFieldDocumentByName(name);
          if (byName) return byName;
        } catch {
          // Continue trying remaining names.
        }
      }

      if (ownerPub) {
        try {
          const byOwner = await fetchFieldDocumentForOwner(ownerPub, candidateNames[0]);
          if (byOwner) return byOwner;
        } catch {
          // ignore and fallthrough
        }
      }
      return null;
    },
    enabled: Boolean(fieldId && isFirebaseConfigured())
  });

  useEffect(() => {
    let alive = true;
    if (!isFirebaseConfigured()) return () => undefined;
    const candidates = Array.from(new Set([field?.name, fieldName].map((v) => String(v ?? "").trim()).filter(Boolean)));
    if (!candidates.length) return () => undefined;

    const parseNum = (v: unknown): number | undefined => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim()) {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };
    const normalize = (v: string) =>
      String(v ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s_\-]+/g, "");
    const normDigits = (v: unknown) => String(v ?? "").replace(/[^\d]/g, "");
    const ownerMatches = (rawOwnerId: unknown) => {
      const ro = String(rawOwnerId ?? "").trim();
      if (!ro) return false;
      if (ownerPub && ro === ownerPub) return true;
      const userUid = String(user?.uid ?? user?.id ?? "").trim();
      if (!userUid) return false;
      const tail = userUid.length >= 6 ? userUid.slice(-6) : userUid;
      return ro === `owner_${tail}`;
    };
    const readPriceMap = (x: Record<string, unknown>) => {
      const pricing =
        x.pricing != null && typeof x.pricing === "object" && !Array.isArray(x.pricing)
          ? (x.pricing as Record<string, unknown>)
          : null;
      const node = pricing ?? x;
      return {
        price90: parseNum(node.price_1_5_hours) ?? parseNum(node.price90),
        price120: parseNum(node.price_2_hours) ?? parseNum(node.price120),
        price180: parseNum(node.price_3_hours) ?? parseNum(node.price180),
        price60: parseNum(node.price_60) ?? parseNum(node.price60) ?? parseNum(node.pricePerHour),
        pricePerHour: parseNum(node.pricePerHour)
      };
    };
    const hasPrices = (m: { price90?: number; price120?: number; price180?: number }) =>
      m.price90 != null || m.price120 != null || m.price180 != null;

    void (async () => {
      try {
        const db = getFirestoreDb();
        const targetNames = candidates.map(normalize);
        const exactSnaps = await Promise.all(
          candidates.map((name) => getDocs(query(collection(db, "fields"), where("name", "==", name), limit(40))))
        );
        const exactDocs = exactSnaps.flatMap((s) => s.docs);

        const pickFromDocs = (docs: Array<{ data: () => Record<string, unknown> }>) => {
          const byName = docs
            .map((d) => d.data())
            .filter((raw) => targetNames.includes(normalize(String(raw.name ?? ""))));
          if (!byName.length) return null;

          const currentPhone = normDigits(field?.phone);
          const currentLoc = normalize(field?.location ?? "");
          const scored = byName
            .map((raw) => {
              const map = readPriceMap(raw);
              let score = 0;
              if (hasPrices(map)) score += 100;
              if (ownerMatches(raw.ownerId)) score += 20;
              const rawPhone = normDigits(raw.phone ?? raw.ownerPhone);
              if (currentPhone && rawPhone && rawPhone === currentPhone) score += 15;
              const rawLoc = normalize(String(raw.location ?? raw.address ?? ""));
              if (currentLoc && rawLoc && (rawLoc.includes(currentLoc) || currentLoc.includes(rawLoc))) score += 10;
              return { map, score };
            })
            .sort((a, b) => b.score - a.score);

          return scored[0]?.map ?? null;
        };

        const exactPick = pickFromDocs(exactDocs);
        if (exactPick) {
          if (alive) setForcedDurationPrices(exactPick);
          return;
        }

        const broadSnap = await getDocs(query(collection(db, "fields"), limit(300)));
        const broadDocs = broadSnap.docs.map((d) => d);
        const broadPick = pickFromDocs(broadDocs);
        if (broadPick) {
          if (alive) setForcedDurationPrices(broadPick);
          return;
        }
        if (alive) setForcedDurationPrices(null);
      } catch {
        if (alive) setForcedDurationPrices(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [field?.name, fieldName, ownerPub, user?.uid, user?.id, field?.phone, field?.location]);

  const merged = useMemo(() => {
    const base = mergeOwnerFieldWithFirebaseDoc(field, fieldDoc ?? null, fieldName);
    const hasDurationPricing =
      base.price90 != null || base.price120 != null || base.price180 != null;
    if (hasDurationPricing) return base;

    const target = (field?.name ?? fieldName).trim().toLowerCase();
    if (!target) return base;
    const byName = fields.find((f) => {
      const n = f.name.trim().toLowerCase();
      const hasPrices = f.price90 != null || f.price120 != null || f.price180 != null;
      return hasPrices && n === target;
    });
    if (!byName) return base;

    return {
      ...base,
      pricePerHour: base.pricePerHour ?? byName.pricePerHour,
      price60: base.price60 ?? byName.price60 ?? byName.pricePerHour,
      price90: base.price90 ?? byName.price90,
      price120: base.price120 ?? byName.price120,
      price180: base.price180 ?? byName.price180
    };
  }, [field, fieldDoc, fieldName, fields]);

  const pricingMerged = useMemo(
    () => ({
      ...merged,
      pricePerHour: merged.pricePerHour ?? forcedDurationPrices?.pricePerHour,
      price60: merged.price60 ?? forcedDurationPrices?.price60 ?? forcedDurationPrices?.pricePerHour,
      price90: merged.price90 ?? forcedDurationPrices?.price90,
      price120: merged.price120 ?? forcedDurationPrices?.price120,
      price180: merged.price180 ?? forcedDurationPrices?.price180
    }),
    [merged, forcedDurationPrices]
  );

  const durationPriceMap = useMemo(() => buildDurationPriceMap(pricingMerged), [pricingMerged]);

  useEffect(() => {
    // Debug: verify exact Firebase prices reaching UI.
    console.log("[FieldManage][prices]", {
      fieldId,
      fieldName,
      pricingMerged: {
        pricePerHour: pricingMerged.pricePerHour ?? null,
        price60: pricingMerged.price60 ?? null,
        price90: pricingMerged.price90 ?? null,
        price120: pricingMerged.price120 ?? null,
        price180: pricingMerged.price180 ?? null
      },
      durationPriceMap
    });
  }, [fieldId, fieldName, pricingMerged, durationPriceMap]);

  const dayStartHour = pricingMerged.openHour ?? 8;
  const dayEndHour = pricingMerged.closeHour ?? 22;
  const resolvedFieldName = pricingMerged.displayName;

  const extrasTotal = useMemo(() => {
    if (!fieldDoc?.extras?.length) return 0;
    return fieldDoc.extras.reduce((sum, e) => sum + (extraSelected[e.id] ? e.price : 0), 0);
  }, [fieldDoc, extraSelected]);

  const lineTotal = useMemo(() => {
    const base = parseFloat(price.replace(/,/g, ".").replace(/\s/g, "")) || 0;
    return base + extrasTotal;
  }, [price, extrasTotal]);

  const bookingServicesFromSelection = useMemo(() => {
    const extraNames = fieldDoc?.extras?.filter((e) => extraSelected[e.id]).map((e) => e.name) ?? [];
    const sizeTag = selectedSize ? [`${t.fields.fieldSizeShort}: ${selectedSize}`] : [];
    return [...extraNames, ...sizeTag];
  }, [fieldDoc?.extras, extraSelected, selectedSize]);

  /** ١٤ يوماً قادماً — يُصفّى بأيام عمل الملعب من Firestore عند توفرها */
  const bookingDayOptions = useMemo(() => {
    const open = fieldDoc?.openDays;
    const build = (filterByOpen: boolean) => {
      const out: { iso: string; weekday: string; dom: string }[] = [];
      for (let i = 0; i < 14; i++) {
        const d = dayjs().add(i, "day");
        const iso = d.format("YYYY-MM-DD");
        const weekday = getArabicWeekdayName(d.day());
        if (filterByOpen && open?.length && !open.includes(weekday)) continue;
        out.push({ iso, weekday, dom: d.format("D") });
      }
      return out;
    };
    const filtered = build(true);
    return filtered.length ? filtered : build(false);
  }, [fieldDoc?.openDays]);

  useEffect(() => {
    if (!bookingDayOptions.length) return;
    if (!bookingDayOptions.some((o) => o.iso === date)) {
      setDate(bookingDayOptions[0].iso);
    }
  }, [bookingDayOptions, date]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t.fields.fieldDetailsScreenTitle,
      headerRight: () => (
        <Pressable
          onPress={() =>
            Share.share({
              message: `${resolvedFieldName}\n${t.fields.shareFieldMessage}`
            }).catch(() => undefined)
          }
          hitSlop={12}
          style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 8 }}
        >
          <Ionicons name="share-outline" size={22} color={palette.primary} />
          <Text style={{ fontWeight: "800", color: palette.primary, fontSize: 14 }}>{t.fields.shareField}</Text>
        </Pressable>
      )
    });
  }, [navigation, resolvedFieldName, palette.primary]);

  useEffect(() => {
    if (!fieldDoc?.sizes?.length) {
      setSelectedSize(field?.fieldSize ?? null);
      return;
    }
    setSelectedSize((prev) => (prev && fieldDoc.sizes!.includes(prev) ? prev : fieldDoc.sizes![0]));
  }, [fieldDoc?.id, fieldDoc?.sizes, field?.fieldSize]);

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
        dayStartHour,
        dayEndHour,
        editOpen ? editing?.id ?? null : null
      ),
    [date, bookingsForSlots, durationMins, editing, editOpen, dayStartHour, dayEndHour]
  );

  const durationAr = useMemo(
    () => ({
      60: t.fields.durationShoot1h,
      90: t.fields.durationShoot1_5h,
      120: t.fields.durationShoot2h,
      180: t.fields.durationShoot3h
    }),
    []
  );

  const locationDisplay = fieldDoc?.locationLine ?? field?.location ?? "";

  const heroSuggestedPrice = computeSuggestedBookingPrice(pricingMerged, durationMins);
  const heroPriceStr =
    heroSuggestedPrice != null
      ? formatNumberEn(Number(heroSuggestedPrice), { maximumFractionDigits: 0 })
      : pricingMerged.pricePerHour != null
        ? formatNumberEn(Number(pricingMerged.pricePerHour), { maximumFractionDigits: 0 })
        : "—";

  useEffect(() => {
    if (!field && !fieldDoc) return;
    if (editOpen) return;
    if (skipPriceSuggestAfterModal.current) {
      skipPriceSuggestAfterModal.current = false;
      return;
    }
    const suggested = computeSuggestedBookingPrice(pricingMerged, durationMins);
    if (suggested != null) setPrice(String(Math.round(suggested)));
  }, [field, fieldDoc, pricingMerged, durationMins, editOpen]);

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
        fieldName: resolvedFieldName,
        date,
        startTime,
        endTime: end.format("HH:mm"),
        durationMinutes: durationMins,
        totalPrice: lineTotal,
        status: "approved",
        source: "manual",
        playerName: playerName.trim() || null,
        phone: playerPhone.trim() || null,
        services: bookingServicesFromSelection,
        ownerPublicId: ownerPub
      });
    },
    onSuccess: () => {
      invalidate();
      Toast.show({ type: "success", text1: t.fields.bookingSaved });
      setPlayerName("");
      setPlayerPhone("");
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editing) return Promise.resolve();
      if (editing.source !== "player") {
        if (!playerName.trim()) throw new Error(t.bookings.playerNameRequired);
        if (!playerPhone.trim()) throw new Error(t.bookings.playerPhoneRequired);
      }
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
        playerName: editing.source === "player" ? editing.playerName ?? null : playerName.trim() || null,
        phone: editing.source === "player" ? editing.phone ?? null : playerPhone.trim() || null,
        services: bookingServicesFromSelection,
        fieldName: resolvedFieldName,
        status: editing.status
      });
    },
    onSuccess: () => {
      skipPriceSuggestAfterModal.current = true;
      setEditOpen(false);
      setEditing(null);
      invalidate();
      Toast.show({ type: "success", text1: t.fields.bookingUpdated });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const closeEditModal = useCallback(() => {
    if (updateMut.isPending) return;
    Keyboard.dismiss();
    skipPriceSuggestAfterModal.current = true;
    setEditOpen(false);
    setEditing(null);
  }, [updateMut.isPending]);

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
    setSelectedSlotStart(s.start);
    setStartTime(s.start);
    setEndTime(s.end);
    const [h0, m0] = s.start.split(":").map((x) => parseInt(x, 10));
    const [h1, m1] = s.end.split(":").map((x) => parseInt(x, 10));
    const diff = h1 * 60 + m1 - (h0 * 60 + m0);
    if (diff === 60 || diff === 90 || diff === 120 || diff === 180) {
      setDurationMins(diff as FieldManageDurationOption);
    }
  };

  const openEdit = (b: OwnerBookingDoc) => {
    if (String(b.id).startsWith("vb:")) return;
    Keyboard.dismiss();
    setEditing(b);
    setDate(b.date);
    setStartTime(b.startTime);
    setEndTime(b.endTime);
    const dm = b.durationMinutes;
    const norm: FieldManageDurationOption =
      dm === 60 || dm === 90 || dm === 120 || dm === 180 ? dm : 60;
    setDurationMins(norm);
    setPrice(String(b.totalPrice));
    setPlayerName(b.playerName ?? "");
    setPlayerPhone(b.phone ?? "");
    const sizePrefix = `${t.fields.fieldSizeShort}: `;
    let nextSize: string | null = null;
    const nextExtra: Record<string, boolean> = {};
    const rest: string[] = [];
    for (const line of b.services ?? []) {
      if (line.startsWith(sizePrefix)) {
        nextSize = line.slice(sizePrefix.length).trim() || null;
      } else {
        rest.push(line);
      }
    }
    if (fieldDoc?.extras?.length) {
      const nameToId = new Map(fieldDoc.extras.map((e) => [e.name, e.id] as const));
      for (const line of rest) {
        const id = nameToId.get(line);
        if (id) nextExtra[id] = true;
      }
    }
    if (nextSize != null && fieldDoc?.sizes?.length && !fieldDoc.sizes.includes(nextSize)) {
      nextSize = fieldDoc.sizes[0];
    }
    setSelectedSize(nextSize ?? field?.fieldSize ?? fieldDoc?.sizes?.[0] ?? null);
    setExtraSelected(nextExtra);
    setEditOpen(true);
  };

  /** لا نعتمد على وجود صف في القائمة المدمجة فقط — قد يُحمَّل الملعب من `fields/{id}` دون ظهوره في owner_fields/الداشبورد */
  const fieldBlocksBooking =
    field != null && (field.status === "closed" || field.status === "maintenance");
  const canBook = !fieldBlocksBooking;
  const hasPrice = (parseFloat(price.replace(/,/g, ".").replace(/\s/g, "")) || 0) > 0;
  const hasSizeChoice = fieldDoc?.sizes?.length ? Boolean(selectedSize) : true;
  const hasChosenSlot = Boolean(selectedSlotStart);
  const hasPlayerName = playerName.trim().length > 0;
  const hasPlayerPhone = playerPhone.trim().length > 0;
  const canConfirmBooking = canBook && hasPrice && hasSizeChoice && hasChosenSlot && hasPlayerName && hasPlayerPhone;

  const banner =
    field?.status === "closed"
      ? t.fields.closedBanner
      : field?.status === "maintenance"
        ? t.fields.maintenanceBanner
        : null;

  const showDashVenueHint =
    isDashboardField && fieldBookings.some((b) => String(b.id).startsWith("vb:"));

  useEffect(() => {
    if (!selectedSlotStart) return;
    const stillExists = slots.some((s) => s.start === selectedSlotStart);
    if (!stillExists) setSelectedSlotStart(null);
  }, [slots, selectedSlotStart]);

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
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell style={{ backgroundColor: palette.surface }}>
      <View style={styles.pageRoot}>
        <ScrollView
          nestedScrollEnabled
          contentContainerStyle={styles.scrollShoot}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <InputLayer>
            {banner ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>{banner}</Text>
              </View>
            ) : null}

            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={styles.heroLeftCol}>
                  <View style={styles.heroMetaRow}>
                    <Ionicons name="wallet-outline" size={18} color={palette.textOnPrimary} />
                    <Text style={styles.heroMetaText}>{t.fields.heroPriceLabel}</Text>
                  </View>
                </View>
                <View style={styles.heroRightCol}>
                  <Text style={styles.heroPriceMain}>{heroPriceStr}</Text>
                  <Text style={styles.heroPriceUnit}>{t.fields.pricePerHourSuffix}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.fieldNameHeadline}>{resolvedFieldName}</Text>
            <View style={styles.subRow}>
              {fieldDoc?.ratingAvg != null ? (
                <>
                  <Text style={styles.starText}>{"★".repeat(Math.min(5, Math.round(fieldDoc.ratingAvg)))}</Text>
                  <Text style={styles.starText}>{fieldDoc.ratingAvg.toFixed(1)}</Text>
                </>
              ) : null}
              {fieldDoc?.reviewCount != null ? (
                <Text style={styles.categoryText}>
                  {t.fields.reviewsCount.replace("{{n}}", String(fieldDoc.reviewCount))}
                </Text>
              ) : null}
              {selectedSize ? (
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingBadgeText}>{selectedSize}</Text>
                </View>
              ) : null}
            </View>
            {fieldDoc?.category ? (
              <View style={styles.categoryRow}>
                <Ionicons name="football-outline" size={18} color={palette.primary} />
                <Text style={styles.categoryText}>{fieldDoc.category}</Text>
              </View>
            ) : null}
            {locationDisplay ? (
              <View style={styles.categoryRow}>
                <Ionicons name="pin-outline" size={18} color={palette.textSecondary} />
                <Text style={styles.categoryText}>{locationDisplay}</Text>
              </View>
            ) : null}

            <View style={styles.panel}>
              <Text style={styles.metaTitle}>بيانات الملعب</Text>
              {fieldDoc?.address ? <Text style={styles.metaLine}>العنوان: {fieldDoc.address}</Text> : null}
              {fieldDoc?.ownerName ? <Text style={styles.metaLine}>اسم المالك: {fieldDoc.ownerName}</Text> : null}
              {fieldDoc?.ownerPhone ?? merged.phone ? (
                <Text style={styles.metaLine}>الهاتف: {fieldDoc?.ownerPhone ?? merged.phone}</Text>
              ) : null}
              {fieldDoc?.latitude != null && fieldDoc?.longitude != null ? (
                <Text style={styles.metaLine}>
                  الإحداثيات: {fieldDoc.latitude.toFixed(4)}, {fieldDoc.longitude.toFixed(4)}
                </Text>
              ) : null}
              {fieldDoc?.status ? <Text style={styles.metaLine}>الحالة: {fieldDoc.status}</Text> : null}
              {fieldDoc?.createdAtLabel ? (
                <Text style={styles.metaLine}>تاريخ الإنشاء: {fieldDoc.createdAtLabel}</Text>
              ) : null}
            </View>

            {fieldDoc?.openDays?.length ? (
              <>
                <Text style={styles.shootSectionTitle}>{t.fields.fieldOpenDaysTitle}</Text>
                <View style={styles.servicesWrap}>
                  {fieldDoc.openDays.map((d) => (
                    <View key={d} style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{d}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {fieldDoc?.description ? (
              <>
                <Text style={styles.shootSectionTitle}>{t.fields.fieldDescriptionTitle}</Text>
                <Text style={styles.descBlock}>{fieldDoc.description}</Text>
              </>
            ) : null}

            <Text style={styles.shootSectionTitle}>{t.fields.timesAndDaysTitle}</Text>
            <Text style={styles.shootHint}>{t.fields.timesAndDaysHint}</Text>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayPickerScroll}
            >
              {bookingDayOptions.map((o) => (
                <Pressable
                  key={o.iso}
                  style={[styles.dayPickerCard, date === o.iso && styles.dayPickerCardOn]}
                  onPress={() => setDate(o.iso)}
                >
                  <Text style={[styles.dayPickerWeekday, date === o.iso && styles.dayPickerWeekdayOn]}>
                    {o.weekday}
                  </Text>
                  <Text style={[styles.dayPickerDom, date === o.iso && styles.dayPickerDomOn]}>{o.dom}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.shootSectionTitle}>{t.fields.bookingDurationTitle}</Text>
            <Text style={styles.shootHint}>{t.fields.durationPriceHintHourly}</Text>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.durationPriceScroll}
            >
              {FIELD_MANAGE_DURATION_OPTIONS.map((m) => {
                const unit = durationPriceMap[m];
                const priceLabel =
                  typeof unit === "number"
                    ? `${formatNumberEn(Number(unit), { maximumFractionDigits: 0 })} ${t.bookings.currencyShort}`
                    : "—";
                return (
                  <Pressable
                    key={m}
                    style={[styles.durationPriceCard, durationMins === m && styles.durationPriceCardOn]}
                    onPress={() => {
                      setDurationMins(m);
                      applyDurationToEnd(startTime, m);
                    }}
                  >
                    <Text
                      style={[styles.durationPriceTitle, durationMins === m && styles.durationPriceTitleOn]}
                    >
                      {durationAr[m as keyof typeof durationAr]}
                    </Text>
                    <Text
                      style={[
                        styles.durationPriceAmount,
                        durationMins === m && styles.durationPriceAmountOn
                      ]}
                    >
                      {priceLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.shootSectionTitle}>{t.fields.chooseTimeTitle}</Text>
            <Text style={styles.shootHint}>{t.fields.chooseTimeSub}</Text>
            <View style={styles.slotList}>
              {slots.length === 0 ? (
                <Text style={styles.muted}>{t.fields.noSlots}</Text>
              ) : (
                slots.map((s) => (
                  <Pressable
                    key={s.label}
                    style={({ pressed }) => [
                      styles.slotRow,
                      selectedSlotStart === s.start && styles.slotRowSelected,
                      pressed && { opacity: 0.88 }
                    ]}
                    onPress={() => pickSlot(s)}
                  >
                    <View style={[styles.slotBadge, selectedSlotStart === s.start && styles.slotBadgeSelected]}>
                      <Text style={[styles.slotBadgeText, selectedSlotStart === s.start && styles.slotBadgeTextSelected]}>
                        {selectedSlotStart === s.start ? "مختار" : t.fields.slotAvailable}
                      </Text>
                    </View>
                    <Text style={[styles.slotRowTime, selectedSlotStart === s.start && styles.slotRowTimeSelected]}>
                      {s.start}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
            <Text style={styles.label}>{t.fields.playerNameLabel}</Text>
            <TextInput
              style={styles.input}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder={t.fields.playerNamePlaceholder}
              textAlign="right"
            />
            <Text style={styles.label}>{t.bookings.playerPhoneLabel}</Text>
            <TextInput
              style={styles.input}
              value={playerPhone}
              onChangeText={setPlayerPhone}
              keyboardType="phone-pad"
              placeholder={t.bookings.playerPhoneLabel}
              textAlign="right"
            />

            {fieldDoc?.sizes?.length ? (
              <>
                <Text style={styles.shootSectionTitle}>{t.fields.fieldSizeTitle}</Text>
                <View style={styles.sizeRow}>
                  {fieldDoc.sizes.map((sz) => (
                    <Pressable
                      key={sz}
                      style={[styles.sizeChip, selectedSize === sz && styles.sizeChipOn]}
                      onPress={() => setSelectedSize(sz)}
                    >
                      <Text style={[styles.sizeChipText, selectedSize === sz && styles.sizeChipTextOn]}>{sz}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {fieldDoc?.extras?.length ? (
              <>
                <Text style={styles.shootSectionTitle}>{t.fields.paidServicesTitle}</Text>
                {fieldDoc.extras.map((ex) => (
                  <Pressable
                    key={ex.id}
                    style={styles.extraCard}
                    onPress={() =>
                      setExtraSelected((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))
                    }
                  >
                    <Text style={styles.extraPrice}>
                      {t.fields.extraPriceFormat.replace(
                        "{{price}}",
                        formatNumberEn(Number(ex.price), { maximumFractionDigits: 0 })
                      )}
                    </Text>
                    <Text style={styles.extraName}>{ex.name}</Text>
                    <View
                      style={[
                        styles.extraCheckbox,
                        extraSelected[ex.id] ? styles.extraCheckboxOn : undefined
                      ]}
                    />
                  </Pressable>
                ))}
              </>
            ) : null}

            {fieldDoc?.ratings ? (
              <>
                <Text style={styles.shootSectionTitle}>{t.fields.ratingsTitle}</Text>
                <View style={styles.ratingSection}>
                  {fieldDoc.ratings.cleanliness != null ? (
                    <View style={styles.ratingBarRow}>
                      <Text style={styles.ratingBarValue}>{fieldDoc.ratings.cleanliness.toFixed(1)}</Text>
                      <View style={styles.ratingBarTrack}>
                        <View
                          style={[
                            styles.ratingBarFill,
                            { width: `${Math.min(100, (fieldDoc.ratings.cleanliness / 5) * 100)}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.ratingBarLabel}>{t.fields.ratingCleanliness}</Text>
                    </View>
                  ) : null}
                  {fieldDoc.ratings.grass != null ? (
                    <View style={styles.ratingBarRow}>
                      <Text style={styles.ratingBarValue}>{fieldDoc.ratings.grass.toFixed(1)}</Text>
                      <View style={styles.ratingBarTrack}>
                        <View
                          style={[
                            styles.ratingBarFill,
                            { width: `${Math.min(100, (fieldDoc.ratings.grass / 5) * 100)}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.ratingBarLabel}>{t.fields.ratingGrass}</Text>
                    </View>
                  ) : null}
                  {fieldDoc.ratings.lighting != null ? (
                    <View style={styles.ratingBarRow}>
                      <Text style={styles.ratingBarValue}>{fieldDoc.ratings.lighting.toFixed(1)}</Text>
                      <View style={styles.ratingBarTrack}>
                        <View
                          style={[
                            styles.ratingBarFill,
                            { width: `${Math.min(100, (fieldDoc.ratings.lighting / 5) * 100)}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.ratingBarLabel}>{t.fields.ratingLighting}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}

            <View style={styles.panel}>
              <Text style={[styles.section, styles.sectionFirst]}>{t.fields.fieldBookingsSection}</Text>
              {showDashVenueHint ? <Text style={styles.hint}>{t.fields.dashboardBookingsReadOnly}</Text> : null}
              {fieldBookings.length === 0 ? (
                <Text style={styles.muted}>{t.bookings.emptySubtitle}</Text>
              ) : (
                fieldBookings.map((b) => (
                  <View key={b.id} style={[styles.bCard, cardElevation(palette, false), styles.bCardEdge]}>
                    <Text style={styles.bDate}>
                      {b.date} · {formatHm12HourAr(b.startTime)} — {formatHm12HourAr(b.endTime)}
                    </Text>
                    <Text style={styles.bMeta}>
                      {b.source === "manual"
                        ? b.playerName?.trim()
                          ? `${t.bookings.bookingByFieldOwnerLabel} · ${b.playerName}`
                          : t.bookings.bookingByFieldOwnerLabel
                        : `${t.bookings.sourcePlayerPrefix}${b.playerName || t.bookings.noPlayerName}`}
                    </Text>
                    {b.phone?.trim() ? (
                      <Text style={styles.bMeta}>
                        {t.bookings.playerPhoneLabel}: {b.phone}
                      </Text>
                    ) : null}
                    {b.services?.length ? (
                      <Text style={styles.bMeta}>
                        {t.bookings.servicesLineLabel}: {b.services.join("، ")}
                      </Text>
                    ) : null}
                    <Text style={styles.bMeta}>
                      {t.bookings.totalPriceLabel}:{" "}
                      {formatNumberEn(Number(b.totalPrice), { maximumFractionDigits: 2 })}{" "}
                      {t.bookings.currencyShort}
                    </Text>
                    {b.source !== "manual" && b.paymentMethod ? (
                      <Text style={styles.bMeta}>
                        {t.bookings.paymentMethodLabel}: {formatBookingPaymentMethod(b.paymentMethod)}
                      </Text>
                    ) : null}
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
                          <Text style={[styles.linkTxt, { color: palette.danger }]}>
                            {t.bookings.deleteBookingShort}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
            <View style={styles.spacerBlock} />
          </InputLayer>
        </ScrollView>

        <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.footerTotalBlock}>
            <Text style={styles.footerTotalLbl}>{t.fields.totalLabel}</Text>
            <Text style={styles.footerTotalVal}>
              {formatNumberEn(lineTotal, { maximumFractionDigits: 0 })} {t.bookings.currencyShort}
            </Text>
          </View>
          <Pressable
            style={[
              styles.footerCta,
              canConfirmBooking && !insertMut.isPending ? styles.footerCtaReady : styles.footerCtaDisabled
            ]}
            onPress={() => {
              if (!canConfirmBooking || insertMut.isPending) return;
              if (!hasPlayerName) {
                Toast.show({ type: "error", text1: t.bookings.playerNameRequired });
                return;
              }
              if (!hasPlayerPhone) {
                Toast.show({ type: "error", text1: t.bookings.playerPhoneRequired });
                return;
              }
              insertMut.mutate();
            }}
          >
            <Ionicons name="calendar-outline" size={22} color={canConfirmBooking ? "#FFFFFF" : palette.text} />
            <Text style={[styles.footerCtaText, canConfirmBooking && styles.footerCtaTextReady]}>
              {t.fields.bookOnlyCta}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={closeEditModal}>
        <View style={styles.modalBg}>
          <ScrollView
            style={styles.modalSheetScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator
            contentContainerStyle={editModalScrollPad}
          >
            <View style={styles.modalCard}>
              <InputLayer>
                <View style={styles.modalHeaderRow}>
                  <Pressable
                    onPress={closeEditModal}
                    style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t.bookings.modalCloseA11y}
                  >
                    <Ionicons name="close" size={26} color={palette.text} />
                  </Pressable>
                  <Text style={styles.modalTitleInHeader}>{t.fields.editBooking}</Text>
                  <View style={styles.modalHeaderSpacer} />
                </View>
                <Text style={styles.label}>{t.fields.timesAndDaysTitle}</Text>
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayPickerScroll}
                >
                  {bookingDayOptions.map((o) => (
                    <Pressable
                      key={o.iso}
                      style={[styles.dayPickerCard, date === o.iso && styles.dayPickerCardOn]}
                      onPress={() => setDate(o.iso)}
                    >
                      <Text style={[styles.dayPickerWeekday, date === o.iso && styles.dayPickerWeekdayOn]}>
                        {o.weekday}
                      </Text>
                      <Text style={[styles.dayPickerDom, date === o.iso && styles.dayPickerDomOn]}>{o.dom}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.label}>{t.bookings.startTimeLabel}</Text>
                <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} textAlign="right" />
                <Text style={styles.label}>{t.bookings.durationMinutesLabel}</Text>
                <View style={styles.durRow}>
                  {FIELD_MANAGE_DURATION_OPTIONS.map((m) => (
                    <Pressable
                      key={m}
                      style={[styles.durChip, durationMins === m && styles.durChipOn]}
                      onPress={() => {
                        setDurationMins(m);
                        applyDurationToEnd(startTime, m);
                      }}
                    >
                      <Text style={[styles.durChipText, durationMins === m && styles.durChipTextOn]}>
                        {durationAr[m as keyof typeof durationAr]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>{t.bookings.priceLabel}</Text>
                <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" textAlign="right" />
                <Text style={styles.label}>{t.fields.playerNameLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={playerName}
                  onChangeText={setPlayerName}
                  placeholder={t.fields.playerNamePlaceholder}
                  textAlign="right"
                  editable={editing?.source !== "player"}
                />
                <Text style={styles.label}>{t.bookings.playerPhoneLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={playerPhone}
                  onChangeText={setPlayerPhone}
                  keyboardType="phone-pad"
                  placeholder={t.bookings.playerPhoneLabel}
                  textAlign="right"
                  editable={editing?.source !== "player"}
                />
                {fieldDoc?.sizes?.length ? (
                  <>
                    <Text style={styles.label}>{t.fields.fieldSizeTitle}</Text>
                    <View style={styles.durRow}>
                      {fieldDoc.sizes.map((sz) => (
                        <Pressable
                          key={sz}
                          style={[styles.durChip, selectedSize === sz && styles.durChipOn]}
                          onPress={() => setSelectedSize(sz)}
                        >
                          <Text style={[styles.durChipText, selectedSize === sz && styles.durChipTextOn]}>{sz}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}
                {fieldDoc?.extras?.length ? (
                  <>
                    <Text style={styles.label}>{t.fields.paidServicesTitle}</Text>
                    {fieldDoc.extras.map((ex) => (
                      <Pressable
                        key={ex.id}
                        style={styles.extraCard}
                        onPress={() =>
                          setExtraSelected((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))
                        }
                      >
                        <Text style={styles.extraPrice}>
                          {t.fields.extraPriceFormat.replace(
                            "{{price}}",
                            formatNumberEn(Number(ex.price), { maximumFractionDigits: 0 })
                          )}
                        </Text>
                        <Text style={styles.extraName}>{ex.name}</Text>
                        <View
                          style={[
                            styles.extraCheckbox,
                            extraSelected[ex.id] ? styles.extraCheckboxOn : undefined
                          ]}
                        />
                      </Pressable>
                    ))}
                  </>
                ) : null}
                <View style={styles.modalRow}>
                  <Pressable style={[styles.modalBtn, styles.cancel]} onPress={closeEditModal}>
                    <Text style={styles.cancelTxt}>{t.bookings.modalCancel}</Text>
                  </Pressable>
                  <Pressable style={[styles.modalBtn, styles.save]} onPress={() => updateMut.mutate()}>
                    {updateMut.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveTxt}>{t.bookings.modalSave}</Text>
                    )}
                  </Pressable>
                </View>
              </InputLayer>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenShell>
  );
};
