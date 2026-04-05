import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
  Alert
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MainAppStackParamList, MainTabParamList } from "../navigation/AppNavigator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "../lib/dayjs";
import Toast from "react-native-toast-message";
import { BookingCard, Booking } from "../components/BookingCard";
import { ScreenShell } from "../components/ScreenShell";
import { EmptyState } from "../components/EmptyState";
import { BookingSkeletonList } from "../components/BookingSkeleton";
import { t } from "../strings";
import { isBackendSyncEnabled } from "../lib/backendFlags";
import { isFirebaseConfigured } from "../config/firebaseConfig";
import {
  fetchBookingsForOwner,
  fetchFieldsForOwner,
  fetchPlayerLabels,
  formatDurationForDisplay,
  formatTimeForDisplay,
  insertBooking,
  mapDbStatusToUi,
  updateBookingStatus,
  type BookingRowWithField,
  type BookingDurationMinutesOption,
  BOOKING_DURATION_MINUTES_OPTIONS
} from "../lib/bookingsApi";
import {
  deleteOwnerBookingDoc,
  fetchOwnerBookingsForUid,
  insertOwnerBooking,
  updateOwnerBookingDoc,
  updateOwnerBookingStatusFirestore,
  type OwnerBookingDoc
} from "../services/ownerBookingsFirestore";
import {
  deleteVenueBookingDoc,
  endTimeFromDuration,
  fetchVenueBookingsForOwner,
  normalizeHm,
  parseVenueBookingUiId,
  SYNC_SOURCE_OWNER_APP,
  updateVenueBookingDoc,
  updateVenueBookingStatus,
  VENUE_BOOKING_ID_PREFIX,
  type VenueBookingDoc
} from "../services/venueBookingsFirestore";
import { fetchMergedFieldsForUid } from "../services/ownerFieldsFirestore";
import { wrapFieldRequestError } from "../lib/fieldRequests";
import { submitFieldRequest } from "../services/fieldRequestService";
import { deriveOwnerIdFromUid } from "../lib/ownerId";
import { useAuth } from "../providers/AuthProvider";
import { BRAND } from "../theme/brand";
import { colors } from "../theme/colors";
import { radius, spacing, cardElevation } from "../theme/tokens";
import { FieldRequestBottomSheet } from "../components/FieldRequestBottomSheet";
import { Ionicons } from "@expo/vector-icons";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function mapRowToBooking(row: BookingRowWithField, labels: Map<string, string>): Booking {
  const tp = row.total_price;
  const price = typeof tp === "string" ? parseFloat(tp) : tp;
  return {
    id: String(row.id),
    field_name: row.fields?.name ?? null,
    player_name: row.player_id ? labels.get(row.player_id) ?? null : null,
    start_time: formatTimeForDisplay(row.start_time),
    end_time: formatTimeForDisplay(row.end_time),
    status: mapDbStatusToUi(row.status),
    date: row.date,
    total_price: Number.isFinite(price) ? price : null,
    duration_label: formatDurationForDisplay(row.duration),
    created_by: row.created_by
  };
}

async function loadBookingsForUi(ownerId: string): Promise<Booking[]> {
  const raw = await fetchBookingsForOwner(ownerId);
  const playerIds = raw.map((r) => r.player_id).filter(Boolean) as string[];
  const labels = await fetchPlayerLabels(playerIds);
  return raw.map((row) => mapRowToBooking(row, labels));
}

function mapFsDocToBooking(b: OwnerBookingDoc): Booking {
  return {
    id: b.id,
    field_name: b.fieldName,
    player_name:
      b.source === "player"
        ? b.playerName || null
        : b.playerName?.trim()
          ? b.playerName
          : null,
    start_time: b.startTime,
    end_time: b.endTime,
    status: mapDbStatusToUi(b.status),
    date: b.date,
    total_price: b.totalPrice,
    duration_label: `${b.durationMinutes} دقيقة`,
    created_by: b.source === "manual" ? "owner" : "player",
    source_kind: b.source,
    services_summary: b.services?.length ? b.services.join("، ") : null,
    booking_kind: "owner",
    settled: Boolean(b.isSettled),
    player_user_id: b.playerUserId ?? null
  };
}

function mapVenueToBooking(d: VenueBookingDoc): Booking {
  const end = endTimeFromDuration(d.date, d.startTime, d.duration);
  const durLabel =
    d.duration > 24 ? `${d.duration} دقيقة` : d.duration === 1 ? "١ ساعة" : `${d.duration} ساعة`;
  const total = d.totalPrice ?? d.price ?? null;
  return {
    id: `${VENUE_BOOKING_ID_PREFIX}${d.id}`,
    field_name: d.venueName,
    player_name: d.playerName ?? null,
    start_time: d.startTime,
    end_time: end,
    status: mapDbStatusToUi(d.status ?? null),
    date: d.date,
    total_price: total,
    duration_label: durLabel,
    source_kind: "player",
    booking_kind: "venue",
    field_size: d.fieldSize ?? null,
    payment_method: d.paymentMethod ?? null,
    phone: d.phone ?? null,
    settled: Boolean(d.isSettled),
    player_user_id: d.playerUserId ?? null
  };
}

function padHmForDayjs(t: string): string {
  const p = t.trim().split(":");
  const h = (p[0] || "0").padStart(2, "0");
  const m = (p[1] || "00").padStart(2, "0");
  return `${h}:${m}`;
}

function bookingSlotEnded(b: Booking): boolean {
  const end = dayjs(`${b.date}T${padHmForDayjs(b.end_time)}:00`);
  return dayjs().isAfter(end);
}

function canOfferPostMatch(b: Booking, firebaseMode: boolean): boolean {
  if (!firebaseMode) return false;
  if (b.settled) return false;
  if (b.status === "pending" || b.status === "cancelled" || b.status === "rejected") return false;
  if (b.status !== "approved" && b.status !== "confirmed") return false;
  return bookingSlotEnded(b);
}

type TabKey = "today" | "upcoming" | "past";

function tabKeyForBookingDate(dateStr: string): TabKey {
  const d0 = dayjs().startOf("day");
  const d = dayjs(dateStr).startOf("day");
  if (d.isSame(d0, "day")) return "today";
  if (d.isAfter(d0, "day")) return "upcoming";
  return "past";
}

export const BookingsScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, "Home">>();
  const listRef = useRef<FlatList<Booking>>(null);
  const [deepLinkTarget, setDeepLinkTarget] = useState<string | null>(null);
  const [highlightBookingId, setHighlightBookingId] = useState<string | null>(null);
  const stackNav = navigation.getParent() as NativeStackNavigationProp<MainAppStackParamList> | undefined;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [fieldRequestVisible, setFieldRequestVisible] = useState(false);
  const [fieldRequestSubmitting, setFieldRequestSubmitting] = useState(false);
  const [reqPersonName, setReqPersonName] = useState("");
  const [reqFieldName, setReqFieldName] = useState("");
  const [reqCity, setReqCity] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [reqPhone, setReqPhone] = useState("");
  const [newDate, setNewDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [newStartTime, setNewStartTime] = useState("18:00");
  const [bookingDurationMinutes, setBookingDurationMinutes] = useState<BookingDurationMinutesOption>(60);
  const [newPrice, setNewPrice] = useState("100");
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [fsEditOpen, setFsEditOpen] = useState(false);
  const [fsEditDoc, setFsEditDoc] = useState<OwnerBookingDoc | null>(null);
  const [fsEditDate, setFsEditDate] = useState("");
  const [fsEditStart, setFsEditStart] = useState("18:00");
  const [fsEditDuration, setFsEditDuration] = useState<BookingDurationMinutesOption>(60);
  const [fsEditPrice, setFsEditPrice] = useState("100");
  const [fsEditServices, setFsEditServices] = useState("");
  const [fsEditSource, setFsEditSource] = useState<"manual" | "player">("manual");
  const [fsEditPlayer, setFsEditPlayer] = useState("");
  const [vbEditOpen, setVbEditOpen] = useState(false);
  const [vbEditDoc, setVbEditDoc] = useState<VenueBookingDoc | null>(null);
  const [vbEditDate, setVbEditDate] = useState("");
  const [vbEditStart, setVbEditStart] = useState("12:00");
  const [vbEditDuration, setVbEditDuration] = useState("1");
  const [vbEditVenueName, setVbEditVenueName] = useState("");
  const [vbEditVenueId, setVbEditVenueId] = useState("");
  const [vbEditFieldSize, setVbEditFieldSize] = useState("");
  const [vbEditPlayer, setVbEditPlayer] = useState("");
  const [vbEditPhone, setVbEditPhone] = useState("");
  const [vbEditPayment, setVbEditPayment] = useState("");
  const [vbEditPrice, setVbEditPrice] = useState("0");
  const [vbEditStatus, setVbEditStatus] = useState("confirmed");

  const useFs = Boolean(user?.id && isFirebaseConfigured());
  const canSync = Boolean(user?.id && (useFs || isBackendSyncEnabled));

  const mergedBookingsQuery = useQuery({
    queryKey: ["mergedBookings", user?.id],
    queryFn: async () => {
      const uid = user!.id;
      const ownerPub = user!.ownerId ?? deriveOwnerIdFromUid(uid);
      const [owner, venue] = await Promise.all([
        fetchOwnerBookingsForUid(uid),
        fetchVenueBookingsForOwner(ownerPub)
      ]);
      return { owner, venue };
    },
    enabled: useFs
  });

  const apiBookingsQuery = useQuery({
    queryKey: ["bookings", user?.id],
    queryFn: () => loadBookingsForUi(user!.id),
    enabled: Boolean(user?.id && isBackendSyncEnabled && !useFs)
  });

  const bookingList = useMemo(() => {
    if (!useFs) return apiBookingsQuery.data ?? [];
    const d = mergedBookingsQuery.data;
    if (!d) return [];
    const ownerRows = d.owner.map(mapFsDocToBooking);
    const venueRows = d.venue
      .filter((v) => v.syncSource !== SYNC_SOURCE_OWNER_APP)
      .map(mapVenueToBooking);
    return [...ownerRows, ...venueRows].sort((x, y) => {
      const ax = `${x.date}T${x.start_time}`;
      const ay = `${y.date}T${y.start_time}`;
      return ay.localeCompare(ax);
    });
  }, [useFs, mergedBookingsQuery.data, apiBookingsQuery.data]);

  const isPending = useFs ? mergedBookingsQuery.isPending : apiBookingsQuery.isPending;
  const isError = useFs ? mergedBookingsQuery.isError : apiBookingsQuery.isError;
  const error = useFs ? mergedBookingsQuery.error : apiBookingsQuery.error;
  const refetch = useFs ? mergedBookingsQuery.refetch : apiBookingsQuery.refetch;
  const isRefetching = useFs ? mergedBookingsQuery.isRefetching : apiBookingsQuery.isRefetching;

  const fsFieldsQuery = useQuery({
    queryKey: ["ownerFields", user?.id, user?.ownerId],
    queryFn: async () => {
      const ownerPub = user!.ownerId ?? deriveOwnerIdFromUid(user!.id);
      return fetchMergedFieldsForUid(user!.id, ownerPub);
    },
    enabled: useFs
  });

  const apiFieldsQuery = useQuery({
    queryKey: ["fields", user?.id],
    queryFn: () => fetchFieldsForOwner(user!.id),
    enabled: Boolean(user?.id && isBackendSyncEnabled && !useFs)
  });

  const fields = useFs
    ? (fsFieldsQuery.data ?? []).map((f) => ({ id: f.id, name: f.name }))
    : (apiFieldsQuery.data ?? []);

  useFocusEffect(
    useCallback(() => {
      if (canSync) void refetch();
      if (useFs && user?.id) {
        void queryClient.invalidateQueries({ queryKey: ["ownerFields", user.id] });
        void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user.id] });
      }
    }, [canSync, refetch, useFs, user?.id, queryClient])
  );

  useEffect(() => {
    if (fields.length && !selectedFieldId) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId]);

  useEffect(() => {
    const p = route.params?.openBookingId?.trim();
    if (!p) return;
    setDeepLinkTarget(p);
    navigation.setParams({ openBookingId: undefined });
  }, [route.params?.openBookingId, navigation]);

  useEffect(() => {
    if (!deepLinkTarget) return;
    const b = bookingList.find((x) => x.id === deepLinkTarget);
    if (!b) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tabKeyForBookingDate(b.date));
    setHighlightBookingId(deepLinkTarget);
  }, [deepLinkTarget, bookingList]);

  useEffect(() => {
    if (!deepLinkTarget || isPending) return;
    const b = bookingList.find((x) => x.id === deepLinkTarget);
    if (b) return;
    const timer = setTimeout(() => {
      if (!bookingList.some((x) => x.id === deepLinkTarget)) {
        setDeepLinkTarget(null);
        setHighlightBookingId(null);
        Toast.show({ type: "info", text1: t.notifications.bookingNotFound });
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [deepLinkTarget, isPending, bookingList]);

  useEffect(() => {
    if (!highlightBookingId) return;
    const t = setTimeout(() => setHighlightBookingId(null), 4500);
    return () => clearTimeout(t);
  }, [highlightBookingId]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string | number; status: string }) => {
      if (useFs) {
        const sid = String(id);
        const vb = parseVenueBookingUiId(sid);
        if (vb) {
          await updateVenueBookingStatus(vb, status);
          return;
        }
        await updateOwnerBookingStatusFirestore(sid, status);
        return;
      }
      await updateBookingStatus(Number(id), status);
    },
    onSuccess: () => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      void queryClient.invalidateQueries({ queryKey: ["bookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      Toast.show({ type: "success", text1: t.bookings.statusUpdated });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const insertMutation = useMutation({
    mutationFn: (row: Parameters<typeof insertBooking>[0]) =>
      useFs
        ? insertOwnerBooking({
            ownerUid: user!.id,
            fieldId: row.field_id,
            fieldName: fields.find((f) => f.id === row.field_id)?.name ?? "—",
            date: row.date,
            startTime: row.start_time,
            endTime: row.end_time,
            durationMinutes: row.durationMinutes,
            totalPrice: row.total_price,
            status: row.status ?? "approved",
            source: "manual",
            playerName: null,
            services: [],
            ownerPublicId: user!.ownerId ?? deriveOwnerIdFromUid(user!.id)
          })
        : insertBooking(row),
    onSuccess: () => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      void queryClient.invalidateQueries({ queryKey: ["bookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      setAddModalVisible(false);
      Toast.show({ type: "success", text1: t.bookings.bookingSaved });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const fsUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!fsEditDoc || !user?.id) return;
      const [hour, minute] = fsEditStart.split(":").map((x) => parseInt(x, 10));
      const end = dayjs(fsEditDate)
        .hour(hour || 0)
        .minute(minute || 0)
        .second(0)
        .add(fsEditDuration, "minute");
      await updateOwnerBookingDoc(fsEditDoc.id, {
        date: fsEditDate,
        startTime: fsEditStart,
        endTime: end.format("HH:mm"),
        durationMinutes: fsEditDuration,
        totalPrice: parseFloat(fsEditPrice.replace(/,/g, ".")) || 0,
        source: fsEditSource,
        playerName: fsEditSource === "player" ? fsEditPlayer.trim() || null : null,
        services: fsEditServices
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean),
        fieldName: fsEditDoc.fieldName,
        status: fsEditDoc.status
      });
    },
    onSuccess: () => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      setFsEditOpen(false);
      setFsEditDoc(null);
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      Toast.show({ type: "success", text1: t.fields.bookingUpdated });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const fsDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const vb = parseVenueBookingUiId(id);
      if (vb) await deleteVenueBookingDoc(vb);
      else await deleteOwnerBookingDoc(id);
    },
    onSuccess: () => {
      const op = user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "");
      void queryClient.invalidateQueries({ queryKey: ["ownerBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["venueBookingsByOwner", op] });
      Toast.show({ type: "success", text1: t.fields.bookingDeleted });
    }
  });

  const vbUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!vbEditDoc) return;
      const duration = parseFloat(vbEditDuration.replace(/,/g, ".")) || 1;
      const priceNum = parseFloat(vbEditPrice.replace(/,/g, ".")) || 0;
      await updateVenueBookingDoc(vbEditDoc.id, {
        date: vbEditDate.trim(),
        startTime: normalizeHm(vbEditStart.trim()),
        duration: Math.round(duration),
        venueName: vbEditVenueName.trim(),
        venueId: vbEditVenueId.trim(),
        fieldSize: vbEditFieldSize.trim() || undefined,
        playerName: vbEditPlayer.trim() || undefined,
        phone: vbEditPhone.trim() || undefined,
        paymentMethod: vbEditPayment.trim() || undefined,
        price: priceNum,
        totalPrice: priceNum,
        status: vbEditStatus.trim() || "confirmed"
      });
    },
    onSuccess: () => {
      setVbEditOpen(false);
      setVbEditDoc(null);
      void queryClient.invalidateQueries({ queryKey: ["mergedBookings", user?.id] });
      Toast.show({ type: "success", text1: t.fields.bookingUpdated });
    },
    onError: (e: unknown) => {
      Toast.show({ type: "error", text1: e instanceof Error ? e.message : t.common.error });
    }
  });

  const openBookingEdit = (bookingId: string) => {
    const vbId = parseVenueBookingUiId(bookingId);
    if (vbId) {
      const doc = (mergedBookingsQuery.data?.venue ?? []).find((b) => b.id === vbId);
      if (!doc) return;
      setVbEditDoc(doc);
      setVbEditDate(doc.date);
      setVbEditStart(doc.startTime);
      setVbEditDuration(String(doc.duration));
      setVbEditVenueName(doc.venueName);
      setVbEditVenueId(doc.venueId);
      setVbEditFieldSize(doc.fieldSize ?? "");
      setVbEditPlayer(doc.playerName ?? "");
      setVbEditPhone(doc.phone ?? "");
      setVbEditPayment(doc.paymentMethod ?? "");
      const tp = doc.totalPrice ?? doc.price ?? 0;
      setVbEditPrice(String(tp));
      setVbEditStatus((doc.status ?? "confirmed").trim() || "confirmed");
      setVbEditOpen(true);
      return;
    }
    const doc = (mergedBookingsQuery.data?.owner ?? []).find((b) => b.id === bookingId);
    if (!doc) return;
    setFsEditDoc(doc);
    setFsEditDate(doc.date);
    setFsEditStart(doc.startTime);
    setFsEditDuration((doc.durationMinutes === 90 ? 90 : 60) as BookingDurationMinutesOption);
    setFsEditPrice(String(doc.totalPrice));
    setFsEditServices((doc.services ?? []).join("، "));
    setFsEditSource(doc.source);
    setFsEditPlayer(doc.playerName ?? "");
    setFsEditOpen(true);
  };

  const filteredBookings = useMemo(() => {
    const d0 = dayjs().startOf("day");
    return bookingList.filter((b) => {
      const d = dayjs(b.date).startOf("day");
      if (activeTab === "today") return d.isSame(d0, "day");
      if (activeTab === "upcoming") return d.isAfter(d0, "day");
      return d.isBefore(d0, "day");
    });
  }, [bookingList, activeTab]);

  useEffect(() => {
    if (!deepLinkTarget) return;
    const idx = filteredBookings.findIndex((x) => x.id === deepLinkTarget);
    if (idx < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.12, animated: true });
    });
    setDeepLinkTarget(null);
    Toast.show({ type: "success", text1: t.notifications.bookingOpenedFromNotification });
  }, [filteredBookings, deepLinkTarget]);

  const showSkeleton = canSync && isPending;

  const setTab = (k: TabKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(k);
  };

  const handleStatusChange = (id: string, status: "approved" | "rejected") => {
    updateStatusMutation.mutate({ id: useFs ? id : Number(id), status });
  };

  const handleAddBooking = () => {
    if (!canSync) {
      Toast.show({
        type: "info",
        text1: !user?.id ? t.bookings.loginRequiredBookings : t.bookings.needBackendBookings
      });
      return;
    }
    if (!selectedFieldId) {
      Toast.show({ type: "error", text1: t.bookings.noFieldsHint });
      return;
    }
    const durationMinutes = bookingDurationMinutes;
    const [hour, minute] = newStartTime.split(":").map((x) => parseInt(x, 10));
    const start = dayjs(newDate).hour(hour || 0).minute(minute || 0).second(0);
    const end = start.add(durationMinutes, "minute");
    const priceNum = parseFloat(newPrice.replace(/,/g, ".")) || 0;

    insertMutation.mutate({
      field_id: selectedFieldId,
      player_id: null,
      date: newDate,
      start_time: start.format("HH:mm"),
      end_time: end.format("HH:mm"),
      durationMinutes,
      total_price: priceNum,
      status: "approved",
      created_by: "owner"
    });
  };

  const handleSubmitFieldRequest = async () => {
    const name = reqFieldName.trim();
    const location = reqCity.trim();

    if (!name) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestValidation });
      return;
    }
    if (!location) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestValidationLocation });
      return;
    }
    if (!isFirebaseConfigured()) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestFirebaseNotConfigured });
      return;
    }
    if (!user?.id) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestLoginRequired });
      return;
    }
    const ownerId = user.ownerId ?? deriveOwnerIdFromUid(user.id);

    const ownerName = user.display_name?.trim() ?? "";
    const accountPhone = user.phone?.trim() ?? "";
    if (!ownerName || !accountPhone) {
      Toast.show({ type: "error", text1: t.bookings.fieldRequestProfileIncomplete });
      return;
    }

    setFieldRequestSubmitting(true);
    try {
      const result = await submitFieldRequest({
        fieldName: name,
        location,
        notes: reqNotes.trim() || undefined,
        ownerId,
        ownerAccountId: ownerId,
        userUid: user.id,
        ownerName,
        phone: accountPhone
      });
      setFieldRequestVisible(false);
      setReqPersonName("");
      setReqFieldName("");
      setReqCity("");
      setReqNotes("");
      setReqPhone("");
      Toast.show({
        type: "success",
        text1: t.bookings.fieldRequestSuccess,
        text2: `${t.bookings.requestIdSentHint}\n${result.id}`,
        visibilityTime: 7000
      });
    } catch (e: unknown) {
      const err = wrapFieldRequestError(e);
      const msg = err.message;
      if (msg === "FIREBASE_NOT_CONFIGURED") {
        Toast.show({ type: "error", text1: t.bookings.fieldRequestFirebaseNotConfigured });
      } else if (msg.startsWith("VALIDATION:")) {
        const key = msg.replace("VALIDATION:", "");
        if (key === "location") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestValidationLocation });
        } else if (key === "ownerName") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestProfileIncomplete });
        } else if (key === "fieldName") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestValidation });
        } else if (key === "phone") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestProfileIncomplete });
        } else if (key === "ownerId" || key === "ownerAccountId" || key === "userUid") {
          Toast.show({ type: "error", text1: t.bookings.fieldRequestOwnerIdMissing });
        } else {
          Toast.show({ type: "error", text1: t.common.error });
        }
      } else {
        Toast.show({ type: "error", text1: msg || t.common.error });
      }
    } finally {
      setFieldRequestSubmitting(false);
    }
  };

  const openAddModal = () => {
    if (!user?.id) {
      Toast.show({ type: "info", text1: t.bookings.loginRequiredBookings });
      return;
    }
    if (!useFs && !isBackendSyncEnabled) {
      Toast.show({ type: "info", text1: t.bookings.needBackendBookings });
      return;
    }
    setBookingDurationMinutes(60);
    setAddModalVisible(true);
  };

  const renderListEmpty = () => {
    if (canSync && isError) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={t.bookings.emptyStateLoadTitle}
          subtitle={t.bookings.loadErrorBookings}
        />
      );
    }
    if (!useFs && !isBackendSyncEnabled) {
      return (
        <EmptyState
          icon="settings-outline"
          title={t.bookings.emptyStateBackendTitle}
          subtitle={t.bookings.needBackendBookings}
        />
      );
    }
    if (!user?.id) {
      return (
        <EmptyState
          icon="lock-closed-outline"
          title={t.bookings.emptyTitle}
          subtitle={t.bookings.loginRequiredBookings}
        />
      );
    }
    return <EmptyState icon="calendar-outline" title={t.bookings.emptyTitle} subtitle={t.bookings.emptySubtitle} />;
  };

  return (
    <>
      <ScreenShell>
        <View style={styles.root}>
          <View style={styles.headerBlock}>
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.brandEn}>{BRAND.name}</Text>
                <Text style={styles.screenTitle}>{t.tabs.home}</Text>
                <Text style={styles.screenSub}>{t.bookings.screenSubtitle}</Text>
              </View>
              <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.headerBtnPressed]} onPress={openAddModal}>
                <Text style={styles.addButtonText}>{t.bookings.addBooking}</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.requestFieldButton, pressed && styles.requestFieldPressed]}
              onPress={() => setFieldRequestVisible(true)}
            >
              <View style={styles.requestFieldInner}>
                <View style={styles.requestFieldIconWrap}>
                  <Ionicons name="add-circle" size={22} color={colors.primary} />
                </View>
                <View style={styles.requestFieldTextCol}>
                  <Text style={styles.requestFieldButtonTitle}>{t.bookings.requestAddField}</Text>
                  <Text style={styles.requestFieldButtonSub}>{t.bookings.fieldRequestSheetSubtitle}</Text>
                </View>
                <Ionicons name="chevron-back" size={20} color={colors.textSubtle} />
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.scheduleCard, pressed && styles.headerBtnPressed]}
              onPress={() => navigation.navigate("Schedule")}
            >
              <View style={styles.scheduleIcon}>
                <Ionicons name="time" size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.scheduleTextCol}>
                <Text style={styles.scheduleTitle}>{t.bookings.scheduleInlineTitle}</Text>
                <Text style={styles.scheduleSub}>{t.schedule.title}</Text>
              </View>
              <Text style={styles.scheduleLink}>{t.bookings.scheduleInlineOpen}</Text>
            </Pressable>
          </View>

          <View style={styles.tabsRow}>
            <TabButton label={t.bookings.today} active={activeTab === "today"} onPress={() => setTab("today")} />
            <TabButton
              label={t.bookings.upcoming}
              active={activeTab === "upcoming"}
              onPress={() => setTab("upcoming")}
            />
            <TabButton label={t.bookings.past} active={activeTab === "past"} onPress={() => setTab("past")} />
          </View>

          {showSkeleton ? (
            <View style={styles.listArea}>
              <BookingSkeletonList />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              style={styles.listArea}
              data={filteredBookings}
              keyExtractor={(item) => item.id}
              onScrollToIndexFailed={({ index }) => {
                requestAnimationFrame(() => {
                  listRef.current?.scrollToIndex({ index, viewPosition: 0.12, animated: true });
                });
              }}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 10) * 42).springify()}>
                  <BookingCard
                    highlighted={item.id === highlightBookingId}
                    booking={item}
                    onApprove={() => handleStatusChange(item.id, "approved")}
                    onReject={() => handleStatusChange(item.id, "rejected")}
                    onEdit={useFs ? () => openBookingEdit(item.id) : undefined}
                    onPostMatch={
                      canOfferPostMatch(item, useFs)
                        ? () => {
                            const vid = parseVenueBookingUiId(item.id);
                            stackNav?.navigate("PostMatch", vid
                              ? { mode: "venue", venueBookingId: vid }
                              : { mode: "owner", ownerBookingId: item.id });
                          }
                        : undefined
                    }
                    onDelete={
                      useFs
                        ? () =>
                            Alert.alert(t.fields.confirmDeleteTitle, t.fields.confirmDeleteBody, [
                              { text: t.common.cancel, style: "cancel" },
                              {
                                text: t.fields.deleteBooking,
                                style: "destructive",
                                onPress: () => fsDeleteMutation.mutate(item.id)
                              }
                            ])
                        : undefined
                    }
                  />
                </Animated.View>
              )}
              contentContainerStyle={
                filteredBookings.length === 0 ? styles.listEmptyGrow : styles.listContent
              }
              ListEmptyComponent={renderListEmpty}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching && !isPending}
                  onRefresh={() => void refetch()}
                  tintColor={colors.primary}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScreenShell>

      <FieldRequestBottomSheet
        visible={fieldRequestVisible}
        onClose={() => setFieldRequestVisible(false)}
        user={user}
        ownerAccountId={user?.ownerId ?? deriveOwnerIdFromUid(user?.id ?? "")}
        reqPersonName={reqPersonName}
        setReqPersonName={setReqPersonName}
        reqFieldName={reqFieldName}
        setReqFieldName={setReqFieldName}
        reqCity={reqCity}
        setReqCity={setReqCity}
        reqNotes={reqNotes}
        setReqNotes={setReqNotes}
        reqPhone={reqPhone}
        setReqPhone={setReqPhone}
        submitting={fieldRequestSubmitting}
        onSubmit={handleSubmitFieldRequest}
      />

      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.addModalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t.bookings.addBooking}</Text>
              <Text style={styles.inputLabel}>{t.bookings.selectField}</Text>
              {fields.length === 0 ? (
                <Text style={styles.warnText}>{t.bookings.noFieldsHint}</Text>
              ) : (
                <View style={styles.fieldChips}>
                  {fields.map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.fieldChip, selectedFieldId === f.id && styles.fieldChipActive]}
                      onPress={() => setSelectedFieldId(f.id)}
                    >
                      <Text style={[styles.fieldChipText, selectedFieldId === f.id && styles.fieldChipTextActive]}>
                        {f.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.inputLabel}>{t.bookings.dateLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.bookings.datePlaceholder}
                value={newDate}
                textAlign="right"
                onChangeText={setNewDate}
              />
              <Text style={styles.inputLabel}>{t.bookings.startTimeLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.bookings.timePlaceholder}
                value={newStartTime}
                textAlign="right"
                onChangeText={setNewStartTime}
              />
              <Text style={styles.inputLabel}>{t.bookings.durationMinutesLabel}</Text>
              <View style={styles.durationChips}>
                {BOOKING_DURATION_MINUTES_OPTIONS.map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.durationChip, bookingDurationMinutes === mins && styles.durationChipActive]}
                    onPress={() => setBookingDurationMinutes(mins)}
                  >
                    <Text
                      style={[
                        styles.durationChipTitle,
                        bookingDurationMinutes === mins && styles.durationChipTitleActive
                      ]}
                    >
                      {mins === 60 ? t.bookings.durationOneHour : t.bookings.durationOneHalfHour}
                    </Text>
                    <Text
                      style={[
                        styles.durationChipSub,
                        bookingDurationMinutes === mins && styles.durationChipSubActive
                      ]}
                    >
                      {mins === 60 ? t.bookings.durationOneHourSub : t.bookings.durationOneHalfHourSub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>{t.bookings.priceLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.bookings.pricePlaceholder}
                value={newPrice}
                keyboardType="decimal-pad"
                textAlign="right"
                onChangeText={setNewPrice}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancel]}
                  onPress={() => setAddModalVisible(false)}
                  disabled={insertMutation.isPending}
                >
                  <Text style={styles.modalCancelText}>{t.bookings.modalCancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPrimary]}
                  onPress={handleAddBooking}
                  disabled={insertMutation.isPending || !fields.length}
                >
                  {insertMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>{t.bookings.modalSave}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={vbEditOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.addModalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t.fields.editBooking}</Text>
              <Text style={styles.inputLabel}>{t.bookings.venueNameLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditVenueName}
                onChangeText={setVbEditVenueName}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.venueIdLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditVenueId}
                onChangeText={setVbEditVenueId}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.fields.selectDate}</Text>
              <TextInput style={styles.input} value={vbEditDate} onChangeText={setVbEditDate} textAlign="right" />
              <Text style={styles.inputLabel}>{t.bookings.startTimeLabel}</Text>
              <TextInput style={styles.input} value={vbEditStart} onChangeText={setVbEditStart} textAlign="right" />
              <Text style={styles.inputLabel}>{t.bookings.durationLabel}</Text>
              <Text style={[styles.warnText, { marginBottom: 6 }]}>{t.bookings.venueDurationHint}</Text>
              <TextInput
                style={styles.input}
                value={vbEditDuration}
                onChangeText={setVbEditDuration}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.fieldSizeLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditFieldSize}
                onChangeText={setVbEditFieldSize}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.fields.playerNameLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditPlayer}
                onChangeText={setVbEditPlayer}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.playerPhoneLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditPhone}
                onChangeText={setVbEditPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.paymentMethodLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditPayment}
                onChangeText={setVbEditPayment}
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.priceLabel}</Text>
              <TextInput
                style={styles.input}
                value={vbEditPrice}
                onChangeText={setVbEditPrice}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.bookings.bookingStatusLabel}</Text>
              <View style={styles.durationChips}>
                {(
                  [
                    ["pending", t.bookings.statusPending],
                    ["approved", t.bookings.statusApproved],
                    ["rejected", t.bookings.statusRejected],
                    ["cancelled", t.bookings.statusCancelled],
                    ["confirmed", t.bookings.statusConfirmed]
                  ] as const
                ).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.durationChip, vbEditStatus === key && styles.durationChipActive]}
                    onPress={() => setVbEditStatus(key)}
                  >
                    <Text
                      style={[styles.durationChipTitle, vbEditStatus === key && styles.durationChipTitleActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancel]}
                  onPress={() => {
                    setVbEditOpen(false);
                    setVbEditDoc(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>{t.bookings.modalCancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPrimary]}
                  onPress={() => vbUpdateMutation.mutate()}
                  disabled={vbUpdateMutation.isPending}
                >
                  {vbUpdateMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>{t.bookings.modalSave}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={fsEditOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.addModalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t.fields.editBooking}</Text>
              <Text style={styles.inputLabel}>{t.fields.selectDate}</Text>
              <TextInput style={styles.input} value={fsEditDate} onChangeText={setFsEditDate} textAlign="right" />
              <Text style={styles.inputLabel}>{t.bookings.startTimeLabel}</Text>
              <TextInput style={styles.input} value={fsEditStart} onChangeText={setFsEditStart} textAlign="right" />
              <Text style={styles.inputLabel}>{t.bookings.durationMinutesLabel}</Text>
              <View style={styles.durationChips}>
                {BOOKING_DURATION_MINUTES_OPTIONS.map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.durationChip, fsEditDuration === mins && styles.durationChipActive]}
                    onPress={() => setFsEditDuration(mins)}
                  >
                    <Text
                      style={[
                        styles.durationChipTitle,
                        fsEditDuration === mins && styles.durationChipTitleActive
                      ]}
                    >
                      {mins === 60 ? t.bookings.durationOneHour : t.bookings.durationOneHalfHour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>{t.bookings.priceLabel}</Text>
              <TextInput
                style={styles.input}
                value={fsEditPrice}
                onChangeText={setFsEditPrice}
                keyboardType="decimal-pad"
                textAlign="right"
              />
              <Text style={styles.inputLabel}>{t.fields.servicesLabel}</Text>
              <TextInput
                style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
                value={fsEditServices}
                onChangeText={setFsEditServices}
                textAlign="right"
                multiline
              />
              <Text style={styles.inputLabel}>{t.fields.sourceLabel}</Text>
              <View style={styles.durationChips}>
                <TouchableOpacity
                  style={[styles.durationChip, fsEditSource === "manual" && styles.durationChipActive]}
                  onPress={() => setFsEditSource("manual")}
                >
                  <Text
                    style={[styles.durationChipTitle, fsEditSource === "manual" && styles.durationChipTitleActive]}
                  >
                    {t.fields.sourceManual}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.durationChip, fsEditSource === "player" && styles.durationChipActive]}
                  onPress={() => setFsEditSource("player")}
                >
                  <Text
                    style={[styles.durationChipTitle, fsEditSource === "player" && styles.durationChipTitleActive]}
                  >
                    {t.fields.sourcePlayer}
                  </Text>
                </TouchableOpacity>
              </View>
              {fsEditSource === "player" ? (
                <>
                  <Text style={styles.inputLabel}>{t.fields.playerNameLabel}</Text>
                  <TextInput
                    style={styles.input}
                    value={fsEditPlayer}
                    onChangeText={setFsEditPlayer}
                    textAlign="right"
                  />
                </>
              ) : null}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancel]}
                  onPress={() => {
                    setFsEditOpen(false);
                    setFsEditDoc(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>{t.bookings.modalCancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalPrimary]}
                  onPress={() => fsUpdateMutation.mutate()}
                  disabled={fsUpdateMutation.isPending}
                >
                  {fsUpdateMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>{t.bookings.modalSave}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const TabButton: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: spacing.sm
  },
  headerBlock: {
    marginBottom: spacing.md
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md
  },
  titleBlock: {
    flex: 1,
    marginLeft: spacing.md
  },
  brandEn: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: colors.primary,
    textAlign: "right",
    marginBottom: 4
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    letterSpacing: -0.6
  },
  screenSub: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "right",
    lineHeight: 20,
    fontWeight: "500"
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radius.full,
    marginTop: 4,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  addButtonText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: "800"
  },
  headerBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }]
  },
  requestFieldButton: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.sm + 2,
    ...cardElevation(true)
  },
  requestFieldPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }]
  },
  requestFieldInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    gap: 12
  },
  requestFieldIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  requestFieldTextCol: {
    flex: 1
  },
  requestFieldButtonTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 4
  },
  requestFieldButtonSub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "right",
    lineHeight: 18
  },
  scheduleCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border
  },
  scheduleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md
  },
  scheduleTextCol: {
    flex: 1
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    textAlign: "right",
    marginBottom: 2
  },
  scheduleSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    fontWeight: "600"
  },
  scheduleLink: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary
  },
  tabsRow: {
    flexDirection: "row-reverse",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing.md
  },
  tabButton: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: 11,
    alignItems: "center"
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceCard,
    shadowColor: "#0c1222",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  tabText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600"
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: "800"
  },
  listArea: {
    flex: 1
  },
  listContent: {
    paddingBottom: 100
  },
  listEmptyGrow: {
    flexGrow: 1
  },
  addModalScroll: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingBottom: spacing.sm
  },
  warnText: {
    fontSize: 13,
    color: colors.accent,
    textAlign: "right",
    marginBottom: 10,
    lineHeight: 20,
    fontWeight: "600"
  },
  fieldChips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    marginBottom: 10
  },
  durationChips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12
  },
  durationChip: {
    flex: 1,
    minWidth: "42%" as const,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center"
  },
  durationChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  durationChipTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text
  },
  durationChipTitleActive: {
    color: colors.primaryDark
  },
  durationChipSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: "600"
  },
  durationChipSubActive: {
    color: colors.primary
  },
  fieldChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.sm,
    marginBottom: spacing.sm
  },
  fieldChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  fieldChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary
  },
  fieldChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "700"
  },
  inputLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "right",
    marginBottom: 4,
    fontWeight: "700"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end"
  },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    maxHeight: "92%"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.lg,
    color: colors.text,
    letterSpacing: -0.3
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    marginBottom: spacing.sm + 2,
    backgroundColor: colors.surfaceMuted,
    color: colors.text
  },
  modalActions: {
    flexDirection: "row-reverse",
    marginTop: spacing.md
  },
  modalButton: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    alignItems: "center"
  },
  modalCancel: {
    backgroundColor: colors.surfaceMuted,
    marginLeft: spacing.sm
  },
  modalPrimary: {
    backgroundColor: colors.primary
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: "800"
  },
  modalPrimaryText: {
    color: colors.textOnPrimary,
    fontWeight: "800"
  }
});
